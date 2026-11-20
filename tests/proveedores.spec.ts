import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import {
  loginAsAdministrador,
  loginAsGerente,
  loginAsOperario,
  loginAsResponsableCalidad,
  loginAsResponsableProduccion,
  quitarPermisos,
} from "./fixtures/mockAuth.ts";

/**
 * useProveedores pagina con PAGE_SIZE=3. Cuando hay texto de búsqueda,
 * en vez de mandarlo al backend (que no soporta búsqueda multi-campo),
 * trae hasta 100 registros (SEARCH_FETCH_LIMIT) y filtra/pagina en el
 * cliente sobre razonSocial, cuit, telefono, emailContacto, provincia,
 * localidad. Además ProveedoresPage debounce-ea el input 400ms antes de
 * pasarlo al hook.
 */
const PROVEEDORES_MOCK = {
  data: [
    {
      id: 1,
      razonSocial: "Tambo El Roble",
      cuit: "30-11111111-1",
      tipo: "tambo",
      empresaId: 1,
      capacidad: 5000,
      localidad: "Villa María",
      provincia: "Cordoba",
      estado: "activa",
      telefono: "3534000000",
      emailContacto: "contacto@elroble.com",
    },
    {
      id: 2,
      razonSocial: "Transportes Rápido SA",
      cuit: "30-22222222-2",
      tipo: "transporte",
      empresaId: 1,
      capacidad: 12,
      localidad: "Rosario",
      provincia: "Santa Fe",
      estado: "trial",
      telefono: "3414000000",
      emailContacto: "info@rapido.com",
    },
  ],
  meta: { page: 1, limit: 3, total: 2, totalPages: 1 },
};

const EMPRESAS_MOCK = {
  data: [{ id: 1, name: "Tambo San José", cuit: "30-12345678-9", plan: "pro", isActive: true }],
  meta: { page: 1, limit: 5, total: 1, totalPages: 1 },
};

// HU-64: GET /proveedores/:id trae el bloque `estabilidad` (el listado no).
// Solo se pide para Tambo; el backend manda null explícito en los opcionales.
const ESTABILIDAD_OK = {
  status: "ok",
  mensaje: null,
  clasificacion: "estable",
  score: 0.042,
  detalle: [],
  cantidadLotes: 8,
  minimoLotes: null,
  calculadoEn: "2026-09-20T12:00:00.000Z",
};

async function mockProveedorDetalle(
  page: Page,
  responder: (id: number) => { status: number; body?: unknown },
) {
  await page.route("**/proveedores/*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr")) return route.continue();
    const id = Number(new URL(route.request().url()).pathname.split("/").pop());
    const { status, body } = responder(id);
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body ?? {}) });
  });
}

async function mockProveedoresAndEmpresas(page: Page) {
  await page.route("**/proveedores*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr")) return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PROVEEDORES_MOCK),
    });
  });
  await mockProveedorDetalle(page, (id) => ({
    status: 200,
    body: { ...PROVEEDORES_MOCK.data.find((p) => p.id === id), estabilidad: ESTABILIDAD_OK },
  }));
  await page.route("**/empresa*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr")) return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(EMPRESAS_MOCK),
    });
  });
  await page.route("**/notificacion*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr")) return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
    });
  });
}

test.describe("ProveedoresPage", () => {
  test("muestra la lista de proveedores con su tipo y estado", async ({ page }) => {
    await mockProveedoresAndEmpresas(page);
    await loginAsAdministrador(page);

    await page.goto("/proveedores");

    await expect(page.getByRole("table").getByText("Tambo El Roble")).toBeVisible();
    await expect(page.getByRole("table").getByText("Transportes Rápido SA")).toBeVisible();
  });

  test("filtrar por tab Tambo manda tipo=tambo al backend", async ({ page }) => {
    await mockProveedoresAndEmpresas(page);
    await loginAsAdministrador(page);
    await page.goto("/proveedores");

    const requestPromise = page.waitForRequest(
      (req) => req.url().includes("/proveedores") && req.method() === "GET" && req.url().includes("tipo=tambo"),
    );
    await page.getByRole("button", { name: "Tambo", exact: true }).click();
    await requestPromise; // si no matchea, el waitForRequest hace timeout y falla el test
  });

  test("buscar por texto filtra en cliente después del debounce", async ({ page }) => {
    await mockProveedoresAndEmpresas(page);
    await loginAsAdministrador(page);
    await page.goto("/proveedores");

    await expect(page.getByRole("table").getByText("Transportes Rápido SA")).toBeVisible();

    // El input dispara el fetch (limit=100) recién 400ms después de dejar
    // de tipear, así que esperamos ese request antes de assertar el filtro.
    const requestPromise = page.waitForRequest(
      (req) => req.url().includes("/proveedores") && req.method() === "GET" && req.url().includes("limit=100"),
    );
    await page.getByPlaceholder(/Buscar por nombre, CUIT, teléfono/i).fill("Roble");
    await requestPromise;

    await expect(page.getByRole("table").getByText("Tambo El Roble")).toBeVisible();
    await expect(page.getByRole("table").getByText("Transportes Rápido SA")).not.toBeVisible();
  });

  test("estado vacío cuando no hay proveedores", async ({ page }) => {
    await page.route("**/proveedores*", async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr")) return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], meta: { page: 1, limit: 3, total: 0, totalPages: 1 } }),
      });
    });
    await page.route("**/empresa*", async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr")) return route.continue();
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPRESAS_MOCK) });
    });
    await page.route("**/notificacion*", async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr")) return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
      });
    });

    await loginAsAdministrador(page);
    await page.goto("/proveedores");

    await expect(page.getByText("No se encontraron proveedores")).toBeVisible();
  });

  test.describe("columna Estabilidad (HU-64)", () => {
    test("Tambo con status ok muestra clasificación y % de desvío; Transporte 'No aplica' sin pedir detalle", async ({ page }) => {
      await mockProveedoresAndEmpresas(page);
      const idsPedidos: string[] = [];
      page.on("request", (req) => {
        const m = new URL(req.url()).pathname.match(/\/proveedores\/(\d+)$/);
        if (m && req.method() === "GET") idsPedidos.push(m[1]);
      });
      await loginAsAdministrador(page);
      await page.goto("/proveedores");

      const filaTambo = page.getByRole("row", { name: /Tambo El Roble/ });
      await expect(filaTambo.getByText("Estable")).toBeVisible();
      await expect(filaTambo.getByText("4.2%")).toBeVisible();

      const filaTransporte = page.getByRole("row", { name: /Transportes Rápido SA/ });
      await expect(filaTransporte.getByText("No aplica")).toBeVisible();
      expect(idsPedidos).toEqual(["1"]);
    });

    test("insufficient_data muestra 'Sin datos suficientes' y cuántos lotes faltan (default 5 si minimoLotes es null)", async ({ page }) => {
      await mockProveedoresAndEmpresas(page);
      await mockProveedorDetalle(page, () => ({
        status: 200,
        body: {
          ...PROVEEDORES_MOCK.data[0],
          estabilidad: { status: "insufficient_data", mensaje: "Sin datos suficientes", cantidadLotes: 2, minimoLotes: null },
        },
      }));
      await loginAsAdministrador(page);
      await page.goto("/proveedores");

      const filaTambo = page.getByRole("row", { name: /Tambo El Roble/ });
      await expect(filaTambo.getByText("Sin datos suficientes")).toBeVisible();
      await expect(filaTambo.getByText("faltan 3 lotes")).toBeVisible();
    });

    test("si falla GET /proveedores/:id la fila muestra 'No disponible' y la tabla sigue", async ({ page }) => {
      await mockProveedoresAndEmpresas(page);
      await mockProveedorDetalle(page, () => ({ status: 500 }));
      await loginAsAdministrador(page);
      await page.goto("/proveedores");

      const filaTambo = page.getByRole("row", { name: /Tambo El Roble/ });
      await expect(filaTambo.getByText("No disponible")).toBeVisible();
      await expect(page.getByRole("table").getByText("Transportes Rápido SA")).toBeVisible();
    });
  });

  test("editar un proveedor y guardar llama a proveedoresService.update", async ({ page }) => {
    await mockProveedoresAndEmpresas(page);
    await loginAsAdministrador(page);

    let updatePayload: Record<string, unknown> | undefined;
    await page.route("**/proveedores/1", async (route) => {
      if (route.request().method() !== "PATCH") return route.continue();
      updatePayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...PROVEEDORES_MOCK.data[0], ...updatePayload }),
      });
    });

    await page.goto("/proveedores");

    await page.getByRole("button", { name: "Editar Tambo El Roble" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Editar proveedor" })).toBeVisible();

    // Los campos ya vienen precargados y válidos (ver "editar un proveedor
    // carga sus datos actuales"): alcanza con tocar uno y guardar.
    await dialog.getByLabel("Teléfono").fill("3534009999");
    await dialog.getByRole("button", { name: "Guardar cambios" }).click();

    // El modal se cierra recién cuando onSubmit (update + refetch) resolvió
    // — sin este wait, proveedoresService.update() queda sin cubrir más
    // allá del arranque de la función (ver mismo patrón en usuarios.spec.ts).
    await expect(dialog).not.toBeVisible();

    expect(updatePayload).toMatchObject({ telefono: "3534009999", razonSocial: "Tambo El Roble" });
  });

  test("editar y vaciar teléfono y email los manda como null en el PATCH", async ({ page }) => {
    await mockProveedoresAndEmpresas(page);
    await loginAsAdministrador(page);

    let updatePayload: Record<string, unknown> | undefined;
    await page.route("**/proveedores/1", async (route) => {
      if (route.request().method() !== "PATCH") return route.continue();
      updatePayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...PROVEEDORES_MOCK.data[0], ...updatePayload }),
      });
    });

    await page.goto("/proveedores");

    await page.getByRole("button", { name: "Editar Tambo El Roble" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Teléfono")).toHaveValue("3534000000");
    await expect(dialog.getByLabel("Email de contacto")).toHaveValue("contacto@elroble.com");

    await dialog.getByLabel("Teléfono").fill("");
    await dialog.getByLabel("Email de contacto").fill("");
    await dialog.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(dialog).not.toBeVisible();

    expect(updatePayload).toMatchObject({ telefono: null, emailContacto: null });
  });
  test.describe("ProveedorFormModal", () => {
  test.beforeEach(async ({ page }) => {
    await mockProveedoresAndEmpresas(page);
    await loginAsAdministrador(page);
    await page.goto("/proveedores");
  });

  test("abre el modal para crear un proveedor", async ({ page }) => {
    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await expect(
      dialog.getByRole("heading", { name: "Nuevo proveedor" }),
    ).toBeVisible();

    await expect(dialog.getByLabel("Razón social *")).toBeVisible();
    await expect(dialog.getByLabel("CUIT *")).toBeVisible();
    await expect(dialog.getByLabel("Empresa asignada *")).toBeVisible();

    await expect(
      dialog.getByRole("button", { name: "Crear proveedor" }),
    ).toBeVisible();
  });

  test("valida los campos obligatorios", async ({ page }) => {
    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await dialog
      .getByRole("button", { name: "Crear proveedor" })
      .click();

    await expect(
      dialog.getByText("La razón social es obligatoria"),
    ).toBeVisible();

    await expect(
      dialog.getByText("El CUIT es obligatorio"),
    ).toBeVisible();

    await expect(
      dialog.getByText("La empresa es obligatoria"),
    ).toBeVisible();
  });

  test("valida el formato del CUIT", async ({ page }) => {
    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("Razón social *").fill("Proveedor Test");
    await dialog.getByLabel("CUIT *").fill("30123");
    await dialog.getByLabel("Empresa asignada *").selectOption("1");

    await dialog
      .getByRole("button", { name: "Crear proveedor" })
      .click();

    await expect(
      dialog.getByText("El CUIT debe tener el formato XX-XXXXXXXX-X"),
    ).toBeVisible();
  });

  test("formatea el CUIT mientras se escribe", async ({ page }) => {
    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const cuit = page.getByRole("dialog").getByLabel("CUIT *");

    await cuit.fill("30123456789");

    await expect(cuit).toHaveValue("30-12345678-9");
  });

  test("Tambo muestra volumen de entrega como capacidad", async ({
    page,
  }) => {
    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await expect(
      dialog.getByLabel("Volumen de entrega (L/día)"),
    ).toBeVisible();
  });

  test("Transporte muestra viajes por semana como capacidad", async ({
    page,
  }) => {
    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await dialog
      .getByRole("button", { name: "Transporte", exact: true })
      .click();

    await expect(
      dialog.getByLabel("Viajes por semana"),
    ).toBeVisible();

    await expect(
      dialog.getByLabel("Volumen de entrega (L/día)"),
    ).not.toBeVisible();
  });

  test("Insumos no muestra el campo capacidad", async ({ page }) => {
    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await dialog
      .getByRole("button", { name: "Insumos", exact: true })
      .click();

    await expect(
      dialog.getByText("CAPACIDAD", { exact: true }),
    ).not.toBeVisible();
  });

  test("Laboratorio no muestra el campo capacidad", async ({ page }) => {
    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await dialog
      .getByRole("button", { name: "Laboratorio", exact: true })
      .click();

    await expect(
      dialog.getByText("CAPACIDAD", { exact: true }),
    ).not.toBeVisible();
  });

  test("crea un proveedor enviando los datos correctos", async ({
    page,
  }) => {
    let requestBody: Record<string, unknown> | undefined;

    await page.route("**/proveedores", async (route) => {
      if (route.request().method() !== "POST") {
        return route.continue();
      }

      requestBody = route.request().postDataJSON();

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: 3,
          ...requestBody,
        }),
      });
    });

    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await dialog
      .getByLabel("Razón social *")
      .fill("  Tambo Nuevo  ");

    await dialog.getByLabel("CUIT *").fill("30333333333");

    await dialog
      .getByLabel("Teléfono")
      .fill("  3534111111  ");

    await dialog
      .getByLabel("Email de contacto")
      .fill("  contacto@nuevo.com  ");

    await dialog
      .getByLabel("Empresa asignada *")
      .selectOption("1");

    await dialog
      .getByLabel("Provincia")
      .selectOption({ label: "Cordoba" });

    await dialog
      .getByLabel("Volumen de entrega (L/día)")
      .fill("6000");

    await dialog
      .getByRole("button", { name: "Trial", exact: true })
      .click();

    await dialog
      .getByRole("button", { name: "Crear proveedor" })
      .click();

    await expect.poll(() => requestBody).toEqual({
      tipo: "tambo",
      razonSocial: "Tambo Nuevo",
      cuit: "30-33333333-3",
      empresaId: 1,
      estado: "trial",
      telefono: "3534111111",
      emailContacto: "contacto@nuevo.com",
      provincia: "Cordoba",
      capacidad: 6000,
    });

    // expect.poll ya resuelve apenas requestBody se asigna (antes de que
    // route.fulfill() termine) — esperar el cierre del modal fuerza a que
    // proveedoresService.create() corra hasta el final (return data).
    await expect(dialog).not.toBeVisible();
  });

  test("no envía campos opcionales vacíos", async ({ page }) => {
    let requestBody: Record<string, unknown> | undefined;

    await page.route("**/proveedores", async (route) => {
      if (route.request().method() !== "POST") {
        return route.continue();
      }

      requestBody = route.request().postDataJSON();

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: 3,
          ...requestBody,
        }),
      });
    });

    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("Razón social *").fill("Proveedor Mínimo");
    await dialog.getByLabel("CUIT *").fill("30333333333");

    await dialog
      .getByLabel("Empresa asignada *")
      .selectOption("1");

    await dialog
      .getByRole("button", { name: "Insumos", exact: true })
      .click();

    await dialog
      .getByRole("button", { name: "Crear proveedor" })
      .click();

    await expect.poll(() => requestBody).toEqual({
      tipo: "insumos",
      razonSocial: "Proveedor Mínimo",
      cuit: "30-33333333-3",
      empresaId: 1,
      estado: "activa",
    });
  });

  test("un error 409 de CUIT se muestra en el campo CUIT", async ({
    page,
  }) => {
    await page.route("**/proveedores", async (route) => {
      if (route.request().method() !== "POST") {
        return route.continue();
      }

      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          field: "cuit",
          message: "Ya existe un proveedor con ese CUIT",
        }),
      });
    });

    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("Razón social *").fill("Proveedor Test");
    await dialog.getByLabel("CUIT *").fill("30111111111");

    await dialog
      .getByLabel("Empresa asignada *")
      .selectOption("1");

    await dialog
      .getByRole("button", { name: "Crear proveedor" })
      .click();

    await expect(
      dialog.getByText("Ya existe un proveedor con ese CUIT"),
    ).toBeVisible();
  });

  test("un error 409 de razón social se muestra en el campo", async ({
    page,
  }) => {
    await page.route("**/proveedores", async (route) => {
      if (route.request().method() !== "POST") {
        return route.continue();
      }

      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          field: "razonSocial",
          message: "Ya existe un proveedor con esa razón social",
        }),
      });
    });

    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("Razón social *").fill("Tambo El Roble");
    await dialog.getByLabel("CUIT *").fill("30333333333");

    await dialog
      .getByLabel("Empresa asignada *")
      .selectOption("1");

    await dialog
      .getByRole("button", { name: "Crear proveedor" })
      .click();

    await expect(
      dialog.getByText(
        "Ya existe un proveedor con esa razón social",
      ),
    ).toBeVisible();
  });

  test("muestra error genérico ante un error inesperado", async ({
    page,
  }) => {
    await page.route("**/proveedores", async (route) => {
      if (route.request().method() !== "POST") {
        return route.continue();
      }

      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Internal Server Error",
        }),
      });
    });

    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("Razón social *").fill("Proveedor Test");
    await dialog.getByLabel("CUIT *").fill("30333333333");

    await dialog
      .getByLabel("Empresa asignada *")
      .selectOption("1");

    await dialog
      .getByRole("button", { name: "Crear proveedor" })
      .click();

    await expect(
      dialog.getByText(
        "No se pudo guardar el proveedor. Intentá nuevamente.",
      ),
    ).toBeVisible();
  });

  // HU-73 / D-06: la regla en sí se cubre en telefono.spec.ts; acá solo que
  // el formulario la usa para bloquear o dejar pasar el envío.
  test("un teléfono inválido muestra el error y no envía la request", async ({
    page,
  }) => {
    let postCount = 0;

    await page.route("**/proveedores", async (route) => {
      if (route.request().method() !== "POST") {
        return route.continue();
      }

      postCount++;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: 3 }),
      });
    });

    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("Razón social *").fill("Proveedor Test");
    await dialog.getByLabel("CUIT *").fill("30333333333");
    await dialog.getByLabel("Teléfono").fill("353-abc-1234");
    await dialog
      .getByLabel("Empresa asignada *")
      .selectOption("1");

    await dialog
      .getByRole("button", { name: "Crear proveedor" })
      .click();

    await expect(
      dialog.getByText(
        "El teléfono solo puede tener números, espacios, guiones y un + al inicio",
      ),
    ).toBeVisible();
    await expect(dialog).toBeVisible();
    expect(postCount).toBe(0);
  });

  test("un teléfono válido se envía sin transformar", async ({ page }) => {
    let requestBody: Record<string, unknown> | undefined;

    await page.route("**/proveedores", async (route) => {
      if (route.request().method() !== "POST") {
        return route.continue();
      }

      requestBody = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: 3, ...requestBody }),
      });
    });

    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("Razón social *").fill("Proveedor Test");
    await dialog.getByLabel("CUIT *").fill("30333333333");
    await dialog.getByLabel("Teléfono").fill("+54 353 412-3456");
    await dialog
      .getByLabel("Empresa asignada *")
      .selectOption("1");

    await dialog
      .getByRole("button", { name: "Crear proveedor" })
      .click();

    await expect
      .poll(() => requestBody)
      .toMatchObject({ telefono: "+54 353 412-3456" });
    await expect(dialog).not.toBeVisible();
  });

  test("Cancelar cierra el modal", async ({ page }) => {
    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await dialog
      .getByRole("button", { name: "Cancelar" })
      .click();

    await expect(dialog).not.toBeVisible();
  });

  test("Escape cierra el modal", async ({ page }) => {
    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(dialog).not.toBeVisible();
  });

  test("editar un proveedor carga sus datos actuales", async ({ page }) => {
    await page
      .getByRole("button", { name: "Editar Tambo El Roble" })
      .click();

    const dialog = page.getByRole("dialog");

    await expect(
      dialog.getByRole("heading", { name: "Editar proveedor" }),
    ).toBeVisible();

    await expect(
      dialog.getByLabel("Razón social *"),
    ).toHaveValue("Tambo El Roble");

    await expect(dialog.getByLabel("CUIT *")).toHaveValue(
      "30-11111111-1",
    );

    await expect(dialog.getByLabel("Teléfono")).toHaveValue(
      "3534000000",
    );

    await expect(
      dialog.getByLabel("Email de contacto"),
    ).toHaveValue("contacto@elroble.com");

    await expect(
      dialog.getByLabel("Empresa asignada *"),
    ).toHaveValue("1");

    await expect(
      dialog.getByLabel("Volumen de entrega (L/día)"),
    ).toHaveValue("5000");
  });

  test("editar un transporte carga viajes por semana", async ({ page }) => {
    await page
      .getByRole("button", {
        name: "Editar Transportes Rápido SA",
      })
      .click();

    const dialog = page.getByRole("dialog");

    await expect(
      dialog.getByLabel("Viajes por semana"),
    ).toHaveValue("12");

    await expect(
      dialog.getByRole("button", {
        name: "Trial",
        exact: true,
      }),
    ).toBeVisible();
  });
});
});
// ---------------------------------------------------------------------------
// HU-64 — Orden por estabilidad y clasificaciones desconocidas
// ---------------------------------------------------------------------------

test.describe("ProveedoresPage (HU-64) › Orden por estabilidad", () => {
  const tambo = (id: number, razonSocial: string) => ({
    ...PROVEEDORES_MOCK.data[0],
    id,
    razonSocial,
    cuit: `30-0000000${id}-1`,
  });
  const LISTA = [
    tambo(11, "Tambo Moderado"),
    PROVEEDORES_MOCK.data[1], // transporte: no aplica
    tambo(12, "Tambo Estable Seis"),
    tambo(13, "Tambo Sin Datos"),
    tambo(14, "Tambo Inestable"),
    tambo(15, "Tambo Estable Dos"),
    tambo(16, "Tambo Clasificación Nueva"),
  ];
  const ok = (clasificacion: string, score: number) => ({ ...ESTABILIDAD_OK, clasificacion, score });
  const ESTABILIDAD_POR_ID: Record<number, unknown> = {
    11: ok("moderada", 0.1),
    12: ok("estable", 0.06),
    13: { status: "insufficient_data", mensaje: "Sin datos suficientes", cantidadLotes: 4, minimoLotes: 5 },
    14: ok("inestable", 0.3),
    15: ok("estable", 0.02),
    // Una clasificación que el front no conoce se trata como sin datos.
    16: ok("excelente", 0.01),
  };

  test.beforeEach(async ({ page }) => {
    await mockProveedoresAndEmpresas(page);
    await page.route("**/proveedores*", async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr")) return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: LISTA, meta: { page: 1, limit: 3, total: LISTA.length, totalPages: 1 } }),
      });
    });
    await mockProveedorDetalle(page, (id) => ({
      status: 200,
      body: { ...LISTA.find((p) => p.id === id), estabilidad: ESTABILIDAD_POR_ID[id] },
    }));
    await loginAsAdministrador(page);
    await page.goto("/proveedores");
    await expect(page.getByRole("row", { name: /Tambo Inestable/ }).getByText("Inestable", { exact: true })).toBeVisible();
  });

  test("ordena de más a menos confiable, después al revés, y vuelve al orden original", async ({ page }) => {
    const ordenar = page.getByRole("button", { name: "ESTABILIDAD" });
    const fila = (n: number) => page.getByRole("table").locator("tbody tr").nth(n);

    await ordenar.click();
    // Clasificadas por rango y desvío; sin datos y no aplica siempre al final.
    await expect(fila(0)).toContainText("Tambo Estable Dos");
    await expect(fila(1)).toContainText("Tambo Estable Seis");
    await expect(fila(2)).toContainText("Tambo Moderado");
    await expect(fila(3)).toContainText("Tambo Inestable");
    await expect(fila(6)).toContainText("Transportes Rápido SA");

    await ordenar.click();
    await expect(fila(0)).toContainText("Tambo Inestable");
    await expect(fila(1)).toContainText("Tambo Moderado");
    await expect(fila(3)).toContainText("Tambo Estable Dos");
    await expect(fila(6)).toContainText("Transportes Rápido SA");

    await ordenar.click();
    await expect(fila(0)).toContainText("Tambo Moderado");
    await expect(fila(1)).toContainText("Transportes Rápido SA");
    await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(LISTA.length);
  });

  test("una clasificación desconocida se muestra como sin datos, sin desvío", async ({ page }) => {
    const nueva = page.getByRole("row", { name: /Tambo Clasificación Nueva/ });
    await expect(nueva.getByText("Sin datos suficientes")).toBeVisible();
    await expect(nueva).not.toContainText("%");
    await expect(page.getByRole("row", { name: /Tambo Sin Datos/ }).getByText("faltan 1 lote")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// HU-73 · Proveedores: teléfono, opcionales en null y unicidad por empresa (Sprint 6)
// ---------------------------------------------------------------------------

test.describe("HU-73 · Proveedores: teléfono, opcionales y unicidad por empresa", () => {
  async function capturarPatch(page: Page, respuesta?: { status: number; body: unknown }) {
    const capturado: { payload?: Record<string, unknown> } = {};
    await page.route("**/proveedores/1", async (route) => {
      if (route.request().method() !== "PATCH") return route.fallback();
      capturado.payload = route.request().postDataJSON();
      await route.fulfill({
        status: respuesta?.status ?? 200,
        contentType: "application/json",
        body: JSON.stringify(respuesta?.body ?? { ...PROVEEDORES_MOCK.data[0], ...capturado.payload }),
      });
    });
    return capturado;
  }

  async function abrirAlta(page: Page) {
    await page.getByRole("button", { name: /nuevo proveedor/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Razón social *").fill("Proveedor Test");
    await dialog.getByLabel("CUIT *").fill("30111111111");
    await dialog.getByLabel("Empresa asignada *").selectOption("1");
    return dialog;
  }

  // --- Unitarios: service ---------------------------------------------------

  test("HU-73 · un 409 sin campo conocido se muestra como error general con el mensaje del back", async ({ page }) => {
    await mockProveedoresAndEmpresas(page);
    await loginAsAdministrador(page);
    await page.route("**/proveedores", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ message: "El proveedor está siendo editado por otro usuario." }),
      });
    });
    await page.goto("/proveedores");
    const dialog = await abrirAlta(page);
    await dialog.getByRole("button", { name: "Crear proveedor" }).click();

    await expect(dialog.getByText("El proveedor está siendo editado por otro usuario.")).toBeVisible();
    await expect(dialog).toBeVisible();
  });

  test("HU-73 · un 409 de CUIT en la edición también se muestra en el campo", async ({ page }) => {
    await mockProveedoresAndEmpresas(page);
    await loginAsAdministrador(page);
    await capturarPatch(page, { status: 409, body: { field: "cuit", message: "Ya existe un proveedor con ese CUIT en la empresa" } });
    await page.goto("/proveedores");
    await page.getByRole("button", { name: "Editar Tambo El Roble" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("CUIT *").fill("30222222222");
    await dialog.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(dialog.getByText("Ya existe un proveedor con ese CUIT en la empresa")).toBeVisible();
  });

  // --- Componente (validaciones e interacción) ------------------------------

  test("HU-73 · corregir el CUIT después de un 409 limpia el error del campo", async ({ page }) => {
    await mockProveedoresAndEmpresas(page);
    await loginAsAdministrador(page);
    await page.route("**/proveedores", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ field: "cuit", message: "Ya existe un proveedor con ese CUIT" }),
      });
    });
    await page.goto("/proveedores");
    const dialog = await abrirAlta(page);
    await dialog.getByRole("button", { name: "Crear proveedor" }).click();
    await expect(dialog.getByText("Ya existe un proveedor con ese CUIT")).toBeVisible();

    await dialog.getByLabel("CUIT *").fill("30999999999");

    await expect(dialog.getByText("Ya existe un proveedor con ese CUIT")).toHaveCount(0);
  });

  test("HU-73 · cambiar de empresa limpia los errores de unicidad (es por empresa)", async ({ page }) => {
    await mockProveedoresAndEmpresas(page);
    await page.route("**/empresa*", async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr")) return route.fallback();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            EMPRESAS_MOCK.data[0],
            { id: 2, name: "Lácteos del Sur", cuit: "30-98765432-1", plan: "pro", isActive: true },
          ],
          meta: { page: 1, limit: 5, total: 2, totalPages: 1 },
        }),
      });
    });
    await loginAsAdministrador(page);
    await page.route("**/proveedores", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ field: "razonSocial", message: "Ya existe un proveedor con esa razón social" }),
      });
    });
    await page.goto("/proveedores");
    const dialog = await abrirAlta(page);
    await dialog.getByRole("button", { name: "Crear proveedor" }).click();
    await expect(dialog.getByText("Ya existe un proveedor con esa razón social")).toBeVisible();

    await dialog.getByLabel("Empresa asignada *").selectOption("2");

    await expect(dialog.getByText("Ya existe un proveedor con esa razón social")).toHaveCount(0);
  });

  test("HU-73 · editar y vaciar provincia, localidad y capacidad los manda como null", async ({ page }) => {
    await mockProveedoresAndEmpresas(page);
    await loginAsAdministrador(page);
    const capturado = await capturarPatch(page);
    await page.goto("/proveedores");
    await page.getByRole("button", { name: "Editar Tambo El Roble" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Provincia")).toHaveValue("Cordoba");

    await dialog.getByLabel("Provincia").selectOption("");
    await dialog.getByLabel("Volumen de entrega (L/día)").fill("");
    await dialog.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(dialog).not.toBeVisible();
    expect(capturado.payload).toMatchObject({ provincia: null, localidad: null, capacidad: null });
  });

  test("HU-73 · un teléfono inválido en la edición no manda el PATCH y al corregirlo sí", async ({ page }) => {
    await mockProveedoresAndEmpresas(page);
    await loginAsAdministrador(page);
    const capturado = await capturarPatch(page);
    await page.goto("/proveedores");
    await page.getByRole("button", { name: "Editar Tambo El Roble" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Teléfono")).toHaveValue("3534000000");

    await dialog.getByLabel("Teléfono").fill("353-abc");
    await dialog.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(
      dialog.getByText("El teléfono solo puede tener números, espacios, guiones y un + al inicio"),
    ).toBeVisible();
    expect(capturado.payload).toBeUndefined();

    await dialog.getByLabel("Teléfono").fill("+54 353 412-3456");
    await dialog.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(dialog).not.toBeVisible();
    expect(capturado.payload).toMatchObject({ telefono: "+54 353 412-3456" });
  });

  // --- Permisos por rol (matriz por defecto de mockAuth.ts) -----------------
  // POST /proveedores pide recepcion:crear y PATCH recepcion:editar.

  const ROLES_HU73: [string, (page: Page) => Promise<void>, boolean, boolean][] = [
    ["Gerente", loginAsGerente, true, true],
    ["Responsable de calidad", loginAsResponsableCalidad, true, false],
    ["Responsable de producción", loginAsResponsableProduccion, false, false],
    ["Operario de línea", loginAsOperario, false, false],
    ["Administrador", loginAsAdministrador, true, true],
  ];
  for (const [rol, login, crea, edita] of ROLES_HU73) {
    test(`HU-73 · ${rol}: ${crea ? "crea" : "no crea"} y ${edita ? "edita" : "no edita"} proveedores`, async ({ page }) => {
      await mockProveedoresAndEmpresas(page);
      await login(page);
      await page.goto("/proveedores");

      await expect(page.getByRole("table").getByText("Tambo El Roble")).toBeVisible();
      await expect(page.getByRole("button", { name: /nuevo proveedor/i })).toHaveCount(crea ? 1 : 0);
      await expect(page.getByRole("button", { name: "Editar Tambo El Roble" })).toHaveCount(edita ? 1 : 0);
    });
  }

  // --- Matriz dinámica (quitarPermisos, HU-72) ------------------------------

  test("HU-73 · un Gerente sin recepcion no entra a /proveedores", async ({ page }) => {
    await mockProveedoresAndEmpresas(page);
    await loginAsGerente(page);
    await quitarPermisos(page, "Gerente", ["recepcion"]);
    await page.goto("/proveedores");

    await expect(page.getByText("Acceso no autorizado")).toBeVisible();
    await expect(page.getByRole("button", { name: /nuevo proveedor/i })).toHaveCount(0);
  });

  // --- E2E: flujo principal -------------------------------------------------

  test("HU-73 · flujo principal: alta con 409 de razón social, corrección, y edición vaciando el teléfono", async ({ page }) => {
    await mockProveedoresAndEmpresas(page);
    await loginAsAdministrador(page);
    let intentos = 0;
    let altaPayload: Record<string, unknown> | undefined;
    await page.route("**/proveedores", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      intentos++;
      altaPayload = route.request().postDataJSON();
      if (intentos === 1) {
        return route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ field: "razonSocial", message: "Ya existe un proveedor con esa razón social" }),
        });
      }
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ ...PROVEEDORES_MOCK.data[0], id: 9, ...altaPayload }),
      });
    });
    const capturado = await capturarPatch(page);
    await page.goto("/proveedores");

    const dialog = await abrirAlta(page);
    await dialog.getByLabel("Teléfono").fill("+54 353 412-3456");
    await dialog.getByRole("button", { name: "Crear proveedor" }).click();
    await expect(dialog.getByText("Ya existe un proveedor con esa razón social")).toBeVisible();

    await dialog.getByLabel("Razón social *").fill("Proveedor Test 2");
    await expect(dialog.getByText("Ya existe un proveedor con esa razón social")).toHaveCount(0);
    await dialog.getByRole("button", { name: "Crear proveedor" }).click();
    await expect(dialog).not.toBeVisible();
    expect(altaPayload).toMatchObject({ razonSocial: "Proveedor Test 2", telefono: "+54 353 412-3456" });
    expect(altaPayload).not.toHaveProperty("emailContacto");

    await page.getByRole("button", { name: "Editar Tambo El Roble" }).click();
    // El modal carga los valores en un efecto: esperar antes de vaciar.
    await expect(dialog.getByLabel("Teléfono")).toHaveValue("3534000000");
    await dialog.getByLabel("Teléfono").fill("");
    await dialog.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(dialog).not.toBeVisible();
    expect(capturado.payload).toMatchObject({ telefono: null });
  });
});
