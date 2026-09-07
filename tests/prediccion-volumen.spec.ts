import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import { loginAsResponsableProduccion, loginAsGerente } from "./fixtures/mockAuth.ts";

// HU-51 · PrediccionVolumenSemanalCard — mock visual dentro de
// DashboardProduccionPage. Mismos mocks que dashboard-produccion.spec.ts:
// esta card no pega a ningún endpoint propio (consigna explícita de la HU).
const DASHBOARD_RESUMEN = {
  lotesProcesados: { valor: 12, valorAnterior: 10, variacion: 2, tendencia: "sube" },
  alertasActivas: { valor: 3, valorAnterior: 5, variacion: -2, tendencia: "baja" },
  parametrosCriticos: { valor: 1, valorAnterior: 1, variacion: 0, tendencia: "igual" },
  lineaCalidad: { recepcion: 15, clasificacion: 13, noAptos: 1, aptos: 12, totalLotesSistema: 15 },
  actualizadoEn: "2026-08-03T08:00:00.000Z",
};

async function mockDashboardProduccionDeps(page: Page) {
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
      body: JSON.stringify({
        id: 10, name: "Lácteos del Sur S.A.", rut: "30-12345678-9", planId: 1, isActive: true,
      }),
    });
  });

  await page.route("**/dashboard*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(DASHBOARD_RESUMEN),
    });
  });

  await page.route("**/dashboard/lotes-procesados/historico*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ dias: 7, puntos: [] }),
    });
  });

  // HU-55: FloatingDictadoVozButton se monta en Layout para cualquier
  // pantalla/rol y llama a useLotes()/useSensores() sin condicionar los
  // hooks por rol. useLotes() espera la forma paginada de GET /lotes
  // ({ data, total, page, limit }); sin este mock explícito cae en el
  // catch-all de arriba (un array pelado), "data" queda undefined y
  // lotesElegibles.filter() explota — deja la página en blanco. No es un
  // bug de HU-51: dashboard-produccion.spec.ts tiene el mismo problema
  // (4 tests rotos en develop) porque nunca mockeó /lotes.
  await page.route("**/lotes*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], total: 0, page: 1, limit: 100 }),
    });
  });
}

test.describe("PrediccionVolumenSemanalCard (HU-51)", () => {
  test("Responsable de producción ve la predicción en estado normal", async ({ page }) => {
    await mockDashboardProduccionDeps(page);
    await loginAsResponsableProduccion(page);

    await expect(page.getByText("Predicción de volumen de producción")).toBeVisible();
    await expect(page.getByText("Generado por IA")).toBeVisible();
    await expect(page.getByText(/Confianza alta/)).toBeVisible();
    await expect(page.getByText("VOLUMEN TOTAL ESPERADO")).toBeVisible();
    await expect(page.getByText("HOY", { exact: true })).toBeVisible();
  });

  test("Gerente no ve la sección de predicción (HU-51 es específica de Producción)", async ({
    page,
  }) => {
    await mockDashboardProduccionDeps(page);
    await loginAsGerente(page);
    await page.goto("/dashboard-produccion");

    await expect(page.getByText("Predicción de volumen de producción")).not.toBeVisible();
  });

  test("estado Cargando muestra el spinner", async ({ page }) => {
    await mockDashboardProduccionDeps(page);
    await loginAsResponsableProduccion(page);

    await page.getByRole("button", { name: "Cargando" }).click();
    await expect(page.getByText("Cargando predicción...")).toBeVisible();
  });

  test("estado Datos insuficientes muestra el mensaje explicativo", async ({ page }) => {
    await mockDashboardProduccionDeps(page);
    await loginAsResponsableProduccion(page);

    await page.getByRole("button", { name: "Datos insuficientes" }).click();
    await expect(
      page.getByText("Todavía no hay suficiente historial para predecir"),
    ).toBeVisible();
    await expect(page.getByText(/al menos 30 días/)).toBeVisible();
  });

  test("estado Baja precisión muestra la advertencia y baja el % de confianza", async ({
    page,
  }) => {
    await mockDashboardProduccionDeps(page);
    await loginAsResponsableProduccion(page);

    await page.getByRole("button", { name: "Baja precisión" }).click();
    await expect(page.getByText(/intervalo de confianza .* muy amplio/)).toBeVisible();
    await expect(page.getByText(/Confianza baja/)).toBeVisible();
  });

  test("estado Error del modelo muestra el reintentar y vuelve a Normal", async ({ page }) => {
    await mockDashboardProduccionDeps(page);
    await loginAsResponsableProduccion(page);

    await page.getByRole("button", { name: "Error del modelo" }).click();
    await expect(page.getByText("No se pudo generar la predicción")).toBeVisible();

    await page.getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByText("VOLUMEN TOTAL ESPERADO")).toBeVisible();
  });

  test("Solo predicción oculta el histórico y la marca HOY", async ({ page }) => {
    await mockDashboardProduccionDeps(page);
    await loginAsResponsableProduccion(page);

    await page.getByRole("button", { name: "Solo predicción" }).click();
    await expect(page.getByText("HOY", { exact: true })).not.toBeVisible();
  });

  test("exportar descarga un CSV con la predicción y el histórico", async ({ page }) => {
    await mockDashboardProduccionDeps(page);
    await loginAsResponsableProduccion(page);

    const descargaPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar", exact: true }).click();
    const descarga = await descargaPromise;

    expect(descarga.suggestedFilename()).toMatch(/^prediccion-volumen-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
