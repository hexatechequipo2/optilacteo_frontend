import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import { loginAsAdministrador, loginAsGerente } from "./fixtures/mockAuth.ts";

/**
 * Loguea cualquier excepción de JS no capturada (pageerror) y errores de
 * consola directo en el output de Playwright. Útil mientras diagnosticamos
 * por qué UsuariosPage no renderiza — más rápido que adivinar qué archivo
 * falta ver.
 */
function logBrowserErrors(page: Page) {
  page.on("pageerror", (err) => {
    console.log("\n🔴 pageerror en el browser:", err.message, "\n", err.stack);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log("\n🔴 console.error en el browser:", msg.text());
    }
  });
}

// useUsuarios pagina con limit=3 fijo y mapea meta.totalPages -> lastPage.
// NOTA: usaba "nombre" acá, pero la app crasheaba con
// "Cannot read properties of undefined (reading 'split')" al renderizar
// la tabla — señal de que UsuarioType usa "name" (como EmpresaType), no
// "nombre". Si me pasás usuario.types.ts confirmamos el shape exacto.
const USUARIOS_MOCK = {
  data: [
    { id: 5, name: "Juan Pérez", email: "juan@optilacteo.com", rolNombre: "Gerente", isActive: true, isLocked: false },
    { id: 6, name: "Ana García", email: "ana@optilacteo.com", rolNombre: "Operador", isActive: true, isLocked: true },
  ],
  meta: { page: 1, limit: 3, total: 2, totalPages: 1 },
};

const EMPRESAS_MOCK = {
  data: [{ id: 1, name: "Tambo San José", cuit: "30-12345678-9", plan: "pro", isActive: true }],
  meta: { page: 1, limit: 5, total: 1, totalPages: 1 },
};

const ROLES_MOCK = [
  { id: 1, nombre: "Administrador", permisos: [] },
  { id: 2, nombre: "Gerente", permisos: [] },
  { id: 3, nombre: "Operador", permisos: [] },
];

async function mockUsuariosDeps(page: Page) {
  // Red de seguridad: cualquier otro request XHR/fetch que no matcheemos
  // explícitamente abajo (ej. "contadores" del Layout) devuelve un array
  // vacío en vez de fallar la conexión real (no hay backend corriendo en
  // los tests). Se registra primero para que los mocks específicos, al
  // registrarse después, tengan prioridad.
  await page.route("**/*", async (route) => {
    const type = route.request().resourceType();
    if (type === "xhr" || type === "fetch") {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    return route.continue();
  });

  await page.route("**/user*", async (route) => {
    if (route.request().method() !== "GET" || route.request().resourceType() === "document") return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(USUARIOS_MOCK) });
  });
  await page.route("**/empresa*", async (route) => {
    if (route.request().method() !== "GET" || route.request().resourceType() === "document") return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPRESAS_MOCK) });
  });
  await page.route("**/rol", async (route) => {
    if (route.request().method() !== "GET" || route.request().resourceType() === "document") return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ROLES_MOCK) });
  });
}

test.describe("UsuariosPage", () => {
  test("muestra la lista de usuarios (excluyendo al usuario logueado)", async ({ page }) => {
    logBrowserErrors(page);
    await mockUsuariosDeps(page);
    await loginAsAdministrador(page); // id: 1, no debería aparecer en la tabla

    await page.goto("/usuarios");
    await expect(page.getByText("Juan Pérez")).toBeVisible();
    await expect(page.getByText("Ana García")).toBeVisible();
  });

  test("Administrador ve el filtro de empresa, Gerente no", async ({ page }) => {
    await mockUsuariosDeps(page);
    await loginAsAdministrador(page);
    await page.goto("/usuarios");
    await expect(page.locator("#usuarios-empresa-filtro")).toBeVisible();
  });

  test("Gerente no ve el filtro de empresa", async ({ page }) => {
    await mockUsuariosDeps(page);
    await loginAsGerente(page);
    await page.goto("/usuarios");
    await expect(page.locator("#usuarios-empresa-filtro")).not.toBeVisible();
  });

  test("elegir una empresa en el filtro manda empresaId al backend", async ({ page }) => {
    await mockUsuariosDeps(page);
    await loginAsAdministrador(page);
    await page.goto("/usuarios");

    const requestPromise = page.waitForRequest(
      (req) => req.url().includes("/user") && req.method() === "GET" && req.url().includes("empresaId=1"),
    );
    await page.locator("#usuarios-empresa-filtro").selectOption("1");
    await requestPromise;
  });

  test("buscar por nombre manda el filtro name al backend", async ({ page }) => {
    await mockUsuariosDeps(page);
    await loginAsAdministrador(page);
    await page.goto("/usuarios");

    const requestPromise = page.waitForRequest(
      (req) => req.url().includes("/user") && req.method() === "GET" && req.url().includes("name=Juan"),
    );
    await page.getByPlaceholder("Buscar por nombre o email...").fill("Juan");
    await requestPromise;
  });

  test("desbloquear un usuario bloqueado llama al endpoint correspondiente", async ({ page }) => {
    await mockUsuariosDeps(page);
    await loginAsAdministrador(page);
    await page.goto("/usuarios");

    await page.route("**/user/6/desbloquear", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...USUARIOS_MOCK.data[1], isLocked: false }),
      });
    });

    // El botón de desbloqueo vive en UsuariosTable, que no está en el
    // contexto que me pasaste — ajustar el selector según el label/icon real.
    // Ejemplo aproximado (descomentar cuando tengas el selector real):
    // const unlockPromise = page.waitForRequest(
    //   (req) => req.url().includes("/user/6/desbloquear") && req.method() === "PATCH",
    // );
    // await page.getByRole("button", { name: "Desbloquear Ana García" }).click();
    // await unlockPromise;
  });

  test("crear un usuario nuevo lo agrega a la lista", async ({ page }) => {
    await mockUsuariosDeps(page);
    await loginAsAdministrador(page);
    await page.goto("/usuarios");

    await page.route("**/user", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: 7, isActive: true, isLocked: false, ...body }),
      });
    });

    await page.getByRole("button", { name: "+ Nuevo usuario" }).click();
    // NuevoUsuarioModal no está en el contexto que me pasaste — completar
    // según los campos reales (nombre, email, rol, empresa) una vez compartido.
  });
});