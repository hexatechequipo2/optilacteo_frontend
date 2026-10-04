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

// Landing = primera ruta de utils/accesoRutas.ts con permiso. Con la matriz
// por defecto todos los roles de empresa tienen dashboard:ver.
const LOGIN_DESTINATIONS: Record<MockUser["rolNombre"], string> = {
  Administrador: "/dashboard",
  Gerente: "/dashboard-produccion",
  "Responsable de calidad": "/dashboard-produccion",
  "Responsable de producción": "/dashboard-produccion",
  "Operario de línea": "/dashboard-produccion",
};

// Espejo de MATRIZ_PERMISOS_POR_DEFECTO (permisos-por-defecto.constant.ts
// del back). R = ver, C = crear, U = editar, D = eliminar, E = exportar.
const LECTURA_SISTEMA: Record<string, string> = {
  dashboard: "RE",
  recepcion: "RE",
  destino_productivo_ia: "RE",
  monitoreo_alertas: "RE",
  sensores_iot: "RE",
  trazabilidad: "RE",
  reportes_forecast: "RE",
  asistente_voz: "RE",
};

const MATRIZ_POR_DEFECTO: Record<Exclude<MockUser["rolNombre"], "Administrador">, Record<string, string>> = {
  Gerente: {
    ...LECTURA_SISTEMA,
    recepcion: "RCUDE",
    destino_productivo_ia: "RCE",
    monitoreo_alertas: "RUE",
    sensores_iot: "RCUDE",
    trazabilidad: "RCUDE",
    configuracion_empresa: "RCUD",
    gestion_roles: "RCUD",
    gestion_usuarios: "RCU",
    auditoria: "RE",
  },
  "Operario de línea": {
    ...LECTURA_SISTEMA,
    monitoreo_alertas: "RCE",
    sensores_iot: "RUE",
  },
  "Responsable de producción": {
    ...LECTURA_SISTEMA,
    destino_productivo_ia: "RCE",
    monitoreo_alertas: "RUE",
    sensores_iot: "RCUDE",
    trazabilidad: "RCUE",
    configuracion_empresa: "R",
  },
  "Responsable de calidad": {
    ...LECTURA_SISTEMA,
    recepcion: "RCE",
    trazabilidad: "RCUE",
    configuracion_empresa: "R",
    gestion_usuarios: "R",
  },
};

export function permisosPorDefecto(rolNombre: MockUser["rolNombre"]) {
  if (rolNombre === "Administrador") {
    return { esSistema: true, rolNombre, permisos: [] };
  }
  return {
    esSistema: false,
    rolNombre,
    permisos: Object.entries(MATRIZ_POR_DEFECTO[rolNombre]).map(([modulo, f]) => ({
      modulo,
      canRead: f.includes("R"),
      canCreate: f.includes("C"),
      canUpdate: f.includes("U"),
      canDelete: f.includes("D"),
      canExport: f.includes("E"),
    })),
  };
}

// HU-72: PermisosProvider pide los permisos al login, al restaurar sesión y
// en recargas silenciosas. Exportado para specs que arman el login a mano.
export async function mockPermisos(page: Page, rolNombre: MockUser["rolNombre"]) {
  await page.route("**/auth/me/permisos", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(permisosPorDefecto(rolNombre)),
    }),
  );
}

// HU-72: la matriz por defecto da ver en todos los módulos de sistema a
// todos los roles de empresa; para probar el bloqueo de una ruta se le saca
// el módulo al rol. Llamarlo después del login y antes del page.goto.
export async function quitarPermisos(
  page: Page,
  rolNombre: Exclude<MockUser["rolNombre"], "Administrador">,
  modulos: string[],
) {
  const base = permisosPorDefecto(rolNombre);
  await page.route("**/auth/me/permisos", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...base,
        permisos: base.permisos.filter((p) => !modulos.includes(p.modulo)),
      }),
    }),
  );
}

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
  await mockPermisos(page, user.rolNombre);

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