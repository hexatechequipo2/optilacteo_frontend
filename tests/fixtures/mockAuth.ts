import type { Page } from "@playwright/test";

/**
 * OJO: no tengo el código de AuthContext/LoginResponse, así que la forma
 * exacta de "user" (rolNombre, id, etc.) es una suposición basada en cómo
 * se usa en LoginPage/UsuariosPage/ProveedoresPage (user.rolNombre, user.id).
 * Si el shape real es distinto, ajustar acá nomás — todos los tests
 * dependen de este único mock.
 */
export interface MockUser {
  id: number;
  email: string;
  rolNombre: "Administrador" | "Gerente";
  empresaId?: number;
}

const ADMIN_USER: MockUser = {
  id: 1,
  email: "admin@optilacteo.com",
  rolNombre: "Administrador",
};

const GERENTE_USER: MockUser = {
  id: 2,
  email: "gerente@optilacteo.com",
  rolNombre: "Gerente",
  empresaId: 10,
};

/**
 * Interceptamos la llamada real de login (authService.login -> POST /login)
 * y devolvemos una respuesta fake. Usamos "**\/login" con chequeo de método
 * POST para no pisar la navegación GET a la página /login.
 */
async function mockLoginEndpoint(page: Page, user: MockUser) {
  await page.route("**/login", async (route) => {
    if (route.request().method() !== "POST") {
      return route.continue();
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "fake-access-token",
        refresh_token: "fake-refresh-token",
        user,
      }),
    });
  });
}

/**
 * Loguea de verdad a través de la UI (form real + submit) contra un backend
 * mockeado. Es más robusto que setear localStorage a mano porque no depende
 * de cómo AuthContext persiste la sesión internamente.
 */
export async function loginAs(page: Page, user: MockUser) {
  await mockLoginEndpoint(page, user);

  await page.goto("/login");
  await page.getByLabel("Correo corporativo").fill(user.email);
  await page.locator("#password").fill("password123");
  await page.getByRole("button", { name: "Ingresar a la consola" }).click();

  // LoginPage navega a /dashboard con replace tras un login exitoso
  await page.waitForURL("/dashboard");
}

export async function loginAsAdministrador(page: Page) {
  await loginAs(page, ADMIN_USER);
}

export async function loginAsGerente(page: Page) {
  await loginAs(page, GERENTE_USER);
}