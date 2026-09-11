import { expect, test } from "./fixtures/coverageFixtures.js";
import type { Page } from "@playwright/test";
import {
  loginAsResponsableCalidad,
  loginAsResponsableProduccion,
  loginAsGerente,
  loginAsOperario,
} from "./fixtures/mockAuth.js";

// ---------------------------------------------------------------------------
// Datos de prueba
// ---------------------------------------------------------------------------

const PROVEEDORES_MOCK = {
  data: [
    {
      id: 1,
      razonSocial: "Tambo El Roble",
      cuit: "30-11111111-1",
      tipo: "tambo",
      empresaId: 10,
      estado: "activa",
    },
  ],
  meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
};

const TAMBOS_MOCK = [
  {
    id: 1,
    nombre: "Establecimiento El Roble",
    ubicacion: "San Rafael",
    activo: true,
    empresaId: 10,
    proveedorId: 1,
    createdAt: "2026-08-01T00:00:00.000Z",
  },
];

// Lote con saldo disponible para consumo parcial (HU-68)
const LOTE_CON_SALDO = {
  id: 1,
  codigo: "LOT-2026-001",
  empresaId: 10,
  proveedorId: 1,
  tamboId: 1,
  materiaPrima: "leche_cruda",
  fechaIngreso: "2026-08-01T12:00:00.000Z",
  clasificacion: "apto",
  destinoInicial: "produccion",
  estado: "registrado",
  parametros: [{ parametro: "ph", valor: 6.8 }],
  cantidad: 1000,
  cantidadDisponible: 600,
  createdAt: "2026-08-01T12:00:00.000Z",
};

// Lote registrado antes de HU-68: sin cantidad total ingresada
const LOTE_SIN_CANTIDAD = {
  id: 2,
  codigo: "LOT-2026-002",
  empresaId: 10,
  proveedorId: 1,
  tamboId: 1,
  materiaPrima: "crema_de_leche",
  fechaIngreso: "2026-08-01T12:00:00.000Z",
  clasificacion: null,
  destinoInicial: "almacenamiento",
  estado: "registrado",
  parametros: [],
  cantidad: null,
  cantidadDisponible: null,
  createdAt: "2026-08-01T12:00:00.000Z",
};

// Lote finalizado: ya no admite nuevos consumos
const LOTE_FINALIZADO = {
  id: 3,
  codigo: "LOT-2026-003",
  empresaId: 10,
  proveedorId: 1,
  tamboId: 1,
  materiaPrima: "leche_cruda",
  fechaIngreso: "2026-07-20T12:00:00.000Z",
  clasificacion: "apto",
  destinoInicial: "produccion",
  estado: "finalizado",
  parametros: [{ parametro: "ph", valor: 6.7 }],
  cantidad: 500,
  cantidadDisponible: 200,
  createdAt: "2026-07-20T12:00:00.000Z",
};

const LOTES_PAGINATED_MOCK = {
  data: [LOTE_CON_SALDO, LOTE_SIN_CANTIDAD, LOTE_FINALIZADO],
  total: 3,
  page: 1,
  limit: 100,
};

const TRAZABILIDAD_MOCK = {
  loteId: 1,
  codigoLote: "LOT-2026-001",
  eventos: [
    {
      tipo: "RECEPCION",
      fecha: "2026-08-01T12:00:00.000Z",
      descripcion: "Ingreso del lote",
      detalle: { materiaPrima: "leche_cruda", cantidad: 1000 },
    },
    {
      tipo: "CLASIFICACION",
      fecha: "2026-08-01T12:05:00.000Z",
      descripcion: "Clasificación automática",
      detalle: { clasificacion: "apto" },
    },
    {
      tipo: "CONSUMO_PARCIAL",
      fecha: "2026-08-02T09:00:00.000Z",
      descripcion: "Consumo hacia producción",
      detalle: { cantidad: 400, loteProduccionCodigo: "LOT-PROD-01" },
    },
    {
      tipo: "FINALIZACION",
      fecha: "2026-08-03T10:00:00.000Z",
      descripcion: "Lote finalizado",
      detalle: { rendimiento: 95, unidadRendimiento: "porcentaje" },
    },
  ],
};

// ---------------------------------------------------------------------------
// Mock de red compartido
// ---------------------------------------------------------------------------

async function mockTrazabilidadDeps(page: Page) {
  // Catch-all: cualquier fetch/XHR no interceptado más abajo devuelve []
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

  await page.route("**/config-param*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  await page.route("**/sensores*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  await page.route("**/proveedores*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PROVEEDORES_MOCK),
    });
  });

  await page.route("**/tambos*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(TAMBOS_MOCK),
    });
  });

  // GET /lotes/producciones — selector de "lote de producción destino"
  await page.route(/\/lotes\/producciones/, async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: 50, codigo: "LOT-PROD-01", createdAt: "2026-08-01T00:00:00.000Z" }]),
    });
  });

  // GET/POST /lotes/:id/consumos — historial vacío por defecto (primer consumo)
  await page.route(/\/lotes\/\d+\/consumos/, async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  // GET /lotes/:id/trazabilidad
  await page.route(/\/lotes\/\d+\/trazabilidad/, async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(TRAZABILIDAD_MOCK),
    });
  });

  // GET /lotes (base paginada)
  await page.route("**/lotes*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(LOTES_PAGINATED_MOCK),
    });
  });
}

async function abrirModalPorTitulo(page: Page, codigo: string, titulo: string) {
  const row = page.getByRole("row").filter({ hasText: codigo });
  await row.getByTitle(titulo).click();
}

// ---------------------------------------------------------------------------
// HU-32 — Historial de trazabilidad completo
// ---------------------------------------------------------------------------

test.describe("HistorialTrazabilidadModal (HU-32)", () => {
  test("muestra el historial completo con eventos de distintos tipos en orden cronológico", async ({
    page,
  }) => {
    await mockTrazabilidadDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await abrirModalPorTitulo(page, "LOT-2026-001", "Historial de trazabilidad completo");

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Historial de trazabilidad completo" })).toBeVisible();
    await expect(dialog.getByText("LOT-2026-001")).toBeVisible();

    const items = dialog.locator("ol > li");
    await expect(items).toHaveCount(4);

    // Orden cronológico: recepción -> clasificación -> consumo -> finalización
    await expect(items.nth(0)).toContainText("Recepción");
    await expect(items.nth(0)).toContainText("Leche cruda");
    await expect(items.nth(1)).toContainText("Clasificación automática");
    await expect(items.nth(1)).toContainText("Apto");
    await expect(items.nth(2)).toContainText("Consumo hacia producción");
    await expect(items.nth(2)).toContainText("400 L → LOT-PROD-01");
    await expect(items.nth(3)).toContainText("Finalización");
    await expect(items.nth(3)).toContainText("Rendimiento: 95 %");
  });

  test("muestra mensaje cuando el lote todavía no tiene eventos de trazabilidad", async ({ page }) => {
    await mockTrazabilidadDeps(page);
    await page.route(/\/lotes\/\d+\/trazabilidad/, async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ loteId: 1, codigoLote: "LOT-2026-001", eventos: [] }),
      });
    });

    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await abrirModalPorTitulo(page, "LOT-2026-001", "Historial de trazabilidad completo");

    await expect(
      page.getByRole("dialog").getByText("Este lote todavía no tiene eventos de trazabilidad registrados."),
    ).toBeVisible();
  });

  test("muestra error y permite reintentar cuando el lote no existe", async ({ page }) => {
    await mockTrazabilidadDeps(page);
    let intentos = 0;
    await page.route(/\/lotes\/\d+\/trazabilidad/, async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      intentos += 1;
      if (intentos === 1) {
        return route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ message: "Lote 1 no encontrado" }),
        });
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(TRAZABILIDAD_MOCK),
      });
    });

    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await abrirModalPorTitulo(page, "LOT-2026-001", "Historial de trazabilidad completo");

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Lote 1 no encontrado")).toBeVisible();

    await dialog.getByRole("button", { name: "Reintentar" }).click();
    await expect(dialog.getByText("Lote 1 no encontrado")).not.toBeVisible();
    await expect(dialog.locator("ol > li")).toHaveCount(4);
  });

  test("un Gerente puede ver el historial completo de trazabilidad", async ({ page }) => {
    await mockTrazabilidadDeps(page);
    await loginAsGerente(page);
    await page.goto("/lotes");

    await abrirModalPorTitulo(page, "LOT-2026-001", "Historial de trazabilidad completo");
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: "Historial de trazabilidad completo" }),
    ).toBeVisible();
  });

  test("un Responsable de producción no ve el botón de historial de trazabilidad completo", async ({
    page,
  }) => {
    await mockTrazabilidadDeps(page);
    await loginAsResponsableProduccion(page);
    await page.goto("/lotes");

    const row = page.getByRole("row").filter({ hasText: "LOT-2026-001" });
    await expect(row.getByTitle("Historial de trazabilidad completo")).not.toBeVisible();
    // Sí ve el panel de trazabilidad y consumo parcial (HU-68)
    await expect(row.getByTitle("Trazabilidad y consumo parcial")).toBeVisible();
  });

  test("un Operario de línea no ve ningún ícono de trazabilidad", async ({ page }) => {
    await mockTrazabilidadDeps(page);
    await loginAsOperario(page);
    await page.goto("/lotes");

    const row = page.getByRole("row").filter({ hasText: "LOT-2026-001" });
    await expect(row.getByTitle("Historial de trazabilidad completo")).not.toBeVisible();
    await expect(row.getByTitle("Trazabilidad y consumo parcial")).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// HU-69 — Anexo de número de remito a lote (visible en la consulta de
// trazabilidad + incluido en la exportación)
// ---------------------------------------------------------------------------

test.describe("HistorialTrazabilidadModal — HU-69 (número de remito)", () => {
  test("muestra proveedor, tambo y número de remito junto al historial", async ({ page }) => {
    await mockTrazabilidadDeps(page);
    await page.addInitScript(() => {
      localStorage.setItem(
        "optilacteo:remito-lote",
        JSON.stringify({
          1: { numeroRemito: "R-000123", registradoEn: "2026-08-01T12:00:00.000Z" },
        }),
      );
    });
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await abrirModalPorTitulo(page, "LOT-2026-001", "Historial de trazabilidad completo");

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Tambo El Roble")).toBeVisible();
    await expect(dialog.getByText("Establecimiento El Roble")).toBeVisible();
    await expect(dialog.getByText("R-000123")).toBeVisible();
  });

  test("muestra 'Sin remito' cuando el lote no tiene número de remito cargado", async ({ page }) => {
    await mockTrazabilidadDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await abrirModalPorTitulo(page, "LOT-2026-001", "Historial de trazabilidad completo");

    await expect(page.getByRole("dialog").getByText("Sin remito")).toBeVisible();
  });

  test("exporta el historial a CSV con proveedor, tambo y número de remito", async ({ page }) => {
    await mockTrazabilidadDeps(page);
    await page.addInitScript(() => {
      localStorage.setItem(
        "optilacteo:remito-lote",
        JSON.stringify({
          1: { numeroRemito: "R-000123", registradoEn: "2026-08-01T12:00:00.000Z" },
        }),
      );
    });
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await abrirModalPorTitulo(page, "LOT-2026-001", "Historial de trazabilidad completo");

    const descargaPromise = page.waitForEvent("download");
    await page.getByRole("dialog").getByRole("button", { name: "Exportar CSV" }).click();
    const descarga = await descargaPromise;

    expect(descarga.suggestedFilename()).toMatch(
      /^trazabilidad-LOT-2026-001-\d{4}-\d{2}-\d{2}\.csv$/,
    );
  });
});

// ---------------------------------------------------------------------------
// HU-68 — Consumo parcial de un lote de ingreso
// ---------------------------------------------------------------------------

test.describe("TrazabilidadLoteModal (HU-68)", () => {
  test("muestra proveedor, tambo de origen, cantidad ingresada y saldo del lote", async ({ page }) => {
    await mockTrazabilidadDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await abrirModalPorTitulo(page, "LOT-2026-001", "Trazabilidad y consumo parcial");

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Detalle de trazabilidad de lote" })).toBeVisible();
    await expect(dialog.getByText("Tambo El Roble")).toBeVisible();
    await expect(dialog.getByText("Establecimiento El Roble")).toBeVisible();
    await expect(dialog.getByText("1000 L", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Consumido:")).toBeVisible();
    await expect(dialog.getByText("600 L", { exact: false })).toBeVisible();
  });

  test("Responsable de calidad registra un consumo parcial (primer consumo) con éxito", async ({ page }) => {
    await mockTrazabilidadDeps(page);

    let requestBody: Record<string, unknown> | undefined;
    await page.route(/\/lotes\/1\/consumos/, async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() === "GET") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
      }
      if (route.request().method() === "POST") {
        requestBody = route.request().postDataJSON();
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: 900,
            loteIngresoId: 1,
            loteProduccionId: 50,
            loteProduccionCodigo: "LOT-PROD-01",
            cantidad: 200,
            usuarioId: 3,
            parametros: [],
            createdAt: "2026-08-05T10:00:00.000Z",
          }),
        });
      }
      return route.continue();
    });

    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await abrirModalPorTitulo(page, "LOT-2026-001", "Trazabilidad y consumo parcial");

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Cantidad \(L\)/).fill("200");
    await dialog.getByLabel("Lote de producción destino").selectOption({ value: "50" });
    await dialog.getByRole("button", { name: "Registrar consumo" }).click();

    await expect.poll(() => requestBody).toEqual({
      cantidad: 200,
      loteProduccionId: 50,
    });
  });

  test("exige al menos un parámetro de calidad si el remanente ya tuvo un consumo previo", async ({
    page,
  }) => {
    await mockTrazabilidadDeps(page);
    await page.route(/\/lotes\/1\/consumos/, async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: 800,
            loteIngresoId: 1,
            loteProduccionId: 51,
            loteProduccionCodigo: "LOT-PROD-00",
            cantidad: 300,
            usuarioId: 3,
            parametros: [],
            createdAt: "2026-08-03T10:00:00.000Z",
          },
        ]),
      });
    });

    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await abrirModalPorTitulo(page, "LOT-2026-001", "Trazabilidad y consumo parcial");

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByText("Este remanente ya tuvo un consumo previo", { exact: false }),
    ).toBeVisible();

    await dialog.getByLabel(/Cantidad \(L\)/).fill("100");
    await dialog.getByRole("button", { name: "Registrar consumo" }).click();

    await expect(
      dialog.getByText(
        "Este remanente ya tuvo un consumo previo: cargá al menos un parámetro de calidad del nuevo análisis",
      ),
    ).toBeVisible();
  });

  test("no permite cargar una cantidad mayor al saldo disponible", async ({ page }) => {
    await mockTrazabilidadDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await abrirModalPorTitulo(page, "LOT-2026-001", "Trazabilidad y consumo parcial");

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Cantidad \(L\)/).fill("601");
    await dialog.getByRole("button", { name: "Registrar consumo" }).click();

    await expect(
      dialog.getByText("No podés consumir más del saldo disponible (600 L)"),
    ).toBeVisible();
  });

  test("muestra error del servidor cuando falla el registro del consumo", async ({ page }) => {
    await mockTrazabilidadDeps(page);
    await page.route(/\/lotes\/1\/consumos/, async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() === "GET") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
      }
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ message: "Saldo insuficiente para este consumo" }),
        });
      }
      return route.continue();
    });

    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await abrirModalPorTitulo(page, "LOT-2026-001", "Trazabilidad y consumo parcial");

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Cantidad \(L\)/).fill("200");
    await dialog.getByRole("button", { name: "Registrar consumo" }).click();

    await expect(dialog.getByText("Saldo insuficiente para este consumo")).toBeVisible();
  });

  test("un Gerente ve el panel de trazabilidad en modo solo lectura, sin formulario de registrar consumo", async ({
    page,
  }) => {
    await mockTrazabilidadDeps(page);
    await loginAsGerente(page);
    await page.goto("/lotes");

    await abrirModalPorTitulo(page, "LOT-2026-001", "Trazabilidad y consumo parcial");

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("CONSUMOS PARCIALES ASOCIADOS")).toBeVisible();
    await expect(dialog.getByText("REGISTRAR CONSUMO")).not.toBeVisible();
    await expect(dialog.getByRole("button", { name: "Registrar consumo" })).not.toBeVisible();
  });

  test("un lote sin cantidad ingresada registrada no admite consumo parcial", async ({ page }) => {
    await mockTrazabilidadDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await abrirModalPorTitulo(page, "LOT-2026-002", "Trazabilidad y consumo parcial");

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByText(
        "Este lote no tiene una cantidad total ingresada registrada: no admite consumo parcial.",
      ),
    ).toBeVisible();
    await expect(
      dialog.getByText("Este lote no admite consumo parcial (sin cantidad ingresada registrada)."),
    ).toBeVisible();
  });

  test("un lote finalizado ya no admite nuevos consumos", async ({ page }) => {
    await mockTrazabilidadDeps(page);
    await loginAsResponsableProduccion(page);
    await page.goto("/lotes");

    await abrirModalPorTitulo(page, "LOT-2026-003", "Trazabilidad y consumo parcial");

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByText("Este lote ya no admite nuevos consumos (estado finalizado o rechazado)."),
    ).toBeVisible();
  });
});
