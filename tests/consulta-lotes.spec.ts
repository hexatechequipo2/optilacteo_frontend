import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import { loginAsResponsableCalidad } from "./fixtures/mockAuth.ts";

// HU-77: ConsultaLotesPage conectada a GET /lotes/producciones/consulta.

const LOTE = {
  id: 12,
  codigo: "LP-0012",
  fecha: "2026-10-12T15:30:00.000Z",
  estado: "en_proceso",
  estadoDescripcion: "Al menos uno de los lotes de ingreso consumidos sigue abierto.",
  cantidadLotesOrigen: 2,
  cantidadConsumidaPorUnidad: { litros: 500 },
  proveedores: [
    { id: 7, nombre: "Tambos Unidos SRL" },
    { id: 8, nombre: "Lácteos del Valle" },
  ],
  tambos: [{ id: 3, nombre: "Tambo Norte" }],
  lotesOrigen: [
    { id: 1, codigo: "L-1" },
    { id: 2, codigo: "L-2" },
  ],
  ultimoConsumo: "2026-10-12T16:00:00.000Z",
};

const json = (body: unknown, status = 200) => ({
  status,
  contentType: "application/json",
  body: JSON.stringify(body),
});

async function mockBase(page: Page) {
  // Todo fetch/xhr no mockeado responde [] (campana, contadores del sidebar, etc.).
  await page.route("**/*", (route) => {
    const rt = route.request().resourceType();
    return rt === "fetch" || rt === "xhr" ? route.fulfill(json([])) : route.continue();
  });
  // La campana del Layout espera un paginado, no [].
  await page.route(/\/notificaciones(\?|$)/, (route) =>
    route.fulfill(json({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } })),
  );
  await page.route("**/notificaciones/no-leidas/count", (route) => route.fulfill(json({ total: 0 })));
  await page.route(/\/proveedores\?/, (route) =>
    route.fulfill(
      json({
        data: [{ id: 7, razonSocial: "Tambos Unidos SRL", cuit: "30-1", tipo: "tambo", empresaId: 10, estado: "activa" }],
        meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
      }),
    ),
  );
  await page.route(/\/tambos$/, (route) =>
    route.fulfill(
      json([{ id: 3, nombre: "Tambo Norte", activo: true, empresaId: 10, proveedorId: 7, createdAt: "2026-08-01T00:00:00.000Z" }]),
    ),
  );
}

const respuestaOk = { data: [LOTE], total: 1, page: 1, limit: 20 };

test.describe("HU-77 — Consulta de lotes de producción", () => {
  test("los filtros y el orden viajan al back con el formato esperado", async ({ page }) => {
    const pedidos: URL[] = [];
    await mockBase(page);
    await page.route(/\/lotes\/producciones\/consulta\?/, (route) => {
      pedidos.push(new URL(route.request().url()));
      return route.fulfill(json(respuestaOk));
    });
    await loginAsResponsableCalidad(page);

    await page.goto("/lotes/consulta");
    await expect(page.getByRole("cell", { name: "LP-0012" })).toBeVisible();
    await expect(page.getByRole("cell").filter({ hasText: "Tambos Unidos SRL" })).toContainText("+1");

    // Sin filtros: orden por defecto, sin parámetros de filtro.
    const inicial = pedidos.at(-1)!.searchParams;
    expect(inicial.get("sortBy")).toBe("fecha");
    expect(inicial.get("sortOrder")).toBe("DESC");
    expect(inicial.has("fechaDesde")).toBe(false);
    expect(inicial.has("proveedorId")).toBe(false);

    // Re-renders sin cambio de filtros no vuelven a consultar.
    const cantidad = pedidos.length;
    await page.waitForTimeout(500);
    expect(pedidos.length).toBe(cantidad);

    await page.getByLabel("Desde").fill("2026-10-10");
    await page.getByLabel("Hasta").fill("2026-10-15");
    await page.getByLabel("Proveedor").selectOption({ label: "Tambos Unidos SRL" });
    await page.getByLabel("Tambo", { exact: true }).selectOption({ label: "Tambo Norte" });
    await page.getByLabel("Estado").selectOption({ label: "En proceso" });
    await page.getByRole("columnheader", { name: /^Lote/ }).getByRole("button").click();

    await expect
      .poll(() => pedidos.at(-1)!.searchParams.get("sortBy"))
      .toBe("codigo");
    const final = pedidos.at(-1)!.searchParams;
    expect(final.get("fechaDesde")).toBe("2026-10-10");
    expect(final.get("fechaHasta")).toBe("2026-10-15");
    expect(final.get("proveedorId")).toBe("7");
    expect(final.get("tamboId")).toBe("3");
    expect(final.get("estado")).toBe("en_proceso");
    expect(final.get("sortOrder")).toBe("ASC");
  });

  test("un 500 muestra el error con Reintentar, no el estado vacío", async ({ page }) => {
    let falla = true;
    await mockBase(page);
    await page.route(/\/lotes\/producciones\/consulta\?/, (route) =>
      route.fulfill(falla ? json({ message: "Internal server error" }, 500) : json(respuestaOk)),
    );
    await loginAsResponsableCalidad(page);

    await page.goto("/lotes/consulta");
    const alerta = page.getByRole("alert").filter({ hasText: "No se pudieron cargar los lotes de producción" });
    await expect(alerta).toBeVisible();
    await expect(page.getByText("No se encontraron lotes")).toBeHidden();

    falla = false;
    await alerta.getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByRole("cell", { name: "LP-0012" })).toBeVisible();
    await expect(alerta).toBeHidden();
  });
});
