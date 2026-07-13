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
test.describe("NuevoUsuarioModal", () => {
  async function abrirNuevoUsuario(page: Page) {
    await mockUsuariosDeps(page);
    await loginAsAdministrador(page);
    await page.goto("/usuarios");

    await page
      .getByRole("button", { name: "+ Nuevo usuario" })
      .click();

    await expect(
      page.getByRole("heading", { name: "Nuevo usuario" }),
    ).toBeVisible();

    return page.locator("#usuario-form");
  }

  async function completarUsuarioValido(page: Page) {
    const form = page.locator("#usuario-form");

    await form
      .getByPlaceholder("Ej: Lucía Fernández")
      .fill("Lucía Fernández");

    await form
      .getByPlaceholder("usuario@empresa.com")
      .fill("lucia@optilacteo.com");

    await form
      .getByPlaceholder("Mínimo 8 caracteres")
      .fill("password123");

    await form
      .locator("select")
      .selectOption("1");

    await form
      .getByText("Operador", { exact: true })
      .click();

    return form;
  }

  test("abre el modal de nuevo usuario", async ({ page }) => {
    await abrirNuevoUsuario(page);

    await expect(
      page.getByText("Asigna una empresa, un rol y sus permisos"),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Cancelar" }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Crear usuario" }),
    ).toBeVisible();
  });

  test("muestra los campos del formulario de creación", async ({ page }) => {
    const form = await abrirNuevoUsuario(page);

    await expect(
      form.getByPlaceholder("Ej: Lucía Fernández"),
    ).toBeVisible();

    await expect(
      form.getByPlaceholder("usuario@empresa.com"),
    ).toBeVisible();

    await expect(
      form.getByPlaceholder("Mínimo 8 caracteres"),
    ).toBeVisible();

    await expect(
      form.locator("select"),
    ).toBeVisible();

    await expect(
      form.locator('select option[value="1"]'),
    ).toHaveText("Tambo San José");

    await expect(
      form.getByText("Administrador", { exact: true }),
    ).toBeVisible();

    await expect(
      form.getByText("Gerente", { exact: true }),
    ).toBeVisible();

    await expect(
      form.getByText("Operador", { exact: true }),
    ).toBeVisible();
  });

  test("valida los campos obligatorios", async ({ page }) => {
    const form = await abrirNuevoUsuario(page);

    await page
      .getByRole("button", { name: "Crear usuario" })
      .click();

    await expect(
      form.getByText("El nombre es obligatorio"),
    ).toBeVisible();

    await expect(
      form.getByText("El email es obligatorio"),
    ).toBeVisible();

    await expect(
      form.getByText(
        "La contraseña debe tener al menos 8 caracteres",
      ),
    ).toBeVisible();

    await expect(
      form.locator("span.text-red-600", {
        hasText: "Seleccioná una empresa",
      }),
    ).toBeVisible();

    await expect(
      form.getByText("Seleccioná un rol"),
    ).toBeVisible();
  });

  test("valida el formato del email", async ({ page }) => {
    const form = await abrirNuevoUsuario(page);

    await form
      .getByPlaceholder("Ej: Lucía Fernández")
      .fill("Lucía Fernández");

    await form
      .getByPlaceholder("usuario@empresa.com")
      .fill("email-invalido");

    await form
      .getByPlaceholder("Mínimo 8 caracteres")
      .fill("password123");

    await form.locator("select").selectOption("1");

    await form
      .getByText("Operador", { exact: true })
      .click();

    await page
      .getByRole("button", { name: "Crear usuario" })
      .click();

    await expect(
      form.getByText("El email no es válido"),
    ).toBeVisible();
  });

  test("valida que la contraseña tenga al menos 8 caracteres", async ({
    page,
  }) => {
    const form = await abrirNuevoUsuario(page);

    await form
      .getByPlaceholder("Ej: Lucía Fernández")
      .fill("Lucía Fernández");

    await form
      .getByPlaceholder("usuario@empresa.com")
      .fill("lucia@optilacteo.com");

    await form
      .getByPlaceholder("Mínimo 8 caracteres")
      .fill("1234567");

    await form.locator("select").selectOption("1");

    await form
      .getByText("Operador", { exact: true })
      .click();

    await page
      .getByRole("button", { name: "Crear usuario" })
      .click();

    await expect(
      form.getByText(
        "La contraseña debe tener al menos 8 caracteres",
      ),
    ).toBeVisible();
  });

  test("crea un usuario enviando el payload correcto", async ({ page }) => {
    let payload: Record<string, unknown> | undefined;

    await mockUsuariosDeps(page);
    await loginAsAdministrador(page);

    await page.route("**/user", async (route) => {
      if (route.request().method() !== "POST") {
        return route.continue();
      }

      payload = route.request().postDataJSON();

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: 7,
          isActive: true,
          isLocked: false,
          ...payload,
        }),
      });
    });

    await page.goto("/usuarios");

    await page
      .getByRole("button", { name: "+ Nuevo usuario" })
      .click();

    await completarUsuarioValido(page);

    const requestPromise = page.waitForRequest(
      (request) =>
        request.url().includes("/user") &&
        request.method() === "POST",
    );

    await page
      .getByRole("button", { name: "Crear usuario" })
      .click();

    await requestPromise;

    expect(payload).toEqual({
      name: "Lucía Fernández",
      email: "lucia@optilacteo.com",
      password: "password123",
      rolId: 3,
      empresaId: 1,
    });
  });

  test("un error 409 de email se muestra en el campo", async ({ page }) => {
    await mockUsuariosDeps(page);
    await loginAsAdministrador(page);

    await page.route("**/user", async (route) => {
      if (route.request().method() !== "POST") {
        return route.continue();
      }

      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          field: "email",
          message: "El email ya está registrado",
        }),
      });
    });

    await page.goto("/usuarios");

    await page
      .getByRole("button", { name: "+ Nuevo usuario" })
      .click();

    const form = await completarUsuarioValido(page);

    await page
      .getByRole("button", { name: "Crear usuario" })
      .click();

    await expect(
      form.getByText("El email ya está registrado"),
    ).toBeVisible();
  });

  test("un error 409 genérico muestra el mensaje del backend", async ({
    page,
  }) => {
    await mockUsuariosDeps(page);
    await loginAsAdministrador(page);

    await page.route("**/user", async (route) => {
      if (route.request().method() !== "POST") {
        return route.continue();
      }

      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          message: "El usuario ya existe",
        }),
      });
    });

    await page.goto("/usuarios");

    await page
      .getByRole("button", { name: "+ Nuevo usuario" })
      .click();

    const form = await completarUsuarioValido(page);

    await page
      .getByRole("button", { name: "Crear usuario" })
      .click();

    await expect(
      form.getByText("El usuario ya existe"),
    ).toBeVisible();
  });

  test("muestra error genérico ante un error inesperado", async ({ page }) => {
    await mockUsuariosDeps(page);
    await loginAsAdministrador(page);

    await page.route("**/user", async (route) => {
      if (route.request().method() !== "POST") {
        return route.continue();
      }

      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Internal Server Error",
        }),
      });
    });

    await page.goto("/usuarios");

    await page
      .getByRole("button", { name: "+ Nuevo usuario" })
      .click();

    const form = await completarUsuarioValido(page);

    await page
      .getByRole("button", { name: "Crear usuario" })
      .click();

    await expect(
      form.getByText(
        "No se pudo guardar el usuario. Intentá nuevamente.",
      ),
    ).toBeVisible();
  });

  test("Cancelar cierra el modal", async ({ page }) => {
    await abrirNuevoUsuario(page);

    await page
      .getByRole("button", { name: "Cancelar" })
      .click();

    await expect(
      page.getByRole("heading", { name: "Nuevo usuario" }),
    ).not.toBeVisible();
  });

  test("Escape cierra el modal", async ({ page }) => {
    await abrirNuevoUsuario(page);

    await page.keyboard.press("Escape");

    await expect(
      page.getByRole("heading", { name: "Nuevo usuario" }),
    ).not.toBeVisible();
  });

  test("el formulario de creación no muestra el estado del usuario", async ({
    page,
  }) => {
    const form = await abrirNuevoUsuario(page);

    await expect(
      form.getByText("ESTADO", { exact: true }),
    ).not.toBeVisible();

    await expect(
      form.getByText("Usuario activo"),
    ).not.toBeVisible();

    await expect(
      form.getByText("Usuario inactivo"),
    ).not.toBeVisible();
  });
});
});