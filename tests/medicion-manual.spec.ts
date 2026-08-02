import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import { loginAsOperario, loginAsResponsableProduccion } from "./fixtures/mockAuth.ts";

const LOTE_1 = {
  id: 1, codigo: "LOT-2026-001", materiaPrima: "leche_cruda",
  estado: "registrado", empresaId: 10,
  createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z",
};

const LOTE_2 = {
  id: 2, codigo: "LOT-2026-002", materiaPrima: "leche_cruda",
  estado: "en_proceso", empresaId: 10,
  createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z",
};

async function mockMedicionManualDeps(page: Page) {
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
      status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
    });
  });

  await page.route("**/sensores*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  // Lotes (glob genérico — registrado ANTES que la ruta de historial para que
  // el historial tenga mayor prioridad por LIFO)
  await page.route("**/lotes*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [LOTE_1], total: 1, page: 1, limit: 20 }),
    });
  });

  // Historial de mediciones (LIFO: mayor prioridad que **/lotes*)
  await page.route(/\/lotes\/\d+\/mediciones-manuales/, async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [], total: 0, limit: 20 }),
    });
  });
}

test.describe("MedicionManualPage", () => {
  test.beforeEach(async ({ page }) => {
    await mockMedicionManualDeps(page);
    await loginAsOperario(page);
    await page.goto("/mediciones-manuales");
  });

  test("muestra el selector con el lote activo disponible", async ({ page }) => {
    const selector = page.locator("select");
    await expect(selector).toBeVisible();
    await expect(selector.locator("option", { hasText: "LOT-2026-001" })).toBeAttached();
  });

  test("muestra estado vacío cuando no hay lotes elegibles", async ({ page }) => {
    await page.route("**/lotes*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ data: [], total: 0, page: 1, limit: 20 }),
      });
    });
    await page.reload();
    await expect(page.getByText("No hay lotes pendientes de medición manual")).toBeVisible();
  });

  test("solo incluye lotes sin sensor asociado en el selector", async ({ page }) => {
    await page.route("**/lotes*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ data: [LOTE_1, LOTE_2], total: 2, page: 1, limit: 20 }),
      });
    });
    await page.route("**/sensores*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify([
          {
            id: 1, nombre: "Sensor pH", tipo: "analogico", parametro: "ph",
            ubicacion: "laboratorio", rangoMinFavor: 6.0, rangoMaxFavor: 7.5,
            estado: "activo", empresaId: 10, loteActualId: 2,
            createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z",
          },
        ]),
      });
    });
    await page.reload();
    const selector = page.locator("select");
    await expect(selector.locator("option")).toHaveCount(1);
    await expect(selector.locator("option", { hasText: "LOT-2026-001" })).toBeAttached();
  });

  test.describe("RegistrarMedicionManualTab", () => {
    test("muestra los campos de parámetros medidos", async ({ page }) => {
      await expect(page.locator("#medicion-manual-ph")).toBeVisible();
      await expect(page.locator("#medicion-manual-temperatura")).toBeVisible();
    });

    test("muestra error al enviar sin completar ningún campo", async ({ page }) => {
      await page.locator('button[type="submit"]').click();
      await expect(page.getByText("Cargá al menos un parámetro.")).toBeVisible();
    });

    test("muestra error cuando un valor no es numérico", async ({ page }) => {
      await page.locator("#medicion-manual-ph").fill("abc");
      await page.locator('button[type="submit"]').click();
      await expect(page.getByText("Debe ser numérico")).toBeVisible();
    });

    test("registra la medición correctamente y muestra el resultado", async ({ page }) => {
      await page.route(/\/lotes\/\d+\/mediciones-manuales/, async (route) => {
        const rt = route.request().resourceType();
        if (rt !== "fetch" && rt !== "xhr") return route.continue();
        if (route.request().method() !== "POST") return route.continue();
        await route.fulfill({
          status: 201, contentType: "application/json",
          body: JSON.stringify({
            id: 1, loteId: 1, userId: 5,
            mediciones: [
              { id: 1, parametro: "ph", valor: 7.0, estado: "NORMAL",
                createdAt: "2026-08-01T10:00:00.000Z" },
            ],
          }),
        });
      });
      await page.locator("#medicion-manual-ph").fill("7");
      await page.locator('button[type="submit"]').click();
      await expect(page.getByText("MEDICIÓN REGISTRADA")).toBeVisible();
      await expect(page.getByText(/pH: 7/)).toBeVisible();
      await expect(page.getByText("Normal")).toBeVisible();
    });

    test("acepta un valor numérico y muestra el resultado como fuera de rango según el backend", async ({ page }) => {
  await page.route(/\/lotes\/\d+\/mediciones-manuales/, async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "POST") return route.continue();
    await route.fulfill({
      status: 201, contentType: "application/json",
      body: JSON.stringify({
        id: 1, loteId: 1, userId: 5,
        mediciones: [
          { id: 1, parametro: "ph", valor: 12.0, estado: "FUERA_DE_RANGO",
            createdAt: "2026-08-01T10:00:00.000Z" },
        ],
      }),
    });
  });
  await page.locator("#medicion-manual-ph").fill("12");
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText("MEDICIÓN REGISTRADA")).toBeVisible();
  await expect(page.getByText("Fuera de rango")).toBeVisible();
});

    test("muestra error del servidor al fallar el registro", async ({ page }) => {
      await page.route(/\/lotes\/\d+\/mediciones-manuales/, async (route) => {
        const rt = route.request().resourceType();
        if (rt !== "fetch" && rt !== "xhr") return route.continue();
        if (route.request().method() !== "POST") return route.continue();
        await route.fulfill({ status: 500, body: "" });
      });
      await page.locator("#medicion-manual-ph").fill("7");
      await page.locator('button[type="submit"]').click();
      await expect(
        page.getByText("No se pudo registrar la medición manual. Intentá nuevamente."),
      ).toBeVisible();
    });
  });

  test.describe("HistorialMedicionesManualesTab", () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole("button", { name: "Historial" }).click();
    });

    test("muestra estado vacío cuando no hay mediciones", async ({ page }) => {
      await expect(
        page.getByText("No hay mediciones manuales para los filtros seleccionados"),
      ).toBeVisible();
    });

    test("muestra las mediciones registradas en la tabla", async ({ page }) => {
      await page.route(/\/lotes\/\d+\/mediciones-manuales/, async (route) => {
        const rt = route.request().resourceType();
        if (rt !== "fetch" && rt !== "xhr") return route.continue();
        if (route.request().method() !== "GET") return route.continue();
        await route.fulfill({
          status: 200, contentType: "application/json",
          body: JSON.stringify({
            data: [
              { id: 1, loteId: 1, parametro: "ph", valor: 7.0, estado: "NORMAL",
                createdAt: "2026-08-01T10:00:00.000Z" },
            ],
            total: 1, limit: 20,
          }),
        });
      });
      await page.goto("/mediciones-manuales");
      await page.getByRole("button", { name: "Historial" }).click();
      await expect(page.getByRole("row").filter({ hasText: "pH" })).toBeVisible();
      await expect(page.getByRole("row").filter({ hasText: "pH" }).getByText("Normal")).toBeVisible();
    });

    test("muestra error cuando la fecha hasta es anterior a la fecha desde", async ({ page }) => {
      await page.locator("input[type='date']").nth(0).fill("2026-07-10"); 
      await page.locator("input[type='date']").nth(1).fill("2026-07-01");
      await page.getByRole("button", { name: "Buscar" }).click();
      await expect(
        page.getByText("La fecha hasta no puede ser anterior a la fecha desde."),
      ).toBeVisible();
    });

    test("muestra error del servidor al cargar el historial", async ({ page }) => {
      await page.route(/\/lotes\/\d+\/mediciones-manuales/, async (route) => {
        const rt = route.request().resourceType();
        if (rt !== "fetch" && rt !== "xhr") return route.continue();
        if (route.request().method() !== "GET") return route.continue();
        await route.fulfill({ status: 500, body: "" });
      });
      await page.goto("/mediciones-manuales");
      await page.getByRole("button", { name: "Historial" }).click();
      await expect(
        page.getByText("No se pudo cargar el historial de mediciones manuales."),
      ).toBeVisible();
    });
  });
});
test("MedicionManualPage - un usuario sin rol de Operario ve acceso no autorizado", async ({ page }) => {
  await mockMedicionManualDeps(page);
  await loginAsResponsableProduccion(page);
  await page.goto("/mediciones-manuales");
  await expect(page.getByText("Acceso no autorizado")).toBeVisible();
});