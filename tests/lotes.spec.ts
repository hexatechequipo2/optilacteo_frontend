import { expect, test } from "./fixtures/coverageFixtures.js";
import type { Page } from "@playwright/test";
import {
  loginAsResponsableCalidad,
  loginAsAdministrador,
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

test.describe("HU-60 · LotesPage", () => {
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

test.describe("HU-22 · RevisionLotesPage", () => {
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