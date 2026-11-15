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
    await page.getByRole("columnheader", { name: /^Lote$/ }).getByRole("button").click();

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

  test("ordena por las columnas del back con aria-sort y pagina con vuelta a la página 1", async ({ page }) => {
    const pedidos: URL[] = [];
    await mockBase(page);
    await page.route(/\/lotes\/producciones\/consulta\?/, (route) => {
      const url = new URL(route.request().url());
      pedidos.push(url);
      return route.fulfill(json({ data: [LOTE], total: 45, page: Number(url.searchParams.get("page")), limit: 20 }));
    });
    await loginAsResponsableCalidad(page);

    await page.goto("/lotes/consulta");
    const encabezado = (nombre: RegExp) => page.getByRole("columnheader", { name: nombre });
    await expect(encabezado(/^Fecha/)).toHaveAttribute("aria-sort", "descending");
    await expect(encabezado(/^Lote$/)).not.toHaveAttribute("aria-sort");
    // Proveedor y Tambo no se ordenan.
    await expect(encabezado(/^Proveedor/).getByRole("button")).toHaveCount(0);
    await expect(encabezado(/^Tambo/).getByRole("button")).toHaveCount(0);

    const nav = page.getByRole("navigation", { name: "Paginación de lotes" });
    await expect(nav.getByText("Página 1 de 3")).toBeVisible();
    await nav.getByRole("button", { name: "Página siguiente" }).click();
    await expect(nav.getByText("Página 2 de 3")).toBeVisible();
    expect(pedidos.at(-1)!.searchParams.get("page")).toBe("2");

    // Cambiar el orden vuelve a la página 1.
    await encabezado(/^Estado/).getByRole("button").click();
    await expect(encabezado(/^Estado/)).toHaveAttribute("aria-sort", "ascending");
    await expect(nav.getByText("Página 1 de 3")).toBeVisible();
    let ultimo = pedidos.at(-1)!.searchParams;
    expect([ultimo.get("sortBy"), ultimo.get("sortOrder"), ultimo.get("page")]).toEqual(["estado", "ASC", "1"]);

    await encabezado(/^Lotes de origen/).getByRole("button").click();
    await expect(encabezado(/^Lotes de origen/)).toHaveAttribute("aria-sort", "descending");
    ultimo = pedidos.at(-1)!.searchParams;
    expect([ultimo.get("sortBy"), ultimo.get("sortOrder")]).toEqual(["lotesOrigen", "DESC"]);

    // Cambiar un filtro también vuelve a la página 1.
    await nav.getByRole("button", { name: "Página siguiente" }).click();
    await expect(nav.getByText("Página 2 de 3")).toBeVisible();
    await page.getByLabel("Estado").selectOption({ label: "Finalizado" });
    await expect(nav.getByText("Página 1 de 3")).toBeVisible();
    ultimo = pedidos.at(-1)!.searchParams;
    expect([ultimo.get("estado"), ultimo.get("page")]).toEqual(["finalizado", "1"]);
  });

  test("sin resultados muestra el mensaje del back y Limpiar filtros", async ({ page }) => {
    const MENSAJE = "No se encontraron lotes de producción que coincidan con los filtros seleccionados.";
    await mockBase(page);
    await page.route(/\/lotes\/producciones\/consulta\?/, (route) => {
      const conFiltro = new URL(route.request().url()).searchParams.has("estado");
      return route.fulfill(
        json(conFiltro ? { data: [], total: 0, page: 1, limit: 20, mensaje: MENSAJE } : respuestaOk),
      );
    });
    await loginAsResponsableCalidad(page);

    await page.goto("/lotes/consulta");
    await expect(page.getByRole("cell", { name: "LP-0012" })).toBeVisible();
    await page.getByLabel("Estado").selectOption({ label: "Sin consumos" });
    await expect(page.getByText(MENSAJE)).toBeVisible();

    await page.getByRole("main").getByRole("button", { name: "Limpiar filtros" }).last().click();
    await expect(page.getByRole("cell", { name: "LP-0012" })).toBeVisible();
    await expect(page.getByLabel("Estado")).toHaveValue("__todos__");
  });

  test("en mobile el select Ordenar por y el botón de invertir mandan sortBy/sortOrder y page=1", async ({ page }) => {
    const pedidos: URL[] = [];
    await page.setViewportSize({ width: 390, height: 844 });
    await mockBase(page);
    await page.route(/\/lotes\/producciones\/consulta\?/, (route) => {
      const url = new URL(route.request().url());
      pedidos.push(url);
      return route.fulfill(json({ data: [LOTE], total: 45, page: Number(url.searchParams.get("page")), limit: 20 }));
    });
    await loginAsResponsableCalidad(page);

    await page.goto("/lotes/consulta");
    const nav = page.getByRole("navigation", { name: "Paginación de lotes" });
    await nav.getByRole("button", { name: "Página siguiente" }).click();
    await expect(nav.getByText("Página 2 de 3")).toBeVisible();

    await page.getByLabel("Ordenar por").selectOption({ label: "Estado" });
    await expect(nav.getByText("Página 1 de 3")).toBeVisible();
    let ultimo = pedidos.at(-1)!.searchParams;
    expect([ultimo.get("sortBy"), ultimo.get("sortOrder"), ultimo.get("page")]).toEqual(["estado", "ASC", "1"]);

    await nav.getByRole("button", { name: "Página siguiente" }).click();
    await expect(nav.getByText("Página 2 de 3")).toBeVisible();
    await page.getByRole("button", { name: /^Invertir orden/ }).click();
    await expect(nav.getByText("Página 1 de 3")).toBeVisible();
    ultimo = pedidos.at(-1)!.searchParams;
    expect([ultimo.get("sortBy"), ultimo.get("sortOrder"), ultimo.get("page")]).toEqual(["estado", "DESC", "1"]);
  });
});


// HU-77 (criterio 7): detalle contra GET /lotes/producciones/:id/trazabilidad.
// Los eventos llegan desordenados a propósito: el front tiene que ordenarlos.
const TRAZABILIDAD = {
  loteProduccion: LOTE,
  origenes: [],
  eventos: [
    {
      tipo: "CONSUMO_PARCIAL",
      fecha: "2026-10-12T16:00:00.000Z",
      descripcion: "Consumo parcial hacia lote de producción LP-0012",
      detalle: { loteProduccionId: 12 },
      loteOrigenId: 2,
      loteOrigenCodigo: "L-2",
    },
    {
      tipo: "RECEPCION",
      fecha: "2026-10-11T13:05:00.000Z",
      descripcion: "Recepción del lote L-1",
      detalle: {},
      loteOrigenId: 1,
      loteOrigenCodigo: "L-1",
    },
    {
      tipo: "CLASIFICACION",
      fecha: "2026-10-11T13:40:00.000Z",
      descripcion: "Clasificación del lote L-1",
      detalle: {},
      loteOrigenId: 1,
      loteOrigenCodigo: "L-1",
    },
  ],
};

const RUTA_TRAZABILIDAD = /\/lotes\/producciones\/\d+\/trazabilidad$/;

test.describe("HU-77 — Detalle y trazabilidad del lote de producción", () => {
  // Navegador en otro huso: las horas tienen que salir igual en hora AR.
  test.use({ timezoneId: "Asia/Tokyo" });

  test("desde la consulta pide la trazabilidad con el id y muestra los eventos ordenados en hora AR", async ({
    page,
  }) => {
    const pedidos: string[] = [];
    await mockBase(page);
    await page.route(/\/lotes\/producciones\/consulta\?/, (route) => route.fulfill(json(respuestaOk)));
    await page.route(RUTA_TRAZABILIDAD, (route) => {
      pedidos.push(new URL(route.request().url()).pathname);
      return route.fulfill(json(TRAZABILIDAD));
    });
    await loginAsResponsableCalidad(page);

    await page.goto("/lotes/consulta");
    await page.getByRole("row", { name: /LP-0012/ }).getByRole("button", { name: /Ver trazabilidad/ }).click();
    await expect(page).toHaveURL(/\/lotes\/consulta\/12$/);
    await expect(page.getByRole("heading", { name: "LP-0012" })).toBeVisible();
    expect(pedidos).toEqual([expect.stringMatching(/\/lotes\/producciones\/12\/trazabilidad$/)]);

    // Cabecera: listas completas, sin "+N".
    await expect(page.getByRole("list", { name: "Proveedores" }).getByRole("listitem")).toHaveText([
      "Tambos Unidos SRL",
      "Lácteos del Valle",
    ]);
    await expect(page.getByRole("list", { name: "Lotes de origen" }).getByRole("listitem")).toHaveText(["L-1", "L-2"]);
    await expect(page.getByText("En proceso")).toBeVisible();

    const eventos = page.getByRole("list", { name: "Eventos de trazabilidad" }).getByRole("listitem");
    await expect(eventos).toHaveCount(3);
    await expect(eventos.nth(0)).toContainText("Recepción");
    await expect(eventos.nth(0)).toContainText("Lote de origen: L-1");
    await expect(eventos.nth(0).locator("time")).toHaveText(/^11\/10\/2026,? 10:05/);
    await expect(eventos.nth(1)).toContainText("Clasificación automática");
    await expect(eventos.nth(1).locator("time")).toHaveText(/^11\/10\/2026,? 10:40/);
    await expect(eventos.nth(2)).toContainText("Consumo hacia producción");
    await expect(eventos.nth(2)).toContainText("Lote de origen: L-2");
    await expect(eventos.nth(2).locator("time")).toHaveText(/^12\/10\/2026,? (13|01):00/);
  });

  test("un lote sin eventos muestra la cabecera y el aviso de trazabilidad vacía", async ({ page }) => {
    await mockBase(page);
    await page.route(RUTA_TRAZABILIDAD, (route) => route.fulfill(json({ ...TRAZABILIDAD, eventos: [] })));
    await loginAsResponsableCalidad(page);

    await page.goto("/lotes/consulta/12");
    await expect(page.getByRole("heading", { name: "LP-0012" })).toBeVisible();
    await expect(page.getByText("Este lote todavía no tiene eventos de trazabilidad.")).toBeVisible();
    await expect(page.getByRole("list", { name: "Eventos de trazabilidad" })).toHaveCount(0);
  });

  test("un 404 muestra No se encontró el lote", async ({ page }) => {
    await mockBase(page);
    await page.route(RUTA_TRAZABILIDAD, (route) =>
      route.fulfill(json({ message: "Lote de producción 99 no encontrado" }, 404)),
    );
    await loginAsResponsableCalidad(page);

    await page.goto("/lotes/consulta/99");
    await expect(page.getByText("No se encontró el lote")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reintentar" })).toHaveCount(0);
  });

  test("un 500 muestra el error con Reintentar y al reintentar carga el lote", async ({ page }) => {
    let falla = true;
    await mockBase(page);
    await page.route(RUTA_TRAZABILIDAD, (route) =>
      route.fulfill(falla ? json({ message: "Internal server error" }, 500) : json(TRAZABILIDAD)),
    );
    await loginAsResponsableCalidad(page);

    await page.goto("/lotes/consulta/12");
    const alerta = page.getByRole("alert").filter({ hasText: "No se pudo cargar la trazabilidad del lote" });
    await expect(alerta).toBeVisible();

    falla = false;
    await alerta.getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByRole("heading", { name: "LP-0012" })).toBeVisible();
    await expect(alerta).toBeHidden();
  });
});
