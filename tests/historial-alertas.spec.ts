import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import { loginAsResponsableCalidad, loginAsResponsableProduccion } from "./fixtures/mockAuth.ts";

const HISTORIAL_ABIERTA = {
  id: 1, tipo: "alerta_umbral",
  mensaje: "Valor de pH fuera de umbral en LOT-2026-001",
  nivelAlerta: "critica", estado: "abierta",
  accionCorrectiva: null, fechaResolucion: null, cerradaEn: null,
  loteId: 1, loteCodigo: "LOT-2026-001", parametro: "ph", sensorId: null,
  leida: false, createdAt: "2026-08-01T08:00:00.000Z",
  data: {
    loteId: 1, loteCodigo: "LOT-2026-001", parametro: "ph", materiaPrima: "leche_entera",
    valor: 9.5, umbralMin: 6.0, umbralMax: 7.5, desvioPorcentaje: 26.7,
    nivelAlerta: "critica", timestamp: "2026-08-01T08:00:00.000Z",
  },
};

const HISTORIAL_CERRADA = {
  id: 2, tipo: "alerta_umbral",
  mensaje: "Valor de temperatura fuera de umbral en LOT-2026-002",
  nivelAlerta: "informativa", estado: "cerrada",
  accionCorrectiva: "Se ajustó la temperatura del tanque",
  fechaResolucion: "2026-08-02T10:00:00.000Z", cerradaEn: "2026-08-02T10:00:00.000Z",
  loteId: 2, loteCodigo: "LOT-2026-002", parametro: "temperatura", sensorId: null,
  leida: true, createdAt: "2026-08-02T08:00:00.000Z",
  data: {
    loteId: 2, loteCodigo: "LOT-2026-002", parametro: "temperatura", materiaPrima: "leche_entera",
    valor: 8.5, umbralMin: 2.0, umbralMax: 8.0, desvioPorcentaje: 6.25,
    nivelAlerta: "informativa", timestamp: "2026-08-02T08:00:00.000Z",
  },
};

async function mockHistorialDeps(page: Page, alertas: object[] = []) {
  await page.route("**/*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await page.route("**/lotes*", async (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          { id: 1, codigo: "LOT-2026-001" },
          { id: 2, codigo: "LOT-2026-002" },
        ],
        total: 2,
        page: 1,
        limit: 20,
      }),
    });
  });

  await page.route("**/notificacion*", async (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], total: 0, page: 1, limit: 20 }),
    });
  });

  await page.route("**/notificaciones/historial*", async (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: alertas,
        total: alertas.length,
        page: 1,
        limit: 20,
      }),
    });
  });

  await page.route("**/notificaciones/historial/exportar/*", async (route) => {
    return route.fulfill({
      status: 200,
      contentType: "text/csv",
      body: "fecha,lote\n",
    });
  });
}

test.describe("HistorialAlertasPage", () => {
  test.beforeEach(async ({ page }) => {
    await mockHistorialDeps(page, [HISTORIAL_ABIERTA, HISTORIAL_CERRADA]);
    await loginAsResponsableCalidad(page);
    await page.goto("/alertas/historial");
  });

  test("muestra lote, parámetro, nivel y estado de cada alerta en la tabla", async ({ page }) => {
    const tabla = page.locator("table");
    await expect(tabla.getByText("LOT-2026-001")).toBeVisible();
    await expect(tabla.getByText("pH", { exact: true })).toBeVisible();
    await expect(tabla.getByText("Crítica")).toBeVisible();
    await expect(tabla.getByText("Abierta")).toBeVisible();
    await expect(tabla.getByText("LOT-2026-002")).toBeVisible();
    await expect(tabla.getByText("Cerrada")).toBeVisible();
  });

  test("muestra la acción correctiva de una alerta cerrada", async ({ page }) => {
    await expect(
      page.locator("table").getByText("Se ajustó la temperatura del tanque"),
    ).toBeVisible();
  });

   test("filtra por nivel al hacer Buscar y muestra solo las alertas del nivel seleccionado", async ({ page }) => {
    // LIFO: override con mayor prioridad que el de mockHistorialDeps,
    // responde según el parámetro nivelAlerta en la URL.
    await page.route("**/notificaciones/historial*", async (route) => {
      const url = route.request().url();
      if (url.includes("nivelAlerta=critica")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: [HISTORIAL_ABIERTA], total: 1, page: 1, limit: 20 }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [HISTORIAL_ABIERTA, HISTORIAL_CERRADA], total: 2, page: 1, limit: 20 }),
      });
    });

    const tabla = page.locator("table");

    // Estado inicial: ambas alertas visibles
    await expect(tabla.getByText("LOT-2026-001")).toBeVisible();
    await expect(tabla.getByText("LOT-2026-002")).toBeVisible();

    // Aplicar filtro por nivel Crítica
    await page.locator("#historial-alertas-filtro-nivel").selectOption("critica");
    await page.getByRole("button", { name: "Buscar" }).click();

    // Solo queda la alerta crítica
    await expect(tabla.getByText("LOT-2026-001")).toBeVisible();
    await expect(tabla.getByText("LOT-2026-002")).not.toBeVisible();
  });
});

test("HistorialAlertasPage - un Responsable de producción ve acceso no autorizado", async ({ page }) => {
  await mockHistorialDeps(page, []);
  await loginAsResponsableProduccion(page);
  await page.goto("/alertas/historial");

  await expect(page.getByText("Acceso no autorizado")).toBeVisible();
});

test("HistorialAlertasPage - muestra estado vacío cuando no hay alertas para los filtros", async ({ page }) => {
  await mockHistorialDeps(page, []);
  await loginAsResponsableCalidad(page);
  await page.goto("/alertas/historial");

  await expect(page.getByText("No hay alertas para los filtros seleccionados")).toBeVisible();
});

test("HistorialAlertasPage - muestra error si fecha hasta es anterior a fecha desde", async ({ page }) => {
  await mockHistorialDeps(page, []);
  await loginAsResponsableCalidad(page);
  await page.goto("/alertas/historial");

  await page.locator("#historial-alertas-filtro-desde").fill("2026-08-31");
  await page.locator("#historial-alertas-filtro-hasta").fill("2026-08-01");
  await page.getByRole("button", { name: "Buscar" }).click();

  await expect(page.getByText("La fecha hasta no puede ser anterior a la fecha desde.")).toBeVisible();
});

test("HistorialAlertasPage - muestra error si el servidor falla al cargar el historial", async ({ page }) => {
  await mockHistorialDeps(page, []);
  await page.route("**/notificaciones/historial*", async (route) => {
    return route.fulfill({ status: 500 });
  });
  await loginAsResponsableCalidad(page);
  await page.goto("/alertas/historial");

  await expect(page.getByText("No se pudo cargar el historial de alertas.")).toBeVisible();
});

test("HistorialAlertasPage - muestra error si el servidor falla al exportar CSV", async ({ page }) => {
  await mockHistorialDeps(page, [HISTORIAL_ABIERTA]);
  await page.route("**/notificaciones/historial/exportar/*", async (route) => {
    return route.fulfill({ status: 500 });
  });
  await loginAsResponsableCalidad(page);
  await page.goto("/alertas/historial");

  await page.getByRole("button", { name: "CSV" }).click();
  await expect(page.getByText("No se pudo exportar el historial a CSV.")).toBeVisible();
});

