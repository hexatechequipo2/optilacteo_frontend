/// <reference lib="dom" />
import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import type { Request } from "@playwright/test";
import {
  loginAs,
  loginAsAdministrador,
  loginAsGerente,
  loginAsResponsableCalidad,
} from "./fixtures/mockAuth.ts";
import {
  EMPRESA_CHICA,
  EMPRESA_ROLES,
  MATRIZ_GERENTE,
  ROLES_MOCK,
  flags,
  misPermisos,
  type EmpresaType,
  type GuardarRolDto,
  type MisPermisos,
  type RolGuardadoResponse,
  type RolType,
} from "./fixtures/roles.ts";

// HU-72: matriz de roles y permisos por módulo y acción (RolesPage +
// RolEditor), y que un cambio en la matriz se refleje en menú, botones y
// rutas después del refetch de GET /auth/me/permisos.

type Respuesta = { status: number; body?: unknown } | "error-de-red";

interface Escenario {
  roles: RolType[];
  // Lo que devuelve GET /auth/me/permisos en este momento.
  permisos: MisPermisos;
  permisosStatus: number;
  permisosLlamadas: number;
  // Si está seteado, un PUT /roles/:id exitoso cambia la matriz del back.
  permisosTrasGuardar?: MisPermisos;
  respuestas: Partial<Record<"GET" | "POST" | "PUT" | "DELETE", Respuesta>>;
  // Retiene GET /roles hasta que el test lo libere (estado de carga).
  retenerGet?: Promise<void>;
  requests: Request[];
}

const GERENTE_CON_ROL = {
  id: 2,
  email: "gerente@optilacteo.com",
  rolNombre: "Gerente" as const,
  empresaId: 10,
  rolId: 2,
};

const SIN_ACCESO = flags("");

const ADMIN_PERMISOS: MisPermisos = { esSistema: true, rolNombre: "Administrador", permisos: [] };

const DASHBOARD_VACIO = {
  lotesProcesados: { valor: 0, valorAnterior: 0, variacion: 0, tendencia: "igual" },
  alertasActivas: { valor: 0, valorAnterior: 0, variacion: 0, tendencia: "igual" },
  parametrosCriticos: { valor: 0, valorAnterior: 0, variacion: 0, tendencia: "igual" },
  lineaCalidad: { recepcion: 0, clasificacion: 0, noAptos: 0, aptos: 0, totalLotesSistema: 0 },
  actualizadoEn: "2026-08-03T08:00:00.000Z",
};

function nuevoEscenario(): Escenario {
  return {
    roles: structuredClone(ROLES_MOCK),
    permisos: misPermisos("Gerente", MATRIZ_GERENTE),
    permisosStatus: 200,
    permisosLlamadas: 0,
    respuestas: {},
    requests: [],
  };
}

const esApi = (route: { request(): Request }) => {
  const rt = route.request().resourceType();
  return rt === "fetch" || rt === "xhr";
};

// Infra común del Layout. Se registra antes del login: el aterrizaje en el
// dashboard ya dispara estos requests.
async function mockLayout(page: Page, empresas: EmpresaType[] = [EMPRESA_ROLES, EMPRESA_CHICA]) {
  await page.route("**/*", (route) =>
    esApi(route)
      ? route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
      : route.continue(),
  );
  const paginado = (data: unknown[]) =>
    JSON.stringify({ data, meta: { page: 1, limit: 100, total: data.length, totalPages: 1 } });
  await page.route("**/notificacion*", (route) =>
    esApi(route)
      ? route.fulfill({ status: 200, contentType: "application/json", body: paginado([]) })
      : route.continue(),
  );
  await page.route("**/lotes*", (route) =>
    esApi(route) && route.request().method() === "GET"
      ? route.fulfill({ status: 200, contentType: "application/json", body: paginado([]) })
      : route.continue(),
  );
  await page.route((url) => url.pathname === "/empresa/me", (route) =>
    esApi(route)
      ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPRESA_ROLES) })
      : route.continue(),
  );
  // Landing de los roles de empresa: con el catch-all ("[]") el dashboard
  // crashea leyendo lineaCalidad.totalLotesSistema.
  await page.route((url) => url.pathname === "/dashboard", (route) =>
    esApi(route)
      ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(DASHBOARD_VACIO) })
      : route.continue(),
  );
  await page.route((url) => url.pathname === "/dashboard/lotes-procesados/historico", (route) =>
    esApi(route)
      ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ dias: 7, puntos: [] }) })
      : route.continue(),
  );
  // Selector de empresa del Administrador: GET /empresa?page=1&limit=100.
  await page.route((url) => url.pathname === "/empresa", (route) =>
    esApi(route)
      ? route.fulfill({ status: 200, contentType: "application/json", body: paginado(empresas) })
      : route.continue(),
  );
}

async function mockRolesApi(page: Page, esc: Escenario) {
  await page.route(/\/roles(\/\d+)?(\?.*)?$/, async (route) => {
    if (!esApi(route)) return route.continue();
    const req = route.request();
    const method = req.method() as keyof Escenario["respuestas"];
    esc.requests.push(req);
    const id = Number(new URL(req.url()).pathname.split("/")[2]);

    if (method === "GET" && esc.retenerGet) await esc.retenerGet;

    const forzada = esc.respuestas[method];
    if (forzada === "error-de-red") return route.abort("failed");
    if (forzada) {
      return route.fulfill({
        status: forzada.status,
        contentType: "application/json",
        body: JSON.stringify(forzada.body ?? {}),
      });
    }

    if (method === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(esc.roles) });
    }
    if (method === "POST") {
      const dto = req.postDataJSON() as GuardarRolDto;
      const creado = { id: 100 + esc.roles.length, nombre: dto.nombre } satisfies RolGuardadoResponse;
      esc.roles.push({
        ...creado,
        descripcion: dto.descripcion ?? null,
        esSistema: false,
        esCatalogo: false,
        usuarios: 0,
        permisos: dto.permisos,
      });
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(creado) });
    }
    if (method === "PUT") {
      const dto = req.postDataJSON() as GuardarRolDto;
      esc.roles = esc.roles.map((r) => (r.id === id ? { ...r, ...dto } : r));
      if (esc.permisosTrasGuardar) esc.permisos = esc.permisosTrasGuardar;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id, nombre: dto.nombre } satisfies RolGuardadoResponse),
      });
    }
    // DELETE
    esc.roles = esc.roles.filter((r) => r.id !== id);
    return route.fulfill({ status: 204, body: "" });
  });
}

// Se registra después del login para pisar el mockPermisos de loginAs.
async function mockPermisosControlados(page: Page, esc: Escenario) {
  await page.route("**/auth/me/permisos", (route) => {
    esc.permisosLlamadas++;
    return route.fulfill({
      status: esc.permisosStatus,
      contentType: "application/json",
      body: JSON.stringify(esc.permisosStatus === 200 ? esc.permisos : { message: "Error" }),
    });
  });
}

// Gerente (o el usuario indicado) en /roles con la matriz del escenario.
async function abrirRoles(
  page: Page,
  esc: Escenario,
  login: (page: Page) => Promise<void> = loginAsGerente,
) {
  await mockLayout(page);
  await mockRolesApi(page, esc);
  await login(page);
  await mockPermisosControlados(page, esc);
  await page.goto("/roles");
  await expect(page.getByRole("heading", { name: "Roles y permisos" })).toBeVisible();
}

const menu = (page: Page) => page.getByRole("complementary");
const opcionMenu = (page: Page, label: string) =>
  menu(page).getByRole("button", { name: label, exact: true });
const itemRol = (page: Page, nombre: string) =>
  page.getByRole("button", { name: new RegExp(`^${nombre}`) });
const acceso = (page: Page, modulo: string) =>
  page.getByRole("combobox", { name: `Acceso a ${modulo}`, exact: true });
const accion = (page: Page, accionLabel: string, modulo: string) =>
  page.getByRole("checkbox", { name: `${accionLabel} en ${modulo}`, exact: true });

const ACCIONES = ["Ver", "Crear", "Editar", "Eliminar", "Exportar"] as const;

async function expectFila(page: Page, modulo: string, marcadas: string) {
  for (const a of ACCIONES) {
    const letra = { Ver: "R", Crear: "C", Editar: "U", Eliminar: "D", Exportar: "E" }[a];
    if (marcadas.includes(letra)) await expect(accion(page, a, modulo)).toBeChecked();
    else await expect(accion(page, a, modulo)).not.toBeChecked();
  }
}

// Después de guardar, useRoles vuelve a pedir GET /roles en segundo plano.
const recargaDeRoles = (page: Page) =>
  page.waitForResponse(
    (r) =>
      r.request().method() === "GET" &&
      ["fetch", "xhr"].includes(r.request().resourceType()) &&
      new URL(r.url()).pathname === "/roles",
  );

const MENSAJE_EXITO = "Los cambios se guardaron correctamente.";

const pedidos = (esc: Escenario, method: string) => esc.requests.filter((r) => r.method() === method);

// Orden de la matriz enviada: módulos de sistema contratados por la empresa
// (en el orden de MODULOS_SISTEMA) y después los administrativos.
const MODULOS_ENVIADOS = [
  "dashboard",
  "recepcion",
  "monitoreo_alertas",
  "sensores_iot",
  "trazabilidad",
  "gestion_roles",
  "gestion_usuarios",
  "auditoria",
  "configuracion_empresa",
];

test.describe("RolesPage (HU-72) › Acceso y menú", () => {
  test("el Gerente ve 'Roles y permisos' en el menú y entra a la pantalla", async ({ page }) => {
    const esc = nuevoEscenario();
    await mockLayout(page);
    await mockRolesApi(page, esc);
    await loginAsGerente(page);

    await opcionMenu(page, "Roles y permisos").click();

    await expect(page).toHaveURL("/roles");
    await expect(page.getByRole("heading", { name: "Roles y permisos" })).toBeVisible();
    await expect(page.getByText("Qué puede ver y hacer cada rol de Lácteos del Sur")).toBeVisible();
  });

  test("un rol sin gestion_roles no ve la opción en el menú y la ruta responde acceso no autorizado", async ({ page }) => {
    await mockLayout(page);
    await loginAsResponsableCalidad(page);

    await expect(menu(page).getByRole("button", { name: /^Usuarios/ })).toBeVisible();
    await expect(opcionMenu(page, "Roles y permisos")).toHaveCount(0);

    await page.goto("/roles");
    await expect(page.getByRole("heading", { name: "Acceso no autorizado" })).toBeVisible();
    await expect(page.getByText("Tu rol no tiene permiso para ver esta sección.")).toBeVisible();
  });

  test("con solo 'ver' en gestión de roles la matriz queda en solo lectura", async ({ page }) => {
    const esc = nuevoEscenario();
    esc.permisos = misPermisos("Gerente", { ...MATRIZ_GERENTE, gestion_roles: "R" });
    await abrirRoles(page, esc);

    await expect(page.getByRole("button", { name: "+ Nuevo rol" })).toHaveCount(0);
    await itemRol(page, "Supervisor de turno").click();

    await expect(page.getByLabel("Nombre *")).toBeDisabled();
    await expect(acceso(page, "Dashboard")).toBeDisabled();
    await expect(accion(page, "Ver", "Dashboard")).toBeDisabled();
    await expect(page.getByText("Solo lectura: tu rol no puede modificar roles.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Eliminar rol" })).toHaveCount(0);
  });
});

test.describe("RolesPage (HU-72) › Listado", () => {
  test("lista los roles con su tipo y cantidad de usuarios, y abre el primero", async ({ page }) => {
    const esc = nuevoEscenario();
    await abrirRoles(page, esc);

    await expect(itemRol(page, "Administrador")).toContainText("Sistema");
    await expect(itemRol(page, "Administrador")).toContainText("1 usuario(s)");
    await expect(itemRol(page, "Gerente")).toContainText("Catálogo");
    await expect(itemRol(page, "Gerente")).toContainText("3 usuario(s)");
    await expect(itemRol(page, "Supervisor de turno")).toContainText("Personalizado");
    await expect(itemRol(page, "Supervisor de turno")).toContainText("0 usuario(s)");

    // Primer rol de la lista = Administrador.
    await expect(page.getByLabel("Nombre *")).toHaveValue("Administrador");
  });

  test("muestra 'Cargando roles...' mientras GET /roles está en vuelo", async ({ page }) => {
    const esc = nuevoEscenario();
    let liberar!: () => void;
    esc.retenerGet = new Promise((resolve) => (liberar = resolve));
    await mockLayout(page);
    await mockRolesApi(page, esc);
    await loginAsGerente(page);
    await mockPermisosControlados(page, esc);
    await page.goto("/roles");

    await expect(page.getByText("Cargando roles...")).toBeVisible();
    liberar();
    await expect(page.getByText("Cargando roles...")).toHaveCount(0);
    await expect(itemRol(page, "Gerente")).toBeVisible();
  });

  test("si GET /roles falla con 500 muestra el error de carga", async ({ page }) => {
    const esc = nuevoEscenario();
    esc.respuestas.GET = { status: 500, body: { message: "Internal server error" } };
    await abrirRoles(page, esc);

    await expect(page.getByText("No se pudieron cargar los roles.")).toBeVisible();
    await expect(itemRol(page, "Gerente")).toHaveCount(0);
  });

  test("el rol Administrador tiene acceso total y no se puede editar", async ({ page }) => {
    const esc = nuevoEscenario();
    await abrirRoles(page, esc);
    await itemRol(page, "Administrador").click();

    await expect(
      page.getByText("Acceso total a todos los módulos. El rol Administrador no se puede modificar."),
    ).toBeVisible();
    await expect(acceso(page, "Dashboard")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Eliminar rol" })).toHaveCount(0);
  });

  test("un rol del catálogo no se puede renombrar ni eliminar, pero sí ajustar su matriz", async ({ page }) => {
    const esc = nuevoEscenario();
    await abrirRoles(page, esc);
    await itemRol(page, "Gerente").click();

    await expect(page.getByLabel("Nombre *")).toBeDisabled();
    await expect(page.getByLabel("Descripción")).toBeDisabled();
    await expect(page.getByText(/Rol del catálogo: se pueden ajustar sus permisos/)).toBeVisible();
    await expect(acceso(page, "Recepción")).toBeEnabled();
    await expect(page.getByRole("button", { name: "Eliminar rol" })).toBeDisabled();
    await expect(page.getByText("Los roles del catálogo no se pueden eliminar.")).toBeVisible();
  });

  test("un rol con usuarios asignados no se puede eliminar y explica por qué", async ({ page }) => {
    const esc = nuevoEscenario();
    await abrirRoles(page, esc);
    await itemRol(page, "Analista externo").click();

    await expect(page.getByLabel("Nombre *")).toBeEnabled();
    await expect(page.getByRole("button", { name: "Eliminar rol" })).toBeDisabled();
    await expect(
      page.getByText("Tiene 2 usuario(s) asignado(s). Reasignalos antes de eliminarlo."),
    ).toBeVisible();
  });

  test("la matriz solo ofrece los módulos de sistema contratados por la empresa", async ({ page }) => {
    const esc = nuevoEscenario();
    await abrirRoles(page, esc);
    await itemRol(page, "Supervisor de turno").click();

    for (const m of ["Dashboard", "Recepción", "Monitoreo y alertas", "Sensores IoT", "Trazabilidad"]) {
      await expect(acceso(page, m)).toBeVisible();
    }
    for (const m of ["Destino productivo (IA)", "Reportes y forecast", "Asistente de voz"]) {
      await expect(acceso(page, m)).toHaveCount(0);
    }
    for (const m of ["Gestión de roles", "Gestión de usuarios", "Auditoría", "Configuración de la empresa"]) {
      await expect(acceso(page, m)).toBeVisible();
    }
  });
});

test.describe("RolesPage (HU-72) › Matriz de permisos", () => {
  test.beforeEach(async ({ page }) => {
    await abrirRoles(page, nuevoEscenario());
    await itemRol(page, "Supervisor de turno").click();
  });

  test("los presets de acceso marcan las acciones correspondientes", async ({ page }) => {
    await acceso(page, "Recepción").selectOption({ label: "Solo ver" });
    await expectFila(page, "Recepción", "R");

    // Igual que el back: "Ver y modificar" no incluye exportar.
    await acceso(page, "Recepción").selectOption({ label: "Ver y modificar" });
    await expectFila(page, "Recepción", "RCUD");

    await acceso(page, "Recepción").selectOption({ label: "Sin acceso" });
    await expectFila(page, "Recepción", "");
  });

  test("marcar una acción marca 'Ver' y deja el acceso en 'Personalizado'", async ({ page }) => {
    await expect(acceso(page, "Recepción")).toHaveValue("SIN_ACCESO");

    await accion(page, "Exportar", "Recepción").check();

    await expectFila(page, "Recepción", "RE");
    await expect(acceso(page, "Recepción")).toHaveValue("PERSONALIZADO");
  });

  test("desmarcar 'Ver' limpia toda la fila", async ({ page }) => {
    await expectFila(page, "Monitoreo y alertas", "RCUD");
    await expect(acceso(page, "Monitoreo y alertas")).toHaveValue("VER_Y_MODIFICAR");

    await accion(page, "Ver", "Monitoreo y alertas").uncheck();

    await expectFila(page, "Monitoreo y alertas", "");
    await expect(acceso(page, "Monitoreo y alertas")).toHaveValue("SIN_ACCESO");
  });
});

test.describe("RolesPage (HU-72) › Alta", () => {
  test("crea un rol enviando nombre, descripción y la matriz completa", async ({ page }) => {
    const esc = nuevoEscenario();
    await abrirRoles(page, esc);

    await page.getByRole("button", { name: "+ Nuevo rol" }).click();
    await expect(page.getByText("Nuevo rol", { exact: true })).toBeVisible();
    await page.getByLabel("Nombre *").fill("  Jefe de calidad  ");
    await page.getByLabel("Descripción").fill("Supervisa la calidad de los lotes");
    await acceso(page, "Trazabilidad").selectOption({ label: "Ver y modificar" });
    await accion(page, "Exportar", "Auditoría").check();
    await page.getByRole("button", { name: "Crear rol" }).click();

    await expect(itemRol(page, "Jefe de calidad")).toBeVisible();
    const [post] = pedidos(esc, "POST");
    const body = post.postDataJSON() as GuardarRolDto;
    expect(body.nombre).toBe("Jefe de calidad");
    expect(body.descripcion).toBe("Supervisa la calidad de los lotes");
    expect(body.permisos.map((p) => p.modulo)).toEqual(MODULOS_ENVIADOS);
    expect(body.permisos.find((p) => p.modulo === "trazabilidad")).toEqual({
      modulo: "trazabilidad",
      ...flags("RCUD"),
    });
    expect(body.permisos.find((p) => p.modulo === "auditoria")).toEqual({
      modulo: "auditoria",
      ...flags("RE"),
    });
    expect(body.permisos.find((p) => p.modulo === "dashboard")).toEqual({
      modulo: "dashboard",
      ...SIN_ACCESO,
    });

    // El rol recién creado queda seleccionado en modo edición, con el aviso.
    await expect(page.getByLabel("Nombre *")).toHaveValue("Jefe de calidad");
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeVisible();
    await expect(page.getByText(MENSAJE_EXITO)).toBeVisible();

    // Al pasar a otro rol el aviso no lo acompaña.
    await itemRol(page, "Gerente").click();
    await expect(page.getByText(MENSAJE_EXITO)).toHaveCount(0);
  });

  test("valida que el nombre tenga entre 3 y 60 caracteres sin enviar nada", async ({ page }) => {
    const esc = nuevoEscenario();
    await abrirRoles(page, esc);
    await page.getByRole("button", { name: "+ Nuevo rol" }).click();
    const error = page.getByText("El nombre debe tener entre 3 y 60 caracteres.");

    await page.getByRole("button", { name: "Crear rol" }).click();
    await expect(error).toBeVisible();

    // Se valida sobre el nombre sin espacios: "  ab  " son 2 caracteres.
    await page.getByLabel("Nombre *").fill("  ab  ");
    await page.getByRole("button", { name: "Crear rol" }).click();
    await expect(error).toBeVisible();

    await page.getByLabel("Nombre *").fill("a".repeat(61));
    await page.getByRole("button", { name: "Crear rol" }).click();
    await expect(error).toBeVisible();

    expect(pedidos(esc, "POST")).toHaveLength(0);
  });

  test("acepta nombres de 3 y 60 caracteres y omite la descripción vacía", async ({ page }) => {
    const esc = nuevoEscenario();
    await abrirRoles(page, esc);

    await page.getByRole("button", { name: "+ Nuevo rol" }).click();
    await page.getByLabel("Nombre *").fill("abc");
    await page.getByLabel("Descripción").fill("   ");
    await page.getByRole("button", { name: "Crear rol" }).click();
    await expect(itemRol(page, "abc")).toBeVisible();

    await page.getByRole("button", { name: "+ Nuevo rol" }).click();
    await page.getByLabel("Nombre *").fill("b".repeat(60));
    await page.getByRole("button", { name: "Crear rol" }).click();
    await expect(page.getByLabel("Nombre *")).toHaveValue("b".repeat(60));

    const [primero, segundo] = pedidos(esc, "POST").map((r) => r.postDataJSON() as GuardarRolDto);
    expect(primero.nombre).toBe("abc");
    expect("descripcion" in primero).toBe(false);
    expect(segundo.nombre).toBe("b".repeat(60));
  });

  test("un 400 con varios mensajes los muestra juntos", async ({ page }) => {
    const esc = nuevoEscenario();
    esc.respuestas.POST = {
      status: 400,
      body: { message: ["nombre must be shorter than 60 characters", "permisos must be an array"] },
    };
    await abrirRoles(page, esc);
    await page.getByRole("button", { name: "+ Nuevo rol" }).click();
    await page.getByLabel("Nombre *").fill("Jefe de calidad");
    await page.getByRole("button", { name: "Crear rol" }).click();

    await expect(page.getByRole("alert")).toHaveText(
      "nombre must be shorter than 60 characters permisos must be an array",
    );
  });

  test("un 409 por nombre duplicado muestra el mensaje del servidor", async ({ page }) => {
    const esc = nuevoEscenario();
    esc.respuestas.POST = { status: 409, body: { message: "Ya existe un rol con ese nombre en la empresa." } };
    await abrirRoles(page, esc);
    await page.getByRole("button", { name: "+ Nuevo rol" }).click();
    await page.getByLabel("Nombre *").fill("Gerente");
    await page.getByRole("button", { name: "Crear rol" }).click();

    await expect(page.getByRole("alert")).toHaveText("Ya existe un rol con ese nombre en la empresa.");
    await expect(page.getByRole("button", { name: "Crear rol" })).toBeEnabled();
  });

  test("un 500 sin mensaje muestra el error genérico", async ({ page }) => {
    const esc = nuevoEscenario();
    esc.respuestas.POST = { status: 500 };
    await abrirRoles(page, esc);
    await page.getByRole("button", { name: "+ Nuevo rol" }).click();
    await page.getByLabel("Nombre *").fill("Jefe de calidad");
    await page.getByRole("button", { name: "Crear rol" }).click();

    await expect(page.getByRole("alert")).toHaveText("No se pudo guardar el rol. Intentá nuevamente.");
  });

  test("un error de red muestra el error genérico", async ({ page }) => {
    const esc = nuevoEscenario();
    esc.respuestas.POST = "error-de-red";
    await abrirRoles(page, esc);
    await page.getByRole("button", { name: "+ Nuevo rol" }).click();
    await page.getByLabel("Nombre *").fill("Jefe de calidad");
    await page.getByRole("button", { name: "Crear rol" }).click();

    await expect(page.getByRole("alert")).toHaveText("No se pudo guardar el rol. Intentá nuevamente.");
  });
});

test.describe("RolesPage (HU-72) › Edición y baja", () => {
  test("guardar un rol personalizado envía PUT con la matriz completa", async ({ page }) => {
    const esc = nuevoEscenario();
    await abrirRoles(page, esc);
    await itemRol(page, "Supervisor de turno").click();

    await page.getByLabel("Descripción").fill("Turno noche");
    await acceso(page, "Dashboard").selectOption({ label: "Ver y modificar" });
    const recarga = recargaDeRoles(page);
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await recarga;

    const [put] = pedidos(esc, "PUT");
    expect(new URL(put.url()).pathname).toBe("/roles/10");
    const body = put.postDataJSON() as GuardarRolDto;
    expect(body).toMatchObject({ nombre: "Supervisor de turno", descripcion: "Turno noche" });
    expect(body.permisos.map((p) => p.modulo)).toEqual(MODULOS_ENVIADOS);
    expect(body.permisos.find((p) => p.modulo === "dashboard")).toEqual({ modulo: "dashboard", ...flags("RCUD") });
    expect(body.permisos.find((p) => p.modulo === "monitoreo_alertas")).toEqual({
      modulo: "monitoreo_alertas",
      ...flags("RCUD"),
    });

    await expect(page.getByText(MENSAJE_EXITO)).toBeVisible();
    // El editor sigue montado con lo que se guardó.
    await expect(page.getByLabel("Descripción")).toHaveValue("Turno noche");
    await expect(acceso(page, "Dashboard")).toHaveValue("VER_Y_MODIFICAR");

    // Tocar la matriz otra vez limpia el aviso.
    await accion(page, "Exportar", "Dashboard").check();
    await expect(page.getByText(MENSAJE_EXITO)).toHaveCount(0);
  });

  test("en el propio rol no deja quitarse la gestión de roles", async ({ page }) => {
    const esc = nuevoEscenario();
    await abrirRoles(page, esc, (p) => loginAs(p, GERENTE_CON_ROL));
    await itemRol(page, "Gerente").click();

    await accion(page, "Editar", "Gestión de roles").uncheck();
    await expect(page.getByRole("alert")).toContainText("No podés quitarte la gestión de roles");
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();

    await accion(page, "Editar", "Gestión de roles").check();
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();
  });

  test("elimina un rol sin usuarios después de confirmar", async ({ page }) => {
    const esc = nuevoEscenario();
    await abrirRoles(page, esc);
    await itemRol(page, "Supervisor de turno").click();

    await page.getByRole("button", { name: "Eliminar rol" }).click();
    const dialogo = page.getByRole("alertdialog");
    await expect(dialogo).toContainText("¿Eliminar el rol Supervisor de turno?");
    await expect(dialogo).toContainText("Esta acción no se puede deshacer.");
    await dialogo.getByRole("button", { name: "Eliminar", exact: true }).click();

    await expect(itemRol(page, "Supervisor de turno")).toHaveCount(0);
    const [del] = pedidos(esc, "DELETE");
    expect(new URL(del.url()).pathname).toBe("/roles/10");
    // Vuelve a mostrar el primer rol de la lista.
    await expect(page.getByLabel("Nombre *")).toHaveValue("Administrador");
  });

  test("cancelar la confirmación no elimina el rol", async ({ page }) => {
    const esc = nuevoEscenario();
    await abrirRoles(page, esc);
    await itemRol(page, "Supervisor de turno").click();

    await page.getByRole("button", { name: "Eliminar rol" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Cancelar" }).click();

    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(itemRol(page, "Supervisor de turno")).toBeVisible();
    expect(pedidos(esc, "DELETE")).toHaveLength(0);
  });

  test("un 409 al eliminar muestra el mensaje del servidor y conserva el rol", async ({ page }) => {
    const esc = nuevoEscenario();
    esc.respuestas.DELETE = {
      status: 409,
      body: { message: "El rol tiene usuarios asignados. Reasignalos antes de eliminarlo." },
    };
    await abrirRoles(page, esc);
    await itemRol(page, "Supervisor de turno").click();

    await page.getByRole("button", { name: "Eliminar rol" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Eliminar", exact: true }).click();

    await expect(page.getByRole("alert")).toHaveText(
      "El rol tiene usuarios asignados. Reasignalos antes de eliminarlo.",
    );
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(itemRol(page, "Supervisor de turno")).toBeVisible();
  });
});

test.describe("RolesPage (HU-72) › Administrador", () => {
  test("sin empresa elegida no pide roles ni ofrece crear", async ({ page }) => {
    const esc = nuevoEscenario();
    esc.permisos = ADMIN_PERMISOS;
    await abrirRoles(page, esc, loginAsAdministrador);

    await expect(page.getByText("Elegí una empresa para ver y editar sus roles.")).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Nuevo rol" })).toHaveCount(0);
    expect(pedidos(esc, "GET")).toHaveLength(0);
  });

  test("al elegir una empresa opera sobre sus roles y sus módulos contratados", async ({ page }) => {
    const esc = nuevoEscenario();
    esc.permisos = ADMIN_PERMISOS;
    await abrirRoles(page, esc, loginAsAdministrador);

    await page.getByRole("combobox", { name: "Empresa" }).selectOption({ label: "Tambo La Esperanza" });

    await expect(page.getByText("Qué puede ver y hacer cada rol de Tambo La Esperanza")).toBeVisible();
    await expect(itemRol(page, "Gerente")).toBeVisible();
    expect(new URL(pedidos(esc, "GET")[0].url()).searchParams.get("empresaId")).toBe("7");

    await itemRol(page, "Supervisor de turno").click();
    await expect(acceso(page, "Trazabilidad")).toBeVisible();
    await expect(acceso(page, "Recepción")).toHaveCount(0);

    await page.getByRole("button", { name: "+ Nuevo rol" }).click();
    await page.getByLabel("Nombre *").fill("Encargado de tambo");
    await page.getByRole("button", { name: "Crear rol" }).click();

    await expect(itemRol(page, "Encargado de tambo")).toBeVisible();
    const [post] = pedidos(esc, "POST");
    expect(new URL(post.url()).searchParams.get("empresaId")).toBe("7");
    expect((post.postDataJSON() as GuardarRolDto).permisos.map((p) => p.modulo)).toEqual([
      "dashboard",
      "trazabilidad",
      "gestion_roles",
      "gestion_usuarios",
      "auditoria",
      "configuracion_empresa",
    ]);
  });
});

test.describe("RolesPage (HU-72) › Propagación de cambios en la matriz", () => {
  const recargaDePermisos = (page: Page) =>
    page.waitForResponse((r) => r.url().includes("/auth/me/permisos"));

  test("quitarse Auditoría en el propio rol la saca del menú y bloquea la ruta", async ({ page }) => {
    const esc = nuevoEscenario();
    esc.permisosTrasGuardar = misPermisos("Gerente", { ...MATRIZ_GERENTE, auditoria: "" });
    await abrirRoles(page, esc, (p) => loginAs(p, GERENTE_CON_ROL));
    await expect(opcionMenu(page, "Auditoría")).toBeVisible();
    const llamadasAntes = esc.permisosLlamadas;

    await itemRol(page, "Gerente").click();
    await acceso(page, "Auditoría").selectOption({ label: "Sin acceso" });
    const recarga = recargaDePermisos(page);
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await recarga;

    await expect(page.getByText(MENSAJE_EXITO)).toBeVisible();
    expect(esc.permisosLlamadas).toBe(llamadasAntes + 1);
    await expect(opcionMenu(page, "Auditoría")).toHaveCount(0);
    await expect(opcionMenu(page, "Roles y permisos")).toBeVisible();

    await page.goto("/auditoria");
    await expect(page.getByRole("heading", { name: "Acceso no autorizado" })).toBeVisible();
  });

  test("quitarse 'Crear' en gestión de roles oculta '+ Nuevo rol' sin recargar", async ({ page }) => {
    const esc = nuevoEscenario();
    esc.permisosTrasGuardar = misPermisos("Gerente", { ...MATRIZ_GERENTE, gestion_roles: "RUD" });
    await abrirRoles(page, esc, (p) => loginAs(p, GERENTE_CON_ROL));
    await expect(page.getByRole("button", { name: "+ Nuevo rol" })).toBeVisible();

    await itemRol(page, "Gerente").click();
    await accion(page, "Crear", "Gestión de roles").uncheck();
    const recarga = recargaDePermisos(page);
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await recarga;

    await expect(page.getByText(MENSAJE_EXITO)).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Nuevo rol" })).toHaveCount(0);
    // Sigue pudiendo editar: conserva ver + editar.
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();
  });

  test("editar un rol ajeno no vuelve a pedir los permisos del usuario", async ({ page }) => {
    const esc = nuevoEscenario();
    await abrirRoles(page, esc, (p) => loginAs(p, GERENTE_CON_ROL));
    const llamadasAntes = esc.permisosLlamadas;

    await itemRol(page, "Supervisor de turno").click();
    await acceso(page, "Recepción").selectOption({ label: "Solo ver" });
    const recarga = recargaDeRoles(page);
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await recarga;
    // Si fuera el propio rol, la recarga de permisos sale justo después del
    // GET /roles: se espera a que la red quede quieta antes de contar.
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(MENSAJE_EXITO)).toBeVisible();
    expect(pedidos(esc, "PUT")).toHaveLength(1);
    expect(esc.permisosLlamadas).toBe(llamadasAntes);
  });

  test("al volver el foco a la pestaña refleja la matriz actualizada en el menú", async ({ page }) => {
    const esc = nuevoEscenario();
    await abrirRoles(page, esc);
    await expect(opcionMenu(page, "Auditoría")).toBeVisible();

    // Otro usuario le sacó Auditoría al rol mientras tanto.
    esc.permisos = misPermisos("Gerente", { ...MATRIZ_GERENTE, auditoria: "" });
    const recarga = recargaDePermisos(page);
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await recarga;

    await expect(opcionMenu(page, "Auditoría")).toHaveCount(0);
  });

  test("un 403 del servidor recarga los permisos y deja la pantalla en solo lectura", async ({ page }) => {
    const esc = nuevoEscenario();
    esc.respuestas.PUT = { status: 403, body: { message: "No tenés permiso para editar roles." } };
    await abrirRoles(page, esc);

    await itemRol(page, "Supervisor de turno").click();
    // Mientras tanto le sacaron crear/editar en gestión de roles.
    esc.permisos = misPermisos("Gerente", { ...MATRIZ_GERENTE, gestion_roles: "R" });
    const recarga = recargaDePermisos(page);
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await recarga;

    await expect(page.getByRole("alert")).toHaveText("No tenés permiso para editar roles.");
    await expect(page.getByText("Solo lectura: tu rol no puede modificar roles.")).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Nuevo rol" })).toHaveCount(0);
  });

  test("si la recarga en segundo plano falla conserva los permisos anteriores", async ({ page }) => {
    const esc = nuevoEscenario();
    await abrirRoles(page, esc);

    esc.permisosStatus = 500;
    const recarga = recargaDePermisos(page);
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    expect((await recarga).status()).toBe(500);

    await expect(page.getByText("No se pudieron cargar tus permisos.")).toHaveCount(0);
    await expect(opcionMenu(page, "Auditoría")).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Nuevo rol" })).toBeVisible();
  });

  test("si la carga inicial de permisos falla ofrece reintentar", async ({ page }) => {
    const esc = nuevoEscenario();
    await mockLayout(page);
    await mockRolesApi(page, esc);
    await loginAsGerente(page);
    await mockPermisosControlados(page, esc);
    esc.permisosStatus = 500;

    await page.goto("/roles");
    await expect(page.getByRole("heading", { name: "No se pudieron cargar tus permisos." })).toBeVisible();

    esc.permisosStatus = 200;
    await page.getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByRole("heading", { name: "Roles y permisos" })).toBeVisible();
  });
});

test.describe("RolesPage (HU-72) › Respuesta de permisos inválida", () => {
  test("si /auth/me/permisos responde con otra forma la trata como error de carga", async ({ page }) => {
    await mockLayout(page);
    await mockRolesApi(page, nuevoEscenario());
    await loginAsGerente(page);
    // 200 pero sin esSistema/permisos: no puede llegar al estado.
    await page.route("**/auth/me/permisos", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ rolNombre: "Gerente" }) }),
    );

    await page.goto("/roles");

    await expect(page.getByRole("heading", { name: "No se pudieron cargar tus permisos." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Roles y permisos" })).toHaveCount(0);
  });
});

test.describe("SinFuncionalidadesPage (HU-72)", () => {
  test("un rol sin ningún permiso aterriza en 'Sin funcionalidades' y puede cerrar sesión", async ({ page }) => {
    const esc = nuevoEscenario();
    await mockLayout(page);
    await loginAsGerente(page);
    esc.permisos = { esSistema: false, rolNombre: "Gerente", permisos: [] };
    await mockPermisosControlados(page, esc);

    await page.goto("/");

    await expect(page).toHaveURL("/sin-funcionalidades");
    await expect(page.getByRole("heading", { name: "Sin funcionalidades disponibles" })).toBeVisible();
    await expect(page.getByText("Todavía no hay funcionalidades disponibles para tu rol.")).toBeVisible();

    const logout = page.waitForRequest((r) => r.url().endsWith("/logout") && r.method() === "POST");
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await logout;
    await expect(page).toHaveURL("/login");
  });
});
