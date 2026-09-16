import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import { loginAsResponsableCalidad, loginAsGerente, loginAsResponsableProduccion } from "./fixtures/mockAuth.ts";

const CONFIGURACION_CRITICA_ROL = {
  id: 1,
  nivelAlerta: "critica",
  rolId: 2,
  rol: { id: 2, nombre: "Responsable de producción" },
  usuarioId: null,
  usuario: null,
  empresaId: 10,
  createdAt: "2026-08-01T00:00:00.000Z",
};

const CONFIGURACION_CRITICA_USUARIO = {
  id: 2,
  nivelAlerta: "critica",
  rolId: null,
  rol: null,
  usuarioId: 3,
  usuario: { id: 3, name: "Juan Calidad", email: "calidad@optilacteo.com" },
  empresaId: 10,
  createdAt: "2026-08-01T00:00:00.000Z",
};

const ROLES_MOCK = [
  { id: 1, nombre: "Gerente" },
  { id: 2, nombre: "Responsable de producción" },
  { id: 3, nombre: "Responsable de calidad" },
  { id: 4, nombre: "Operario de línea" },
];

const USUARIOS_MOCK = [
  { id: 3, name: "Juan Calidad", email: "calidad@optilacteo.com" },
  { id: 4, name: "Pedro Producción", email: "produccion@optilacteo.com" },
];

async function mockDestinatariosDeps(page: Page, configuraciones: object[] = []) {
  await page.route("**/*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  // loteService.getAll() hace return data.data — si el catch-all devuelve "[]",
  // data.data = undefined → setLotes(undefined) → crash en FloatingDictadoVozButton.
  await page.route("**/lote*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr")) return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, limit: 100, total: 0, totalPages: 1 } }),
    });
  });

  await page.route("**/user*", async (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: USUARIOS_MOCK, total: USUARIOS_MOCK.length, page: 1, limit: 100 }),
    });
  });

  await page.route("**/rol*", async (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ROLES_MOCK),
    });
  });

  await page.route("**/notificacion*", async (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], total: 0, page: 1, limit: 20 }),
    });
  });

  await page.route("**/notificaciones/configuracion*", async (route) => {
    const method = route.request().method();
    if (method === "POST") {
      const body = JSON.parse(route.request().postData() ?? "{}") as { nivelAlerta: string; rolId?: number; usuarioId?: number };
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: 99,
          nivelAlerta: body.nivelAlerta,
          rolId: body.rolId ?? null,
          rol: body.rolId ? ROLES_MOCK.find((r) => r.id === body.rolId) ?? null : null,
          usuarioId: body.usuarioId ?? null,
          usuario: body.usuarioId ? USUARIOS_MOCK.find((u) => u.id === body.usuarioId) ?? null : null,
          empresaId: 10,
          createdAt: new Date().toISOString(),
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(configuraciones),
    });
  });

  await page.route("**/notificaciones/configuracion-alerta-desconexion*", async (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: 1, umbralMinutos: 5, empresaId: 10 }),
    });
  });
}

test.describe("DestinatariosAlertasPage", () => {
  test.beforeEach(async ({ page }) => {
    await mockDestinatariosDeps(page, [CONFIGURACION_CRITICA_ROL, CONFIGURACION_CRITICA_USUARIO]);
    await loginAsGerente(page);
    await page.goto("/alertas/destinatarios");
  });

  test("muestra los destinatarios ya configurados para cada nivel", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Quitar Responsable de producción de Crítica" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Quitar Juan Calidad de Crítica" }),
    ).toBeVisible();
  });
});

test("DestinatariosAlertasPage - un RC ve acceso no autorizado", async ({ page }) => {
  await mockDestinatariosDeps(page, []);
  await loginAsResponsableCalidad(page);
  await page.goto("/alertas/destinatarios");

  await expect(page.getByText("Acceso no autorizado")).toBeVisible();
});

test("DestinatariosAlertasPage - agrega un usuario como destinatario de nivel crítico", async ({ page }) => {
  await mockDestinatariosDeps(page, []);
  await loginAsGerente(page);
  await page.goto("/alertas/destinatarios");

  const cardCritica = page.locator(".rounded-xl").filter({ has: page.getByText("Crítica", { exact: true }) });
  await cardCritica.getByRole("button", { name: "+ Usuario" }).click();
  await page.getByRole("combobox").selectOption({ label: "Pedro Producción (produccion@optilacteo.com)" });

  await expect(
    page.getByRole("button", { name: "Quitar Pedro Producción de Crítica" }),
  ).toBeVisible();
});

test("DestinatariosAlertasPage - puede tener más de un destinatario en el mismo nivel", async ({ page }) => {
  await mockDestinatariosDeps(page, [CONFIGURACION_CRITICA_ROL]);
  await loginAsGerente(page);
  await page.goto("/alertas/destinatarios");

  await expect(
    page.getByRole("button", { name: "Quitar Responsable de producción de Crítica" }),
  ).toBeVisible();

  const cardCritica = page.locator(".rounded-xl").filter({ has: page.getByText("Crítica", { exact: true }) });
  await cardCritica.getByRole("button", { name: "+ Usuario" }).click();
  await page.getByRole("combobox").selectOption({ label: "Juan Calidad (calidad@optilacteo.com)" });

  await expect(
    page.getByRole("button", { name: "Quitar Responsable de producción de Crítica" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Quitar Juan Calidad de Crítica" }),
  ).toBeVisible();
});

test("DestinatariosAlertasPage - muestra error si se intenta quitar el único destinatario de alertas críticas", async ({ page }) => {
  await mockDestinatariosDeps(page, [CONFIGURACION_CRITICA_ROL]);
  await page.route(/\/notificaciones\/configuracion\/\d+$/, async (route) => {
    return route.fulfill({ status: 400 });
  });
  await loginAsGerente(page);
  await page.goto("/alertas/destinatarios");

  await page.getByRole("button", { name: "Quitar Responsable de producción de Crítica" }).click();

  await expect(page.getByText("No se pudo quitar el destinatario.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Quitar Responsable de producción de Crítica" }),
  ).toBeVisible();
});

test("DestinatariosAlertasPage - muestra error si el servidor falla al cargar la configuración", async ({ page }) => {
  await mockDestinatariosDeps(page, []);
  await page.route("**/notificaciones/configuracion*", async (route) => {
    if (route.request().url().includes("desconexion")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: 1, umbralMinutos: 5, empresaId: 10 }),
      });
    }
    return route.fulfill({ status: 500 });
  });
  await loginAsGerente(page);
  await page.goto("/alertas/destinatarios");

  await expect(page.getByText("No se pudo cargar la configuración de alertas.")).toBeVisible();
});

test("DestinatariosAlertasPage - deshabilita el botón de agregar usuario cuando no quedan disponibles", async ({ page }) => {
  await mockDestinatariosDeps(page, [
    {
      id: 10, nivelAlerta: "critica", rolId: null, rol: null,
      usuarioId: 3, usuario: { id: 3, name: "Juan Calidad", email: "calidad@optilacteo.com" },
      empresaId: 10, createdAt: "2026-08-01T00:00:00.000Z",
    },
    {
      id: 11, nivelAlerta: "critica", rolId: null, rol: null,
      usuarioId: 4, usuario: { id: 4, name: "Pedro Producción", email: "produccion@optilacteo.com" },
      empresaId: 10, createdAt: "2026-08-01T00:00:00.000Z",
    },
  ]);
  await loginAsGerente(page);
  await page.goto("/alertas/destinatarios");

  const cardCritica = page.locator(".rounded-xl").filter({ has: page.getByText("Crítica", { exact: true }) });
  await expect(cardCritica.getByRole("button", { name: "+ Usuario" })).toBeDisabled();
});

// ---------------------------------------------------------------------------
// HU-31 — Umbral de desconexión
// ---------------------------------------------------------------------------

test.describe("HU-31 — DestinatariosAlertasPage › Umbral de desconexión", () => {
  test("muestra el umbral actual y guarda el nuevo valor con confirmación", async ({ page }) => {
    await mockDestinatariosDeps(page, []);
    await loginAsGerente(page);
    await page.goto("/alertas/destinatarios");

    const input = page.getByLabel("Minutos");
    await expect(input).toHaveValue("5");

    await input.fill("30");
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(page.getByText("Umbral actualizado")).toBeVisible();
  });

  test("muestra error de validación si el campo está vacío al guardar", async ({ page }) => {
    await mockDestinatariosDeps(page, []);
    await loginAsGerente(page);
    await page.goto("/alertas/destinatarios");

    await page.getByLabel("Minutos").fill("");
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(page.getByText("Ingresá un número entero de minutos.")).toBeVisible();
  });

  test("muestra error de validación si el umbral es menor a 1", async ({ page }) => {
    await mockDestinatariosDeps(page, []);
    await loginAsGerente(page);
    await page.goto("/alertas/destinatarios");

    await page.getByLabel("Minutos").fill("0");
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(
      page.getByText("El umbral debe ser mayor o igual a 1 minuto."),
    ).toBeVisible();
  });

  test("muestra error si el servidor falla al guardar el umbral", async ({ page }) => {
    await mockDestinatariosDeps(page, []);
    await page.route("**/notificaciones/configuracion-alerta-desconexion*", async (route) => {
  if (route.request().method() === "PATCH") {
    return route.fulfill({ status: 500 });
  }
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ id: 1, umbralMinutos: 5, empresaId: 10 }),
  });
});
    await loginAsGerente(page);
    await page.goto("/alertas/destinatarios");

    await page.getByLabel("Minutos").fill("30");
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(
      page.getByText("No se pudo guardar el umbral. Reintentá en unos segundos."),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// HU-30 — Horarios de silencio
// ---------------------------------------------------------------------------

test.describe("HU-30 — Horarios de silencio", () => {
  test.beforeEach(async ({ page }) => {
    await mockDestinatariosDeps(page, []);
    // Endpoint de horarios (LIFO: mayor prioridad que el catch-all de mockDestinatariosDeps)
    await page.route("**/notificaciones/horarios-silencio*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });
    await loginAsResponsableProduccion(page);
    await page.goto("/alertas/destinatarios");
    await page.waitForLoadState("networkidle");
  });

  test("muestra la card de horarios de silencio con texto informativo", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Horarios de silencio", level: 2 })).toBeVisible();
  await expect(
    page.getByText("Las alertas de advertencia y críticas nunca se silencian."),
  ).toBeVisible();
  await expect(
    page.getByText("Todavía no hay horarios de silencio configurados."),
  ).toBeVisible();
});

test("crear un horario lo agrega a la lista", async ({ page }) => {
  const NUEVO_HORARIO = {
    id: 1, empresaId: 10, nombre: "Turno nocturno",
    horaInicio: "22:00", horaFin: "06:00",
    diasSemana: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };

  let creado = false;
  await page.route("**/notificaciones/horarios-silencio*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() === "POST") {
      creado = true;
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(NUEVO_HORARIO) });
    }
    return route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify(creado ? [NUEVO_HORARIO] : []),
    });
  });

  await page.getByRole("button", { name: "Nuevo horario" }).click();
  await page.getByLabel("Nombre (opcional)").fill("Turno nocturno");
  await page.getByLabel("Hora de inicio *").fill("22:00");
  await page.getByLabel("Hora de fin *").fill("06:00");
  await page.getByRole("button", { name: "Crear horario" }).click();
  await page.waitForLoadState("networkidle");

  await expect(page.getByText("Turno nocturno")).toBeVisible();
  await expect(page.getByText("22:00 - 06:00")).toBeVisible();
  await expect(page.getByText("Todos los días")).toBeVisible();
});

test("múltiples horarios configurados se muestran todos en la lista", async ({ page }) => {
  await page.route("**/notificaciones/horarios-silencio*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: 1, empresaId: 10, nombre: "Turno nocturno",
          horaInicio: "22:00", horaFin: "06:00", diasSemana: null,
          createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z",
        },
        {
          id: 2, empresaId: 10, nombre: "Fin de semana",
          horaInicio: "20:00", horaFin: "08:00", diasSemana: [0, 6],
          createdAt: "2026-09-02T00:00:00.000Z", updatedAt: "2026-09-02T00:00:00.000Z",
        },
      ]),
    });
  });
  await page.reload();
  await page.waitForLoadState("networkidle");

  await expect(page.getByText("Turno nocturno")).toBeVisible();
  await expect(page.getByText("Fin de semana")).toBeVisible();
  await expect(page.getByText("Dom, Sáb")).toBeVisible();
});

test("editar un horario actualiza sus datos en la lista", async ({ page }) => {
  const HORARIO_ORIGINAL = {
    id: 1, empresaId: 10, nombre: "Turno nocturno",
    horaInicio: "22:00", horaFin: "06:00", diasSemana: null,
    createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z",
  };
  const HORARIO_EDITADO = { ...HORARIO_ORIGINAL, nombre: "Nocturno actualizado", horaInicio: "23:00" };

  let editado = false;
  await page.route(/\/notificaciones\/horarios-silencio/, async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() === "PATCH") {
      editado = true;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(HORARIO_EDITADO) });
    }
    return route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify(editado ? [HORARIO_EDITADO] : [HORARIO_ORIGINAL]),
    });
  });
  await page.reload();
  await page.waitForLoadState("networkidle");

  await page.getByTitle("Editar horario").click();
  await expect(page.getByLabel("Nombre (opcional)")).toHaveValue("Turno nocturno");
  await expect(page.getByLabel("Hora de inicio *")).toHaveValue("22:00");

  await page.getByLabel("Nombre (opcional)").fill("Nocturno actualizado");
  await page.getByLabel("Hora de inicio *").fill("23:00");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await page.waitForLoadState("networkidle");

  await expect(page.getByText("Nocturno actualizado")).toBeVisible();
  await expect(page.getByText("23:00 - 06:00")).toBeVisible();
});

test("eliminar un horario lo quita de la lista", async ({ page }) => {
  const HORARIO = {
    id: 1, empresaId: 10, nombre: "Turno nocturno",
    horaInicio: "22:00", horaFin: "06:00", diasSemana: null,
    createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z",
  };

  let eliminado = false;
  await page.route(/\/notificaciones\/horarios-silencio/, async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() === "DELETE") {
      eliminado = true;
      return route.fulfill({ status: 200, contentType: "application/json", body: "" });
    }
    return route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify(eliminado ? [] : [HORARIO]),
    });
  });
  await page.reload();
  await page.waitForLoadState("networkidle");

  await expect(page.getByText("Turno nocturno")).toBeVisible();

  await page.getByTitle("Eliminar horario").click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Eliminar" }).click();
  await page.waitForLoadState("networkidle");

  await expect(page.getByText("Turno nocturno", { exact: true })).not.toBeVisible();
  await expect(page.getByText("Todavía no hay horarios de silencio configurados.")).toBeVisible();
});

test("validación: hora fin igual a hora inicio muestra error", async ({ page }) => {
  await page.getByRole("button", { name: "Nuevo horario" }).click();
  await page.getByLabel("Hora de inicio *").fill("10:00");
  await page.getByLabel("Hora de fin *").fill("10:00");
  await page.getByRole("button", { name: "Crear horario" }).click();

  await expect(page.getByText("No puede ser igual a la hora de inicio")).toBeVisible();
});
test("validación: sin días seleccionados muestra error", async ({ page }) => {
  await page.getByRole("button", { name: "Nuevo horario" }).click();
  await page.getByLabel("Hora de inicio *").fill("10:00");
  await page.getByLabel("Hora de fin *").fill("11:00");
  await page.locator('[role="switch"]').click(); // desactiva "Todos los días"
  await page.getByRole("button", { name: "Crear horario" }).click();
  await expect(
    page.getByText('Seleccioná al menos un día, o activá "Todos los días"'),
  ).toBeVisible();
});

test("muestra error cuando el servidor falla al cargar los horarios", async ({ page }) => {
  await page.route(/\/notificaciones\/horarios-silencio/, async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ message: "Internal server error" }),
    });
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByText("No se pudieron cargar los horarios de silencio."),
  ).toBeVisible();
});
test("muestra error del servidor al crear un horario solapado", async ({ page }) => {
  await page.route(/\/notificaciones\/horarios-silencio/, async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ message: "El horario se solapa con uno ya configurado." }),
      });
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
  await page.getByRole("button", { name: "Nuevo horario" }).click();
  await page.getByLabel("Hora de inicio *").fill("10:00");
  await page.getByLabel("Hora de fin *").fill("11:00");
  await page.getByRole("button", { name: "Crear horario" }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("El horario se solapa con uno ya configurado.")).toBeVisible();
});

test("muestra error en el modal de confirmación cuando el servidor falla al eliminar", async ({ page }) => {
  const HORARIO = { id: 1, empresaId: 10, nombre: "Turno nocturno", horaInicio: "22:00", horaFin: "06:00", diasSemana: null, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z" };
  await page.route(/\/notificaciones\/horarios-silencio/, async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() === "DELETE") {      
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ statusCode: 500 }), // sin "message" → usa el fallback
  });
}
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([HORARIO]) });
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTitle("Eliminar horario").click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Eliminar" }).click();
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByText("No se pudo eliminar el horario. Intentá nuevamente."),
  ).toBeVisible();
});

test("crear horario con días específicos los muestra correctamente en la lista", async ({ page }) => {
  const NUEVO_HORARIO = { id: 1, empresaId: 10, nombre: "Turno tarde", horaInicio: "14:00", horaFin: "20:00", diasSemana: [1, 5], createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z" };
  let creado = false;
  await page.route("**/notificaciones/horarios-silencio*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() === "POST") {
      creado = true;
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(NUEVO_HORARIO) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(creado ? [NUEVO_HORARIO] : []) });
  });
  await page.getByRole("button", { name: "Nuevo horario" }).click();
  await page.getByLabel("Nombre (opcional)").fill("Turno tarde");
  await page.getByLabel("Hora de inicio *").fill("14:00");
  await page.getByLabel("Hora de fin *").fill("20:00");
  await page.locator('[role="switch"]').click(); // desactiva "Todos los días"
  await page.getByRole("button", { name: "Lun" }).click();
  await page.getByRole("button", { name: "Vie" }).click();
  await page.getByRole("button", { name: "Crear horario" }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Turno tarde")).toBeVisible();
  await expect(page.getByText("14:00 - 20:00")).toBeVisible();
  await expect(page.getByText("Lun, Vie")).toBeVisible();
});

test("muestra error del servidor cuando falla la edición de un horario", async ({ page }) => {
  const HORARIO = { id: 1, empresaId: 10, nombre: "Turno nocturno", horaInicio: "22:00", horaFin: "06:00", diasSemana: null, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z" };
  await page.route(/\/notificaciones\/horarios-silencio/, async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() === "PATCH") {
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ statusCode: 500 }),
      });
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([HORARIO]) });
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTitle("Editar horario").click();
  await page.getByLabel("Nombre (opcional)").fill("Nombre modificado");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByText("No se pudo actualizar el horario. Intentá nuevamente."),
  ).toBeVisible();
});

test("horario sin nombre se muestra con el identificador de fallback", async ({ page }) => {
  const HORARIO_SIN_NOMBRE = { id: 3, empresaId: 10, nombre: null, horaInicio: "08:00", horaFin: "16:00", diasSemana: null, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z" };
  await page.route("**/notificaciones/horarios-silencio*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([HORARIO_SIN_NOMBRE]) });
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Horario #3")).toBeVisible();
  await expect(page.getByText("08:00 - 16:00")).toBeVisible();
});

test("muestra aviso de medianoche cuando la hora de fin es menor a la de inicio", async ({ page }) => {
  await page.getByRole("button", { name: "Nuevo horario" }).click();
  await page.getByLabel("Hora de inicio *").fill("22:00");
  await page.getByLabel("Hora de fin *").fill("06:00");
  await expect(page.getByText(/Cruza la medianoche/)).toBeVisible();
});

test("validación: nombre con más de 80 caracteres muestra error", async ({ page }) => {
  await page.getByRole("button", { name: "Nuevo horario" }).click();
  await page.getByLabel("Nombre (opcional)").fill("A".repeat(81));
  await page.getByLabel("Hora de inicio *").fill("10:00");
  await page.getByLabel("Hora de fin *").fill("11:00");
  await page.getByRole("button", { name: "Crear horario" }).click();
  await expect(page.getByText("Máximo 80 caracteres")).toBeVisible();
});

test("cancelar el modal no crea ningún horario", async ({ page }) => {
  await page.getByRole("button", { name: "Nuevo horario" }).click();
  await page.getByLabel("Nombre (opcional)").fill("Horario cancelado");
  await page.getByLabel("Hora de inicio *").fill("10:00");
  await page.getByLabel("Hora de fin *").fill("11:00");
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByText("Todavía no hay horarios de silencio configurados.")).toBeVisible();
  await expect(page.getByText("Horario cancelado")).not.toBeVisible();
});

test("muestra error del servidor cuando falla la creación de un horario", async ({ page }) => {
  await page.route(/\/notificaciones\/horarios-silencio/, async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ statusCode: 500 }),
      });
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
  await page.getByRole("button", { name: "Nuevo horario" }).click();
  await page.getByLabel("Hora de inicio *").fill("10:00");
  await page.getByLabel("Hora de fin *").fill("11:00");
  await page.getByRole("button", { name: "Crear horario" }).click();
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByText("No se pudo crear el horario. Intentá nuevamente."),
  ).toBeVisible();
});
});