import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import { loginAsResponsableProduccion, loginAsGerente } from "./fixtures/mockAuth.ts";

// HU-51 · PrediccionVolumenSemanalCard en DashboardProduccionPage.
// El componente conecta a GET /prediccion-volumen (microservicio ML).
// El switcher manual de demo fue eliminado — los estados salen del ciclo real
// de fetch + el campo `status` de la respuesta.

const DASHBOARD_RESUMEN = {
  lotesProcesados: { valor: 12, valorAnterior: 10, variacion: 2, tendencia: "sube" },
  alertasActivas: { valor: 3, valorAnterior: 5, variacion: -2, tendencia: "baja" },
  parametrosCriticos: { valor: 1, valorAnterior: 1, variacion: 0, tendencia: "igual" },
  lineaCalidad: { recepcion: 15, clasificacion: 13, noAptos: 1, aptos: 12, totalLotesSistema: 15 },
  actualizadoEn: "2026-08-03T08:00:00.000Z",
};

const PREDICCION_MOCK = {
  status: "ok",
  tipoMateriaPrima: "leche_cruda",
  unidad: "litros",
  fechaActualizacionModelo: "2026-09-14T03:00:00.000Z",
  modeloVersion: "1.0.0",
  prediccion: [
    { fecha: "2026-09-15", minimo: 900, esperado: 1000, maximo: 1100 },
    { fecha: "2026-09-16", minimo: 850, esperado: 950,  maximo: 1050 },
    { fecha: "2026-09-17", minimo: 800, esperado: 900,  maximo: 1000 },
    { fecha: "2026-09-18", minimo: 950, esperado: 1050, maximo: 1150 },
    { fecha: "2026-09-19", minimo: 900, esperado: 1000, maximo: 1100 },
    { fecha: "2026-09-20", minimo: 850, esperado: 950,  maximo: 1050 },
    { fecha: "2026-09-21", minimo: 800, esperado: 900,  maximo: 1000 },
  ],
  historicoReciente: [
    { fecha: "2026-09-08", valor: 980  },
    { fecha: "2026-09-09", valor: 1020 },
    { fecha: "2026-09-10", valor: 950  },
    { fecha: "2026-09-11", valor: 1100 },
    { fecha: "2026-09-12", valor: 980  },
    { fecha: "2026-09-13", valor: 1050 },
    { fecha: "2026-09-14", valor: 1010 },
  ],
};

async function mockDashboardProduccionDeps(page: Page) {
  // LIFO: el último registrado se evalúa primero.

  await page.route("**/*", async (route) => {
    const rt = route.request().resourceType();
    if (rt === "xhr" || rt === "fetch") {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    return route.continue();
  });

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
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr")) return route.continue();
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

  await page.route("**/indicadores/evolucion*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        granularidadAplicada: "mes",
        desde: "2026-08-18T00:00:00.000Z",
        hasta: "2026-09-14T23:59:59.999Z",
        series: [
          { parametro: "grasa",    puntos: [{ fecha: "2026-09-08", valor: 3.5 }] },
          { parametro: "proteina", puntos: [{ fecha: "2026-09-08", valor: 3.2 }] },
        ],
      }),
    });
  });

  // Microservicio ML — registrado ÚLTIMO → máxima prioridad.
  await page.route("**/prediccion-volumen*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PREDICCION_MOCK),
    });
  });
}

test.describe("PrediccionVolumenSemanalCard (HU-51)", () => {
  test.beforeEach(async ({ page }) => {
    await mockDashboardProduccionDeps(page);
    await loginAsResponsableProduccion(page);
    await page.goto("/dashboard-produccion");
    await page.waitForLoadState("networkidle");
  });

  test("muestra la predicción en estado normal con datos del modelo", async ({ page }) => {
    await expect(page.getByText("Generado por IA")).toBeVisible();
    await expect(page.getByText("VOLUMEN TOTAL ESPERADO")).toBeVisible();
    await expect(page.getByText("Se actualiza automáticamente todos los días")).toBeVisible();
  });

    test("estado datos insuficientes muestra el mensaje del modelo", async ({ page }) => {
    await page.route("**/prediccion-volumen*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "insufficient_data",
          tipoMateriaPrima: "leche_cruda",
          unidad: null,
          fechaActualizacionModelo: null,
          modeloVersion: null,
          prediccion: [],
          historicoReciente: [],
          mensaje: "Datos insuficientes para generar una predicción.",
        }),
      });
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText("Todavía no hay suficiente historial para predecir"),
    ).toBeVisible();
    await expect(
      page.getByText("Datos insuficientes para generar una predicción."),
    ).toBeVisible();
  });

  test("estado error muestra el mensaje y botón Reintentar", async ({ page }) => {
    await page.route("**/prediccion-volumen*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({ status: 500, body: "" });
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("No se pudo generar la predicción")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
  });

  test("muestra la fecha de última actualización del modelo", async ({ page }) => {
    await expect(page.getByText(/Última actualización del modelo:/)).toBeVisible();
  });

  test("permite alternar entre vista con histórico y solo predicción", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Con histórico comparado" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Solo predicción" })).toBeVisible();

    await page.getByRole("button", { name: "Solo predicción" }).click();
    await expect(page.getByRole("button", { name: "Con histórico comparado" })).toBeVisible();
  });

  test("exportar CSV descarga el archivo con nombre correcto", async ({ page }) => {
    // **/prediccion-volumen/exportar/csv* es un path separado — no lo captura
    // **/prediccion-volumen* del beforeEach porque * no cruza /.
    await page.route("**/prediccion-volumen/exportar/csv*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "text/csv",
        body: "fecha,minimo,esperado,maximo\n2026-09-15,900,1000,1100",
      });
    });

    const descargaPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar CSV" }).click();
    const descarga = await descargaPromise;

    expect(descarga.suggestedFilename()).toMatch(
      /^prediccion-volumen-leche_cruda-\d{4}-\d{2}-\d{2}\.csv$/,
    );
  });

    test("muestra el intervalo de confianza del día de mayor volumen", async ({ page }) => {
    await expect(page.getByText("DÍA DE MAYOR VOLUMEN PREVISTO")).toBeVisible();
    // El componente renderiza "X L esperados · rango MIN–MAX L"
    await expect(page.getByText(/esperados · rango/)).toBeVisible();
  });

  test("cambiar materia prima recarga la predicción", async ({ page }) => {
    await page.getByRole("button", { name: "Crema de leche" }).click();
    await page.waitForLoadState("networkidle");

    // La card sigue en estado normal con los datos del mock
    await expect(page.getByText("Generado por IA")).toBeVisible();
    await expect(page.getByText("VOLUMEN TOTAL ESPERADO")).toBeVisible();
  });
});

test("Gerente también ve la predicción de volumen", async ({ page }) => {
  await mockDashboardProduccionDeps(page);
  await loginAsGerente(page);
  await page.goto("/dashboard-produccion");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Generado por IA")).toBeVisible();
});
