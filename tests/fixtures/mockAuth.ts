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
  rolNombre: "Administrador" | "Gerente" | "Responsable de calidad" | "Responsable de producción" | "Operario de línea";
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

const RESPONSABLE_CALIDAD_USER: MockUser = {
  id: 3,
  email: "calidad@optilacteo.com",
  rolNombre: "Responsable de calidad",
  empresaId: 10,
};

const RESPONSABLE_PRODUCCION_USER: MockUser = {
  id: 4,
  email: "produccion@optilacteo.com",
  rolNombre: "Responsable de producción",
  empresaId: 10,
};

const OPERARIO_USER: MockUser = {
  id: 5,
  email: "operario@optilacteo.com",
  rolNombre: "Operario de línea",
  empresaId: 10,
};

const LOGIN_DESTINATIONS: Record<MockUser["rolNombre"], string> = {
  Administrador: "/dashboard",
  Gerente: "/dashboard-produccion",
  "Responsable de calidad": "/lotes",
  "Responsable de producción": "/dashboard-produccion",
  "Operario de línea": "/sensores",
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

  // El access_token vive solo en memoria (ver tokenStore/AuthContext): un
  // page.goto() a mitad de test es una recarga dura que lo pierde, y
  // AuthContext dispara un POST /refresh silencioso para restaurar la
  // sesión a partir del refresh_token guardado. Sin este mock esa llamada
  // caía en el catch-all genérico de cada spec (200 []), dejaba
  // isAuthenticated en false y ProtectedRoute redirigía a /login a mitad
  // de test.
  await page.route("**/refresh", async (route) => {
    if (route.request().method() !== "POST") {
      return route.continue();
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "fake-access-token-refreshed",
        refresh_token: "fake-refresh-token",
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

  await page.waitForURL(LOGIN_DESTINATIONS[user.rolNombre]);
}

export async function loginAsAdministrador(page: Page) {
  await loginAs(page, ADMIN_USER);
}

export async function loginAsGerente(page: Page) {
  await loginAs(page, GERENTE_USER);
}

export async function loginAsResponsableCalidad(page: Page) {
  await loginAs(page, RESPONSABLE_CALIDAD_USER);
}

export async function loginAsResponsableProduccion(page: Page) {
  await loginAs(page, RESPONSABLE_PRODUCCION_USER);
}

export async function loginAsOperario(page: Page) {
  await loginAs(page, OPERARIO_USER);
}