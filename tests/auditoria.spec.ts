import { test, expect } from "./fixtures/coverageFixtures.ts";
import { loginAsGerente, quitarPermisos } from "./fixtures/mockAuth.ts";

// HU-43: Log de auditoría — Gerente consulta, filtra y exporta GET /audit-log.
// El log es solo lectura: no hay botones de edición ni eliminación en la UI.

test.use({ timezoneId: "America/Argentina/Cordoba", locale: "es-AR" });

const AUDIT_LOGS_MOCK = [
  {
    id: 1,
    userId: 5,
    userEmail: "juan@empresa.com",
    userNombre: "Juan Pérez",
    userRol: "Gerente",
    empresaId: 10,
    accion: "LOTE_CREAR_SUCCESS",
    entidad: "Lote",
    entidadId: 42,
    tipo: "ALTA",
    descripcion: "Creó el lote LOT-2026-001",
    detalle: null,
    createdAt: "2026-09-26T13:05:00.000Z",
  },
  {
    id: 2,
    userId: null,
    userEmail: "operario@empresa.com",
    userNombre: null,
    userRol: null,
    empresaId: 10,
    accion: "LOGIN_FAILURE",
    entidad: "Auth",
    entidadId: null,
    tipo: "LOGIN",
    descripcion: null,
    detalle: null,
    createdAt: "2026-09-26T08:00:00.000Z",
  },
];

test.describe("AuditoriaPage (HU-43)", () => {
  test.beforeEach(async ({ page }) => {
    // Mock del listado de usuarios para el filtro (GET /user?page=1&limit=100).
    // Se filtra por `limit` para no interceptar /user/me ni rutas de auth.
    await page.route("**/user*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (!new URL(route.request().url()).searchParams.has("limit")) return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], total: 0 }),
      });
    });
    await page.route("**/notificacion*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
      });
    });
  });

  test("muestra las entradas del log con usuario, acción, descripción y entidad afectada", async ({ page }) => {
    await page.route("**/audit-log*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([AUDIT_LOGS_MOCK, 2]),
      });
    });
    await loginAsGerente(page);
    await page.goto("/auditoria");
    await page.waitForLoadState("networkidle");

    // Encabezado con total
    await expect(page.getByText("2 resultados", { exact: true })).toBeVisible();

    // Fila 1: Alta de lote
    const filaJuan = page.getByRole("row", { name: /Juan Pérez/ });
    await expect(filaJuan.getByText("Juan Pérez")).toBeVisible();
    await expect(filaJuan.getByText("Gerente")).toBeVisible();
    await expect(filaJuan.getByText("Alta")).toBeVisible();
    await expect(filaJuan.getByText("Creó el lote LOT-2026-001")).toBeVisible();
    await expect(filaJuan.getByText("Lote #42")).toBeVisible();

    // Fila 2: Login fallido → badge "Fallida" además del tipo
    const filaOperario = page.getByRole("row", { name: /operario@empresa\.com/ });
    await expect(filaOperario.getByText("Inicio de sesión")).toBeVisible();
    await expect(filaOperario.getByText("Fallida")).toBeVisible();
  });

  test("muestra estado vacío cuando no hay entradas que coincidan con los filtros", async ({ page }) => {
    await page.route("**/audit-log*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([[], 0]),
      });
    });
    await loginAsGerente(page);
    await page.goto("/auditoria");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText("No hay entradas que coincidan con los filtros seleccionados."),
    ).toBeVisible();
    await expect(page.getByText("0 resultados")).toBeVisible();
  });

    test("muestra error al fallar la carga y recupera al reintentar", async ({ page }) => {
    const control = { falla: true };
    await page.route("**/audit-log*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (control.falla) {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Error interno" }),
        });
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([AUDIT_LOGS_MOCK, 2]),
      });
    });
    await loginAsGerente(page);
    await page.goto("/auditoria");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("No se pudo cargar el log de auditoría.")).toBeVisible();

    control.falla = false;
    await page.getByRole("button", { name: "Reintentar" }).click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("No se pudo cargar el log de auditoría.")).not.toBeVisible();
    await expect(page.getByRole("row", { name: /Juan Pérez/ })).toBeVisible();
  });

    test("filtra por tipo de acción y muestra solo las entradas del tipo seleccionado", async ({ page }) => {
    await page.route("**/audit-log*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().url().includes("tipo=LOGIN")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([[AUDIT_LOGS_MOCK[1]], 1]),
        });
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([AUDIT_LOGS_MOCK, 2]),
      });
    });
    await loginAsGerente(page);
    await page.goto("/auditoria");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("row", { name: /Juan Pérez/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /operario@empresa\.com/ })).toBeVisible();

    await page.getByRole("combobox", { name: "Tipo de acción" }).selectOption("LOGIN");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("row", { name: /operario@empresa\.com/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /Juan Pérez/ })).not.toBeVisible();
  });

    test("muestra aviso cuando la fecha Desde es posterior a Hasta", async ({ page }) => {
    await page.route("**/audit-log*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([[], 0]),
      });
    });
    await loginAsGerente(page);
    await page.goto("/auditoria");
    await page.waitForLoadState("networkidle");

    await page.locator("#auditoria-desde").fill("2026-09-30");
    await page.locator("#auditoria-hasta").fill("2026-09-01");

    await expect(
      page.getByText('La fecha "Desde" no puede ser posterior a "Hasta". El filtro de período no se aplica.'),
    ).toBeVisible();
  });

  test("exportar CSV descarga el archivo con nombre correcto", async ({ page }) => {
    await page.route("**/audit-log*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([AUDIT_LOGS_MOCK, 2]),
      });
    });
    await page.route("**/audit-log/export*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "text/csv",
        body: "id,usuario,fecha\n1,Juan Pérez,2026-09-26\n",
      });
    });
    await loginAsGerente(page);
    await page.goto("/auditoria");
    await page.waitForLoadState("networkidle");

    const descarga = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar CSV" }).click();
    const archivo = await descarga;
    expect(archivo.suggestedFilename()).toMatch(/^log-auditoria-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});

test("AuditoriaPage - un Gerente sin permiso de auditoría ve acceso no autorizado", async ({ page }) => {
  await page.route("**/notificacion*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
    });
  });
  await loginAsGerente(page);
  await quitarPermisos(page, "Gerente", ["auditoria"]);
  await page.goto("/auditoria");

  await expect(page.getByText("Acceso no autorizado")).toBeVisible();
});
// ---------------------------------------------------------------------------
// HU-43 — filtros que viajan al backend y paginación
// ---------------------------------------------------------------------------

test.describe("AuditoriaPage (HU-43) › Filtros y paginación", () => {
  // Registra los query params de cada GET /audit-log y responde `total`
  // filas totales (20 por página).
  async function mockAuditLog(page: import("@playwright/test").Page, total = 2) {
    const pedidos: URLSearchParams[] = [];
    await page.route("**/audit-log*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      const params = new URL(route.request().url()).searchParams;
      pedidos.push(params);
      const pagina = Number(params.get("page") ?? 1);
      const items = AUDIT_LOGS_MOCK.map((e) => ({ ...e, id: e.id + pagina * 100, descripcion: `${e.descripcion ?? "Sin descripción"} (página ${pagina})` }));
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([items, total]) });
    });
    return pedidos;
  }

  test.beforeEach(async ({ page }) => {
    await page.route("**/user*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (!new URL(route.request().url()).searchParams.has("limit")) return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            { id: 7, name: "Zoe Ruiz", email: "zoe@empresa.com", isActive: true },
            { id: 5, name: "Juan Pérez", email: "juan@empresa.com", isActive: true },
            { id: 9, name: "Ana Gómez", email: "ana@empresa.com", isActive: false },
          ],
          total: 3,
        }),
      });
    });
  });

  test("el filtro de usuario lista por nombre, marca inactivos y manda userId", async ({ page }) => {
    const pedidos = await mockAuditLog(page);
    await loginAsGerente(page);
    await page.goto("/auditoria");

    const usuario = page.getByLabel("Usuario", { exact: true });
    await expect(usuario.locator("option")).toHaveText([
      "Todos los usuarios",
      "Ana Gómez (inactivo)",
      "Juan Pérez",
      "Zoe Ruiz",
    ]);
    await usuario.selectOption({ label: "Juan Pérez" });

    await expect.poll(() => pedidos.at(-1)?.get("userId")).toBe("5");
    expect(pedidos.at(-1)?.get("page")).toBe("1");
  });

  test("el filtro de resultado manda el estado elegido", async ({ page }) => {
    const pedidos = await mockAuditLog(page);
    await loginAsGerente(page);
    await page.goto("/auditoria");

    await page.getByLabel("Resultado", { exact: true }).selectOption({ label: "Fallidas" });
    await expect.poll(() => pedidos.at(-1)?.get("estado")).toBe("FAILURE");

    await page.getByLabel("Resultado", { exact: true }).selectOption({ label: "Todas" });
    await expect.poll(() => pedidos.at(-1)?.has("estado")).toBe(false);
  });

  test("un período válido se manda como inicio y fin del día local", async ({ page }) => {
    const pedidos = await mockAuditLog(page);
    await loginAsGerente(page);
    await page.goto("/auditoria");

    await page.getByLabel("Desde", { exact: true }).fill("2026-09-20");
    await page.getByLabel("Hasta", { exact: true }).fill("2026-09-26");

    // Córdoba es UTC-3: 00:00 local = 03:00Z y 23:59:59.999 local = 02:59:59.999Z del día siguiente.
    await expect.poll(() => pedidos.at(-1)?.get("fechaHasta")).toBe("2026-09-27T02:59:59.999Z");
    expect(pedidos.at(-1)?.get("fechaDesde")).toBe("2026-09-20T03:00:00.000Z");
  });

  test("pagina de a 20 entradas y deshabilita los extremos", async ({ page }) => {
    const pedidos = await mockAuditLog(page, 45);
    await loginAsGerente(page);
    await page.goto("/auditoria");

    await expect(page.getByText("1 de 3 · 45 resultados")).toBeVisible();
    const anterior = page.getByRole("button").filter({ has: page.locator("svg.lucide-chevron-left") });
    const siguiente = page.getByRole("button").filter({ has: page.locator("svg.lucide-chevron-right") });
    await expect(anterior).toBeDisabled();

    await siguiente.click();
    await expect(page.getByText("2 de 3 · 45 resultados")).toBeVisible();
    await expect(page.getByText("Creó el lote LOT-2026-001 (página 2)")).toBeVisible();
    expect(pedidos.at(-1)?.get("page")).toBe("2");
    expect(pedidos.at(-1)?.get("limit")).toBe("20");

    await siguiente.click();
    await expect(page.getByText("3 de 3 · 45 resultados")).toBeVisible();
    await expect(siguiente).toBeDisabled();

    await anterior.click();
    await expect(page.getByText("2 de 3 · 45 resultados")).toBeVisible();
  });

  test("un tipo de acción desconocido se muestra tal como viene", async ({ page }) => {
    await page.route("**/audit-log*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([[{ ...AUDIT_LOGS_MOCK[0], tipo: "IMPORTACION", accion: "LOTE_IMPORTAR_SUCCESS" }], 1]),
      });
    });
    await loginAsGerente(page);
    await page.goto("/auditoria");

    await expect(page.getByRole("row", { name: /Juan Pérez/ }).getByText("IMPORTACION")).toBeVisible();
  });
});
