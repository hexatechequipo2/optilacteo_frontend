import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import { loginAsAdministrador } from "./fixtures/mockAuth.ts";

/**
 * useProveedores pagina con PAGE_SIZE=3. Cuando hay texto de búsqueda,
 * en vez de mandarlo al backend (que no soporta búsqueda multi-campo),
 * trae hasta 100 registros (SEARCH_FETCH_LIMIT) y filtra/pagina en el
 * cliente sobre razonSocial, cuit, telefono, emailContacto, provincia,
 * localidad. Además ProveedoresPage debounce-ea el input 400ms antes de
 * pasarlo al hook.
 */
const PROVEEDORES_MOCK = {
  data: [
    {
      id: 1,
      razonSocial: "Tambo El Roble",
      cuit: "30-11111111-1",
      tipo: "tambo",
      empresaId: 1,
      capacidad: 5000,
      localidad: "Villa María",
      provincia: "Córdoba",
      estado: "activa",
      telefono: "3534000000",
      emailContacto: "contacto@elroble.com",
    },
    {
      id: 2,
      razonSocial: "Transportes Rápido SA",
      cuit: "30-22222222-2",
      tipo: "transporte",
      empresaId: 1,
      capacidad: 12,
      localidad: "Rosario",
      provincia: "Santa Fe",
      estado: "trial",
      telefono: "3414000000",
      emailContacto: "info@rapido.com",
    },
  ],
  meta: { page: 1, limit: 3, total: 2, totalPages: 1 },
};

const EMPRESAS_MOCK = {
  data: [{ id: 1, name: "Tambo San José", cuit: "30-12345678-9", plan: "pro", isActive: true }],
  meta: { page: 1, limit: 5, total: 1, totalPages: 1 },
};

async function mockProveedoresAndEmpresas(page: Page) {
  await page.route("**/proveedores*", async (route) => {
    if (route.request().method() !== "GET" || route.request().resourceType() === "document") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PROVEEDORES_MOCK),
    });
  });
  await page.route("**/empresa*", async (route) => {
    if (route.request().method() !== "GET" || route.request().resourceType() === "document") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(EMPRESAS_MOCK),
    });
  });
}

test.describe("ProveedoresPage", () => {
  test("muestra la lista de proveedores con su tipo y estado", async ({ page }) => {
    await mockProveedoresAndEmpresas(page);
    await loginAsAdministrador(page);

    await page.goto("/proveedores");

    await expect(page.getByText("Tambo El Roble")).toBeVisible();
    await expect(page.getByText("Transportes Rápido SA")).toBeVisible();
  });

  test("filtrar por tab Tambo manda tipo=tambo al backend", async ({ page }) => {
    await mockProveedoresAndEmpresas(page);
    await loginAsAdministrador(page);
    await page.goto("/proveedores");

    const requestPromise = page.waitForRequest(
      (req) => req.url().includes("/proveedores") && req.method() === "GET" && req.url().includes("tipo=tambo"),
    );
    await page.getByRole("button", { name: "Tambo", exact: true }).click();
    await requestPromise; // si no matchea, el waitForRequest hace timeout y falla el test
  });

  test("buscar por texto filtra en cliente después del debounce", async ({ page }) => {
    await mockProveedoresAndEmpresas(page);
    await loginAsAdministrador(page);
    await page.goto("/proveedores");

    await expect(page.getByText("Transportes Rápido SA")).toBeVisible();

    // El input dispara el fetch (limit=100) recién 400ms después de dejar
    // de tipear, así que esperamos ese request antes de assertar el filtro.
    const requestPromise = page.waitForRequest(
      (req) => req.url().includes("/proveedores") && req.method() === "GET" && req.url().includes("limit=100"),
    );
    await page.getByPlaceholder(/Buscar por nombre, CUIT, teléfono/i).fill("Roble");
    await requestPromise;

    await expect(page.getByText("Tambo El Roble")).toBeVisible();
    await expect(page.getByText("Transportes Rápido SA")).not.toBeVisible();
  });

  test("estado vacío cuando no hay proveedores", async ({ page }) => {
    await page.route("**/proveedores*", async (route) => {
      if (route.request().method() !== "GET" || route.request().resourceType() === "document") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], meta: { page: 1, limit: 3, total: 0, totalPages: 1 } }),
      });
    });
    await page.route("**/empresa*", async (route) => {
      if (route.request().method() !== "GET" || route.request().resourceType() === "document") return route.continue();
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPRESAS_MOCK) });
    });

    await loginAsAdministrador(page);
    await page.goto("/proveedores");

    await expect(page.getByText("No se encontraron proveedores")).toBeVisible();
  });

  test("editar un proveedor abre el modal de edición", async ({ page }) => {
    await mockProveedoresAndEmpresas(page);
    await loginAsAdministrador(page);
    await page.goto("/proveedores");

    await page.getByRole("button", { name: "Editar Tambo El Roble" }).click();
    // ProveedorFormModal no está en el contexto que me pasaste — completar
    // según los campos reales una vez que lo compartas.
  });
});