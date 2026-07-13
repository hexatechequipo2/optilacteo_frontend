import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import { loginAsAdministrador } from "./fixtures/mockAuth.ts";

/**
 * useProveedores pagina con PAGE_SIZE=3. Cuando hay texto de búsqueda,
 * en vez de mandarlo al backend (que no soporta búsqueda multi-campo),
 * trae hasta 100 registros (SEARCH_FETCH_LIMIT) y filtra/pagina en el
 * cliente sobre razonSocial, cuit, telefono, emailContacto, provincia,
 * localidad. Además ProveedoresPage debounce-ea el input 400ms antes de
 * pasarlo al hook.
 */
const PROVEEDORES_MOCK = {
  data: [
    {
      id: 1,
      razonSocial: "Tambo El Roble",
      cuit: "30-11111111-1",
      tipo: "tambo",
      empresaId: 1,
      capacidad: 5000,
      localidad: "Villa María",
      provincia: "Cordoba",
      estado: "activa",
      telefono: "3534000000",
      emailContacto: "contacto@elroble.com",
    },
    {
      id: 2,
      razonSocial: "Transportes Rápido SA",
      cuit: "30-22222222-2",
      tipo: "transporte",
      empresaId: 1,
      capacidad: 12,
      localidad: "Rosario",
      provincia: "Santa Fe",
      estado: "trial",
      telefono: "3414000000",
      emailContacto: "info@rapido.com",
    },
  ],
  meta: { page: 1, limit: 3, total: 2, totalPages: 1 },
};

const EMPRESAS_MOCK = {
  data: [{ id: 1, name: "Tambo San José", cuit: "30-12345678-9", plan: "pro", isActive: true }],
  meta: { page: 1, limit: 5, total: 1, totalPages: 1 },
};

async function mockProveedoresAndEmpresas(page: Page) {
  await page.route("**/proveedores*", async (route) => {
    if (route.request().method() !== "GET" || route.request().resourceType() === "document") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PROVEEDORES_MOCK),
    });
  });
  await page.route("**/empresa*", async (route) => {
    if (route.request().method() !== "GET" || route.request().resourceType() === "document") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(EMPRESAS_MOCK),
    });
  });
}

test.describe("ProveedoresPage", () => {
  test("muestra la lista de proveedores con su tipo y estado", async ({ page }) => {
    await mockProveedoresAndEmpresas(page);
    await loginAsAdministrador(page);

    await page.goto("/proveedores");

    await expect(page.getByText("Tambo El Roble")).toBeVisible();
    await expect(page.getByText("Transportes Rápido SA")).toBeVisible();
  });

  test("filtrar por tab Tambo manda tipo=tambo al backend", async ({ page }) => {
    await mockProveedoresAndEmpresas(page);
    await loginAsAdministrador(page);
    await page.goto("/proveedores");

    const requestPromise = page.waitForRequest(
      (req) => req.url().includes("/proveedores") && req.method() === "GET" && req.url().includes("tipo=tambo"),
    );
    await page.getByRole("button", { name: "Tambo", exact: true }).click();
    await requestPromise; // si no matchea, el waitForRequest hace timeout y falla el test
  });

  test("buscar por texto filtra en cliente después del debounce", async ({ page }) => {
    await mockProveedoresAndEmpresas(page);
    await loginAsAdministrador(page);
    await page.goto("/proveedores");

    await expect(page.getByText("Transportes Rápido SA")).toBeVisible();

    // El input dispara el fetch (limit=100) recién 400ms después de dejar
    // de tipear, así que esperamos ese request antes de assertar el filtro.
    const requestPromise = page.waitForRequest(
      (req) => req.url().includes("/proveedores") && req.method() === "GET" && req.url().includes("limit=100"),
    );
    await page.getByPlaceholder(/Buscar por nombre, CUIT, teléfono/i).fill("Roble");
    await requestPromise;

    await expect(page.getByText("Tambo El Roble")).toBeVisible();
    await expect(page.getByText("Transportes Rápido SA")).not.toBeVisible();
  });

  test("estado vacío cuando no hay proveedores", async ({ page }) => {
    await page.route("**/proveedores*", async (route) => {
      if (route.request().method() !== "GET" || route.request().resourceType() === "document") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], meta: { page: 1, limit: 3, total: 0, totalPages: 1 } }),
      });
    });
    await page.route("**/empresa*", async (route) => {
      if (route.request().method() !== "GET" || route.request().resourceType() === "document") return route.continue();
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPRESAS_MOCK) });
    });

    await loginAsAdministrador(page);
    await page.goto("/proveedores");

    await expect(page.getByText("No se encontraron proveedores")).toBeVisible();
  });

  test("editar un proveedor abre el modal de edición", async ({ page }) => {
    await mockProveedoresAndEmpresas(page);
    await loginAsAdministrador(page);
    await page.goto("/proveedores");

    await page.getByRole("button", { name: "Editar Tambo El Roble" }).click();
    // ProveedorFormModal no está en el contexto que me pasaste — completar
    // según los campos reales una vez que lo compartas.
  });
  test.describe("ProveedorFormModal", () => {
  test.beforeEach(async ({ page }) => {
    await mockProveedoresAndEmpresas(page);
    await loginAsAdministrador(page);
    await page.goto("/proveedores");
  });

  test("abre el modal para crear un proveedor", async ({ page }) => {
    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await expect(
      dialog.getByRole("heading", { name: "Nuevo proveedor" }),
    ).toBeVisible();

    await expect(dialog.getByLabel("Razón social *")).toBeVisible();
    await expect(dialog.getByLabel("CUIT *")).toBeVisible();
    await expect(dialog.getByLabel("Empresa asignada *")).toBeVisible();

    await expect(
      dialog.getByRole("button", { name: "Crear proveedor" }),
    ).toBeVisible();
  });

  test("valida los campos obligatorios", async ({ page }) => {
    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await dialog
      .getByRole("button", { name: "Crear proveedor" })
      .click();

    await expect(
      dialog.getByText("La razón social es obligatoria"),
    ).toBeVisible();

    await expect(
      dialog.getByText("El CUIT es obligatorio"),
    ).toBeVisible();

    await expect(
      dialog.getByText("La empresa es obligatoria"),
    ).toBeVisible();
  });

  test("valida el formato del CUIT", async ({ page }) => {
    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("Razón social *").fill("Proveedor Test");
    await dialog.getByLabel("CUIT *").fill("30123");
    await dialog.getByLabel("Empresa asignada *").selectOption("1");

    await dialog
      .getByRole("button", { name: "Crear proveedor" })
      .click();

    await expect(
      dialog.getByText("El CUIT debe tener el formato XX-XXXXXXXX-X"),
    ).toBeVisible();
  });

  test("formatea el CUIT mientras se escribe", async ({ page }) => {
    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const cuit = page.getByRole("dialog").getByLabel("CUIT *");

    await cuit.fill("30123456789");

    await expect(cuit).toHaveValue("30-12345678-9");
  });

  test("Tambo muestra volumen de entrega como capacidad", async ({
    page,
  }) => {
    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await expect(
      dialog.getByLabel("Volumen de entrega (L/día)"),
    ).toBeVisible();
  });

  test("Transporte muestra viajes por semana como capacidad", async ({
    page,
  }) => {
    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await dialog
      .getByRole("button", { name: "Transporte", exact: true })
      .click();

    await expect(
      dialog.getByLabel("Viajes por semana"),
    ).toBeVisible();

    await expect(
      dialog.getByLabel("Volumen de entrega (L/día)"),
    ).not.toBeVisible();
  });

  test("Insumos no muestra el campo capacidad", async ({ page }) => {
    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await dialog
      .getByRole("button", { name: "Insumos", exact: true })
      .click();

    await expect(
      dialog.getByText("CAPACIDAD", { exact: true }),
    ).not.toBeVisible();
  });

  test("Laboratorio no muestra el campo capacidad", async ({ page }) => {
    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await dialog
      .getByRole("button", { name: "Laboratorio", exact: true })
      .click();

    await expect(
      dialog.getByText("CAPACIDAD", { exact: true }),
    ).not.toBeVisible();
  });

  test("crea un proveedor enviando los datos correctos", async ({
    page,
  }) => {
    let requestBody: Record<string, unknown> | undefined;

    await page.route("**/proveedores", async (route) => {
      if (route.request().method() !== "POST") {
        return route.continue();
      }

      requestBody = route.request().postDataJSON();

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: 3,
          ...requestBody,
        }),
      });
    });

    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await dialog
      .getByLabel("Razón social *")
      .fill("  Tambo Nuevo  ");

    await dialog.getByLabel("CUIT *").fill("30333333333");

    await dialog
      .getByLabel("Teléfono")
      .fill("  3534111111  ");

    await dialog
      .getByLabel("Email de contacto")
      .fill("  contacto@nuevo.com  ");

    await dialog
      .getByLabel("Empresa asignada *")
      .selectOption("1");

    await dialog
      .getByLabel("Provincia")
      .selectOption({ label: "Cordoba" });

    await dialog
      .getByLabel("Volumen de entrega (L/día)")
      .fill("6000");

    await dialog
      .getByRole("button", { name: "Trial", exact: true })
      .click();

    await dialog
      .getByRole("button", { name: "Crear proveedor" })
      .click();

    await expect.poll(() => requestBody).toEqual({
      tipo: "tambo",
      razonSocial: "Tambo Nuevo",
      cuit: "30-33333333-3",
      empresaId: 1,
      estado: "trial",
      telefono: "3534111111",
      emailContacto: "contacto@nuevo.com",
      provincia: "Cordoba",
      capacidad: 6000,
    });
  });

  test("no envía campos opcionales vacíos", async ({ page }) => {
    let requestBody: Record<string, unknown> | undefined;

    await page.route("**/proveedores", async (route) => {
      if (route.request().method() !== "POST") {
        return route.continue();
      }

      requestBody = route.request().postDataJSON();

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: 3,
          ...requestBody,
        }),
      });
    });

    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("Razón social *").fill("Proveedor Mínimo");
    await dialog.getByLabel("CUIT *").fill("30333333333");

    await dialog
      .getByLabel("Empresa asignada *")
      .selectOption("1");

    await dialog
      .getByRole("button", { name: "Insumos", exact: true })
      .click();

    await dialog
      .getByRole("button", { name: "Crear proveedor" })
      .click();

    await expect.poll(() => requestBody).toEqual({
      tipo: "insumos",
      razonSocial: "Proveedor Mínimo",
      cuit: "30-33333333-3",
      empresaId: 1,
      estado: "activa",
    });
  });

  test("un error 409 de CUIT se muestra en el campo CUIT", async ({
    page,
  }) => {
    await page.route("**/proveedores", async (route) => {
      if (route.request().method() !== "POST") {
        return route.continue();
      }

      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          field: "cuit",
          message: "Ya existe un proveedor con ese CUIT",
        }),
      });
    });

    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("Razón social *").fill("Proveedor Test");
    await dialog.getByLabel("CUIT *").fill("30111111111");

    await dialog
      .getByLabel("Empresa asignada *")
      .selectOption("1");

    await dialog
      .getByRole("button", { name: "Crear proveedor" })
      .click();

    await expect(
      dialog.getByText("Ya existe un proveedor con ese CUIT"),
    ).toBeVisible();
  });

  test("un error 409 de razón social se muestra en el campo", async ({
    page,
  }) => {
    await page.route("**/proveedores", async (route) => {
      if (route.request().method() !== "POST") {
        return route.continue();
      }

      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          field: "razonSocial",
          message: "Ya existe un proveedor con esa razón social",
        }),
      });
    });

    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("Razón social *").fill("Tambo El Roble");
    await dialog.getByLabel("CUIT *").fill("30333333333");

    await dialog
      .getByLabel("Empresa asignada *")
      .selectOption("1");

    await dialog
      .getByRole("button", { name: "Crear proveedor" })
      .click();

    await expect(
      dialog.getByText(
        "Ya existe un proveedor con esa razón social",
      ),
    ).toBeVisible();
  });

  test("muestra error genérico ante un error inesperado", async ({
    page,
  }) => {
    await page.route("**/proveedores", async (route) => {
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

    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("Razón social *").fill("Proveedor Test");
    await dialog.getByLabel("CUIT *").fill("30333333333");

    await dialog
      .getByLabel("Empresa asignada *")
      .selectOption("1");

    await dialog
      .getByRole("button", { name: "Crear proveedor" })
      .click();

    await expect(
      dialog.getByText(
        "No se pudo guardar el proveedor. Intentá nuevamente.",
      ),
    ).toBeVisible();
  });

  test("Cancelar cierra el modal", async ({ page }) => {
    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await dialog
      .getByRole("button", { name: "Cancelar" })
      .click();

    await expect(dialog).not.toBeVisible();
  });

  test("Escape cierra el modal", async ({ page }) => {
    await page
      .getByRole("button", { name: /nuevo proveedor/i })
      .click();

    const dialog = page.getByRole("dialog");

    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(dialog).not.toBeVisible();
  });

  test("editar un proveedor carga sus datos actuales", async ({ page }) => {
    await page
      .getByRole("button", { name: "Editar Tambo El Roble" })
      .click();

    const dialog = page.getByRole("dialog");

    await expect(
      dialog.getByRole("heading", { name: "Editar proveedor" }),
    ).toBeVisible();

    await expect(
      dialog.getByLabel("Razón social *"),
    ).toHaveValue("Tambo El Roble");

    await expect(dialog.getByLabel("CUIT *")).toHaveValue(
      "30-11111111-1",
    );

    await expect(dialog.getByLabel("Teléfono")).toHaveValue(
      "3534000000",
    );

    await expect(
      dialog.getByLabel("Email de contacto"),
    ).toHaveValue("contacto@elroble.com");

    await expect(
      dialog.getByLabel("Empresa asignada *"),
    ).toHaveValue("1");

    await expect(
      dialog.getByLabel("Volumen de entrega (L/día)"),
    ).toHaveValue("5000");
  });

  test("editar un transporte carga viajes por semana", async ({ page }) => {
    await page
      .getByRole("button", {
        name: "Editar Transportes Rápido SA",
      })
      .click();

    const dialog = page.getByRole("dialog");

    await expect(
      dialog.getByLabel("Viajes por semana"),
    ).toHaveValue("12");

    await expect(
      dialog.getByRole("button", {
        name: "Trial",
        exact: true,
      }),
    ).toBeVisible();
  });
});
});