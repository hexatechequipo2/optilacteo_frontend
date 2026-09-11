import { expect, test } from "./fixtures/coverageFixtures.js";
import type { Page } from "@playwright/test";
import {
  loginAsGerente,
  loginAsOperario,
  loginAsResponsableCalidad,
} from "./fixtures/mockAuth.js";

// ---------------------------------------------------------------------------
// Datos de prueba
// ---------------------------------------------------------------------------

const PROVEEDORES_MOCK = {
  data: [
    {
      id: 1,
      razonSocial: "Tambo El Roble",
      cuit: "30-11111111-1",
      tipo: "tambo",
      empresaId: 10,
      estado: "activa",
    },
    {
      id: 2,
      razonSocial: "Tambo La Loma",
      cuit: "30-22222222-2",
      tipo: "tambo",
      empresaId: 10,
      estado: "activa",
    },
  ],
  meta: { page: 1, limit: 100, total: 2, totalPages: 1 },
};

const TAMBO_1 = {
  id: 1,
  nombre: "Establecimiento El Roble",
  ubicacion: "San Rafael",
  activo: true,
  empresaId: 10,
  proveedorId: 1,
  createdAt: "2026-08-01T00:00:00.000Z",
};

const TAMBO_2 = {
  id: 2,
  nombre: "Establecimiento La Loma",
  ubicacion: "Villa Mercedes",
  activo: false,
  empresaId: 10,
  proveedorId: 2,
  createdAt: "2026-08-02T00:00:00.000Z",
};

const TAMBOS_CATALOGO_MOCK = [TAMBO_1, TAMBO_2];

// ---------------------------------------------------------------------------
// Mocks compartidos
// ---------------------------------------------------------------------------

async function mockCatchAll(page: Page) {
  await page.route("**/*", async (route) => {
    const rt = route.request().resourceType();
    if (rt === "xhr" || rt === "fetch") {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    return route.continue();
  });

  await page.route("**/notificacion*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
    });
  });

  await page.route("**/proveedores*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PROVEEDORES_MOCK),
    });
  });
}

// GET /tambos (catálogo completo, sin query) usado por TambosPage
async function mockTambosCatalogo(page: Page) {
  await page.route("**/tambos*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    const url = new URL(route.request().url());
    if (route.request().method() === "GET" && !url.searchParams.has("proveedorId")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(TAMBOS_CATALOGO_MOCK),
      });
    }
    return route.continue();
  });
}

// ---------------------------------------------------------------------------
// TambosPage (HU-36)
// ---------------------------------------------------------------------------

test.describe("TambosPage", () => {
  test("muestra la tabla de tambos con el proveedor resuelto", async ({ page }) => {
    await mockCatchAll(page);
    await mockTambosCatalogo(page);
    await loginAsGerente(page);
    await page.goto("/tambos");

    const table = page.getByRole("table");
    await expect(table.getByText("Establecimiento El Roble")).toBeVisible();
    await expect(table.getByText("Tambo El Roble")).toBeVisible();
    await expect(table.getByText("Establecimiento La Loma")).toBeVisible();
    await expect(table.getByText("Activo", { exact: true })).toBeVisible();
    await expect(table.getByText("Inactivo", { exact: true })).toBeVisible();
  });

  test("un Operario de línea da de alta un tambo nuevo con proveedor obligatorio", async ({ page }) => {
    await mockCatchAll(page);
    await mockTambosCatalogo(page);

    let requestBody: Record<string, unknown> | undefined;
    await page.route("**/tambos*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() === "POST") {
        requestBody = route.request().postDataJSON();
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ ...TAMBO_1, id: 3, nombre: "Tambo Nuevo" }),
        });
      }
      return route.continue();
    });

    await loginAsOperario(page);
    await page.goto("/tambos");

    await page.getByRole("button", { name: "+ Nuevo tambo" }).click();
    const dialog = page.getByRole("dialog");

    // Sin proveedor: falla la validación de front, no llega a pegarle al backend
    await dialog.getByLabel("Nombre *").fill("Tambo Nuevo");
    await dialog.getByRole("button", { name: "Registrar tambo" }).click();
    await expect(dialog.getByText("El proveedor es obligatorio")).toBeVisible();

    await dialog.getByLabel("Proveedor *").selectOption({ value: "1" });
    await dialog.getByLabel("Ubicación (opcional)").fill("Ruta 6 km 12");
    await dialog.getByRole("button", { name: "Registrar tambo" }).click();

    await expect.poll(() => requestBody).toEqual({
      proveedorId: 1,
      nombre: "Tambo Nuevo",
      ubicacion: "Ruta 6 km 12",
    });
    await expect(dialog).not.toBeVisible();
  });

  test("muestra el mensaje del backend cuando falla el alta de un tambo", async ({ page }) => {
    await mockCatchAll(page);
    await mockTambosCatalogo(page);

    await page.route("**/tambos*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ message: "Ya existe un tambo con ese nombre" }),
      });
    });

    await loginAsOperario(page);
    await page.goto("/tambos");

    await page.getByRole("button", { name: "+ Nuevo tambo" }).click();
    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("Nombre *").fill("Tambo Nuevo");
    await dialog.getByLabel("Proveedor *").selectOption({ value: "1" });
    await dialog.getByRole("button", { name: "Registrar tambo" }).click();

    // Con response.data.message presente, tamboService.extraerMensajeError()
    // devuelve el mensaje real del backend en vez del fallback genérico.
    await expect(dialog.getByText("Ya existe un tambo con ese nombre")).toBeVisible();
  });

  test("un Gerente edita un tambo con el proveedor deshabilitado", async ({ page }) => {
    await mockCatchAll(page);

    await mockTambosCatalogo(page);

    // "**/tambos*" no matchea "/tambos/1" (el "*" no cruza el "/"): se
    // necesita un patrón dedicado para el PATCH a un tambo puntual.
    let requestBody: Record<string, unknown> | undefined;
    await page.route(/\/tambos\/\d+$/, async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "PATCH" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      requestBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...TAMBO_1, nombre: "El Roble (renombrado)" }),
      });
    });

    await loginAsGerente(page);
    await page.goto("/tambos");

    await page.getByRole("table").getByLabel("Editar Establecimiento El Roble").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Proveedor *")).toBeDisabled();

    await dialog.getByLabel("Nombre *").fill("El Roble (renombrado)");
    await dialog.getByRole("button", { name: "Guardar cambios" }).click();

    // El modal recién cierra cuando onSubmit (tamboService.update + refetch)
    // resolvió del todo — esperar solo el request (como hacía antes acá)
    // deja sin cubrir el "return data" post-await de update().
    await expect(dialog).not.toBeVisible();

    expect(requestBody).toEqual({
      nombre: "El Roble (renombrado)",
      ubicacion: "San Rafael",
    });
  });

  test("un Gerente da de baja y reactiva un tambo", async ({ page }) => {
    await mockCatchAll(page);

    let bajaAplicada = false;

    await page.route("**/tambos/1", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "DELETE") return route.continue();
      bajaAplicada = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...TAMBO_1, activo: false }),
      });
    });

    // "**/tambos/1" no matchea "/tambos/1/activar" (el "*" no cruza el "/"):
    // hace falta una ruta dedicada, mismo criterio que el PATCH de edición.
    await page.route("**/tambos/1/activar", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "PATCH") return route.continue();
      bajaAplicada = false;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...TAMBO_1, activo: true }),
      });
    });

    // GET /tambos (catálogo): refleja el estado post-baja una vez aplicada.
    await page.route("**/tambos*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      const url = new URL(route.request().url());
      if (route.request().method() === "GET" && !url.searchParams.has("proveedorId")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([{ ...TAMBO_1, activo: !bajaAplicada }, TAMBO_2]),
        });
      }
      return route.continue();
    });

    await loginAsGerente(page);
    await page.goto("/tambos");

    const table = page.getByRole("table");
    await expect(table.getByLabel("Dar de baja Establecimiento El Roble")).toBeVisible();
    await table.getByLabel("Dar de baja Establecimiento El Roble").click();

    await expect(table.getByLabel("Reactivar Establecimiento El Roble")).toBeVisible();

    // tamboService.activar() — reactivar de vuelta.
    await table.getByLabel("Reactivar Establecimiento El Roble").click();

    await expect(table.getByLabel("Dar de baja Establecimiento El Roble")).toBeVisible();
  });

  test("un Responsable de calidad no ve el botón de + Nuevo tambo ni acciones de edición", async ({
    page,
  }) => {
    await mockCatchAll(page);
    await mockTambosCatalogo(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/tambos");

    await expect(page.getByRole("button", { name: "+ Nuevo tambo" })).not.toBeVisible();
    await expect(page.getByLabel("Editar Establecimiento El Roble")).not.toBeVisible();
    await expect(page.getByLabel("Dar de baja Establecimiento El Roble")).not.toBeVisible();
  });

  test("filtra la tabla de tambos por proveedor", async ({ page }) => {
    await mockCatchAll(page);
    await mockTambosCatalogo(page);
    await loginAsGerente(page);
    await page.goto("/tambos");

    await page.getByLabel("Proveedor").selectOption({ value: "2" });

    const table = page.getByRole("table");
    await expect(table.getByText("Establecimiento La Loma")).toBeVisible();
    await expect(table.getByText("Establecimiento El Roble")).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// LoteFormModal — combo encadenado proveedor → tambo (HU-36)
// ---------------------------------------------------------------------------

async function mockLotesDepsParaCombo(page: Page) {
  await mockCatchAll(page);

  await page.route("**/config-param*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  await page.route("**/sensores*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  // GET /tambos?proveedorId=1 -> [TAMBO_1] ; ?proveedorId=2 -> [TAMBO_2]
  await page.route("**/tambos*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    const url = new URL(route.request().url());
    const proveedorId = url.searchParams.get("proveedorId");
    const data = proveedorId === "2" ? [TAMBO_2] : proveedorId === "1" ? [TAMBO_1] : [];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
  });

  await page.route(/\/lotes\/\d+\/revisiones/, async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  await page.route("**/lotes*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], total: 0, page: 1, limit: 100 }),
    });
  });
}

test.describe("LoteFormModal — combo proveedor/tambo", () => {
  test("el tambo queda deshabilitado hasta elegir un proveedor y se resetea si el proveedor cambia", async ({
    page,
  }) => {
    await mockLotesDepsParaCombo(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await page.getByRole("button", { name: /nuevo lote/i }).click();
    const dialog = page.getByRole("dialog");

    await expect(dialog.getByLabel("Tambo de origen *")).toBeDisabled();

    await dialog.getByLabel("Proveedor *").selectOption({ value: "1" });
    await expect(dialog.getByLabel("Tambo de origen *")).toBeEnabled();
    await dialog.getByLabel("Tambo de origen *").selectOption({ value: "1" });
    await expect(dialog.getByLabel("Tambo de origen *")).toHaveValue("1");

    // Cambiar de proveedor invalida el tambo elegido: se resetea a vacío
    await dialog.getByLabel("Proveedor *").selectOption({ value: "2" });
    await expect(dialog.getByLabel("Tambo de origen *")).toHaveValue("");

    // La lista de tambos ahora corresponde al nuevo proveedor (La Loma)
    await dialog.getByLabel("Tambo de origen *").selectOption({ label: "Establecimiento La Loma" });
    await expect(dialog.getByLabel("Tambo de origen *")).toHaveValue("2");
  });

  test("el tambo de origen es obligatorio para registrar un lote", async ({ page }) => {
    await mockLotesDepsParaCombo(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await page.getByRole("button", { name: /nuevo lote/i }).click();
    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("Proveedor *").selectOption({ value: "1" });
    await dialog.getByLabel("Fecha de ingreso *").fill("2026-08-01");
    await dialog.getByLabel("Cantidad ingresada (L) *").fill("1000");
    await dialog.getByText("Leche cruda").click();
    await dialog.getByLabel("pH (sin unidad)").fill("6.8");
    await dialog.getByLabel("Destino inicial *").selectOption({ value: "produccion" });
    await dialog.getByLabel("Número de remito *").fill("R-000123");

    await dialog.getByRole("button", { name: "Registrar lote" }).click();

    await expect(dialog.getByText("El tambo de origen es obligatorio")).toBeVisible();
  });

  test("registra un lote nuevo enviando proveedorId y tamboId correctos", async ({ page }) => {
    await mockLotesDepsParaCombo(page);

    let requestBody: Record<string, unknown> | undefined;
    await page.route("**/lotes*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "POST") return route.continue();
      requestBody = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          lote: { id: 99, codigo: "LOT-2026-099", proveedorId: 1, tamboId: 1 },
          sensoresDisponibles: [],
        }),
      });
    });

    await loginAsResponsableCalidad(page);
    await page.goto("/lotes");

    await page.getByRole("button", { name: /nuevo lote/i }).click();
    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("Proveedor *").selectOption({ value: "1" });
    await dialog.getByLabel("Tambo de origen *").selectOption({ value: "1" });
    await dialog.getByLabel("Fecha de ingreso *").fill("2026-08-01");
    await dialog.getByLabel("Cantidad ingresada (L) *").fill("1000");
    await dialog.getByText("Leche cruda").click();
    await dialog.getByLabel("pH (sin unidad)").fill("6.8");
    await dialog.getByLabel("Destino inicial *").selectOption({ value: "produccion" });
    await dialog.getByLabel("Número de remito *").fill("R-000123");

    await dialog.getByRole("button", { name: "Registrar lote" }).click();

    await expect.poll(() => requestBody?.proveedorId).toBe(1);
    await expect.poll(() => requestBody?.tamboId).toBe(1);
  });
});
