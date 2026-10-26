import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import { loginAsAdministrador, loginAsResponsableCalidad } from "./fixtures/mockAuth.ts";
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
  // Prefijo más largo, salvo destino sugerido (HU-78), que pertenece al flujo
  // de la consulta (HU-77) aunque su URL no cuelgue de /lotes/consulta.
  const casos = [
    { url: "/lotes", item: "Lotes" },
    { url: "/lotes/consulta", item: "Consulta de lotes" },
    { url: "/lotes/consulta/L-2026-0412", item: "Consulta de lotes" },
    { url: "/lotes/L-2026-0412/destino-sugerido", item: "Consulta de lotes" },
    { url: "/lotes/revision", item: "Revisión de calidad" },
  ];
  const activo = (page: Page) => page.getByRole("complementary").locator('[aria-current="page"]');
  // Lotes y Revisión leen GET /lotes y /proveedores paginados; el [] genérico
  // de mockLayout las rompe.
  const mockListadosVacios = (page: Page) =>
    page.route(/\/(lotes|proveedores)\?/, (route) => {
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

  test("colapsado, destino sugerido sigue marcando Consulta de lotes", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("sidebar-colapsado", "true"));
    await mockLayout(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes/L-2026-0412/destino-sugerido");
    await expect(activo(page)).toHaveCount(1);
    await expect(activo(page)).toHaveAttribute("title", "Consulta de lotes");
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
