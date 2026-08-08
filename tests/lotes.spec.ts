import { expect, test } from "./fixtures/coverageFixtures.js";
import type { Page } from "@playwright/test";
import {
  loginAsResponsableCalidad,
  loginAsAdministrador,
  loginAsOperario,
  loginAsResponsableProduccion,
} from "./fixtures/mockAuth.js";
// ---------------------------------------------------------------------------
// Datos de prueba
// ---------------------------------------------------------------------------

const PROVEEDORES_MOCK = {
  data: [
    {
      id: 1,
      razonSocial: "Tambo El Roble",
      cuit: "30-11111111-1",
      tipo: "tambo",
      empresaId: 10,
      estado: "activa",
    },
  ],
  meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
};

// Lote sin clasificación — simula estado recién registrado
const LOTE_1 = {
  id: 1,
  codigo: "LOT-2026-001",
  empresaId: 10,
  proveedorId: 1,
  materiaPrima: "leche_cruda",
  fechaIngreso: "2026-08-01T12:00:00.000Z",
  clasificacion: null,
  destinoInicial: "produccion",
  estado: "registrado",
  parametros: [{ parametro: "ph", valor: 6.8 }],
  createdAt: "2026-08-01T12:00:00.000Z",
};

// Lote con clasificacion "no_apto" — usado también para la lista /no-aptos
const LOTE_2 = {
  id: 2,
  codigo: "LOT-2026-002",
  empresaId: 10,
  proveedorId: 1,
  materiaPrima: "crema_de_leche",
  fechaIngreso: "2026-08-01T12:00:00.000Z",
  clasificacion: "no_apto",
  destinoInicial: "almacenamiento",
  estado: "registrado",
  parametros: [{ parametro: "grasa", valor: 2.5 }],
  createdAt: "2026-08-01T12:00:00.000Z",
};

// GET /lotes devuelve formato paginado; GET /lotes/no-aptos devuelve Lote[] plano
const LOTES_PAGINATED_MOCK = {
  data: [LOTE_1, LOTE_2],
  total: 2,
  page: 1,
  limit: 100,
};



async function mockLotesDeps(page: Page) {
  // Catch-all: cualquier fetch/XHR no interceptado más arriba devuelve []
  await page.route("**/*", async (route) => {
    const rt = route.request().resourceType();
    if (rt === "xhr" || rt === "fetch") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      });
    }
    return route.continue();
  });

  // notificacionService: requiere formato paginado para no crashear el hook
  await page.route("**/notificacion*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
      }),
    });
  });

  // useConfigParametros → GET /config-parametros
  await page.route("**/config-param*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  // useSensores → GET /sensores
  await page.route("**/sensores*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  // proveedoresService.getAll → GET /proveedores?limit=100&estado=activa
  await page.route("**/proveedores*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PROVEEDORES_MOCK),
    });
  });

  // GET /lotes/:id/revisiones — regex para no depender de glob cross-segment
  await page.route(/\/lotes\/\d+\/revisiones/, async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  // GET /lotes/no-aptos — [] por defecto; mockRevisionDeps lo sobreescribe con LIFO
  await page.route(/\/lotes\/no-aptos/, async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  // GET /lotes base (paginado) — **/lotes* solo matchea /lotes con query params, no sub-paths con /
  // POST /lotes se deja pasar (route.continue) para que cada test lo capture inline
  await page.route("**/lotes*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(LOTES_PAGINATED_MOCK),
    });
  });
}

// ---------------------------------------------------------------------------
// HU-60 · LotesPage — gestión de lotes de materia prima
// ---------------------------------------------------------------------------

test.describe("LotesPage", () => {
  test("muestra la tabla con los lotes registrados", async ({ page }) => {
    await mockLotesDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await expect(
      page.getByRole("table").getByText("LOT-2026-001"),
    ).toBeVisible();
    await expect(
      page.getByRole("table").getByText("LOT-2026-002"),
    ).toBeVisible();
  });

  test("muestra estado vacío cuando no hay lotes registrados", async ({
    page,
  }) => {
    // Registramos handlers ad-hoc para devolver listas vacías en lugar de
    // reusar mockLotesDeps, así los handlers de lotes devuelven data=[]
    await page.route("**/*", async (route) => {
      const rt = route.request().resourceType();
      if (rt === "xhr" || rt === "fetch") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "[]",
        });
      }
      return route.continue();
    });
    await page.route("**/notificacion*", async (route) => {
      const rt = route.request().resourceType();
      if (
        route.request().method() !== "GET" ||
        (rt !== "fetch" && rt !== "xhr")
      )
        return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
        }),
      });
    });
    await page.route("**/config-param*", async (route) => {
      const rt = route.request().resourceType();
      if (
        route.request().method() !== "GET" ||
        (rt !== "fetch" && rt !== "xhr")
      )
        return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });
    await page.route("**/sensores*", async (route) => {
      const rt = route.request().resourceType();
      if (
        route.request().method() !== "GET" ||
        (rt !== "fetch" && rt !== "xhr")
      )
        return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });
    await page.route("**/proveedores*", async (route) => {
      const rt = route.request().resourceType();
      if (
        route.request().method() !== "GET" ||
        (rt !== "fetch" && rt !== "xhr")
      )
        return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PROVEEDORES_MOCK),
      });
    });
    await page.route("**/lotes*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      const url = route.request().url();
      if (url.includes("/no-aptos")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], total: 0, page: 1, limit: 100 }),
      });
    });

    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await expect(page.getByText("No hay lotes registrados")).toBeVisible();
  });

  test("Responsable de calidad ve el botón '+ Nuevo lote'", async ({
    page,
  }) => {
    await mockLotesDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await expect(
      page.getByRole("button", { name: /nuevo lote/i }),
    ).toBeVisible();
  });

  test("Administrador NO ve el botón '+ Nuevo lote' (solo lectura)", async ({
    page,
  }) => {
    await mockLotesDeps(page);
    await loginAsAdministrador(page);
    await page.goto("/lotes");

    // El Administrador tiene acceso de solo lectura — no puede crear lotes
    await expect(
      page.getByRole("button", { name: /nuevo lote/i }),
    ).not.toBeVisible();
  });

  test("abre el modal de nuevo lote al hacer clic en '+ Nuevo lote'", async ({
    page,
  }) => {
    await mockLotesDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await page.getByRole("button", { name: /nuevo lote/i }).click();

    // Verificamos que el primer paso del form (selección de proveedor y fecha) sea visible
    await expect(page.getByLabel("Proveedor *")).toBeVisible();
    await expect(page.getByLabel("Fecha de ingreso *")).toBeVisible();
  });

  test("muestra errores de validación al enviar el formulario vacío", async ({
    page,
  }) => {
    await mockLotesDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await page.getByRole("button", { name: /nuevo lote/i }).click();

    // Intentamos enviar sin completar ningún campo
    await page.getByRole("button", { name: "Registrar lote" }).click();

    await expect(
      page.getByText("El proveedor es obligatorio"),
    ).toBeVisible();
    await expect(
      page.getByText("El destino inicial es obligatorio"),
    ).toBeVisible();
    await expect(
      page.getByText("Cargá al menos un parámetro de calidad"),
    ).toBeVisible();
  });

  test("registra un lote nuevo correctamente y cierra el modal", async ({
    page,
  }) => {
    await mockLotesDeps(page);

    // Interceptamos POST /lotes con prioridad máxima (LIFO: registrado último).
    // La respuesta incluye sensoresDisponibles vacío → el form salta el paso
    // de asociación de sensores y cierra el modal directamente.
    await page.route("**/lotes*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          lote: { ...LOTE_1, id: 99, codigo: "LOT-2026-099" },
          sensoresDisponibles: [],
        }),
      });
    });

    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await page.getByRole("button", { name: /nuevo lote/i }).click();

    await page.getByLabel("Proveedor *").selectOption({ value: "1" });
    await page.getByLabel("Fecha de ingreso *").fill("2026-08-01");
    // RadioCard de materia prima — se hace clic en el texto del label
    await page.getByText("Leche cruda").click();
    await page.getByLabel("pH (sin unidad)").fill("6.8");
    await page.getByLabel("Destino inicial *").selectOption({ value: "produccion" });

    await page.getByRole("button", { name: "Registrar lote" }).click();

    // El modal se cierra tras el submit exitoso
    await expect(
      page.getByRole("button", { name: "Registrar lote" }),
    ).not.toBeVisible();
  });

  test("muestra error del servidor cuando el POST /lotes falla con 500", async ({
    page,
  }) => {
    await mockLotesDeps(page);

    await page.route("**/lotes*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({ status: 500, body: "" });
    });

    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await page.getByRole("button", { name: /nuevo lote/i }).click();

    await page.getByLabel("Proveedor *").selectOption({ value: "1" });
    await page.getByLabel("Fecha de ingreso *").fill("2026-08-01");
    await page.getByText("Leche cruda").click();
    await page.getByLabel("pH (sin unidad)").fill("6.8");
    await page.getByLabel("Destino inicial *").selectOption({ value: "produccion" });

    await page.getByRole("button", { name: "Registrar lote" }).click();

    await expect(
      page.getByText("No se pudo registrar el lote. Intentá nuevamente."),
    ).toBeVisible();
  });

  test("cancela el modal sin guardar cambios", async ({ page }) => {
    await mockLotesDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await page.getByRole("button", { name: /nuevo lote/i }).click();
    await expect(page.getByLabel("Proveedor *")).toBeVisible();

    await page.getByRole("button", { name: "Cancelar" }).click();

    // El modal debe cerrarse y el campo desaparecer del DOM
    await expect(page.getByLabel("Proveedor *")).not.toBeVisible();
  });


    test("muestra error cuando un parámetro está fuera del umbral configurado", async ({
    page,
  }) => {
    await mockLotesDeps(page);

    await page.route("**/config-param*", async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: 1,
            empresaId: 10,
            parametro: "ph",
            tipoMateriaPrima: "leche_cruda",
            umbralMin: 6,
            umbralMax: 7.5,
            createdAt: "2026-08-01T00:00:00.000Z",
            updatedAt: "2026-08-01T00:00:00.000Z",
          },
        ]),
      });
    });

    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await page.getByRole("button", { name: /nuevo lote/i }).click();

    await page.getByLabel("Proveedor *").selectOption({ value: "1" });
    await page.getByLabel("Fecha de ingreso *").fill("2026-08-01");
    await page.locator("#lote-form").getByText("Leche cruda").click();
    // pH por debajo del mínimo configurado (6–7.5)
    await page.getByLabel("pH (sin unidad)").fill("2");
    await page.getByLabel("Destino inicial *").selectOption({ value: "produccion" });

    await page.getByRole("button", { name: "Registrar lote" }).click();

    await expect(page.getByText("Debe estar entre 6 y 7.5")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// HU-22 · RevisionLotesPage — revisión y decisión sobre lotes no aptos
// ---------------------------------------------------------------------------

test.describe("RevisionLotesPage", () => {
  // Lote con pH bajo que debería aparecer en la pestaña "Pendientes"
  const LOTE_PENDIENTE = {
    id: 10,
    codigo: "LOT-2026-010",
    empresaId: 10,
    proveedorId: 1,
    materiaPrima: "leche_cruda",
    fechaIngreso: "2026-08-01T12:00:00.000Z",
    clasificacion: "no_apto",
    destinoInicial: "produccion",
    estado: "registrado",
    parametros: [{ parametro: "ph", valor: 4.2 }],
    createdAt: "2026-08-01T12:00:00.000Z",
  };

 // mockRevisionDeps extiende mockLotesDeps sobreescribiendo /lotes/no-aptos
// para devolver LOTE_PENDIENTE. Por LIFO, este handler tiene mayor prioridad.
async function mockRevisionDeps(page: Page) {
  await mockLotesDeps(page);

  await page.route(/\/lotes\/no-aptos/, async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([LOTE_PENDIENTE]),
    });
  });
}

  test("muestra los lotes pendientes de revisión en la pestaña Pendientes", async ({
    page,
  }) => {
    await mockRevisionDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/revision");

    await expect(
      page.getByRole("table").getByText("LOT-2026-010"),
    ).toBeVisible();
  });

  test("muestra estado vacío en Pendientes cuando no hay lotes no aptos", async ({
    page,
  }) => {
    // mockLotesDeps devuelve [] en /no-aptos por defecto
    await mockLotesDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/revision");

    await expect(
      page.getByText("No hay lotes pendientes de revisión"),
    ).toBeVisible();
  });

  test("muestra estado vacío en Historial cuando aún no hay decisiones", async ({
    page,
  }) => {
    await mockRevisionDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/revision");

    await page.getByRole("button", { name: /historial/i }).click();

    await expect(
      page.getByText("Todavía no hay decisiones registradas"),
    ).toBeVisible();
  });

  test("abre el modal de revisión al hacer clic en el botón de acción", async ({
    page,
  }) => {
    await mockRevisionDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/revision");

    await page
      .getByRole("table")
      .getByTitle("Aprobar o rechazar lote")
      .click();

    await expect(page.getByRole("button", { name: "Aprobar", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Rechazar", exact: true })).toBeVisible();
  });

  test("muestra error si se confirma sin elegir decisión", async ({ page }) => {
    await mockRevisionDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/revision");

    await page
      .getByRole("table")
      .getByTitle("Aprobar o rechazar lote")
      .click();

    // No se selecciona ninguna decisión — se hace clic directamente en Confirmar
    await page.getByRole("button", { name: "Confirmar decisión" }).click();

    await expect(
      page.getByText("Elegí si el lote se aprueba o se rechaza."),
    ).toBeVisible();
  });

  test("muestra error si la justificación tiene menos de 10 caracteres", async ({
    page,
  }) => {
    await mockRevisionDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/revision");

    await page
      .getByRole("table")
      .getByTitle("Aprobar o rechazar lote")
      .click();

    await page.getByRole("button", { name: "Aprobar", exact: true }).click();
    await page.getByLabel("Justificación").fill("corta");
    await page.getByRole("button", { name: "Confirmar decisión" }).click();

    await expect(
      page.getByText(
        "La justificación es obligatoria y debe tener al menos 10 caracteres.",
      ),
    ).toBeVisible();
  });

  test("aprueba un lote correctamente y cierra el modal", async ({ page }) => {
    await mockRevisionDeps(page);

    await page.route("**/lotes/*/revision", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ decision: "aprobado" }),
      });
    });

    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/revision");

    await page
      .getByRole("table")
      .getByTitle("Aprobar o rechazar lote")
      .click();

    await page.getByRole("button", { name: "Aprobar", exact: true }).click();
    await page
      .getByLabel("Justificación")
      .fill("Parámetros dentro del rango aceptable.");
    await page.getByRole("button", { name: "Confirmar decisión" }).click();

    // Tras el submit exitoso el modal debe cerrarse
    await expect(
      page.getByRole("button", { name: "Confirmar decisión" }),
    ).not.toBeVisible();
  });

  test("rechaza un lote correctamente y cierra el modal", async ({ page }) => {
    await mockRevisionDeps(page);

    await page.route("**/lotes/*/revision", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ decision: "rechazado" }),
      });
    });

    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/revision");

    await page
      .getByRole("table")
      .getByTitle("Aprobar o rechazar lote")
      .click();

    await page.getByRole("button", { name: "Rechazar", exact: true }).click();
    await page
      .getByLabel("Justificación")
      .fill("pH por debajo del mínimo aceptable.");
    await page.getByRole("button", { name: "Confirmar decisión" }).click();

    await expect(
      page.getByRole("button", { name: "Confirmar decisión" }),
    ).not.toBeVisible();
  });

test("la lista de Pendientes se actualiza y queda vacía tras aprobar un lote", async ({ page }) => {
  await mockRevisionDeps(page);

  // Simula aprobación exitosa en POST /lotes/:id/revision
  await page.route("**/lotes/*/revision", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "POST") return route.continue();
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ decision: "aprobado" }),
    });
  });

  await loginAsResponsableCalidad(page);
  await page.goto("/lotes/revision");

  // El lote pendiente aparece en la tabla
  await expect(
    page.getByRole("table").getByText("LOT-2026-010"),
  ).toBeVisible();

  // Abrir modal y seleccionar decisión con justificación válida
  await page
    .getByRole("table")
    .getByTitle("Aprobar o rechazar lote")
    .click();
  await page.getByRole("button", { name: "Aprobar", exact: true }).click();
  await page
    .getByLabel("Justificación")
    .fill("Parámetros dentro del rango aceptable.");

  await page.route(/\/lotes\/no-aptos/, async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await page.getByRole("button", { name: "Confirmar decisión" }).click();

  // El modal se cierra y Pendientes queda vacío
  await expect(
    page.getByRole("button", { name: "Confirmar decisión" }),
  ).not.toBeVisible();
  await expect(
    page.getByText("No hay lotes pendientes de revisión"),
  ).toBeVisible();
});

test("un usuario sin rol de Responsable de Calidad ve acceso no autorizado", async ({ page }) => {
  await mockLotesDeps(page);
  await loginAsAdministrador(page);
  await page.goto("/lotes/revision");

  await expect(page.getByText("Acceso no autorizado")).toBeVisible();
});

  test("cancela el modal de revisión sin registrar decisión", async ({
    page,
  }) => {
    await mockRevisionDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/revision");

    await page
      .getByRole("table")
      .getByTitle("Aprobar o rechazar lote")
      .click();

    await expect(
      page.getByRole("button", { name: "Confirmar decisión" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Cancelar" }).click();

    await expect(
      page.getByRole("button", { name: "Confirmar decisión" }),
    ).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// HU-21 · ClasificacionAutomaticaTab 
// ---------------------------------------------------------------------------

test.describe("LotesPage › ClasificacionAutomaticaTab", () => {
  const CONFIG_PARAM_PH_LECHE = {
    id: 1, empresaId: 10, parametro: "ph", tipoMateriaPrima: "leche_cruda",
    umbralMin: 6, umbralMax: 7.5,
    createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z",
  };

  test.beforeEach(async ({ page }) => {
    await mockLotesDeps(page);
    await page.route("**/config-param*", async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify([CONFIG_PARAM_PH_LECHE]),
      });
    });
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");
  });

    test("lote sin clasificación muestra 'Sin clasificar' y aviso de sin parámetros", async ({ page }) => {
    const row = page.getByRole("row").filter({ hasText: "LOT-2026-001" });
    await row.getByTitle("Clasificación automática").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("PARÁMETROS UTILIZADOS")).toBeVisible();
    await expect(dialog.getByText("Sin clasificar")).toBeVisible();
    await expect(dialog.getByText("Este lote todavía no tiene parámetros registrados.")).toBeVisible();
  });

  test("lote clasificado Apto muestra el badge y el parámetro dentro de umbral", async ({ page }) => {
    await page.route("**/lotes*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          data: [{ ...LOTE_1, clasificacion: "apto", parametros: [{ parametro: "ph", valor: 6.8 }] }],
          total: 1, page: 1, limit: 100,
        }),
      });
    });
    await page.reload();
    await page.getByTitle("Clasificación automática").first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Apto")).toBeVisible();
    await expect(dialog.getByText(/pH: 6\.8/)).toBeVisible();
    await expect(dialog.getByText("Dentro de umbral")).toBeVisible();
  });

  test("lote clasificado No Apto muestra el badge, el parámetro fuera de umbral y el motivo", async ({ page }) => {
    await page.route("**/lotes*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          data: [{ ...LOTE_1, clasificacion: "no_apto", parametros: [{ parametro: "ph", valor: 2.0 }] }],
          total: 1, page: 1, limit: 100,
        }),
      });
    });
    await page.reload();
    await page.getByTitle("Clasificación automática").first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("No apto")).toBeVisible();
    await expect(dialog.getByText(/pH: 2/)).toBeVisible();
    await expect(dialog.getByText("Fuera de umbral")).toBeVisible();
    await expect(dialog.getByText(/El valor de "pH".*fuera del umbral/)).toBeVisible();
  });

    test("parámetro sin umbral configurado se muestra sin badge de estado", async ({ page }) => {
    // LIFO: vacía los umbrales — el parámetro queda con estado SIN_UMBRAL_CONFIGURADO
    await page.route("**/config-param*", async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    });
    await page.route("**/lotes*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          data: [{ ...LOTE_1, clasificacion: "apto", parametros: [{ parametro: "ph", valor: 6.8 }] }],
          total: 1, page: 1, limit: 100,
        }),
      });
    });
    await page.reload();
    await page.getByTitle("Clasificación automática").first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/pH: 6\.8/)).toBeVisible();
    await expect(dialog.getByText("Dentro de umbral")).not.toBeVisible();
    await expect(dialog.getByText("Fuera de umbral")).not.toBeVisible();
  });

  test("la campana muestra el badge y el mensaje cuando un lote fue clasificado como No Apto", async ({ page }) => {
    // LIFO: simula que el backend generó una notificación de No Apto
    await page.route("**/notificacion*", async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          data: [{
            id: 1,
            tipo: "lote_no_apto",
            mensaje: "El lote LOT-2026-001 fue clasificado como No Apto.",
            data: { loteId: 1, loteCodigo: "LOT-2026-001" },
            leida: false,
            createdAt: "2026-08-03T10:00:00.000Z",
          }],
          meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
        }),
      });
    });
    await page.reload();
    // El badge rojo sobre la campana debe mostrar "1"
    await expect(page.getByTitle("Notificaciones")).toContainText("1");
    // El panel muestra el mensaje y el botón para marcar como leído
    await page.getByTitle("Notificaciones").click();
    await expect(page.getByText("El lote LOT-2026-001 fue clasificado como No Apto.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Marcar como leído" })).toBeVisible();
  });

  test("la campana no muestra badge cuando el lote fue clasificado como Apto", async ({ page }) => {
    await expect(page.getByTitle("Notificaciones").locator("span")).not.toBeVisible();
  });
});

test("LotesPage › un Operario de línea no ve el tab de Clasificación automática en el modal", async ({ page }) => {
  await mockLotesDeps(page);
  await loginAsOperario(page);
  await page.goto("/lotes");

  // Operario puede abrir el modal (puedeCargarMedicionManualBase = true) pero
  // puedeVerClasificacion = false → el tab no debe existir en la lista de tabs
  const row = page.getByRole("row").filter({ hasText: "LOT-2026-001" });
  await row.getByTitle("Mediciones").click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Registrar medición manual" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Clasificación automática" })).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// HU-24 · Comparación de lote contra histórico de la empresa
// ---------------------------------------------------------------------------
test.describe("LotesPage › ComparacionHistoricaTab", () => {
  test.beforeEach(async ({ page }) => {
    await mockLotesDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");
  });

  test("sin registros históricos suficientes muestra el mensaje correspondiente", async ({ page }) => {
    await page.route(/\/lotes\/\d+\/comparacion-historica/, async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          loteId: 1,
          cantidadLotesHistoricosUtilizados: 0,
          cantidadLotesHistoricosConfigurada: 20,
          desvioSignificativoPorcentaje: 10,
          parametros: [],
        }),
      });
    });
    await page.getByTitle("Clasificación automática").first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Comparación histórica" }).click();
    await expect(
      dialog.getByText("La empresa todavía no tiene suficientes registros históricos para calcular esta comparación.")
    ).toBeVisible();
  });

  test("parámetro dentro del histórico muestra el badge 'Dentro del histórico'", async ({ page }) => {
    await page.route(/\/lotes\/\d+\/comparacion-historica/, async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          loteId: 1,
          cantidadLotesHistoricosUtilizados: 20,
          cantidadLotesHistoricosConfigurada: 20,
          desvioSignificativoPorcentaje: 10,
          parametros: [{
            parametro: "ph",
            valorLote: 6.8,
            promedioHistorico: 6.7,
            desviacionPorcentual: 1.49,
            superaDesvioSignificativo: false,
          }],
        }),
      });
    });
    await page.getByTitle("Clasificación automática").first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Comparación histórica" }).click();
    await expect(dialog.getByText(/pH: 6\.8.*promedio histórico: 6\.7.*\+1\.49%/)).toBeVisible();
    await expect(dialog.getByText("Dentro del histórico")).toBeVisible();
  });

  test("parámetro con desvío significativo muestra el badge 'Desvío significativo'", async ({ page }) => {
    await page.route(/\/lotes\/\d+\/comparacion-historica/, async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          loteId: 1,
          cantidadLotesHistoricosUtilizados: 20,
          cantidadLotesHistoricosConfigurada: 20,
          desvioSignificativoPorcentaje: 10,
          parametros: [{
            parametro: "ph",
            valorLote: 4.0,
            promedioHistorico: 6.7,
            desviacionPorcentual: -40.3,
            superaDesvioSignificativo: true,
          }],
        }),
      });
    });
    await page.getByTitle("Clasificación automática").first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Comparación histórica" }).click();
    await expect(dialog.getByText(/pH: 4.*promedio histórico: 6\.7.*-40\.3%/)).toBeVisible();
    await expect(dialog.getByText("Desvío significativo")).toBeVisible();
  });

    test("muestra error cuando el servidor falla al cargar la comparación", async ({ page }) => {
    await page.route(/\/lotes\/\d+\/comparacion-historica/, async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      await route.fulfill({ status: 500, body: "" });
    });
    await page.getByTitle("Clasificación automática").first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Comparación histórica" }).click();
    await expect(dialog.getByText("No se pudo cargar la comparación histórica.")).toBeVisible();
  });

  test("muestra advertencia cuando se usaron menos lotes que los configurados", async ({ page }) => {
    await page.route(/\/lotes\/\d+\/comparacion-historica/, async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          loteId: 1,
          cantidadLotesHistoricosUtilizados: 5,
          cantidadLotesHistoricosConfigurada: 20,
          desvioSignificativoPorcentaje: 10,
          parametros: [{
            parametro: "ph",
            valorLote: 6.8,
            promedioHistorico: 6.7,
            desviacionPorcentual: 1.49,
            superaDesvioSignificativo: false,
          }],
        }),
      });
    });
    await page.getByTitle("Clasificación automática").first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Comparación histórica" }).click();
    await expect(
      dialog.getByText("Calculado con 5 de 20 lotes históricos configurados.")
    ).toBeVisible();
    await expect(dialog.getByText("Dentro del histórico")).toBeVisible();
  });
});

test("LotesPage › un Responsable de Producción no ve el tab de Comparación histórica en el modal", async ({ page }) => {
  await mockLotesDeps(page);
  // HistorialMedicionesManualesTab se renderiza al abrir el modal (primer tab para RP)
  // y llama a GET /lotes/:id/mediciones-manuales — necesita formato paginado
  await page.route(/\/lotes\/\d+\/mediciones-manuales/, async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [], total: 0, page: 1, limit: 20 }),
    });
  });
  await loginAsResponsableProduccion(page);
  await page.goto("/lotes");
  const row = page.getByRole("row").filter({ hasText: "LOT-2026-001" });
  await row.getByTitle("Mediciones").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/Mediciones — LOT-2026-001/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Comparación histórica" })).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// LotesPage › HistorialLecturasLoteTab 
// ---------------------------------------------------------------------------
test.describe("LotesPage › HistorialLecturasLoteTab", () => {
  test.beforeEach(async ({ page }) => {
    await mockLotesDeps(page);
    // LIFO: sensor con loteActualId: 1 → LOTE_1 queda con sensor asociado
    await page.route("**/sensores*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: 1,
            nombre: "Sensor pH Laboratorio",
            tipo: "analogico",
            parametro: "ph",
            ubicacion: "laboratorio",
            rangoMinFavor: 6.0,
            rangoMaxFavor: 7.5,
            estado: "activo",
            empresaId: 10,
            loteActualId: 1,
            createdAt: "2026-08-01T00:00:00.000Z",
            updatedAt: "2026-08-01T00:00:00.000Z",
          },
        ]),
      });
    });

    await page.route("**/sensores/lecturas/historial-mediciones*", async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], total: 0, page: 1, limit: 20, rangoAmplio: false }),
      });
    });
    await loginAsResponsableProduccion(page);
    await page.goto("/lotes");
    const row = page.getByRole("row").filter({ hasText: "LOT-2026-001" });
    await row.getByTitle("Mediciones").click();
  });

  test("muestra estado vacío cuando no hay mediciones para el lote con sensor", async ({ page }) => {
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("No hay mediciones para los filtros seleccionados")).toBeVisible();
  });

  test("muestra las mediciones del lote al aplicar filtros", async ({ page }) => {
    await page.route("**/sensores/lecturas/historial-mediciones*", async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              id: 1,
              valor: 6.8,
              unidad: "pH",
              sensorNombre: "Sensor pH Laboratorio",
              parametro: "pH",
              loteCodigo: "LOT-2026-001",
              timestampLectura: "2026-08-01T08:00:00.000Z",
              estado: "NORMAL",
              origen: "sensor",
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
          rangoAmplio: false,
        }),
      });
    });
    const dialog = page.getByRole("dialog");
    await dialog.locator("input[type='date']").nth(0).fill("2026-08-01");
    await dialog.getByRole("button", { name: "Buscar" }).click();
    const histRow = dialog.getByRole("row").filter({ hasText: "Sensor pH Laboratorio" });
    await expect(histRow).toBeVisible();
    await expect(histRow.getByText("Normal")).toBeVisible();
  });

  test("muestra error de validación cuando fecha hasta es anterior a fecha desde", async ({ page }) => {
    const dialog = page.getByRole("dialog");
    await dialog.locator("input[type='date']").nth(0).fill("2026-08-05");
    await dialog.locator("input[type='date']").nth(1).fill("2026-08-01");
    await dialog.getByRole("button", { name: "Buscar" }).click();
    await expect(
      dialog.getByText("La fecha hasta no puede ser anterior a la fecha desde."),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// LotesPage › IngresoManualFallbackLoteTab 
// ---------------------------------------------------------------------------
test.describe("LotesPage › IngresoManualFallbackLoteTab", () => {
  test.beforeEach(async ({ page }) => {
    await mockLotesDeps(page);
    // LIFO: sensor inactivo con loteActualId: 1 → Operario ve tab "Ingreso manual (fallback)"
    await page.route("**/sensores*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: 1,
            nombre: "Sensor pH Laboratorio",
            tipo: "analogico",
            parametro: "ph",
            ubicacion: "laboratorio",
            rangoMinFavor: 6.0,
            rangoMaxFavor: 7.5,
            estado: "inactivo",
            empresaId: 10,
            loteActualId: 1,
            createdAt: "2026-08-01T00:00:00.000Z",
            updatedAt: "2026-08-01T00:00:00.000Z",
          },
        ]),
      });
    });
    await loginAsOperario(page);
    await page.goto("/lotes");
    const row = page.getByRole("row").filter({ hasText: "LOT-2026-001" });
    await row.getByTitle("Mediciones").click();
  });

  test("muestra el sensor del lote con el campo de ingreso habilitado", async ({ page }) => {
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Sensor pH Laboratorio · pH")).toBeVisible();
    await expect(dialog.getByText("Inactivo", { exact: true })).toBeVisible();
    await expect(dialog.locator("#lectura-manual-1")).toBeEnabled();
  });

  test("registra el valor manual del sensor y muestra confirmación", async ({ page }) => {
    const dialog = page.getByRole("dialog");
    await dialog.locator("#lectura-manual-1").fill("6.8");
    await dialog
      .locator("form:has(#lectura-manual-1)")
      .getByRole("button", { name: "Cargar" })
      .click();
    await expect(dialog.getByText("Valor manual registrado.")).toBeVisible();
  });
});