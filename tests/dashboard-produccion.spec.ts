import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import { loginAsResponsableProduccion, loginAsResponsableCalidad, quitarPermisos } from "./fixtures/mockAuth.ts";

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

   // loteService.getAll() hace return data.data — si el catch-all devuelve "[]",
  // data.data = undefined → setLotes(undefined) → crash en FloatingDictadoVozButton.
  await page.route("**/lote*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr")) return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, limit: 100, total: 0, totalPages: 1 } }),
    });
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
  await quitarPermisos(page, "Responsable de calidad", ["dashboard"]);
  await page.goto("/dashboard-produccion");
  await expect(page.getByText("Acceso no autorizado")).toBeVisible();
});
// ---------------------------------------------------------------------------
// HU-38: gráfico de lotes procesados, filtros de período y reporte PDF
// ---------------------------------------------------------------------------

const HISTORICO_SEMANA = {
  dias: 7,
  puntos: [
    { fecha: "2026-10-05", lotesProcesados: 4 },
    { fecha: "2026-10-06", lotesProcesados: 10 },
    { fecha: "2026-10-07", lotesProcesados: 7 },
  ],
};

// Pisa el histórico del helper. Registra los query params de cada pedido.
async function mockHistorico(page: Page, respuesta: unknown, pedidos: URLSearchParams[] = []) {
  await page.route("**/dashboard/lotes-procesados/historico*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    pedidos.push(new URL(route.request().url()).searchParams);
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(respuesta) });
  });
}

// Puntos del gráfico: círculos SVG enfocables (no tienen rol accesible).
const puntosGrafico = (page: Page) => page.locator("svg circle[tabindex='0']");

test.describe("DashboardProduccionPage (HU-38) › Gráfico de lotes procesados", () => {
  test.beforeEach(async ({ page }) => {
    await mockDashboardProduccionDeps(page);
    await loginAsResponsableProduccion(page);
  });

  test("dibuja un punto por día con la escala de mínimo, medio y máximo", async ({ page }) => {
    await mockHistorico(page, HISTORICO_SEMANA);
    await page.goto("/dashboard-produccion");

    await expect(puntosGrafico(page)).toHaveCount(3);
    const escala = page.locator("div.h-40.flex-col");
    await expect(escala).toHaveText(["10" + "7" + "4"].join(""));
  });

  test("al pasar el mouse, enfocar o tocar un punto muestra los lotes de ese día", async ({ page }) => {
    await mockHistorico(page, HISTORICO_SEMANA);
    await page.goto("/dashboard-produccion");

    await puntosGrafico(page).nth(1).hover();
    await expect(page.getByText("10 lotes", { exact: true })).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(page.getByText("10 lotes", { exact: true })).toHaveCount(0);

    await puntosGrafico(page).nth(2).focus();
    await expect(page.getByText("7 lotes", { exact: true })).toBeVisible();
    await puntosGrafico(page).nth(2).blur();
    await expect(page.getByText("7 lotes", { exact: true })).toHaveCount(0);

    // Tocar alterna el tooltip (pantallas táctiles).
    await puntosGrafico(page).nth(0).dispatchEvent("click");
    await expect(page.getByText("4 lotes", { exact: true })).toBeVisible();
    await puntosGrafico(page).nth(0).dispatchEvent("click");
    await expect(page.getByText("4 lotes", { exact: true })).toHaveCount(0);
  });

  test("con un solo día lo centra y usa ese valor como toda la escala", async ({ page }) => {
    await mockHistorico(page, { dias: 1, puntos: [{ fecha: "2026-10-10", lotesProcesados: 5 }] });
    await page.goto("/dashboard-produccion");

    await expect(puntosGrafico(page)).toHaveCount(1);
    await expect(puntosGrafico(page)).toHaveAttribute("cx", "50");
    await expect(page.locator("div.h-40.flex-col")).toHaveText("555");
  });

  test("sin datos muestra el estado vacío en lugar del gráfico", async ({ page }) => {
    await mockHistorico(page, { dias: 7, puntos: [] });
    await page.goto("/dashboard-produccion");

    await expect(page.getByText("Sin lotes procesados en los últimos 7 días.")).toBeVisible();
    await expect(puntosGrafico(page)).toHaveCount(0);
  });

  test("cada filtro de período pide el histórico con su granularidad y cantidad", async ({ page }) => {
    const pedidos: URLSearchParams[] = [];
    await mockHistorico(page, HISTORICO_SEMANA, pedidos);
    await page.goto("/dashboard-produccion");
    // El reporte de impresión repite el título (oculto en pantalla).
    await expect(page.getByText("Lotes procesados · últimos 7 días").filter({ visible: true })).toBeVisible();
    expect(pedidos.at(-1)?.toString()).toBe("granularidad=dia&cantidad=7");

    // El primero es el filtro de la página; el panel de evolución tiene el suyo.
    await page.getByRole("button", { name: "Mes", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Producción · Mes" })).toBeVisible();
    await expect(page.getByText("Lotes procesados · este mes")).toBeVisible();
    await expect.poll(() => pedidos.at(-1)?.toString()).toBe("granularidad=mes&cantidad=1");

    await page.getByRole("button", { name: "Hoy", exact: true }).first().click();
    await expect(page.getByText("Lotes procesados · hoy")).toBeVisible();
    await expect.poll(() => pedidos.at(-1)?.toString()).toBe("granularidad=dia&cantidad=1");
  });
});

test.describe("DashboardProduccionPage (HU-38) › Reporte PDF", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __impresiones: number }).__impresiones = 0;
      window.print = () => {
        (window as unknown as { __impresiones: number }).__impresiones++;
      };
    });
    await mockDashboardProduccionDeps(page);
    await loginAsResponsableProduccion(page);
  });

  test("'Exportar PDF' abre el diálogo de impresión del navegador", async ({ page }) => {
    await mockHistorico(page, HISTORICO_SEMANA);
    await page.goto("/dashboard-produccion");

    await page.getByRole("button", { name: "Exportar PDF" }).click();

    expect(await page.evaluate(() => (window as unknown as { __impresiones: number }).__impresiones)).toBe(1);
  });

  test("la vista de impresión arma el reporte en tablas y oculta la pantalla", async ({ page }) => {
    await mockHistorico(page, HISTORICO_SEMANA);
    await page.goto("/dashboard-produccion");
    await expect(page.getByText("Reporte de Producción")).toBeHidden();

    await page.emulateMedia({ media: "print" });

    await expect(page.getByRole("heading", { name: "Reporte de Producción" })).toBeVisible();
    const reporte = page.locator("div.print\\:block");
    await expect(reporte.getByText(/^Lácteos del Sur S\.A\. · /)).toBeVisible();
    await expect(reporte.getByText(/^Generado el /)).toBeVisible();
    // Los paneles de pantalla y el propio botón (print:hidden vía className
    // de Button) se ocultan al imprimir.
    await expect(page.getByRole("button", { name: "Exportar PDF" })).toBeHidden();
    await expect(page.getByText("Línea de calidad", { exact: true })).toBeHidden();
    await expect(puntosGrafico(page).first()).toBeHidden();

    const metricas = page.locator("table").first();
    await expect(metricas.getByRole("row", { name: /Lotes procesados/ })).toHaveText(/Lotes procesados\s*12\s*10\s*\+2/);
    await expect(metricas.getByRole("row", { name: /Alertas activas/ })).toHaveText(/Alertas activas\s*3\s*5\s*-2/);
    await expect(metricas.getByRole("row", { name: /Parámetros críticos/ })).toHaveText(/Parámetros críticos\s*1\s*1\s*0$/);

    await expect(page.getByRole("row", { name: /Total lotes en el sistema/ })).toContainText("15");
    await expect(page.getByRole("row", { name: /No aptos/ })).toContainText("1");
    await expect(page.getByRole("heading", { name: "Lotes procesados · últimos 7 días" })).toBeVisible();
    const historico = page.locator("table").last();
    await expect(historico.locator("tbody tr")).toHaveCount(3);
    await expect(historico.locator("tbody tr").nth(1)).toContainText("10");
  });

  test("sin histórico el reporte omite la tabla de lotes por día", async ({ page }) => {
    await mockHistorico(page, { dias: 7, puntos: [] });
    await page.goto("/dashboard-produccion");
    await page.emulateMedia({ media: "print" });

    await expect(page.getByRole("heading", { name: "Reporte de Producción" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Lotes procesados · últimos/ })).toHaveCount(0);
  });
});

// Las fechas del histórico llegan como yyyy-MM-dd. En Argentina (UTC-3)
// tienen que mostrarse como ese mismo día, no como el anterior.
test.describe("DashboardProduccionPage (HU-38) › Fechas del histórico en hora local", () => {
  test.use({ timezoneId: "America/Argentina/Cordoba", locale: "es-AR" });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.print = () => {};
    });
    await mockDashboardProduccionDeps(page);
    await loginAsResponsableProduccion(page);
    await mockHistorico(page, HISTORICO_SEMANA);
    await page.goto("/dashboard-produccion");
  });

  test("el gráfico rotula cada punto con su propio día", async ({ page }) => {
    // 2026-10-05 es lunes.
    const etiquetas = page.locator("div.pl-8 span");
    await expect(etiquetas).toHaveText(["lun", "mar", "mié"]);

    await puntosGrafico(page).nth(0).focus();
    // "05 oct" o "05-oct" según el ICU del navegador.
    await expect(page.getByText(/^05[ -]oct\.?$/)).toBeVisible();
  });

  test("el reporte PDF lista cada día con su fecha", async ({ page }) => {
    await page.emulateMedia({ media: "print" });

    const filas = page.locator("table").last().locator("tbody tr");
    // El separador depende del ICU del navegador ("05/10" o "05-10").
    await expect(filas.nth(0)).toContainText(/lunes,? 05[/-]10/i);
    await expect(filas.nth(2)).toContainText(/miércoles,? 07[/-]10/i);
  });
});
