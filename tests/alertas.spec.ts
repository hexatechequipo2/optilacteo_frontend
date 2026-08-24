import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import {
  loginAsResponsableProduccion,
  loginAsResponsableCalidad,
} from "./fixtures/mockAuth.ts";

// ---------------------------------------------------------------------------
// Datos de prueba
// ---------------------------------------------------------------------------

const ALERTA_CRITICA = {
  id: 1,
  tipo: "alerta_umbral",
  mensaje: "Valor de pH fuera de umbral en LOT-2026-001",
  nivelAlerta: "critica",
  estado: "abierta",
  accionCorrectiva: null,
  fechaResolucion: null,
  loteId: 1,
  loteCodigo: "LOT-2026-001",
  parametro: "ph",
  sensorId: null,
  leida: false,
  createdAt: "2026-08-01T08:00:00.000Z",
  data: {
    loteId: 1,
    loteCodigo: "LOT-2026-001",
    parametro: "ph",
    materiaPrima: "leche_entera",
    valor: 9.5,
    umbralMin: 6.0,
    umbralMax: 7.5,
    desvioPorcentaje: 26.7,
    nivelAlerta: "critica",
    timestamp: "2026-08-01T08:00:00.000Z",
  },
};

const ALERTA_INFORMATIVA = {
  id: 2,
  tipo: "alerta_umbral",
  mensaje: "Valor de temperatura fuera de umbral en LOT-2026-002",
  nivelAlerta: "informativa",
  estado: "abierta",
  accionCorrectiva: null,
  fechaResolucion: null,
  loteId: 2,
  loteCodigo: "LOT-2026-002",
  parametro: "temperatura",
  sensorId: null,
  leida: false,
  createdAt: "2026-08-01T09:00:00.000Z",
  data: {
    loteId: 2,
    loteCodigo: "LOT-2026-002",
    parametro: "temperatura",
    materiaPrima: "leche_entera",
    valor: 8.5,
    umbralMin: 2.0,
    umbralMax: 8.0,
    desvioPorcentaje: 6.25,
    nivelAlerta: "informativa",
    timestamp: "2026-08-01T09:00:00.000Z",
  },
};

const ALERTA_SENSOR_DESCONECTADO = {
  id: 10,
  tipo: "alerta_sensor_desconectado",
  mensaje: "El sensor SEN-001 no envía datos desde hace 20 minutos",
  nivelAlerta: "critica",
  estado: "abierta",
  accionCorrectiva: null,
  fechaResolucion: null,
  sensorId: 5,
  loteId: null,
  loteCodigo: null,
  parametro: null,
  leida: false,
  createdAt: "2026-08-21T08:00:00.000Z",
  data: {
    sensorId: 5,
    sensorNombre: "SEN-001",
    ultimaLectura: "2026-08-21T07:40:00.000Z",
    minutosSinDatos: 20,
  },
};

const ALERTA_SENSOR_DESCONECTADO_RESUELTA = {
  ...ALERTA_SENSOR_DESCONECTADO,
  id: 11,
  estado: "cerrada",
  fechaResolucion: "2026-08-21T09:00:00.000Z",
};

// ---------------------------------------------------------------------------
// Helper de mocks
// ---------------------------------------------------------------------------

async function mockAlertasDeps(
  page: Page,
  alertas: object[] = [],
) {
  // Catch-all
  await page.route("**/*", async (route) => {
    const rt = route.request().resourceType();
    if (rt === "document" || rt === "stylesheet" || rt === "script" || rt === "image" || rt === "font")
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  // Lotes (para el selector de filtro)
  await page.route("**/lotes*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], total: 0, page: 1, limit: 20 }),
    });
  });

  // Notificaciones (alertas)
  await page.route("**/notificacion*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: alertas,
        total: alertas.length,
        page: 1,
        limit: 100,
      }),
    });
  });
}

// ---------------------------------------------------------------------------
// AlertasPage — HU-25
// ---------------------------------------------------------------------------

test.describe("AlertasPage", () => {
  test.beforeEach(async ({ page }) => {
    await mockAlertasDeps(page, [ALERTA_CRITICA, ALERTA_INFORMATIVA]);
    await loginAsResponsableProduccion(page);
    await page.goto("/alertas");
  });

  test("muestra alerta crítica con parámetro, valor, umbral y lote", async ({ page }) => {
    const card = page.locator("[role='button']").filter({ hasText: "LOT-2026-001" });
    await expect(card).toBeVisible();
    await expect(card.getByText("Crítica")).toBeVisible();
    await expect(card.getByText("pH", { exact: true })).toBeVisible();
    await expect(card.getByText("9.5")).toBeVisible();
    await expect(card.getByText("6–7.5")).toBeVisible();
  });

  test("muestra alerta informativa con badge de nivel correcto", async ({ page }) => {
    const card = page.locator("[role='button']").filter({ hasText: "LOT-2026-002" });
    await expect(card).toBeVisible();
    await expect(card.getByText("Informativa")).toBeVisible();
    await expect(card.getByText("No leída")).toBeVisible();
  });

  test("muestra estado vacío cuando no hay alertas", async ({ page }) => {
  await mockAlertasDeps(page, []);
  await loginAsResponsableProduccion(page);
  await page.goto("/alertas");
  await expect(
    page.getByText("No hay alertas no leídas para los filtros seleccionados."),
  ).toBeVisible();
});

  test("el tab Críticas filtra y muestra solo las alertas críticas", async ({ page }) => {
    await page.getByRole("button", { name: "Críticas" }).click();
    await expect(page.locator("[role='button']").filter({ hasText: "LOT-2026-001" })).toBeVisible();
    await expect(
      page.locator("[role='button']").filter({ hasText: "LOT-2026-002" }),
    ).not.toBeVisible();
  });

    test("muestra los contadores con el recuento correcto por nivel", async ({ page }) => {
    // 1 crítica y 1 informativa — ContadoresAlertas debe reflejar eso
    await expect(page.getByText("1", { exact: true }).first()).toBeVisible();
    // Verificamos los labels de los contadores destacados
    await expect(page.getByText("Crítica", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Informativa", { exact: true }).first()).toBeVisible();
  });

  test("muestra el indicador de sin conexión al WS de notificaciones", async ({ page }) => {
    await expect(page.getByText("Sin conexión al WS de notificaciones")).toBeVisible();
  });
  
  test("muestra el badge con el total de notificaciones no leídas en la campana", async ({ page }) => {
    // Los 2 fixtures tienen leida: false → noLeidasCount = 2
    const campana = page.getByTitle("Notificaciones");
    await expect(campana.locator("span")).toBeVisible();
    await expect(campana.locator("span")).toHaveText("2");
    });
});

test("AlertasPage - un Responsable de calidad ve acceso no autorizado", async ({ page }) => {
  await mockAlertasDeps(page);
  await loginAsResponsableCalidad(page);
  await page.goto("/alertas");
  await expect(page.getByText("Acceso no autorizado")).toBeVisible();
});

test.describe("AlertasPage › Marcar como leída", () => {
  test.beforeEach(async ({ page }) => {
    await mockAlertasDeps(page, [ALERTA_CRITICA]);
    await loginAsResponsableProduccion(page);
    await page.goto("/alertas");
  });

  test("el botón Marcar como leída desaparece y la alerta sale de la vista No leídas", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Marcar como leída", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Marcar como leída", exact: true }).click();
    // La alerta pasa a leída y el filtro "No leídas" la oculta
    await expect(page.getByRole("button", { name: "Marcar como leída", exact: true })).not.toBeVisible();
    await expect(page.getByText("No hay alertas no leídas")).toBeVisible();
  });
});

test("AlertasPage - revierte a No leída si el servidor falla al marcar", async ({ page }) => {
  await mockAlertasDeps(page, [ALERTA_CRITICA]);
  await page.route("**/notificaciones/*/leida", async (route) => {
    if (route.request().method() === "PATCH") {
      return route.fulfill({ status: 500 });
    }
    return route.continue();
  });
  await loginAsResponsableProduccion(page);
  await page.goto("/alertas");

  await page.getByRole("button", { name: "Marcar como leída", exact: true }).click();
  // Rollback: la alerta reaparece con su estado original
  await expect(page.getByText("No leída", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Marcar como leída", exact: true })).toBeVisible();
});

test.describe("AlertasPage › Cierre de alerta", () => {
  test.beforeEach(async ({ page }) => {
    await mockAlertasDeps(page, [ALERTA_CRITICA]);
    // LIFO: mock para PATCH /resolver
    await page.route("**/notificaciones/*/resolver", async (route) => {
      if (route.request().method() === "PATCH") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            estado: "cerrada",
            accionCorrectiva: "Se ajustó el pH con buffer correctivo",
            fechaResolucion: "2026-08-21T10:00:00.000Z",
          }),
        });
      }
      return route.continue();
    });
    await loginAsResponsableProduccion(page);
    await page.goto("/alertas");
    // Clic en el mensaje de la alerta para abrir el panel de detalle
    await page.getByText("Valor de pH fuera de umbral en LOT-2026-001").click();
    await expect(page.getByText("Detalle de alerta")).toBeVisible();
  });

  test("muestra error si se intenta resolver sin ingresar acción correctiva", async ({ page }) => {
    await page.getByRole("button", { name: "Marcar como resuelto" }).click();
    await expect(page.getByText("Ingresá la acción correctiva tomada.")).toBeVisible();
  });

  test("resuelve la alerta con acción correctiva válida y cierra el panel", async ({ page }) => {
    await page.getByLabel("Acción correctiva tomada").fill("Se ajustó el pH con buffer correctivo");
    await page.getByRole("button", { name: "Marcar como resuelto" }).click();
    // Panel cerrado + alerta resuelta y leída → desaparece del filtro "No leídas"
    await expect(page.getByText("Detalle de alerta")).not.toBeVisible();
    await expect(page.getByText("No hay alertas no leídas")).toBeVisible();
  });
});

test("AlertasPage - muestra error si el servidor falla al cerrar la alerta", async ({ page }) => {
  await mockAlertasDeps(page, [ALERTA_CRITICA]);
  // LIFO: override solo el PATCH /resolver → 500
  await page.route("**/notificaciones/*/resolver", async (route) => {
    if (route.request().method() === "PATCH") {
      return route.fulfill({ status: 500 });
    }
    return route.continue();
  });
  await loginAsResponsableProduccion(page);
  await page.goto("/alertas");
  await page.getByText("Valor de pH fuera de umbral en LOT-2026-001").click();
  await expect(page.getByText("Detalle de alerta")).toBeVisible();
  await page.getByLabel("Acción correctiva tomada").fill("Acción de prueba");
  await page.getByRole("button", { name: "Marcar como resuelto" }).click();
  await expect(page.getByText("No se pudo cerrar la alerta. Reintentá en unos segundos.")).toBeVisible();
});

// ---------------------------------------------------------------------------
// HU-31 — Alertas ante sensor desconectado
// ---------------------------------------------------------------------------

test.describe("AlertasPage › Sensor desconectado", () => {
  test("muestra la card con nombre del sensor, tiempo sin datos y estado Abierta", async ({ page }) => {
    await mockAlertasDeps(page, [ALERTA_SENSOR_DESCONECTADO]);
    await loginAsResponsableProduccion(page);
    await page.goto("/alertas");

    const card = page.locator("[role='button']").filter({ hasText: "SEN-001" });
    await expect(card).toBeVisible();
    await expect(card.getByText("Sensor desconectado — SEN-001")).toBeVisible();
    await expect(card.getByText("20 min", { exact: true })).toBeVisible();
    await expect(card.getByText("Crítica")).toBeVisible();
    await expect(card.getByText("Abierta")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Marcar como leída", exact: true }),
    ).toBeVisible();
  });

  test("muestra el badge Cerrada cuando el sensor volvió a enviar datos", async ({ page }) => {
    await mockAlertasDeps(page, [ALERTA_SENSOR_DESCONECTADO_RESUELTA]);
    await loginAsResponsableProduccion(page);
    await page.goto("/alertas");

    const card = page.locator("[role='button']").filter({ hasText: "SEN-001" });
    await expect(card).toBeVisible();
    await expect(card.getByText("Cerrada")).toBeVisible();
    await expect(card.getByText("Abierta")).not.toBeVisible();
  });

    test("el botón Marcar como leída desaparece al hacer clic", async ({ page }) => {
    await mockAlertasDeps(page, [ALERTA_SENSOR_DESCONECTADO]);
    await loginAsResponsableProduccion(page);
    await page.goto("/alertas");

    await page.getByRole("button", { name: "Marcar como leída", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Marcar como leída", exact: true }),
    ).not.toBeVisible();
    await expect(page.getByText("No hay alertas no leídas")).toBeVisible();
  });

    test("abre el panel de detalle al hacer clic en la card", async ({ page }) => {
    await mockAlertasDeps(page, [ALERTA_SENSOR_DESCONECTADO]);
    await loginAsResponsableProduccion(page);
    await page.goto("/alertas");

    await page.locator("[role='button']").filter({ hasText: "SEN-001" }).click();
    await expect(
      page.getByText(
        "Esta alerta se resuelve automáticamente en cuanto el sensor vuelva a enviar datos — no requiere ninguna acción manual.",
      ),
    ).toBeVisible();
  });

    test("el panel de detalle muestra el mensaje de resolución cuando la alerta está cerrada", async ({ page }) => {
    await mockAlertasDeps(page, [ALERTA_SENSOR_DESCONECTADO_RESUELTA]);
    await loginAsResponsableProduccion(page);
    await page.goto("/alertas");

    await page.locator("[role='button']").filter({ hasText: "SEN-001" }).click();
    await expect(
      page.getByText(
        "El sensor volvió a enviar datos y la alerta se resolvió automáticamente",
      ),
    ).toBeVisible();
  });

  test("revierte a No leída si el servidor falla al marcar como leída", async ({ page }) => {
    await mockAlertasDeps(page, [ALERTA_SENSOR_DESCONECTADO]);
    await page.route("**/notificaciones/*/leida", async (route) => {
      if (route.request().method() === "PATCH") {
        return route.fulfill({ status: 500 });
      }
      return route.continue();
    });
    await loginAsResponsableProduccion(page);
    await page.goto("/alertas");

    await page.getByRole("button", { name: "Marcar como leída", exact: true }).click();
    await expect(page.getByText("No leída", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Marcar como leída", exact: true }),
    ).toBeVisible();
  });

    test("muestra error cuando el servidor falla al cargar las alertas", async ({ page }) => {
    await mockAlertasDeps(page, []);
    await page.route("**/notificacion*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      return route.fulfill({ status: 500 });
    });
    await loginAsResponsableProduccion(page);
    await page.goto("/alertas");

    await expect(page.getByText("No se pudieron cargar las alertas.")).toBeVisible();
  });
});