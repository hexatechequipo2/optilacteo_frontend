import type { Route } from "@playwright/test";
import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import { loginAsOperario, loginAsResponsableCalidad } from "./fixtures/mockAuth.ts";

// HU-40: pestaña "Monitoreo en línea" (Sensores) conectada al backend.
// La actualización en vivo por WebSocket no se cubre acá: socket.io arranca
// por long-polling y emular su handshake con page.route es frágil; queda
// para la prueba manual con el simulador. El catch-all rompe ese polling a
// propósito, así que el socket nunca conecta (ver caso "EN VIVO").

test.use({ timezoneId: "America/Argentina/Cordoba", locale: "es-AR" });

// "Ahora" fijo para que hoy/otro día/antigua no dependan del día en que se corre.
// 13:10Z = 10:10 en Córdoba.
const AHORA = new Date("2026-09-26T13:10:00.000Z");

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(AHORA);
});

const LOTE_A = {
  id: 1, codigo: "LOT-2026-101", materiaPrima: "leche_cruda", estado: "en_proceso",
  ubicacionInicial: "sector_envasado", empresaId: 10, parametros: [],
};
const LOTE_B = {
  id: 2, codigo: "LOT-2026-102", materiaPrima: "crema_de_leche", estado: "en_proceso",
  ubicacionInicial: null, empresaId: 10, parametros: [],
};

const SENSORES = [
  { id: 11, nombre: "Termómetro 1", parametro: "temperatura", estado: "activo", empresaId: 10 },
  { id: 12, nombre: "pHmetro 1", parametro: "ph", estado: "activo", empresaId: 10 },
];

// 13:05:10Z = 10:05:10 en Córdoba (timezoneId de arriba).
const SEMAFORO_LOTE_A = {
  loteId: 1,
  loteCodigo: "LOT-2026-101",
  parametros: [
    { parametro: "temperatura", valor: 4.2, estado: "NORMAL", origen: "SENSOR", timestamp: "2026-09-26T13:05:10.000Z" },
    // Hoy pero hace más de 2 h → hora sola + "Lectura antigua".
    { parametro: "ph", valor: 6.52, estado: "EN_LIMITE", origen: "SENSOR", timestamp: "2026-09-26T10:00:00.000Z" },
    { parametro: "acidez", valor: 0.25, estado: "FUERA_DE_RANGO", origen: "MANUAL", timestamp: "2026-09-26T13:04:00.000Z" },
    // Otro día → fecha + hora + "Lectura antigua".
    { parametro: "grasa", valor: 3.6, estado: "SIN_UMBRAL_CONFIGURADO", origen: "SENSOR", timestamp: "2026-09-24T19:15:00.000Z" },
  ],
};

const CARGA_MANUAL_LOTE_A = {
  id: 501, parametro: "acidez", valor: 0.25, estado: "FUERA_DE_RANGO",
  createdAt: "2026-09-24T19:15:00.000Z",
};

const CARD_NAME = /: (En rango|En límite|Fuera de rango|Sin umbral|Sin lecturas)$/;

function esGetDeApi(route: Route) {
  const rt = route.request().resourceType();
  return (rt === "fetch" || rt === "xhr") && route.request().method() === "GET";
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function mockMonitoreoDeps(
  page: Page,
  opts: { lotes?: unknown[]; lotesFallan?: boolean } = {},
) {
  const lotes = opts.lotes ?? [LOTE_A, LOTE_B];
  const estadosPedidos: (string | null)[] = [];
  // Mientras sea true, GET /lotes?estado=en_proceso responde 500. No es
  // "falla una sola vez": si la pestaña se remonta durante el login, un
  // segundo pedido no puede "consumir" el error antes de que el test lo vea.
  const control = { lotesFallan: opts.lotesFallan ?? false };

  // Catch-all (también rompe el long-polling de socket.io).
  await page.route("**/*", async (route) => {
    const rt = route.request().resourceType();
    if (rt === "xhr" || rt === "fetch") return json(route, []);
    return route.continue();
  });

  await page.route("**/notificacion*", async (route) => {
    if (!esGetDeApi(route)) return route.continue();
    await json(route, { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } });
  });

  await page.route("**/sensores*", async (route) => {
    if (!esGetDeApi(route)) return route.continue();
    await json(route, SENSORES);
  });

  await page.route("**/lotes*", async (route) => {
    if (!esGetDeApi(route)) return route.continue();
    const estado = new URL(route.request().url()).searchParams.get("estado");
    estadosPedidos.push(estado);
    if (estado === "en_proceso" && control.lotesFallan) {
      return json(route, { message: "Error interno" }, 500);
    }
    await json(route, { data: lotes, total: lotes.length, page: 1, limit: 100 });
  });

  // LIFO: más prioridad que **/lotes*.
  await page.route(/\/lotes\/\d+\/mediciones-manuales/, async (route) => {
    if (!esGetDeApi(route)) return route.continue();
    const loteId = Number(route.request().url().match(/\/lotes\/(\d+)\//)?.[1]);
    const data = loteId === LOTE_A.id ? [CARGA_MANUAL_LOTE_A] : [];
    await json(route, { data, total: data.length, page: 1, limit: 20 });
  });

  await page.route(/\/dashboard\/lote\/\d+\/semaforo/, async (route) => {
    if (!esGetDeApi(route)) return route.continue();
    const loteId = Number(route.request().url().match(/\/lote\/(\d+)\//)?.[1]);
    await json(
      route,
      loteId === LOTE_A.id
        ? SEMAFORO_LOTE_A
        : { loteId, loteCodigo: "LOT-2026-102", parametros: [] },
    );
  });

  return { estadosPedidos, control };
}

test.describe("Sensores › Monitoreo en línea (HU-40)", () => {
  test("Operario entra directo al semáforo tras recargar /sensores", async ({ page }) => {
    await mockMonitoreoDeps(page);
    await loginAsOperario(page);
    await page.goto("/sensores"); // recarga dura

    await expect(page.getByText("Lote activo")).toBeVisible();
    await expect(page.getByRole("group", { name: "Temperatura: En rango" })).toBeVisible();
  });

  test("muestra las 7 cards en orden, con estado, hora real y 'Sin lecturas'", async ({ page }) => {
    await mockMonitoreoDeps(page);
    await loginAsOperario(page);

    const cards = page.getByRole("group", { name: CARD_NAME });
    await expect(cards).toHaveCount(7);
    await expect(page.getByRole("group", { name: "Temperatura: En rango" })).toBeVisible();
    const nombres = await cards.evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
    expect(nombres).toEqual([
      "pH: En límite",
      "Temperatura: En rango",
      "Densidad: Sin lecturas",
      "Materia grasa: Sin umbral",
      "Proteínas: Sin lecturas",
      "Acidez titulable: Fuera de rango",
      "Conductividad: Sin lecturas",
    ]);

    await expect(page.getByRole("group", { name: "Temperatura: En rango" })).toContainText("10:05:10");
    const acidez = page.getByRole("group", { name: "Acidez titulable: Fuera de rango" });
    await expect(acidez).toContainText("10:04:00");
    await expect(acidez).toContainText("Carga manual");

    const densidad = page.getByRole("group", { name: "Densidad: Sin lecturas" });
    await expect(densidad).not.toContainText(/\d{2}:\d{2}:\d{2}/);
    await expect(densidad).not.toContainText(/\d+\.\d+/);
  });

  test("hora de la lectura: hoy, otro día y aviso de lectura antigua", async ({ page }) => {
    await mockMonitoreoDeps(page);
    await loginAsOperario(page);

    // Hoy y reciente: hora sola, sin aviso.
    const temperatura = page.getByRole("group", { name: "Temperatura: En rango" });
    await expect(temperatura).toContainText("10:05:10");
    await expect(temperatura).not.toContainText("Lectura antigua");

    // Hoy pero de hace más de 2 h: hora sola + aviso.
    const ph = page.getByRole("group", { name: "pH: En límite" });
    await expect(ph).toContainText("07:00:00");
    await expect(ph).toContainText("Lectura antigua");

    // Otro día: fecha + hora + aviso; el color lo sigue definiendo el backend.
    const grasa = page.getByRole("group", { name: "Materia grasa: Sin umbral" });
    await expect(grasa).toContainText("24/09 16:15");
    await expect(grasa).toContainText("Lectura antigua");

    // Historial de cargas manuales: mismo criterio de fecha.
    await expect(
      page.getByRole("listitem").filter({ hasText: "Acidez titulable" }),
    ).toContainText("24/09 16:15");
  });

  test("pide lotes en_proceso y muestra ubicación con fallback", async ({ page }) => {
    const { estadosPedidos } = await mockMonitoreoDeps(page);
    await loginAsOperario(page);

    await expect(page.getByRole("button", { name: /LOT-2026-101/ })).toContainText("Sector envasado");
    await expect(page.getByRole("button", { name: /LOT-2026-102/ })).toContainText("Sin ubicación");
    expect(estadosPedidos).toContain("en_proceso");
  });

  test("al cambiar de lote refetchea semáforo e historial de cargas manuales", async ({ page }) => {
    await mockMonitoreoDeps(page);
    await loginAsOperario(page);

    await expect(page.getByText("Historial de cargas manuales · LOT-2026-101")).toBeVisible();
    await expect(page.getByText("1 registro", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /LOT-2026-102/ }).click();

    await expect(page.getByText("Historial de cargas manuales · LOT-2026-102")).toBeVisible();
    await expect(page.getByText("Sin cargas manuales aún")).toBeVisible();
    await expect(page.getByRole("group", { name: /: Sin lecturas$/ })).toHaveCount(7);
  });

  test("muestra los umbrales aplicados según la materia prima del lote", async ({ page }) => {
    await mockMonitoreoDeps(page);
    const config = (parametro: string, tipoMateriaPrima: string, u: number[]) => ({
      id: u[0] * 100, empresaId: 10, parametro, tipoMateriaPrima,
      umbralAlertaMin: u[0], umbralMin: u[1], umbralMax: u[2], umbralAlertaMax: u[3],
      createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z",
    });
    // LIFO: más prioridad que el catch-all.
    await page.route("**/config-parametros*", async (route) => {
      if (!esGetDeApi(route)) return route.continue();
      await json(route, [
        config("ph", "leche_cruda", [5.5, 6, 7.5, 8]),
        config("ph", "crema_de_leche", [4, 4.5, 5, 6]),
        // Sin bandas (backend sin el fix de HU-40): solo "Normal x–y".
        { ...config("acidez", "leche_cruda", [0, 14, 18, 0]), umbralAlertaMin: null, umbralAlertaMax: undefined },
      ]);
    });
    await loginAsOperario(page);

    // LOTE_A es leche cruda: banda de leche cruda.
    const ph = page.getByRole("group", { name: "pH: En límite" });
    await expect(ph).toContainText("Normal 6–7.5 · alerta 5.5–8");
    const acidez = page.getByRole("group", { name: "Acidez titulable: Fuera de rango" });
    await expect(acidez).toContainText("Normal 14–18");
    await expect(acidez).not.toContainText("alerta");
    // Sin config para ese parámetro y materia prima: no se muestra la línea.
    await expect(page.getByRole("group", { name: "Temperatura: En rango" })).not.toContainText("Normal");

    // LOTE_B es crema de leche: cambia la banda aunque no tenga lecturas.
    await page.getByRole("button", { name: /LOT-2026-102/ }).click();
    await expect(page.getByRole("group", { name: "pH: Sin lecturas" })).toContainText(
      "Normal 4.5–5 · alerta 4–6",
    );
  });

  test("no muestra EN VIVO si el socket no está conectado", async ({ page }) => {
    await mockMonitoreoDeps(page);
    await loginAsOperario(page);

    await expect(page.getByRole("group", { name: "Temperatura: En rango" })).toBeVisible();
    await expect(page.getByText("EN VIVO")).toHaveCount(0);
  });

  test("estado vacío sin lotes en proceso", async ({ page }) => {
    await mockMonitoreoDeps(page, { lotes: [] });
    await loginAsOperario(page);

    await expect(page.getByText("No hay lotes en proceso")).toBeVisible();
  });

  test("error al cargar lotes con reintentar", async ({ page }) => {
    const { control } = await mockMonitoreoDeps(page, { lotesFallan: true });
    await loginAsOperario(page);

    await expect(page.getByRole("alert")).toContainText("No se pudieron cargar los lotes en proceso.");
    control.lotesFallan = false;
    await page.getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByRole("group", { name: "Temperatura: En rango" })).toBeVisible();
  });

  test("Responsable de calidad no ve la pestaña", async ({ page }) => {
    await mockMonitoreoDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/sensores");

    await expect(page.getByRole("button", { name: "Registro (alta / edición)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Monitoreo en línea" })).toHaveCount(0);
  });
});
