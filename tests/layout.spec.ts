import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import {
  loginAsAdministrador,
  loginAsGerente,
  loginAsOperario,
  loginAsResponsableCalidad,
  loginAsResponsableProduccion,
  quitarPermisos,
} from "./fixtures/mockAuth.ts";
import { mockSocketIo } from "./fixtures/socketIoMock.ts";

// Capas transversales del Layout: campana de notificaciones (REST + WS
// /notificaciones), menú lateral, breadcrumb, tema claro/oscuro (HU-01) y
// cierre de sesión por inactividad (HU-04). Se prueban sobre /planes con el
// Administrador: es una pantalla quieta, sin datos propios que mockear.

const notificacion = (id: number, mensaje: string, leida = false) => ({
  id,
  tipo: "alerta_umbral",
  mensaje,
  leida,
  createdAt: `2026-09-2${id % 10}T12:00:00.000Z`,
  data: {},
});

interface Opciones {
  notificaciones?: unknown[];
  noLeidas?: number;
  inactividad?: { status: number; minutos?: number };
}

async function mockLayout(page: Page, { notificaciones = [], noLeidas, inactividad }: Opciones = {}) {
  // Estado del "servidor" para GET /notificaciones/no-leidas/count: los tests
  // lo ajustan cuando simulan cambios que el backend real reflejaría.
  const servidor = {
    noLeidas: noLeidas ?? (notificaciones as { leida: boolean }[]).filter((n) => !n.leida).length,
  };
  await page.route("**/*", (route) => {
    const rt = route.request().resourceType();
    return rt === "fetch" || rt === "xhr"
      ? route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
      : route.continue();
  });
  await page.route("**/notificaciones?*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: notificaciones, meta: { page: 1, limit: 20, total: notificaciones.length, totalPages: 1 } }),
    }),
  );
  await page.route("**/notificaciones", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: notificaciones, meta: { page: 1, limit: 20, total: notificaciones.length, totalPages: 1 } }),
        })
      : route.fallback(),
  );
  await page.route("**/notificaciones/no-leidas/count", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ total: servidor.noLeidas }) }),
  );
  if (inactividad) {
    await page.route("**/system-config/inactivity-timeout", (route) =>
      inactividad.status === 200
        ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ inactivityTimeout: inactividad.minutos }) })
        : route.fulfill({ status: inactividad.status, body: "{}" }),
    );
  }
  return servidor;
}

async function abrirPlanes(page: Page) {
  await loginAsAdministrador(page);
  await page.goto("/planes");
  await expect(page.getByRole("heading", { name: "Planes" })).toBeVisible();
}

const campana = (page: Page) => page.getByTitle("Notificaciones");
const contador = (page: Page) => campana(page).locator("span");

test.describe("Layout › Campana de notificaciones", () => {
  test("muestra cuántas hay sin leer y las lista al abrirla", async ({ page }) => {
    await mockLayout(page, {
      notificaciones: [notificacion(1, "pH fuera de umbral en LOT-1"), notificacion(2, "Sensor SEN-2 sin datos", true)],
    });
    await abrirPlanes(page);

    await expect(contador(page)).toHaveText("1");
    await campana(page).click();
    await expect(page.getByText("pH fuera de umbral en LOT-1")).toBeVisible();
    await expect(page.getByText("Sensor SEN-2 sin datos")).toBeVisible();
    // Solo la no leída ofrece marcarse.
    await expect(page.getByRole("button", { name: "Marcar como leído" })).toHaveCount(1);
  });

  test("con más de 9 sin leer muestra '9+'", async ({ page }) => {
    await mockLayout(page, {
      notificaciones: Array.from({ length: 12 }, (_, i) => notificacion(i + 1, `Aviso ${i + 1}`)),
    });
    await abrirPlanes(page);

    await expect(contador(page)).toHaveText("9+");
  });

  test("con más de 20 sin leer el badge refleja el total del backend, no la página cargada", async ({ page }) => {
    await mockLayout(page, {
      notificaciones: Array.from({ length: 20 }, (_, i) => notificacion(i + 1, `Aviso ${i + 1}`)),
      noLeidas: 25,
    });
    await abrirPlanes(page);

    await expect(contador(page)).toHaveText("9+");
    await expect(campana(page)).toHaveAttribute("aria-label", "Notificaciones, 25 sin leer");
  });

  test("sin notificaciones lo aclara y no muestra contador", async ({ page }) => {
    await mockLayout(page);
    await abrirPlanes(page);

    await expect(contador(page)).toHaveCount(0);
    await campana(page).click();
    await expect(page.getByText("No tenés notificaciones.")).toBeVisible();
  });

  test("marcar como leído baja el contador y manda el PATCH", async ({ page }) => {
    const servidor = await mockLayout(page, { notificaciones: [notificacion(1, "pH fuera de umbral en LOT-1")] });
    const marcadas: string[] = [];
    await page.route("**/notificaciones/*/leida", (route) => {
      marcadas.push(new URL(route.request().url()).pathname);
      servidor.noLeidas--;
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    await abrirPlanes(page);

    await campana(page).click();
    await page.getByRole("button", { name: "Marcar como leído" }).click();

    await expect(contador(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Marcar como leído" })).toHaveCount(0);
    expect(marcadas).toEqual(["/notificaciones/1/leida"]);
  });

  test("si el servidor falla al marcar, vuelve a mostrarla como no leída", async ({ page }) => {
    await mockLayout(page, { notificaciones: [notificacion(1, "pH fuera de umbral en LOT-1")] });
    await page.route("**/notificaciones/*/leida", (route) => route.fulfill({ status: 500, body: "{}" }));
    await abrirPlanes(page);

    await campana(page).click();
    await page.getByRole("button", { name: "Marcar como leído" }).click();

    await expect(page.getByRole("button", { name: "Marcar como leído" })).toBeVisible();
    await expect(contador(page)).toHaveText("1");
  });

  test("una notificación nueva por WebSocket aparece primera y suma al contador", async ({ page }) => {
    const servidor = await mockLayout(page, { notificaciones: [notificacion(1, "Aviso viejo")] });
    const socket = await mockSocketIo(page);
    await abrirPlanes(page);
    await expect.poll(() => socket.conectados()).toContain("/notificaciones");

    servidor.noLeidas = 2;
    socket.emitir("/notificaciones", "notificacion:nueva", notificacion(7, "Alerta crítica en LOT-9"));

    await expect(contador(page)).toHaveText("2");
    await campana(page).click();
    await expect(page.locator("div.max-h-80 li").first()).toContainText("Alerta crítica en LOT-9");
  });

  test("tocar fuera del panel lo cierra", async ({ page }) => {
    await mockLayout(page, { notificaciones: [notificacion(1, "pH fuera de umbral en LOT-1")] });
    await abrirPlanes(page);

    await campana(page).click();
    await expect(page.getByText("pH fuera de umbral en LOT-1")).toBeVisible();
    // Fuera del panel y del menú lateral (que queda por encima del fondo).
    await page.mouse.click(700, 600);
    await expect(page.getByText("pH fuera de umbral en LOT-1")).toHaveCount(0);
  });
});

test.describe("Layout › Campana › Marcar todas como leídas", () => {
  const marcarTodas = (page: Page) => page.getByRole("button", { name: "Marcar todas como leídas" });

  test("con no leídas aparece el botón y al usarlo manda el PATCH y deja todo leído", async ({ page }) => {
    const servidor = await mockLayout(page, {
      notificaciones: [notificacion(1, "Aviso 1"), notificacion(2, "Aviso 2"), notificacion(3, "Aviso 3", true)],
    });
    const pedidos: string[] = [];
    await page.route("**/notificaciones/leidas", (route) => {
      pedidos.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
      servidor.noLeidas = 0;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ actualizadas: 2 }) });
    });
    await abrirPlanes(page);

    await expect(contador(page)).toHaveText("2");
    await campana(page).click();
    await marcarTodas(page).click();

    await expect(contador(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Marcar como leído" })).toHaveCount(0);
    expect(pedidos).toEqual(["PATCH /notificaciones/leidas"]);
  });

  test("con más de 20 sin leer el contador queda en 0 después del resync", async ({ page }) => {
    const servidor = await mockLayout(page, {
      notificaciones: Array.from({ length: 20 }, (_, i) => notificacion(i + 1, `Aviso ${i + 1}`)),
      noLeidas: 25,
    });
    await page.route("**/notificaciones/leidas", (route) => {
      servidor.noLeidas = 0;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ actualizadas: 25 }) });
    });
    await abrirPlanes(page);

    await expect(campana(page)).toHaveAttribute("aria-label", "Notificaciones, 25 sin leer");
    await campana(page).click();
    const resync = page.waitForResponse("**/notificaciones/no-leidas/count");
    await marcarTodas(page).click();
    await resync;

    await expect(contador(page)).toHaveCount(0);
    await expect(campana(page)).toHaveAttribute("aria-label", "Notificaciones");
  });

  test("si el PATCH falla, vuelve el contador anterior y avisa el error", async ({ page }) => {
    await mockLayout(page, { notificaciones: [notificacion(1, "Aviso 1"), notificacion(2, "Aviso 2")] });
    await page.route("**/notificaciones/leidas", (route) => route.fulfill({ status: 500, body: "{}" }));
    await abrirPlanes(page);

    await campana(page).click();
    await marcarTodas(page).click();

    await expect(page.getByRole("alert")).toHaveText("No se pudieron marcar como leídas. Intentá nuevamente.");
    await expect(contador(page)).toHaveText("2");
    await expect(page.getByRole("button", { name: "Marcar como leído" })).toHaveCount(2);
    await expect(marcarTodas(page)).toBeEnabled();

    // Cerrar el desplegable (tocando fuera, el fondo tapa la campana) descarta el error.
    await page.mouse.click(700, 600);
    await expect(page.getByRole("alert")).toHaveCount(0);
    await campana(page).click();
    await expect(marcarTodas(page)).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  });

  test("sin no leídas no aparece el botón", async ({ page }) => {
    await mockLayout(page, { notificaciones: [notificacion(1, "Aviso 1", true)] });
    await abrirPlanes(page);

    await campana(page).click();
    await expect(page.getByText("Aviso 1")).toBeVisible();
    await expect(marcarTodas(page)).toHaveCount(0);
  });
});

test.describe("Layout › Encabezado y menú", () => {
  test("muestra el breadcrumb y los datos del usuario", async ({ page }) => {
    await mockLayout(page);
    await abrirPlanes(page);

    const encabezado = page.locator("header");
    await expect(encabezado.getByText("Consola", { exact: true })).toBeVisible();
    await expect(encabezado.getByText("Planes", { exact: true })).toBeVisible();
    await expect(encabezado.getByText("admin@optilacteo.com")).toBeVisible();
    await expect(encabezado.getByText("Administrador")).toBeVisible();
    await expect(encabezado.getByText("AD", { exact: true })).toBeVisible();
  });

  test.describe("en pantallas chicas", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("el botón de menú abre el lateral y tocar el fondo lo cierra", async ({ page }) => {
      await mockLayout(page);
      await abrirPlanes(page);
      const menu = page.getByRole("complementary");
      await expect(menu).not.toBeInViewport();

      await page.getByRole("button", { name: "Abrir menú lateral" }).click();
      await expect(menu).toBeInViewport();

      await page.mouse.click(380, 400);
      await expect(menu).not.toBeInViewport();
    });

    test("no ofrece colapsar y el drawer se ve completo aunque haya quedado colapsado", async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("sidebar-colapsado", "true"));
      await mockLayout(page);
      await abrirPlanes(page);
      const menu = page.getByRole("complementary");

      await expect(page.getByRole("button", { name: /^(Colapsar|Expandir) menú lateral$/ })).toBeHidden();
      const abrir = page.getByRole("button", { name: "Abrir menú lateral" });
      await expect(abrir).toBeVisible();
      await expect(abrir).toHaveAttribute("aria-expanded", "false");
      await abrir.click();
      await expect(abrir).toHaveAttribute("aria-expanded", "true");
      await expect(menu).toBeInViewport();
      await expect(menu.getByText("Usuarios", { exact: true })).toBeVisible();
    });
  });
});

test.describe("Layout › Menú lateral colapsable", () => {
  const menu = (page: Page) => page.getByRole("complementary");
  // Botón del header, el que colapsa en escritorio (el de abrir el drawer es lg:hidden).
  const toggle = (page: Page) => page.locator("header").getByRole("button", { name: /^(Colapsar|Expandir) menú lateral$/ });

  test("colapsar oculta labels y nombre de empresa, y los íconos siguen navegando", async ({ page }) => {
    await mockLayout(page);
    await abrirPlanes(page);
    await expect(page.getByRole("button", { name: "Abrir menú lateral" })).toBeHidden();
    await expect(toggle(page)).toHaveAttribute("aria-expanded", "true");
    await expect(toggle(page)).toHaveAttribute("aria-controls", "sidebar-principal");
    await expect(toggle(page)).toHaveAttribute("title", "Colapsar menú lateral");
    await expect(menu(page).getByRole("heading", { name: "OptiLácteo" })).toBeVisible();

    await toggle(page).click();

    await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
    await expect(toggle(page)).toHaveAttribute("title", "Expandir menú lateral");
    await expect(menu(page).getByText("Usuarios", { exact: true })).toBeHidden();
    await expect(menu(page).getByRole("heading", { name: "OptiLácteo" })).toBeHidden();

    const usuarios = menu(page).getByRole("button", { name: "Usuarios" });
    await expect(usuarios).toHaveAttribute("title", "Usuarios");
    await usuarios.click();
    await expect(page).toHaveURL("/usuarios");
  });

  test("el estado colapsado se mantiene al recargar", async ({ page }) => {
    await mockLayout(page);
    await abrirPlanes(page);
    await toggle(page).click();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Planes" })).toBeVisible();
    await expect(toggle(page)).toHaveAccessibleName("Expandir menú lateral");
    await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
    await expect(menu(page).getByText("Usuarios", { exact: true })).toBeHidden();

    await toggle(page).click();
    await expect(menu(page).getByText("Usuarios", { exact: true })).toBeVisible();
  });
});

test.describe("Layout › Ítem activo del menú en rutas de lotes", () => {
  // Prefijo más largo: /lotes/consulta y /lotes/revision no activan también
  // "Lotes" (/lotes) solo porque comparten el prefijo.
  const casos = [
    { url: "/lotes", item: "Lotes" },
    { url: "/lotes/consulta", item: "Consulta de lotes" },
    { url: "/lotes/consulta/12", item: "Consulta de lotes" },
    { url: "/lotes/revision", item: "Revisión de calidad" },
  ];
  const activo = (page: Page) => page.getByRole("complementary").locator('[aria-current="page"]');
  // Lotes, Revisión y Consulta leen GET /lotes, /proveedores y
  // /lotes/producciones/consulta paginados; el [] genérico de mockLayout las rompe.
  const mockListadosVacios = (page: Page) =>
    page.route(/\/(lotes|proveedores|lotes\/producciones\/consulta)\?/, (route) => {
      const rt = route.request().resourceType();
      return rt === "fetch" || rt === "xhr"
        ? route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ data: [], total: 0, page: 1, limit: 100, meta: { page: 1, limit: 100, total: 0, totalPages: 0 } }),
          })
        : route.fallback();
    });

  test("marca un solo ítem, el que corresponde a cada pantalla", async ({ page }) => {
    await mockLayout(page);
    await mockListadosVacios(page);
    await loginAsResponsableCalidad(page);
    for (const { url, item } of casos) {
      await page.goto(url);
      await expect(activo(page), url).toHaveCount(1);
      await expect(activo(page).getByText(item, { exact: true }), url).toBeVisible();
    }
  });
});

test.describe("ThemeContext › Tema claro y oscuro", () => {
  const esOscuro = (page: Page) => page.evaluate(() => document.documentElement.classList.contains("dark"));

  test("el botón cambia el tema y la elección se recuerda al recargar", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await mockLayout(page);
    await abrirPlanes(page);
    expect(await esOscuro(page)).toBe(false);

    await page.getByTitle("Cambiar tema").click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.reload();
    await expect(page.getByRole("heading", { name: "Planes" })).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.getByTitle("Cambiar tema").click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("sin elección guardada sigue el tema del sistema, también en vivo", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await mockLayout(page);
    await abrirPlanes(page);
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("con una elección guardada ignora los cambios del sistema", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await mockLayout(page);
    await abrirPlanes(page);
    await page.getByTitle("Cambiar tema").click();
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.emulateMedia({ colorScheme: "dark" });
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});

test.describe("InactivityMonitor (HU-04) › Cierre por inactividad", () => {
  const aviso = (page: Page) => page.getByRole("heading", { name: "Tu sesión está por cerrarse" });

  test("avisa 2 minutos antes y 'Continuar conectado' reinicia el plazo", async ({ page }) => {
    await page.clock.install();
    await mockLayout(page, { inactividad: { status: 200, minutos: 5 } });
    await abrirPlanes(page);

    await page.clock.fastForward("03:01");
    await expect(aviso(page)).toBeVisible();
    await expect(page.getByText("Por inactividad, tu sesión se cerrará automáticamente en 2 minutos.")).toBeVisible();

    await page.getByRole("button", { name: "Continuar conectado" }).click();
    await expect(aviso(page)).toHaveCount(0);

    // El plazo arrancó de nuevo: a los 2 minutos todavía no hay aviso.
    await page.clock.fastForward("02:00");
    await expect(aviso(page)).toHaveCount(0);
    await expect(page).toHaveURL("/planes");
  });

  test("sin actividad cierra la sesión al cumplirse el plazo", async ({ page }) => {
    await page.clock.install();
    await mockLayout(page, { inactividad: { status: 200, minutos: 5 } });
    const logout = page.waitForRequest((r) => r.url().endsWith("/logout") && r.method() === "POST");
    await abrirPlanes(page);

    await page.clock.fastForward("05:01");

    await logout;
    await expect(page).toHaveURL("/login");
    await expect(page.getByRole("button", { name: "Ingresar a la consola" })).toBeVisible();
  });

  test("si no se puede leer la configuración usa 30 minutos", async ({ page }) => {
    await page.clock.install();
    await mockLayout(page, { inactividad: { status: 500 } });
    await abrirPlanes(page);

    await page.clock.fastForward("27:00");
    await expect(aviso(page)).toHaveCount(0);
    await page.clock.fastForward("01:01");
    await expect(aviso(page)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// HU-79 · Campana: error de carga y contador (Sprint 6)
// ---------------------------------------------------------------------------
// GET/PATCH /notificaciones y /no-leidas/count no llevan @Permissions en el
// back: la campana es de cada usuario, sin depender de la matriz.

test.describe("HU-79 · Campana: error de carga y contador", () => {
  const campana = (page: Page) => page.getByRole("button", { name: /^Notificaciones/ });

  test("HU-79 · si falla la carga de notificaciones muestra el error con Reintentar y recupera", async ({ page }) => {
    await mockLayout(page, { notificaciones: [notificacion(1, "Lote LOT-1 No Apto")] });
    let falla = true;
    await page.route(/\/notificaciones(\?|$)/, (route) =>
      falla && route.request().method() === "GET" ? route.fulfill({ status: 503, body: "" }) : route.fallback(),
    );
    await loginAsAdministrador(page);
    await page.goto("/planes");

    await campana(page).click();
    await expect(page.getByText("No se pudieron cargar las notificaciones.")).toBeVisible();
    await expect(page.getByText("No tenés notificaciones.")).toHaveCount(0);

    falla = false;
    await page.getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByText("Lote LOT-1 No Apto")).toBeVisible();
  });

  test("HU-79 · si falla el conteo inicial no muestra badge en vez de un 0", async ({ page }) => {
    await mockLayout(page, { notificaciones: [notificacion(1, "Lote LOT-1 No Apto")] });
    await page.route("**/notificaciones/no-leidas/count", (route) => route.fulfill({ status: 500, body: "" }));
    await loginAsAdministrador(page);
    await page.goto("/planes");
    await page.waitForLoadState("networkidle");

    await expect(campana(page)).toHaveAccessibleName("Notificaciones");
  });

  test("HU-79 · si falla el resync tras marcar, conserva el contador ajustado", async ({ page }) => {
    await mockLayout(page, {
      notificaciones: [notificacion(1, "Uno"), notificacion(2, "Dos"), notificacion(3, "Tres")],
    });
    await page.route("**/notificaciones/*/leida", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
    );
    await loginAsAdministrador(page);
    await page.goto("/planes");
    await expect(campana(page)).toHaveAccessibleName("Notificaciones, 3 sin leer");

    await page.route("**/notificaciones/no-leidas/count", (route) => route.fulfill({ status: 500, body: "" }));
    await campana(page).click();
    await page.getByRole("button", { name: "Marcar como leído" }).first().click();

    await expect(campana(page)).toHaveAccessibleName("Notificaciones, 2 sin leer");
    await page.waitForTimeout(500);
    await expect(campana(page)).toHaveAccessibleName("Notificaciones, 2 sin leer");
  });

  test("HU-79 · flujo principal: marcar una, marcar todas y recargar sin badge", async ({ page }) => {
    const servidor = await mockLayout(page, {
      notificaciones: [notificacion(1, "Uno"), notificacion(2, "Dos"), notificacion(3, "Tres")],
    });
    await page.route("**/notificaciones/*/leida", async (route) => {
      servidor.noLeidas--;
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    await page.route("**/notificaciones/leidas", async (route) => {
      servidor.noLeidas = 0;
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    await loginAsAdministrador(page);
    await page.goto("/planes");
    await expect(campana(page)).toHaveAccessibleName("Notificaciones, 3 sin leer");

    await campana(page).click();
    await page.getByRole("button", { name: "Marcar como leído" }).first().click();
    await expect(campana(page)).toHaveAccessibleName("Notificaciones, 2 sin leer");

    await page.getByRole("button", { name: "Marcar todas como leídas" }).click();
    await expect(campana(page)).toHaveAccessibleName("Notificaciones");
    await expect(page.getByRole("button", { name: "Marcar como leído" })).toHaveCount(0);

    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(campana(page)).toHaveAccessibleName("Notificaciones");
  });
});

// ---------------------------------------------------------------------------
// HU-81 · Nombre de empresa y rol en la barra lateral (Sprint 6)
// ---------------------------------------------------------------------------

const EMPRESA_NOMBRE_LARGO = "Cooperativa Láctea del Centro y Sur de Córdoba Limitada";

// /lotes/consulta es una pantalla de empresa que renderiza con un listado
// vacío (el [] genérico de mockLayout rompe las otras).
async function mockPantallaEmpresa(page: Page, empresa: unknown = { id: 10, name: EMPRESA_NOMBRE_LARGO, logoUrl: null }) {
  await mockLayout(page);
  await page.route(/\/lotes\/producciones\/consulta\?/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], total: 0, page: 1, limit: 20 }),
    }),
  );
  // El botón flotante de dictado (Layout) se rompe si GET /lotes es [] plano.
  await page.route(/\/(lotes|proveedores)\?/, (route) => {
    const rt = route.request().resourceType();
    return rt === "fetch" || rt === "xhr"
      ? route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: [], total: 0, page: 1, limit: 100, meta: { page: 1, limit: 100, total: 0, totalPages: 0 } }),
        })
      : route.fallback();
  });
  await page.route("**/empresa/me", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(empresa) }),
  );
}

const encabezadoMenu = (page: Page) => page.getByRole("complementary");

test.describe("HU-81 · Nombre de empresa y rol en la barra lateral", () => {
  test("HU-81 · muestra el nombre completo de la empresa, sin recortar, y el rol largo completo", async ({ page }) => {
    await mockPantallaEmpresa(page);
    await loginAsResponsableProduccion(page);
    await page.goto("/lotes/consulta");

    const nombre = encabezadoMenu(page).getByRole("heading", { name: EMPRESA_NOMBRE_LARGO });
    await expect(nombre).toBeVisible();
    await expect(nombre).not.toHaveClass(/truncate/);
    await expect(encabezadoMenu(page).getByText("Responsable de producción", { exact: true }).first()).toBeVisible();
    await expect(encabezadoMenu(page).getByText("Producción", { exact: true })).toHaveCount(0);
  });

  test("HU-81 · usa el logo de la empresa con su nombre como texto alternativo", async ({ page }) => {
    await mockPantallaEmpresa(page, { id: 10, name: "Lácteos del Sur", logoUrl: "https://cdn.example.com/logo-lacteos.png" });
    await page.route("https://cdn.example.com/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: "" }));
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/consulta");

    const logo = encabezadoMenu(page).getByRole("img", { name: "Lácteos del Sur" });
    await expect(logo).toHaveAttribute("src", "https://cdn.example.com/logo-lacteos.png");
  });

  test("HU-81 · si la empresa no carga, muestra OptiLácteo en vez de dejar el encabezado vacío", async ({ page }) => {
    await mockPantallaEmpresa(page);
    await page.route("**/empresa/me", (route) => route.fulfill({ status: 500, body: "" }));
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/consulta");

    await expect(encabezadoMenu(page).getByRole("heading", { name: "OptiLácteo" })).toBeVisible();
  });

  // Permisos por rol: el encabezado no depende de la matriz, cada rol ve su
  // nombre completo.
  const ROLES_HU81: [string, (page: Page) => Promise<void>][] = [
    ["Gerente", loginAsGerente],
    ["Responsable de producción", loginAsResponsableProduccion],
    ["Responsable de calidad", loginAsResponsableCalidad],
    ["Operario de línea", loginAsOperario],
  ];
  for (const [rol, login] of ROLES_HU81) {
    test(`HU-81 · ${rol} ve la empresa y su rol completo en el encabezado`, async ({ page }) => {
      await mockPantallaEmpresa(page);
      await login(page);
      await page.goto("/lotes/consulta");

      await expect(encabezadoMenu(page).getByRole("heading", { name: EMPRESA_NOMBRE_LARGO })).toBeVisible();
      await expect(encabezadoMenu(page).getByText(rol, { exact: true }).first()).toBeVisible();
    });
  }

  test("HU-81 · Administrador (sin empresa) ve OptiLácteo y su rol", async ({ page }) => {
    await mockLayout(page);
    await loginAsAdministrador(page);
    await page.goto("/planes");

    await expect(encabezadoMenu(page).getByRole("heading", { name: "OptiLácteo" })).toBeVisible();
    await expect(encabezadoMenu(page).getByText("Administrador", { exact: true }).first()).toBeVisible();
  });

  // Matriz dinámica (HU-72): el menú refleja la matriz, no el rol.
  test("HU-81 · un Responsable de calidad sin trazabilidad no ve Consulta de lotes ni Revisión de calidad en el menú", async ({ page }) => {
    await mockPantallaEmpresa(page);
    await loginAsResponsableCalidad(page);
    await quitarPermisos(page, "Responsable de calidad", ["trazabilidad"]);
    // /lotes sigue habilitada por recepcion ("Acceso no autorizado" se dibuja
    // sin el Layout, así que el menú se revisa desde una pantalla permitida).
    await page.goto("/lotes");

    await expect(encabezadoMenu(page).getByRole("heading", { name: EMPRESA_NOMBRE_LARGO })).toBeVisible();
    await expect(encabezadoMenu(page).getByText("Lotes", { exact: true })).toBeVisible();
    await expect(encabezadoMenu(page).getByText("Consulta de lotes", { exact: true })).toHaveCount(0);
    await expect(encabezadoMenu(page).getByText("Revisión de calidad", { exact: true })).toHaveCount(0);
  });

  // E2E: colapsar, navegar con el ícono, ítem activo y expandir.
  test("HU-81 · flujo principal: colapsar, navegar por ícono con ítem activo y expandir con el nombre de la empresa", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mockPantallaEmpresa(page);
    await page.route(/\/(lotes|proveedores)\?/, (route) => {
      const rt = route.request().resourceType();
      return rt === "fetch" || rt === "xhr"
        ? route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ data: [], total: 0, page: 1, limit: 100, meta: { page: 1, limit: 100, total: 0, totalPages: 0 } }),
          })
        : route.fallback();
    });
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");
    const toggleMenu = page.locator("header").getByRole("button", { name: /^(Colapsar|Expandir) menú lateral$/ });

    await toggleMenu.click();
    await expect(toggleMenu).toHaveAccessibleName("Expandir menú lateral");
    await expect(encabezadoMenu(page).getByRole("heading", { name: EMPRESA_NOMBRE_LARGO })).toBeHidden();

    // Los ítems del menú son botones con title (ver el test de colapsar).
    await encabezadoMenu(page).getByRole("button", { name: "Consulta de lotes" }).click();
    await expect(page).toHaveURL(/\/lotes\/consulta$/);
    await expect(encabezadoMenu(page).locator('[aria-current="page"]')).toHaveCount(1);
    await expect(encabezadoMenu(page).locator('[aria-current="page"]')).toHaveAttribute("title", "Consulta de lotes");

    await toggleMenu.click();
    await expect(encabezadoMenu(page).getByRole("heading", { name: EMPRESA_NOMBRE_LARGO })).toBeVisible();
    await expect(encabezadoMenu(page).getByText("Consulta de lotes", { exact: true })).toBeVisible();
  });
});
