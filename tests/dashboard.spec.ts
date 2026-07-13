import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import { loginAsAdministrador } from "./fixtures/mockAuth.ts";

// Dos empresas (una activa, una suspendida) con módulos distintos, para que
// promedioModulosPorEmpresa y modulosMasHabilitados (useDashboard.ts) tengan
// datos no triviales para calcular.
const EMPRESAS_MOCK = {
  data: [
    {
      id: 1,
      name: "Tambo San José",
      cuit: "30-12345678-9",
      email: null,
      telefono: null,
      direccion: "Av. Colón 1234, San Rafael",
      isActive: true,
      plan: "pro",
      modulos: [
        { modulo: "dashboard", isActive: true },
        { modulo: "recepcion", isActive: true },
      ],
    },
    {
      id: 2,
      name: "Lácteos del Sur",
      cuit: "30-98765432-1",
      email: null,
      telefono: null,
      direccion: null,
      isActive: false,
      plan: "starter",
      modulos: [{ modulo: "dashboard", isActive: true }],
    },
  ],
  meta: { page: 1, limit: 5, total: 2, totalPages: 1 },
};

// Un usuario activo y uno inactivo, para que usuariosActivos != totalUsuarios.
const USUARIOS_MOCK = {
  data: [
    { id: 5, name: "Juan Pérez", email: "juan@optilacteo.com", rolNombre: "Gerente", isActive: true, isLocked: false },
    { id: 6, name: "Ana García", email: "ana@optilacteo.com", rolNombre: "Operador", isActive: false, isLocked: true },
  ],
  meta: { page: 1, limit: 3, total: 2, totalPages: 1 },
};

// planesService.getAll() devuelve un array plano (sin meta), a diferencia de
// empresa/user que paginan.
const PLANES_MOCK = [
  { id: 1, nombre: "Pro", precio: 99, maxUsuarios: 20, maxSensores: 10, modulos: [], empresasAsignadas: 1 },
  { id: 2, nombre: "Starter", precio: 49, maxUsuarios: 5, maxSensores: 2, modulos: [], empresasAsignadas: 1 },
];

async function mockDashboardDeps(page: Page) {
  // Red de seguridad: el Sidebar pide contadores de empresa/user/planes/
  // proveedores en TODAS las páginas (no solo Dashboard). Cualquier XHR/fetch
  // no matcheado explícitamente abajo devuelve un array vacío en vez de
  // fallar la conexión real (no hay backend corriendo en los tests).
  await page.route("**/*", async (route) => {
    const type = route.request().resourceType();
    if (type === "xhr" || type === "fetch") {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    return route.continue();
  });

  await page.route("**/empresa*", async (route) => {
    if (route.request().method() !== "GET" || route.request().resourceType() === "document") return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPRESAS_MOCK) });
  });
  await page.route("**/user*", async (route) => {
    if (route.request().method() !== "GET" || route.request().resourceType() === "document") return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(USUARIOS_MOCK) });
  });
  await page.route("**/planes*", async (route) => {
    if (route.request().method() !== "GET" || route.request().resourceType() === "document") return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PLANES_MOCK) });
  });
}

test.describe("DashboardPage", () => {
  test("muestra las métricas y los paneles con datos reales", async ({ page }) => {
    await mockDashboardDeps(page);
    await loginAsAdministrador(page);
    await page.goto("/dashboard");

    await expect(
      page.getByText("Estado general del SaaS · 2 empresas · 2 usuarios"),
    ).toBeVisible();

    // StatCards
    await expect(page.getByText("Empresas activas")).toBeVisible();
    await expect(page.getByText("0 en trial · 2 totales")).toBeVisible();

    await expect(page.getByText("1 activos")).toBeVisible();

    await expect(page.getByText("Módulos / empresa")).toBeVisible();
    await expect(page.getByText("de 8 disponibles")).toBeVisible();

    // EmpresasListPanel
    await expect(page.getByText("Listado de empresas")).toBeVisible();
    await expect(page.getByText("Tambo San José")).toBeVisible();
    await expect(page.getByText("Lácteos del Sur")).toBeVisible();
    await expect(page.getByText("Av. Colón 1234, San Rafael")).toBeVisible();
    await expect(page.getByText("Sin ubicación")).toBeVisible();

    // DistribucionPlanPanel
    await expect(page.getByText("Distribución por plan")).toBeVisible();
    await expect(page.getByText("US$ 99")).toBeVisible();
    await expect(page.getByText("US$ 49")).toBeVisible();

    // ModulosHabilitadosPanel
    await expect(page.getByText("Módulos más habilitados")).toBeVisible();
    await expect(page.getByRole("main").getByText("Dashboard", { exact: true })).toBeVisible();
    await expect(page.getByText("2/2")).toBeVisible();
    await expect(page.getByText("1/2")).toBeVisible();
  });

  test("muestra el estado de carga antes de que respondan los datos", async ({ page }) => {
    await mockDashboardDeps(page);
    await loginAsAdministrador(page);

    // Retrasamos la respuesta de empresas para poder observar el loading.
    await page.route("**/empresa*", async (route) => {
      if (route.request().method() !== "GET" || route.request().resourceType() === "document") return route.continue();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPRESAS_MOCK) });
    });

    await page.goto("/dashboard");

    await expect(page.getByText("Cargando resumen...")).toBeVisible();
    await expect(page.getByText("Listado de empresas")).toBeVisible();
    await expect(page.getByText("Cargando resumen...")).not.toBeVisible();
  });

  test("un error al cargar muestra el mensaje y Reintentar vuelve a pedir los datos", async ({ page }) => {
    await mockDashboardDeps(page);
    await loginAsAdministrador(page);

    // Falla mientras shouldFail=true (cubre tanto el fetch de useDashboard
    // como el de los contadores del Sidebar, que pegan al mismo endpoint).
    let shouldFail = true;
    await page.route("**/empresa*", async (route) => {
      if (route.request().method() !== "GET" || route.request().resourceType() === "document") return route.continue();
      if (shouldFail) {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Internal Server Error" }),
        });
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPRESAS_MOCK) });
    });

    await page.goto("/dashboard");

    await expect(
      page.getByText("No se pudieron cargar las empresas."),
    ).toBeVisible();

    shouldFail = false;
    await page.getByRole("button", { name: "Reintentar" }).click();

    await expect(
      page.getByText("No se pudieron cargar las empresas."),
    ).not.toBeVisible();
    await expect(page.getByText("Tambo San José")).toBeVisible();
  });

  test("el botón + Nueva empresa navega a /empresas", async ({ page }) => {
    await mockDashboardDeps(page);
    await loginAsAdministrador(page);
    await page.goto("/dashboard");

    await expect(page.getByText("Listado de empresas")).toBeVisible();

    await page.getByRole("button", { name: "+ Nueva empresa" }).click();

    await page.waitForURL("/empresas");
  });

  test("Ver todas → en el listado de empresas navega a /empresas", async ({ page }) => {
    await mockDashboardDeps(page);
    await loginAsAdministrador(page);
    await page.goto("/dashboard");

    await page.getByRole("button", { name: "Ver todas →" }).click();

    await page.waitForURL("/empresas");
  });
});
