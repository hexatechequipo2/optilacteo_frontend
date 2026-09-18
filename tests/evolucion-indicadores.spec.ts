import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import { loginAsResponsableProduccion } from "./fixtures/mockAuth.ts";

// HU-39 · EvolucionIndicadoresPanel en DashboardProduccionPage.
// El panel vive en /dashboard-produccion (allowedRoles: ["Responsable de
// producción", "Gerente"]). Endpoint: GET /dashboard/indicadores/evolucion.

const RESUMEN_MOCK = {
  lotesProcesados: { valor: 5, valorAnterior: 4, variacion: 1, tendencia: "sube" },
  alertasActivas: { valor: 0, valorAnterior: 0, variacion: 0, tendencia: "igual" },
  parametrosCriticos: { valor: 0, valorAnterior: 0, variacion: 0, tendencia: "igual" },
  lineaCalidad: { recepcion: 5, clasificacion: 5, noAptos: 0, aptos: 5, totalLotesSistema: 5 },
  actualizadoEn: "2026-09-15T10:00:00.000Z",
};

// Respuesta de GET /dashboard/indicadores/evolucion.
// El panel inicia en período "mes" con grasa y proteina seleccionados.
const EVOLUCION_MOCK = {
  granularidadAplicada: "mes",
  desde: "2026-08-18T00:00:00.000Z",
  hasta: "2026-09-14T23:59:59.999Z",
  series: [
    {
      parametro: "grasa",
      puntos: [
        { fecha: "2026-08-18", valor: 3.5 },
        { fecha: "2026-08-25", valor: 3.7 },
        { fecha: "2026-09-01", valor: 3.6 },
        { fecha: "2026-09-08", valor: 3.8 },
      ],
    },
    {
      parametro: "proteina",
      puntos: [
        { fecha: "2026-08-18", valor: 3.2 },
        { fecha: "2026-08-25", valor: 3.1 },
        { fecha: "2026-09-01", valor: 3.3 },
        { fecha: "2026-09-08", valor: 3.4 },
      ],
    },
  ],
};

// PrediccionVolumenSemanalCard se monta para "Responsable de producción"
// y llama al microservicio ML (GET /prediccion-volumen). Sin este mock
// el componente crashea y desmonta todo el árbol de la página.
const PREDICCION_INSUFICIENTE_MOCK = {
  status: "insufficient_data",
  tipoMateriaPrima: "leche_cruda",
  unidad: null,
  fechaActualizacionModelo: null,
  modeloVersion: null,
  prediccion: [],
  historicoReciente: [],
  mensaje: "Datos insuficientes para generar una predicción.",
};

async function mockDashboardProduccionDeps(page: Page) {
  // LIFO: el último registrado se evalúa primero.

  // 1. Catch-all — mínima prioridad.
  await page.route("**/*", async (route) => {
    const rt = route.request().resourceType();
    if (rt === "xhr" || rt === "fetch") {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    return route.continue();
  });

  // 2. FloatingDictadoVozButton (HU-55) llama a useLotes() que espera formato
  //    paginado { data, meta }. El catch-all devuelve "[]" → data.data=undefined
  //    → lotesElegibles.filter() explota y desmonta toda la página.
  await page.route("**/lote*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr")) return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, limit: 100, total: 0, totalPages: 1 } }),
    });
  });

  // 3. Notificaciones.
  await page.route("**/notificacion*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr")) return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
    });
  });

  // 4. Empresa.
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

  // 5. Microservicio ML (HU-51) — PrediccionVolumenSemanalCard.
  await page.route("**/prediccion-volumen*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PREDICCION_INSUFICIENTE_MOCK),
    });
  });

  // 6. Resumen del dashboard. Registrado antes que el historico para que LIFO
  //    le dé menor prioridad (el historico se evalúa primero).
  await page.route("**/dashboard*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(RESUMEN_MOCK),
    });
  });

  // 7. Historial de lotes procesados — registrado DESPUÉS de **/dashboard*
  //    → LIFO lo evalúa primero → no lo captura el handler genérico.
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

  // 8. Evolución de indicadores — registrado ÚLTIMO → máxima prioridad.
  //    Devuelve 400 si el rango es inválido (hasta < desde).
  await page.route("**/indicadores/evolucion*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "GET") return route.continue();

    const url = new URL(route.request().url());
    const periodo = url.searchParams.get("periodo");
    const desde = url.searchParams.get("desde");
    const hasta = url.searchParams.get("hasta");

    if (periodo === "rango" && desde && hasta && hasta < desde) {
      return route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          message: "La fecha hasta no puede ser anterior a la fecha desde.",
        }),
      });
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(EVOLUCION_MOCK),
    });
  });
}

test.describe("EvolucionIndicadoresPanel (HU-39)", () => {
  test.beforeEach(async ({ page }) => {
    await mockDashboardProduccionDeps(page);
    await loginAsResponsableProduccion(page);
    await page.goto("/dashboard-produccion");
    await page.waitForLoadState("networkidle");
  });

  test("muestra el panel de evolución de indicadores", async ({ page }) => {
    await expect(page.getByText("Evolución de indicadores")).toBeVisible();
  });

  test("muestra el gráfico por defecto con 2 indicadores y tipo línea", async ({ page }) => {
    // Subtítulo dinámico: "{n} indicadores comparados"
    await expect(
      page.locator("p").filter({ hasText: "2 indicadores comparados" }),
    ).toBeVisible();
    // En modo línea, el chart renderiza una <polyline> por indicador seleccionado.
    // Con grasa y proteina (2 indicadores) sin valores nulos → 2 polylines.
    await expect(page.locator("svg polyline")).toHaveCount(2);
  });

  test("cambia a tipo barras y verifica que desaparecen las polylines", async ({ page }) => {
    await page.getByRole("button", { name: "Barras" }).click();
    await page.waitForLoadState("networkidle");

    await expect(page.locator("svg polyline")).toHaveCount(0);
    await expect(page.locator("svg rect").first()).toBeVisible();
  });

  test("cambia el período a Semana y recarga el gráfico", async ({ page }) => {
    await page.getByRole("button", { name: "Semana", exact: true }).click();
    await page.waitForLoadState("networkidle");

    // El panel sigue visible y en modo línea con 2 indicadores
    await expect(page.locator("svg polyline")).toHaveCount(2);
  });

  test("rango personalizado con fecha fin anterior a inicio muestra error", async ({ page }) => {
    await page.getByRole("button", { name: "Rango personalizado" }).click();

    const fechas = page.locator('input[type="date"]');
    await fechas.nth(0).fill("2026-06-10");
    await fechas.nth(1).fill("2026-06-01");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText("La fecha hasta no puede ser anterior a la fecha desde."),
    ).toBeVisible();
  });

  test("rango personalizado válido carga el gráfico", async ({ page }) => {
    await page.getByRole("button", { name: "Rango personalizado" }).click();

    const fechas = page.locator('input[type="date"]');
    await fechas.nth(0).fill("2026-06-01");
    await fechas.nth(1).fill("2026-06-30");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("svg polyline")).toHaveCount(2);
  });

  test("deseleccionar todos los indicadores muestra aviso de selección", async ({ page }) => {
    await page.getByRole("button", { name: "Materia grasa %" }).click();
    await page.getByRole("button", { name: "Proteínas %" }).click();

    await expect(page.getByText("Seleccioná al menos un indicador")).toBeVisible();
  });

  test("exportar PNG descarga un archivo con nombre correcto", async ({ page }) => {
    const botonExportar = page.getByRole("button", { name: "Exportar PNG" });
    await expect(botonExportar).toBeEnabled();

    const descargaPromise = page.waitForEvent("download");
    await botonExportar.click();
    const descarga = await descargaPromise;

    expect(descarga.suggestedFilename()).toMatch(
      /^evolucion-indicadores-\d{4}-\d{2}-\d{2}\.png$/,
    );
  });

    test("muestra estado vacío cuando el período no tiene mediciones", async ({ page }) => {
    await page.route("**/indicadores/evolucion*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          granularidadAplicada: "mes",
          desde: "2026-08-18T00:00:00.000Z",
          hasta: "2026-09-14T23:59:59.999Z",
          series: [
            { parametro: "grasa", puntos: [{ fecha: "2026-08-18", valor: null }] },
            { parametro: "proteina", puntos: [{ fecha: "2026-08-18", valor: null }] },
          ],
        }),
      });
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText("No hay mediciones disponibles para el período seleccionado"),
    ).toBeVisible();
  });

  test("muestra error y botón Reintentar cuando falla la carga", async ({ page }) => {
    await page.route("**/indicadores/evolucion*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      await route.fulfill({ status: 500, body: "" });
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText("No se pudo cargar la evolución de indicadores."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
  });

  test("seleccionar múltiples indicadores los compara en el mismo gráfico", async ({ page }) => {
  // Por defecto: grasa y proteina → 2 polylines
  await expect(page.locator("p").filter({ hasText: "2 indicadores comparados" })).toBeVisible();
  await expect(page.locator("svg polyline")).toHaveCount(2);

  // Deseleccionar proteina → 1 indicador
  await page.getByRole("button", { name: "Proteínas %" }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.locator("svg polyline")).toHaveCount(1);

  // Override del mock para devolver 3 series cuando se agregue acidez
  await page.route("**/indicadores/evolucion*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...EVOLUCION_MOCK,
        series: [
          ...EVOLUCION_MOCK.series,
          {
            parametro: "acidez",
            puntos: [
              { fecha: "2026-08-18", valor: 16.5 },
              { fecha: "2026-08-25", valor: 17.0 },
              { fecha: "2026-09-01", valor: 16.8 },
              { fecha: "2026-09-08", valor: 17.2 },
            ],
          },
        ],
      }),
    });
  });

  // Re-seleccionar proteina y agregar acidez → 3 indicadores en el mismo gráfico
  await page.getByRole("button", { name: "Proteínas %" }).click();
  await page.getByRole("button", { name: "Acidez titulable °D" }).click();
  await page.waitForLoadState("networkidle");

  await expect(page.locator("p").filter({ hasText: "3 indicadores comparados" })).toBeVisible();
  await expect(page.locator("svg polyline")).toHaveCount(3);
});

test("cambiar indicador actualiza el gráfico sin recargar la página", async ({ page }) => {
  let navigated = false;
  page.on("framenavigated", () => { navigated = true; });

  await page.getByRole("button", { name: "Materia grasa %" }).click();
  await page.waitForLoadState("networkidle");

  expect(navigated).toBe(false);
  await expect(page.locator("svg polyline")).toHaveCount(1);
});
});
