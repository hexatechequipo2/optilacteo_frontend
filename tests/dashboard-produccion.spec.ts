import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import { loginAsResponsableProduccion, loginAsResponsableCalidad } from "./fixtures/mockAuth.ts";

// ---------------------------------------------------------------------------
// Datos de prueba
// ---------------------------------------------------------------------------

const DASHBOARD_RESUMEN = {
  lotesProcesados: { valor: 12, valorAnterior: 10, variacion: 2, tendencia: "sube" },
  alertasActivas: { valor: 3, valorAnterior: 5, variacion: -2, tendencia: "baja" },
  parametrosCriticos: { valor: 1, valorAnterior: 1, variacion: 0, tendencia: "igual" },
  lineaCalidad: { recepcion: 15, clasificacion: 13, noAptos: 1, aptos: 12, totalLotesSistema: 15 },
  actualizadoEn: "2026-08-03T08:00:00.000Z",
};

const DASHBOARD_RESUMEN_VACIO = {
  lotesProcesados: { valor: 0, valorAnterior: 0, variacion: 0, tendencia: "igual" },
  alertasActivas: { valor: 0, valorAnterior: 0, variacion: 0, tendencia: "igual" },
  parametrosCriticos: { valor: 0, valorAnterior: 0, variacion: 0, tendencia: "igual" },
  lineaCalidad: { recepcion: 0, clasificacion: 0, noAptos: 0, aptos: 0, totalLotesSistema: 0 },
  actualizadoEn: "2026-08-03T08:00:00.000Z",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

  // LIFO: mayor prioridad → maneja GET /dashboard/lotes-procesados/historico.
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
}

// ---------------------------------------------------------------------------
// DashboardProduccionPage
// ---------------------------------------------------------------------------

test.describe("DashboardProduccionPage", () => {
  test.beforeEach(async ({ page }) => {
    await mockDashboardProduccionDeps(page);
    await loginAsResponsableProduccion(page);
    await page.goto("/dashboard-produccion");
    await page.waitForLoadState("networkidle");
  });

  test("muestra las métricas del día cuando los datos cargan", async ({ page }) => {
    // El filtro por defecto es "semana" (ver useDashboardProduccion), así que
    // para probar la vista de "hoy" hay que seleccionarla explícitamente.
    await page.getByRole("button", { name: "Hoy" }).click();
    await expect(page.getByText("Lotes procesados hoy")).toBeVisible();
    await expect(page.locator("p").filter({ hasText: "Alertas activas" })).toBeVisible();
    await expect(page.locator("p").filter({ hasText: "Parámetros críticos" })).toBeVisible();
    // Tendencia de lotesProcesados: variacion=2, signo="+"
    await expect(page.getByText("+2 vs. ayer")).toBeVisible();
  });

  test("muestra el panel Línea de calidad y el gráfico histórico", async ({ page }) => {
    await expect(page.getByText("Línea de calidad", { exact: true })).toBeVisible();
    await expect(page.getByText("15 lotes en el sistema")).toBeVisible();
    await expect(page.getByText("Lotes procesados · últimos 7 días")).toBeVisible();
  });

  test("muestra cero métricas cuando no hay actividad en el día", async ({ page }) => {
    await page.route("**/dashboard*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(DASHBOARD_RESUMEN_VACIO),
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
    await page.goto("/dashboard-produccion");
    await page.waitForLoadState("networkidle");
    // El filtro por defecto es "semana" (ver useDashboardProduccion), así que
    // para probar la vista de "hoy" hay que seleccionarla explícitamente.
    await page.getByRole("button", { name: "Hoy" }).click();

    // Las métricas en 0 se muestran igual, sin pantalla de error (AC HU-38)
    await expect(page.getByText("Lotes procesados hoy")).toBeVisible();
    await expect(page.getByText("0 lotes en el sistema")).toBeVisible();
  });

  test("muestra error del servidor con botón Reintentar", async ({ page }) => {
    await page.route("**/dashboard*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({ status: 500, body: "" });
    });
    await page.goto("/dashboard-produccion");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("No se pudo cargar el panel de producción.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
  });
});

test("DashboardProduccionPage - un Responsable de calidad ve acceso no autorizado", async ({ page }) => {
  await mockDashboardProduccionDeps(page);
  await loginAsResponsableCalidad(page);
  await page.goto("/dashboard-produccion");
  await expect(page.getByText("Acceso no autorizado")).toBeVisible();
});