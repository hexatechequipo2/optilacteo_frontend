import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import {
  loginAsAdministrador,
  loginAsGerente,
  loginAsOperario,
  loginAsResponsableCalidad,
  loginAsResponsableProduccion,
  quitarPermisos,
} from "./fixtures/mockAuth.ts";

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

// ---------------------------------------------------------------------------
// HU-77 · Consulta de lotes de producción (Sprint 6)
// ---------------------------------------------------------------------------
//
// HU-77-D1 (diferencia documentada): GET /proveedores pide recepcion:READ
// (proveedor.controller.ts:37), la consulta pide trazabilidad:READ
// (lote.controller.ts:86) y GET /tambos acepta cualquiera de los dos
// (tambo.controller.ts:41). Un rol con trazabilidad sin recepción ve la
// consulta pero no puede filtrar por proveedor. Los tests siguen al backend.

const RUTA_CONSULTA = /\/lotes\/producciones\/consulta\?/;
const menuLateral = (page: Page) => page.getByRole("complementary");

function diferido() {
  let liberar!: () => void;
  const promesa = new Promise<void>((r) => (liberar = r));
  return { promesa, liberar };
}

// Un pedido abortado por el front no se puede completar: se ignora el error.
async function fulfillSiSigue(route: Parameters<Parameters<Page["route"]>[1]>[0], body: unknown, status = 200) {
  try {
    await route.fulfill(json(body, status));
  } catch {
    // pedido cancelado por el AbortController
  }
}

test.describe("HU-77 · Consulta de lotes de producción", () => {
  // --- Unitarios: service ---------------------------------------------------

  test("HU-77 · el primer pedido manda page=1 y limit=20", async ({ page }) => {
    const pedidos: URL[] = [];
    await mockBase(page);
    await page.route(RUTA_CONSULTA, (route) => {
      pedidos.push(new URL(route.request().url()));
      return route.fulfill(json(respuestaOk));
    });
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/consulta");
    await expect(page.getByRole("cell", { name: "LP-0012" })).toBeVisible();

    const params = pedidos[0].searchParams;
    expect(params.get("page")).toBe("1");
    expect(params.get("limit")).toBe("20");
  });

  test("HU-77 · un 400 de la consulta muestra el mensaje del backend", async ({ page }) => {
    await mockBase(page);
    await page.route(RUTA_CONSULTA, (route) =>
      route.fulfill(json({ message: ["fechaDesde must be a valid ISO 8601 date string"] }, 400)),
    );
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/consulta");

    await expect(
      page.getByRole("alert").filter({ hasText: "fechaDesde must be a valid ISO 8601 date string" }),
    ).toBeVisible();
  });

  test("HU-77 · un error de red en la consulta muestra el mensaje genérico con Reintentar", async ({ page }) => {
    await mockBase(page);
    await page.route(RUTA_CONSULTA, (route) => route.abort("failed"));
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/consulta");

    const alerta = page.getByRole("alert").filter({ hasText: "No se pudieron cargar los lotes de producción" });
    await expect(alerta).toBeVisible();
    await expect(alerta.getByRole("button", { name: "Reintentar" })).toBeVisible();
  });

  test("HU-77 · detalle: un 403 muestra el mensaje del backend y no 'No se encontró el lote'", async ({ page }) => {
    await mockBase(page);
    await page.route(RUTA_TRAZABILIDAD, (route) =>
      route.fulfill(json({ message: "No tenés permiso sobre Trazabilidad." }, 403)),
    );
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/consulta/12");

    await expect(page.getByRole("alert").filter({ hasText: "No tenés permiso sobre Trazabilidad." })).toBeVisible();
    await expect(page.getByText("No se encontró el lote")).toHaveCount(0);
  });

  // --- Unitarios: hooks (loading / error / data) ----------------------------

  test("HU-77 · en la primera carga muestra 'Cargando lotes…' sin el estado vacío", async ({ page }) => {
    const gate = diferido();
    await mockBase(page);
    await page.route(RUTA_CONSULTA, async (route) => {
      await gate.promesa;
      await fulfillSiSigue(route, respuestaOk);
    });
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/consulta");

    await expect(page.getByText("Cargando lotes…")).toBeVisible();
    await expect(page.getByText("No se encontraron lotes")).toHaveCount(0);

    gate.liberar();
    await expect(page.getByRole("cell", { name: "LP-0012" })).toBeVisible();
    await expect(page.getByText("Cargando lotes…")).toHaveCount(0);
  });

  test("HU-77 · una respuesta tardía de un filtro anterior no pisa la actual", async ({ page }) => {
    const gate = diferido();
    const LOTE_FINALIZADO = { ...LOTE, id: 99, codigo: "LP-0099", estado: "finalizado" };
    await mockBase(page);
    await page.route(RUTA_CONSULTA, async (route) => {
      const estado = new URL(route.request().url()).searchParams.get("estado");
      if (estado === "finalizado") {
        return fulfillSiSigue(route, { data: [LOTE_FINALIZADO], total: 1, page: 1, limit: 20 });
      }
      // El pedido sin filtro queda colgado hasta después del filtrado.
      await gate.promesa;
      await fulfillSiSigue(route, respuestaOk);
    });
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/consulta");
    await expect(page.getByText("Cargando lotes…")).toBeVisible();

    await page.getByLabel("Estado").selectOption({ label: "Finalizado" });
    await expect(page.getByRole("cell", { name: "LP-0099" })).toBeVisible();

    gate.liberar();
    await page.waitForTimeout(500);
    await expect(page.getByRole("cell", { name: "LP-0099" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "LP-0012" })).toHaveCount(0);
  });

  test("HU-77 · si la página pedida quedó fuera de rango, salta a la última con datos", async ({ page }) => {
    const pedidos: URL[] = [];
    let seBorraron = false;
    await mockBase(page);
    await page.route(RUTA_CONSULTA, (route) => {
      const url = new URL(route.request().url());
      pedidos.push(url);
      const pagina = Number(url.searchParams.get("page"));
      if (pagina === 3) {
        // Entre una consulta y otra se borraron lotes: ya hay solo 21 (2 páginas).
        seBorraron = true;
        return route.fulfill(json({ data: [], total: 21, page: 3, limit: 20 }));
      }
      return route.fulfill(json({ data: [LOTE], total: seBorraron ? 21 : 45, page: pagina, limit: 20 }));
    });
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/consulta");
    const nav = page.getByRole("navigation", { name: "Paginación de lotes" });
    await expect(nav.getByText("Página 1 de 3")).toBeVisible();

    await nav.getByRole("button", { name: "Página siguiente" }).click();
    await expect(nav.getByText("Página 2 de 3")).toBeVisible();
    await nav.getByRole("button", { name: "Página siguiente" }).click();

    await expect(nav.getByText("Página 2 de 2")).toBeVisible();
    expect(pedidos.at(-1)!.searchParams.get("page")).toBe("2");
    await expect(page.getByRole("cell", { name: "LP-0012" })).toBeVisible();
  });

  test("HU-77 · detalle: muestra 'Cargando lote…' con aria-busy mientras carga", async ({ page }) => {
    const gate = diferido();
    await mockBase(page);
    await page.route(RUTA_TRAZABILIDAD, async (route) => {
      await gate.promesa;
      await fulfillSiSigue(route, TRAZABILIDAD);
    });
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/consulta/12");

    await expect(page.locator('[aria-busy="true"]').filter({ hasText: "Cargando lote…" })).toBeVisible();
    gate.liberar();
    await expect(page.getByRole("heading", { name: "LP-0012" })).toBeVisible();
    await expect(page.getByText("Cargando lote…")).toHaveCount(0);
  });

  test("HU-77 · detalle: un id inválido en la URL muestra 'No se encontró el lote' sin llamar al back", async ({ page }) => {
    const pedidos: string[] = [];
    await mockBase(page);
    await page.route(RUTA_TRAZABILIDAD, (route) => {
      pedidos.push(route.request().url());
      return route.fulfill(json(TRAZABILIDAD));
    });
    await loginAsResponsableCalidad(page);

    for (const id of ["abc", "0", "-3", "1.5"]) {
      await page.goto(`/lotes/consulta/${id}`);
      await expect(page.getByText("No se encontró el lote"), id).toBeVisible();
    }
    expect(pedidos).toEqual([]);
  });

  // --- Unitarios: componentes (render, interacción, validaciones) -----------

  test("HU-77 · si Desde es posterior a Hasta avisa y no manda las fechas", async ({ page }) => {
    const pedidos: URL[] = [];
    await mockBase(page);
    await page.route(RUTA_CONSULTA, (route) => {
      pedidos.push(new URL(route.request().url()));
      return route.fulfill(json(respuestaOk));
    });
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/consulta");
    await expect(page.getByRole("cell", { name: "LP-0012" })).toBeVisible();

    await page.getByLabel("Desde").fill("2026-10-15");
    await page.getByLabel("Hasta").fill("2026-10-10");

    await expect(
      page.getByText('La fecha "Desde" no puede ser posterior a "Hasta". El filtro de período no se aplica.'),
    ).toBeVisible();
    await expect.poll(() => pedidos.at(-1)!.searchParams.has("fechaDesde")).toBe(false);
    expect(pedidos.at(-1)!.searchParams.has("fechaHasta")).toBe(false);
  });

  test("HU-77 · sin filtros y sin lotes muestra el texto local sin Limpiar filtros", async ({ page }) => {
    await mockBase(page);
    await page.route(RUTA_CONSULTA, (route) => route.fulfill(json({ data: [], total: 0, page: 1, limit: 20 })));
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/consulta");

    await expect(page.getByText("No se encontraron lotes")).toBeVisible();
    await expect(page.getByText("Todavía no hay lotes de producción registrados.")).toBeVisible();
    await expect(page.getByRole("main").getByRole("button", { name: "Limpiar filtros" })).toHaveCount(0);
  });

  test("HU-77 · el badge de estado muestra las tres etiquetas con la descripción en el title", async ({ page }) => {
    const lotes = [
      { ...LOTE, id: 1, codigo: "LP-0001", estado: "sin_consumos", estadoDescripcion: "Todavía no consumió lotes de ingreso." },
      { ...LOTE, id: 2, codigo: "LP-0002", estado: "en_proceso", estadoDescripcion: "Al menos uno sigue abierto." },
      { ...LOTE, id: 3, codigo: "LP-0003", estado: "finalizado", estadoDescripcion: "Todos sus lotes de ingreso están cerrados." },
    ];
    await mockBase(page);
    await page.route(RUTA_CONSULTA, (route) => route.fulfill(json({ data: lotes, total: 3, page: 1, limit: 20 })));
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/consulta");

    const esperado: [string, string, string][] = [
      ["LP-0001", "Sin consumos", "Todavía no consumió lotes de ingreso."],
      ["LP-0002", "En proceso", "Al menos uno sigue abierto."],
      ["LP-0003", "Finalizado", "Todos sus lotes de ingreso están cerrados."],
    ];
    for (const [codigo, etiqueta, descripcion] of esperado) {
      const badge = page.getByRole("row", { name: new RegExp(codigo) }).getByTitle(descripcion);
      await expect(badge, codigo).toHaveText(etiqueta);
    }
  });

  test("HU-77 · si fallan los proveedores, ese combo queda deshabilitado con aviso y el resto sigue andando", async ({ page }) => {
    await mockBase(page);
    await page.route(/\/proveedores\?/, (route) => route.fulfill(json({ message: "x" }, 500)));
    await page.route(RUTA_CONSULTA, (route) => route.fulfill(json(respuestaOk)));
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/consulta");

    await expect(page.getByLabel("Proveedor")).toBeDisabled();
    await expect(page.getByText("No se pudieron cargar los proveedores.")).toBeVisible();
    await expect(page.getByLabel("Tambo", { exact: true })).toBeEnabled();
    await expect(page.getByRole("cell", { name: "LP-0012" })).toBeVisible();
  });

  test("HU-77 · si fallan los tambos, ese combo queda deshabilitado con aviso y el resto sigue andando", async ({ page }) => {
    await mockBase(page);
    await page.route(/\/tambos$/, (route) => route.fulfill(json({ message: "x" }, 500)));
    await page.route(RUTA_CONSULTA, (route) => route.fulfill(json(respuestaOk)));
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/consulta");

    await expect(page.getByLabel("Tambo", { exact: true })).toBeDisabled();
    await expect(page.getByText("No se pudieron cargar los tambos.")).toBeVisible();
    await expect(page.getByLabel("Proveedor")).toBeEnabled();
    await expect(page.getByRole("cell", { name: "LP-0012" })).toBeVisible();
  });

  test("HU-77 · detalle: un evento de tipo desconocido se muestra como 'Evento'", async ({ page }) => {
    await mockBase(page);
    await page.route(RUTA_TRAZABILIDAD, (route) =>
      route.fulfill(
        json({
          ...TRAZABILIDAD,
          eventos: [
            {
              tipo: "TIPO_NUEVO_DEL_BACK",
              fecha: "2026-10-11T13:05:00.000Z",
              descripcion: "Evento que el front todavía no conoce",
              detalle: {},
              loteOrigenId: 1,
              loteOrigenCodigo: "L-1",
            },
          ],
        }),
      ),
    );
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/consulta/12");

    const eventos = page.getByRole("list", { name: "Eventos de trazabilidad" }).getByRole("listitem");
    await expect(eventos).toHaveCount(1);
    await expect(eventos.first()).toContainText("Evento");
    await expect(eventos.first()).toContainText("Lote de origen: L-1");
  });

  test("HU-77 · detalle: 'Volver al listado' vuelve a /lotes/consulta", async ({ page }) => {
    await mockBase(page);
    await page.route(RUTA_CONSULTA, (route) => route.fulfill(json(respuestaOk)));
    await page.route(RUTA_TRAZABILIDAD, (route) => route.fulfill(json(TRAZABILIDAD)));
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/consulta/12");
    await expect(page.getByRole("heading", { name: "LP-0012" })).toBeVisible();

    await page.getByRole("button", { name: "Volver al listado" }).click();

    await expect(page).toHaveURL(/\/lotes\/consulta$/);
    await expect(page.getByRole("cell", { name: "LP-0012" })).toBeVisible();
  });

  // --- Permisos por rol (matriz por defecto de mockAuth.ts) -----------------

  const ROLES_CON_CONSULTA: [string, (page: Page) => Promise<void>][] = [
    ["Gerente", loginAsGerente],
    ["Operario de línea", loginAsOperario],
    ["Responsable de producción", loginAsResponsableProduccion],
    ["Responsable de calidad", loginAsResponsableCalidad],
  ];

  for (const [rol, login] of ROLES_CON_CONSULTA) {
    test(`HU-77 · ${rol} ve 'Consulta de lotes' en el Sidebar y el listado`, async ({ page }) => {
      await mockBase(page);
      await page.route(RUTA_CONSULTA, (route) => route.fulfill(json(respuestaOk)));
      await login(page);
      await page.goto("/lotes/consulta");

      await expect(menuLateral(page).getByText("Consulta de lotes", { exact: true })).toBeVisible();
      await expect(page.getByRole("cell", { name: "LP-0012" })).toBeVisible();
    });
  }

  test("HU-77 · Administrador no ve el ítem y en /lotes/consulta ve 'Acceso no autorizado' sin hacer la consulta", async ({ page }) => {
    const pedidos: string[] = [];
    await mockBase(page);
    await page.route(RUTA_CONSULTA, (route) => {
      pedidos.push(route.request().url());
      return route.fulfill(json(respuestaOk));
    });
    await loginAsAdministrador(page);
    await page.goto("/lotes/consulta");

    await expect(page.getByText("Acceso no autorizado")).toBeVisible();
    await expect(menuLateral(page).getByText("Consulta de lotes", { exact: true })).toHaveCount(0);
    expect(pedidos).toEqual([]);
  });

  // --- Matriz dinámica (quitarPermisos, HU-72) ------------------------------

  test("HU-77 · un Gerente sin trazabilidad no ve el ítem y las rutas de consulta dan 'Acceso no autorizado'", async ({ page }) => {
    const pedidos: string[] = [];
    await mockBase(page);
    await page.route(/\/lotes\/producciones\//, (route) => {
      pedidos.push(route.request().url());
      return route.fulfill(json(respuestaOk));
    });
    await loginAsGerente(page);
    await quitarPermisos(page, "Gerente", ["trazabilidad"]);

    for (const url of ["/lotes/consulta", "/lotes/consulta/12"]) {
      await page.goto(url);
      await expect(page.getByText("Acceso no autorizado"), url).toBeVisible();
      await expect(menuLateral(page).getByText("Consulta de lotes", { exact: true }), url).toHaveCount(0);
    }
    expect(pedidos).toEqual([]);
  });

  test("HU-77 · un Operario sin recepcion ve la consulta pero no puede filtrar por proveedor", async ({ page }) => {
    await mockBase(page);
    // Sigue al backend: GET /proveedores pide recepcion:READ; GET /tambos
    // acepta trazabilidad:READ (HU-77-D1).
    await page.route(/\/proveedores\?/, (route) =>
      route.fulfill(json({ message: "No tenés permiso sobre Recepción." }, 403)),
    );
    await page.route(RUTA_CONSULTA, (route) => route.fulfill(json(respuestaOk)));
    await loginAsOperario(page);
    await quitarPermisos(page, "Operario de línea", ["recepcion"]);
    await page.goto("/lotes/consulta");

    await expect(page.getByRole("cell", { name: "LP-0012" })).toBeVisible();
    await expect(page.getByLabel("Proveedor")).toBeDisabled();
    await expect(page.getByText("No se pudieron cargar los proveedores.")).toBeVisible();
    await expect(page.getByLabel("Tambo", { exact: true })).toBeEnabled();
  });

  // --- E2E: flujo principal -------------------------------------------------

  test("HU-77 · flujo principal: filtrar, abrir la trazabilidad y volver al listado", async ({ page }) => {
    const pedidos: URL[] = [];
    await mockBase(page);
    await page.route(RUTA_CONSULTA, (route) => {
      pedidos.push(new URL(route.request().url()));
      return route.fulfill(json(respuestaOk));
    });
    await page.route(RUTA_TRAZABILIDAD, (route) => route.fulfill(json(TRAZABILIDAD)));
    await loginAsResponsableProduccion(page);
    // Arranca desde un enlace directo al detalle: la landing
    // (/dashboard-produccion) no renderiza con los [] genéricos de mockBase.
    await page.goto("/lotes/consulta/12");
    await expect(page.getByRole("heading", { name: "LP-0012" })).toBeVisible();

    await menuLateral(page).getByText("Consulta de lotes", { exact: true }).click();
    await expect(page).toHaveURL(/\/lotes\/consulta$/);
    await expect(page.getByRole("cell", { name: "LP-0012" })).toBeVisible();

    await page.getByLabel("Proveedor").selectOption({ label: "Tambos Unidos SRL" });
    await page.getByLabel("Estado").selectOption({ label: "En proceso" });
    await expect.poll(() => pedidos.at(-1)!.searchParams.get("estado")).toBe("en_proceso");
    expect(pedidos.at(-1)!.searchParams.get("proveedorId")).toBe("7");

    await page.getByRole("row", { name: /LP-0012/ }).getByRole("button", { name: /Ver trazabilidad/ }).click();
    await expect(page).toHaveURL(/\/lotes\/consulta\/12$/);
    await expect(page.getByRole("heading", { name: "LP-0012" })).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Eventos de trazabilidad" }).getByRole("listitem"),
    ).toHaveCount(3);

    await page.getByRole("button", { name: "Volver al listado" }).click();
    await expect(page).toHaveURL(/\/lotes\/consulta$/);
    await expect(page.getByRole("cell", { name: "LP-0012" })).toBeVisible();
  });
});
