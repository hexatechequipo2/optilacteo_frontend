import { expect, test } from "./fixtures/coverageFixtures.js";
import type { Locator, Page } from "@playwright/test";
import { loginAsAdministrador, loginAsResponsableCalidad } from "./fixtures/mockAuth.js";

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
      empresaId: 1,
      capacidad: 5000,
      localidad: "Villa María",
      provincia: "Cordoba",
      estado: "activa",
      telefono: "3534000000",
      emailContacto: "contacto@elroble.com",
    },
  ],
  meta: { page: 1, limit: 3, total: 1, totalPages: 1 },
};

const DESVIOS_MOCK = [
  {
    loteId: 1,
    codigo: "LOT-2026-001",
    fechaIngreso: "2026-08-01T12:00:00.000Z",
    cantidadComprometidaKg: 1000,
    cantidadReal: 1046,
    desvioCantidadPorcentaje: 4.6,
    parametros: [
      { parametro: "ph", valorComprometido: 6.5, valorReal: 6.8, desvioPorcentaje: 4.62 },
      { parametro: "grasa", valorComprometido: 3.5, valorReal: 3.3, desvioPorcentaje: -5.71 },
    ],
  },
];

async function mockProveedoresDeps(page: Page) {
  await page.route("**/*", async (route) => {
    const rt = route.request().resourceType();
    if (rt === "xhr" || rt === "fetch") {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    return route.continue();
  });

  await page.route("**/notificacion*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
    });
  });

  await page.route("**/empresa*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, limit: 5, total: 0, totalPages: 1 } }),
    });
  });

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

  // GET /lotes/proveedor/:id/desvios
  await page.route(/\/lotes\/proveedor\/\d+\/desvios/, async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(DESVIOS_MOCK),
    });
  });
}

async function abrirModalDesvios(page: Page, razonSocial: string) {
  await page.getByRole("table").getByLabel(`Historial de desvíos de ${razonSocial}`).click();
}

// ---------------------------------------------------------------------------
// DesviosProveedorModal (HU-66)
// ---------------------------------------------------------------------------

test.describe("DesviosProveedorModal", () => {
  test("muestra el historial de desvíos con cantidad y parámetros comprometido vs. real", async ({
    page,
  }) => {
    await mockProveedoresDeps(page);
    await loginAsAdministrador(page);
    await page.goto("/proveedores");

    await abrirModalDesvios(page, "Tambo El Roble");

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Historial de desvíos" })).toBeVisible();
    await expect(
      dialog.getByText("Tambo El Roble — comprometido según remito vs. recibido"),
    ).toBeVisible();
    await expect(dialog.getByText("LOT-2026-001")).toBeVisible();
    await expect(dialog.getByText("Cantidad: 1000 comprometido — 1046 recibido")).toBeVisible();
    await expect(dialog.getByText("+4.6%")).toBeVisible();
    await expect(dialog.getByText("pH: 6.5 comprometido — 6.8 recibido")).toBeVisible();
    await expect(dialog.getByText("+4.62%")).toBeVisible();
    await expect(dialog.getByText("Materia grasa: 3.5 % comprometido — 3.3 % recibido")).toBeVisible();
    await expect(dialog.getByText("-5.71%")).toBeVisible();
  });

  test("muestra mensaje cuando el proveedor todavía no tiene lotes con remito cargado", async ({
    page,
  }) => {
    await mockProveedoresDeps(page);
    await page.route(/\/lotes\/proveedor\/\d+\/desvios/, async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    });

    await loginAsAdministrador(page);
    await page.goto("/proveedores");

    await abrirModalDesvios(page, "Tambo El Roble");

    await expect(
      page.getByRole("dialog").getByText("Este proveedor todavía no tiene lotes con remito cargado."),
    ).toBeVisible();
  });

  test("muestra error y permite reintentar cuando falla la carga del historial", async ({ page }) => {
    await mockProveedoresDeps(page);
    let intentos = 0;
    await page.route(/\/lotes\/proveedor\/\d+\/desvios/, async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      intentos += 1;
      if (intentos === 1) {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Error interno" }),
        });
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(DESVIOS_MOCK),
      });
    });

    await loginAsAdministrador(page);
    await page.goto("/proveedores");

    await abrirModalDesvios(page, "Tambo El Roble");

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Error interno")).toBeVisible();

    await dialog.getByRole("button", { name: "Reintentar" }).click();
    await expect(dialog.getByText("LOT-2026-001")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// LoteFormModal — sección remito (HU-66)
// ---------------------------------------------------------------------------

const TAMBOS_MOCK = [
  {
    id: 1,
    nombre: "Establecimiento El Roble",
    ubicacion: "San Rafael",
    activo: true,
    empresaId: 10,
    proveedorId: 1,
    createdAt: "2026-08-01T00:00:00.000Z",
  },
];

async function mockLotesDeps(page: Page) {
  await page.route("**/*", async (route) => {
    const rt = route.request().resourceType();
    if (rt === "xhr" || rt === "fetch") {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    return route.continue();
  });

  await page.route("**/notificacion*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
    });
  });

  await page.route("**/config-param*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  await page.route("**/sensores*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

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

  await page.route("**/tambos*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(TAMBOS_MOCK),
    });
  });

  await page.route(/\/lotes\/\d+\/revisiones/, async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  await page.route("**/lotes*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], total: 0, page: 1, limit: 100 }),
    });
  });
}

async function completarDatosBasicosDelLote(dialog: Locator) {
  await dialog.getByLabel("Proveedor *").selectOption({ value: "1" });
  await dialog.getByLabel("Tambo de origen *").selectOption({ value: "1" });
  await dialog.getByLabel("Fecha de ingreso *").fill("2026-08-01");
  await dialog.getByLabel("Cantidad ingresada (L) *").fill("1000");
  await dialog.getByText("Leche cruda").click();
  await dialog.getByLabel("Destino inicial *").selectOption({ value: "produccion" });
}

test.describe("LoteFormModal — datos del remito", () => {
  // HU-69: la sección dejó de ser un acordeón colapsado por defecto — el
  // número de remito ahora es obligatorio (AC1), así que se muestra siempre
  // expandida. Antes de HU-69 esta sección era 100% opcional y arrancaba
  // colapsada.
  test("la sección de datos del remito está siempre visible, sin necesidad de expandirla", async ({
    page,
  }) => {
    await mockLotesDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await page.getByRole("button", { name: /nuevo lote/i }).click();
    const dialog = page.getByRole("dialog");

    await expect(dialog.getByLabel("Número de remito *")).toBeVisible();
    await expect(dialog.getByLabel("Cantidad comprometida según remito")).toBeVisible();
  });

  test("el campo de parámetro comprometido queda deshabilitado hasta cargar el valor real", async ({
    page,
  }) => {
    await mockLotesDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await page.getByRole("button", { name: /nuevo lote/i }).click();
    const dialog = page.getByRole("dialog");

    await expect(dialog.getByLabel("pH comprometido (sin unidad)")).toBeDisabled();

    await dialog.getByLabel("pH (sin unidad)").fill("6.8");
    await expect(dialog.getByLabel("pH comprometido (sin unidad)")).toBeEnabled();
  });

  test("registra un lote con datos de remito completos, incluyendo el desvío comprometido", async ({
    page,
  }) => {
    await mockLotesDeps(page);

    let requestBody: Record<string, unknown> | undefined;
    await page.route("**/lotes*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "POST") return route.continue();
      requestBody = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          lote: { id: 100, codigo: "LOT-2026-100" },
          sensoresDisponibles: [],
        }),
      });
    });

    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await page.getByRole("button", { name: /nuevo lote/i }).click();
    const dialog = page.getByRole("dialog");

    await completarDatosBasicosDelLote(dialog);
    await dialog.getByLabel("pH (sin unidad)").fill("6.8");
    await dialog.getByLabel("Número de remito *").fill("R-000123");
    await dialog.getByLabel("Cantidad comprometida según remito").fill("950");
    await dialog.getByLabel("pH comprometido (sin unidad)").fill("6.5");

    await dialog.getByRole("button", { name: "Registrar lote" }).click();

    await expect.poll(() => requestBody?.cantidadComprometidaKg).toBe(950);
    await expect.poll(() => requestBody?.parametros).toEqual([
      { parametro: "ph", valor: 6.8, valorComprometido: 6.5 },
    ]);
  });

  test("registra un lote sin datos de remito: el payload no incluye las claves opcionales", async ({
    page,
  }) => {
    await mockLotesDeps(page);

    let requestBody: Record<string, unknown> | undefined;
    await page.route("**/lotes*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "POST") return route.continue();
      requestBody = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          lote: { id: 101, codigo: "LOT-2026-101" },
          sensoresDisponibles: [],
        }),
      });
    });

    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await page.getByRole("button", { name: /nuevo lote/i }).click();
    const dialog = page.getByRole("dialog");

    await completarDatosBasicosDelLote(dialog);
    await dialog.getByLabel("pH (sin unidad)").fill("6.8");
    await dialog.getByLabel("Número de remito *").fill("R-000123");

    await dialog.getByRole("button", { name: "Registrar lote" }).click();

    await expect.poll(() => requestBody).not.toBeUndefined();
    expect(requestBody).not.toHaveProperty("cantidadComprometidaKg");
    expect((requestBody?.parametros as unknown[])[0]).not.toHaveProperty("valorComprometido");
  });

  test("valida que la cantidad comprometida sea un número mayor a 0", async ({ page }) => {
    await mockLotesDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await page.getByRole("button", { name: /nuevo lote/i }).click();
    const dialog = page.getByRole("dialog");

    await completarDatosBasicosDelLote(dialog);
    await dialog.getByLabel("pH (sin unidad)").fill("6.8");
    await dialog.getByLabel("Número de remito *").fill("R-000123");
    await dialog.getByLabel("Cantidad comprometida según remito").fill("-5");

    await dialog.getByRole("button", { name: "Registrar lote" }).click();

    await expect(dialog.getByText("Debe ser un número mayor a 0")).toBeVisible();
  });
});
