import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import { loginAsAdministrador } from "./fixtures/mockAuth.ts";

// planesService.getAll() devuelve un array plano (sin meta), a diferencia de
// empresa/user que paginan (ver comentario en dashboard.spec.ts).
//
// Combinación pensada para ejercitar las ramas de PlanCard.tsx:
// - topBorderClass: "pro" (case-insensitive), "enterprise" y el default.
// - singular/plural de "empresa(s)": Pro tiene 1, Enterprise tiene 5.
// - módulos habilitados vs deshabilitados: Pro trae 2 de los 8 módulos
//   posibles, así el Set de habilitados no queda ni vacío ni completo.
const PLANES_MOCK = [
  {
    id: 1,
    nombre: "Pro",
    precio: 99,
    maxUsuarios: 20,
    maxSensores: 10,
    empresasAsignadas: 1,
    modulos: [
      { nombre: "Dashboard", codigo: "dashboard" },
      { nombre: "Sensores IoT", codigo: "sensores_iot" },
    ],
  },
  {
    id: 2,
    nombre: "Enterprise",
    precio: 249,
    maxUsuarios: 100,
    maxSensores: 50,
    empresasAsignadas: 5,
    modulos: [
      { nombre: "Dashboard", codigo: "dashboard" },
      { nombre: "Recepción", codigo: "recepcion" },
      { nombre: "Trazabilidad", codigo: "trazabilidad" },
    ],
  },
  {
    id: 3,
    nombre: "Starter",
    precio: 49,
    maxUsuarios: 5,
    maxSensores: 2,
    empresasAsignadas: 0,
    modulos: [],
  },
];

async function mockPlanesDeps(page: Page, planes: unknown[] | null = PLANES_MOCK) {
  // Red de seguridad: el Sidebar pide contadores de empresa/user/planes/
  // proveedores en TODAS las páginas. Cualquier XHR/fetch no matcheado
  // explícitamente abajo devuelve un array vacío en vez de fallar la
  // conexión real (no hay backend corriendo en los tests).
  await page.route("**/*", async (route) => {
    const type = route.request().resourceType();
    if (type === "xhr" || type === "fetch") {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    return route.continue();
  });

  // Layout pide las notificaciones (campanita) en TODAS las páginas
  // autenticadas y espera la forma paginada {data, meta}: el catch-all de
  // arriba devuelve un array plano y notificaciones.filter(...) explota
  // sobre undefined (ver useNotificaciones.ts).
  await page.route("**/notificacion*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
    });
  });

  if (planes !== null) {
    await page.route("**/planes*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(planes) });
    });
  }
}

test.describe("PlanesPage", () => {
  test("muestra el estado de carga y luego los planes con sus datos", async ({ page }) => {
    await mockPlanesDeps(page, null);

    // Retrasamos la respuesta de planes para poder observar el skeleton.
    await page.route("**/planes*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "GET") return route.continue();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PLANES_MOCK) });
    });

    await loginAsAdministrador(page);
    await page.goto("/planes");

    // Skeleton: 3 placeholders animados mientras isLoading es true.
    await expect(page.locator(".animate-pulse")).toHaveCount(3);

    // Header con el total de planes y la suma de empresas asignadas
    // (1 + 5 + 0 = 6).
    await expect(page.getByText("3 planes de suscripción · 6 empresas asignadas")).toBeVisible();
    await expect(page.locator(".animate-pulse")).toHaveCount(0);

    // PlanCard de "Pro": precio, singular de "empresa", límites y módulos.
    await expect(page.getByRole("heading", { name: "Pro" })).toBeVisible();
    await expect(page.getByText("99", { exact: true })).toBeVisible();
    await expect(page.getByText("empresa", { exact: true })).toBeVisible();
    await expect(page.getByText("Hasta 20 usuarios")).toBeVisible();
    await expect(page.getByText("Hasta 10 sensores")).toBeVisible();
    await expect(page.getByText("2 de 8 módulos")).toBeVisible();

    // PlanCard de "Enterprise": plural de "empresas".
    await expect(page.getByRole("heading", { name: "Enterprise" })).toBeVisible();
    await expect(page.getByText("empresas", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("3 de 8 módulos")).toBeVisible();

    // PlanCard de "Starter": sin módulos habilitados.
    await expect(page.getByRole("heading", { name: "Starter" })).toBeVisible();
    await expect(page.getByText("0 de 8 módulos")).toBeVisible();

    // Los chips de módulo se listan siempre (habilitado o no), el texto es
    // el mismo para las 3 cards por eso solo chequeamos que aparezcan.
    await expect(page.getByText("Asistente de voz").first()).toBeVisible();
  });

  test("sin planes registrados muestra el estado vacío", async ({ page }) => {
    await mockPlanesDeps(page, []);
    await loginAsAdministrador(page);
    await page.goto("/planes");

    await expect(page.getByText("0 planes de suscripción · 0 empresas asignadas")).toBeVisible();
    await expect(page.getByText("No hay planes registrados.")).toBeVisible();
  });

  test("un error al cargar muestra el mensaje y Reintentar vuelve a pedir los datos", async ({ page }) => {
    await mockPlanesDeps(page, null);

    let shouldFail = true;
    await page.route("**/planes*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "GET") return route.continue();
      if (shouldFail) {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Internal Server Error" }),
        });
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PLANES_MOCK) });
    });

    await loginAsAdministrador(page);
    await page.goto("/planes");

    await expect(page.getByText("No se pudieron cargar los planes.")).toBeVisible();

    shouldFail = false;
    await page.getByRole("button", { name: "Reintentar" }).click();

    await expect(page.getByText("No se pudieron cargar los planes.")).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "Pro" })).toBeVisible();
  });
});
