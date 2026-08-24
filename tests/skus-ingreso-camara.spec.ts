import { expect, test } from "./fixtures/coverageFixtures.js";
import type { Page } from "@playwright/test";
import { loginAsGerente, loginAsResponsableProduccion } from "./fixtures/mockAuth.js";

// ---------------------------------------------------------------------------
// Datos de prueba
// ---------------------------------------------------------------------------

const SKUS_MOCK = [
  { id: 1, empresaId: 10, nombre: "Manteca x 200g", unidadMedida: "unidades", activo: true, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: 2, empresaId: 10, nombre: "Queso Cremoso", unidadMedida: "kg", activo: true, createdAt: "2026-08-01T00:00:00.000Z" },
];

const INGRESOS_MOCK = {
  data: [
    {
      id: 1,
      empresaId: 10,
      skuId: 1,
      skuNombre: "Manteca x 200g",
      cantidad: 50,
      loteId: 5,
      loteCodigo: "LOT-2026-005",
      fechaIngreso: "2026-08-10T00:00:00.000Z",
      createdAt: "2026-08-10T10:00:00.000Z",
    },
  ],
  total: 1,
  page: 1,
  limit: 100,
};

async function baseMocks(page: Page) {
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

  await page.route("**/empresa/me", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: 10, name: "Lácteos del Sur S.A.", rut: "30-12345678-9", planId: 1, isActive: true }),
    });
  });
}

// ---------------------------------------------------------------------------
// SkusConfigTab (HU-67, alta de SKU)
// ---------------------------------------------------------------------------

async function mockSkusDeps(
  page: Page,
  skusIniciales: unknown[] = SKUS_MOCK,
  onPost?: (dto: Record<string, unknown>) => { status: number; body: unknown },
) {
  await baseMocks(page);
  await page.route("**/skus*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(skusIniciales),
      });
    }
    if (route.request().method() === "POST" && onPost) {
      const dto = route.request().postDataJSON();
      const { status, body } = onPost(dto);
      return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    }
    return route.continue();
  });
}

async function irATabSkus(page: Page) {
  await page.getByRole("button", { name: "Catálogo de SKUs" }).click();
  await expect(page.getByText("Productos terminados disponibles para registrar ingreso a cámara")).toBeVisible();
}

test.describe("SkusConfigTab (HU-67)", () => {
  test("muestra el catálogo de SKUs con nombre y unidad de medida", async ({ page }) => {
    await mockSkusDeps(page);
    await loginAsGerente(page);
    await page.goto("/configuracion");
    await irATabSkus(page);

    const table = page.getByRole("table");
    await expect(table.getByText("Manteca x 200g")).toBeVisible();
    await expect(table.getByText("Unidades")).toBeVisible();
    await expect(table.getByText("Queso Cremoso")).toBeVisible();
    await expect(table.getByText("kg")).toBeVisible();
  });

  test("muestra mensaje cuando todavía no hay SKUs cargados", async ({ page }) => {
    await mockSkusDeps(page, []);
    await loginAsGerente(page);
    await page.goto("/configuracion");
    await irATabSkus(page);

    await expect(
      page.getByText('Todavía no diste de alta ningún SKU. Registrá el primero con el botón "+ Nuevo SKU".'),
    ).toBeVisible();
  });

  test("da de alta un SKU nuevo y aparece de inmediato en la tabla", async ({ page }) => {
    let requestBody: Record<string, unknown> | undefined;
    await mockSkusDeps(page, [], (dto) => {
      requestBody = dto;
      return {
        status: 201,
        body: { id: 3, empresaId: 10, nombre: dto.nombre, unidadMedida: dto.unidadMedida, activo: true, createdAt: "2026-08-11T00:00:00.000Z" },
      };
    });

    await loginAsGerente(page);
    await page.goto("/configuracion");
    await irATabSkus(page);

    await page.getByRole("button", { name: "+ Nuevo SKU" }).click();
    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("Nombre *").fill("Yogur Bebible 1L");
    await dialog.getByLabel("Unidad de medida *").selectOption({ label: "Kilogramos (kg)" });
    await dialog.getByRole("button", { name: "Crear SKU" }).click();

    await expect.poll(() => requestBody).toEqual({ nombre: "Yogur Bebible 1L", unidadMedida: "kg" });
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("table").getByText("Yogur Bebible 1L")).toBeVisible();
  });

  test("el nombre del SKU es obligatorio", async ({ page }) => {
    await mockSkusDeps(page);
    await loginAsGerente(page);
    await page.goto("/configuracion");
    await irATabSkus(page);

    await page.getByRole("button", { name: "+ Nuevo SKU" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Crear SKU" }).click();

    await expect(dialog.getByText("El nombre del SKU es obligatorio")).toBeVisible();
  });

  test("muestra el error del backend cuando el nombre del SKU ya existe", async ({ page }) => {
    await mockSkusDeps(page, SKUS_MOCK, () => ({
      status: 409,
      body: { message: "Ya existe un SKU con ese nombre en tu empresa" },
    }));

    await loginAsGerente(page);
    await page.goto("/configuracion");
    await irATabSkus(page);

    await page.getByRole("button", { name: "+ Nuevo SKU" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nombre *").fill("Manteca x 200g");
    await dialog.getByRole("button", { name: "Crear SKU" }).click();

    await expect(dialog.getByText("Ya existe un SKU con ese nombre en tu empresa")).toBeVisible();
  });

  test("muestra error de carga con opción de reintentar", async ({ page }) => {
    await baseMocks(page);
    let intentos = 0;
    await page.route("**/skus*", async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      intentos += 1;
      if (intentos === 1) {
        return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({}) });
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SKUS_MOCK) });
    });

    await loginAsGerente(page);
    await page.goto("/configuracion");
    await irATabSkus(page);

    await expect(page.getByText("No se pudo cargar el catálogo de SKUs.")).toBeVisible();
    await page.getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByRole("table").getByText("Manteca x 200g")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// IngresoCamaraPage (HU-67, registro de ingreso)
// ---------------------------------------------------------------------------

async function mockIngresoCamaraDeps(
  page: Page,
  skusIniciales: unknown[] = SKUS_MOCK,
  onPost?: (dto: Record<string, unknown>) => { status: number; body: unknown },
) {
  await baseMocks(page);

  await page.route("**/skus*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(skusIniciales),
    });
  });

  await page.route("**/lotes*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [{ id: 5, codigo: "LOT-2026-005" }], total: 1, page: 1, limit: 100 }),
    });
  });

  await page.route("**/ingresos-camara*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(INGRESOS_MOCK),
      });
    }
    if (route.request().method() === "POST" && onPost) {
      const dto = route.request().postDataJSON();
      const { status, body } = onPost(dto);
      return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    }
    return route.continue();
  });
}

test.describe("IngresoCamaraPage (HU-67)", () => {
  test("muestra el historial de ingresos con SKU, cantidad, lote de origen y fecha", async ({ page }) => {
    await mockIngresoCamaraDeps(page);
    await loginAsResponsableProduccion(page);
    await page.goto("/ingreso-camara");

    const table = page.getByRole("table");
    await expect(table.getByText("Manteca x 200g")).toBeVisible();
    await expect(table.getByText("50 unidades")).toBeVisible();
    await expect(table.getByText("LOT-2026-005")).toBeVisible();
  });

  test("registra un nuevo ingreso a cámara con el payload correcto", async ({ page }) => {
    let requestBody: Record<string, unknown> | undefined;
    await mockIngresoCamaraDeps(page, SKUS_MOCK, (dto) => {
      requestBody = dto;
      return {
        status: 201,
        body: {
          id: 2,
          empresaId: 10,
          skuId: dto.skuId,
          skuNombre: "Queso Cremoso",
          cantidad: dto.cantidad,
          loteId: dto.loteId,
          fechaIngreso: dto.fechaIngreso,
          createdAt: "2026-08-11T00:00:00.000Z",
        },
      };
    });

    await loginAsResponsableProduccion(page);
    await page.goto("/ingreso-camara");

    await page.getByRole("button", { name: "+ Nuevo ingreso" }).click();
    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("SKU *").selectOption({ label: "Queso Cremoso" });
    await dialog.getByLabel("Cantidad *").fill("25");
    await dialog.getByLabel("Lote de producción de origen").selectOption({ label: "LOT-2026-005" });
    await dialog.getByLabel("Fecha de ingreso a cámara *").fill("2026-08-11");

    await dialog.getByRole("button", { name: "Registrar ingreso" }).click();

    await expect.poll(() => requestBody).toEqual({
      skuId: 2,
      cantidad: 25,
      loteId: 5,
      fechaIngreso: "2026-08-11T00:00:00.000Z",
    });
    await expect(dialog).not.toBeVisible();
  });

  test("el SKU es obligatorio para registrar un ingreso", async ({ page }) => {
    await mockIngresoCamaraDeps(page);
    await loginAsResponsableProduccion(page);
    await page.goto("/ingreso-camara");

    await page.getByRole("button", { name: "+ Nuevo ingreso" }).click();
    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("Cantidad *").fill("10");
    await dialog.getByLabel("Fecha de ingreso a cámara *").fill("2026-08-11");
    await dialog.getByRole("button", { name: "Registrar ingreso" }).click();

    await expect(dialog.getByText("El SKU es obligatorio")).toBeVisible();
  });

  test("muestra el banner y deshabilita Registrar ingreso cuando la empresa no tiene SKUs", async ({
    page,
  }) => {
    await mockIngresoCamaraDeps(page, []);
    await loginAsResponsableProduccion(page);
    await page.goto("/ingreso-camara");

    await page.getByRole("button", { name: "+ Nuevo ingreso" }).click();
    const dialog = page.getByRole("dialog");

    await expect(
      dialog.getByText(
        "Tu empresa todavía no tiene SKUs cargados. Pedile a un Gerente que dé de alta uno desde Configuración → Catálogo de SKUs.",
      ),
    ).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Registrar ingreso" })).toBeDisabled();
  });

  test("filtra el historial de ingresos por SKU", async ({ page }) => {
    await mockIngresoCamaraDeps(page);

    const requestPromise = page.waitForRequest(
      (req) => req.url().includes("/ingresos-camara") && req.method() === "GET" && req.url().includes("skuId=2"),
    );

    await loginAsResponsableProduccion(page);
    await page.goto("/ingreso-camara");

    await page.getByLabel("SKU").selectOption({ label: "Queso Cremoso" });
    await requestPromise;
  });

  test("un Gerente no tiene acceso a Ingreso a cámara", async ({ page }) => {
    await mockIngresoCamaraDeps(page);
    await loginAsGerente(page);
    await page.goto("/ingreso-camara");

    await expect(page.getByText("Acceso no autorizado")).toBeVisible();
  });
});
