import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import { loginAsResponsableCalidad, loginAsGerente } from "./fixtures/mockAuth.ts";

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
      return route.continue();
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