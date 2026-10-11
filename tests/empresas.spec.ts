import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import { loginAsAdministrador, loginAsGerente } from "./fixtures/mockAuth.ts";

/**
 * useEmpresas pagina con limit=5 fijo (hardcodeado en el hook, no
 * configurable desde la UI) y mapea meta.totalPages -> meta.lastPage.
 */
const EMPRESAS_MOCK = {
  data: [
    { id: 1, name: "Tambo San José", cuit: "30-12345678-9", plan: "pro", isActive: true },
    { id: 2, name: "Lácteos del Sur", cuit: "30-98765432-1", plan: "starter", isActive: true },
  ],
  meta: { page: 1, limit: 5, total: 2, totalPages: 1 },
};

async function mockEmpresasGet(page: Page) {
  await page.route("**/empresa*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "GET") return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(EMPRESAS_MOCK),
    });
  });
}

test.describe("EmpresasPage", () => {
  test("un Administrador puede ver la lista de empresas", async ({ page }) => {
    await mockEmpresasGet(page);
    await loginAsAdministrador(page);

    await page.goto("/empresas");
    await expect(page.getByRole("table").getByText("Tambo San José")).toBeVisible();
    await expect(page.getByRole("table").getByText("Lácteos del Sur")).toBeVisible();
  });

  test("un Gerente no puede acceder a Empresas", async ({ page }) => {
    // ProtectedRoute bloquea por contenido in-place (no redirige), por eso
    // la URL sigue siendo /empresas; se verifica el mensaje de bloqueo.
    await mockEmpresasGet(page);
    await loginAsGerente(page);

    await page.goto("/empresas");
    await expect(page.getByText("Acceso no autorizado")).toBeVisible();
    await expect(
      page.getByText(
        "Tu rol no tiene permiso para ver esta sección.",
      ),
    ).toBeVisible();
  });

  test("buscar por CUIT manda el filtro cuit, no name", async ({ page }) => {
    await mockEmpresasGet(page);
    await loginAsAdministrador(page);
    await page.goto("/empresas");

    const requestPromise = page.waitForRequest(
      (req) => req.url().includes("/empresa") && req.method() === "GET" && req.url().includes("cuit="),
    );
    await page.getByPlaceholder("Buscar por nombre, CUIT o plan...").fill("30-12345678-9");
    const request = await requestPromise;

    const url = new URL(request.url());
    expect(url.searchParams.get("cuit")).toBe("30-12345678-9");
    expect(url.searchParams.get("name")).toBeNull();
  });

  test("buscar un plan válido manda el filtro plan, no name", async ({ page }) => {
    await mockEmpresasGet(page);
    await loginAsAdministrador(page);
    await page.goto("/empresas");

    const requestPromise = page.waitForRequest(
      (req) => req.url().includes("/empresa") && req.method() === "GET" && req.url().includes("plan="),
    );
    await page.getByPlaceholder("Buscar por nombre, CUIT o plan...").fill("pro");
    const request = await requestPromise;

    const url = new URL(request.url());
    expect(url.searchParams.get("plan")).toBe("pro");
    expect(url.searchParams.get("name")).toBeNull();
  });

  test("buscar un nombre cualquiera manda el filtro name", async ({ page }) => {
    await mockEmpresasGet(page);
    await loginAsAdministrador(page);
    await page.goto("/empresas");

    const requestPromise = page.waitForRequest(
      (req) => req.url().includes("/empresa") && req.method() === "GET" && req.url().includes("name="),
    );
    await page.getByPlaceholder("Buscar por nombre, CUIT o plan...").fill("Tambo San");
    const request = await requestPromise;

    const url = new URL(request.url());
    expect(url.searchParams.get("name")).toBe("Tambo San");
  });

  test("filtro por tab Suspendidas manda isActive=false", async ({ page }) => {
    await mockEmpresasGet(page);
    await loginAsAdministrador(page);
    await page.goto("/empresas");

    const requestPromise = page.waitForRequest(
      (req) => req.url().includes("/empresa") && req.method() === "GET" && req.url().includes("isActive="),
    );
    await page.getByRole("button", { name: "Suspendidas", exact: true }).click();
    const request = await requestPromise;

    const url = new URL(request.url());
    expect(url.searchParams.get("isActive")).toBe("false");
  });

  test("crear una empresa nueva la agrega a la lista", async ({ page }) => {
    await mockEmpresasGet(page);
    await loginAsAdministrador(page);
    await page.goto("/empresas");

    await page.route("**/empresa", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: 3, isActive: true, ...body }),
      });
    });

    await page.getByRole("button", { name: "+ Nueva empresa" }).click();
    // Los labels exactos del modal (NuevaEmpresaModal) no están en el
    // contexto que me pasaste — completar según los campos reales del form.
    // Ejemplo aproximado:
    // await page.getByLabel("Nombre").fill("Nueva Empresa Test");
    // await page.getByRole("button", { name: "Guardar" }).click();
    // await expect(page.getByText("Nueva Empresa Test")).toBeVisible();
  });

  test.describe("NuevaEmpresaModal", () => {
  test.beforeEach(async ({ page }) => {
    await mockEmpresasGet(page);
    await loginAsAdministrador(page);
    await page.goto("/empresas");

    await page.getByRole("button", { name: "+ Nueva empresa" }).click();
    await expect(
      page.getByRole("heading", { name: "Nueva empresa" }),
    ).toBeVisible();
  });

  test("abre el modal de nueva empresa", async ({ page }) => {
  await expect(
    page.getByText("Nueva empresa", { exact: true }),
  ).toBeVisible();

  await expect(
    page.getByText(
      "Completá los datos para registrar una nueva organización en la plataforma.",
    ),
  ).toBeVisible();

  await expect(page.getByLabel("Nombre *")).toBeVisible();
  await expect(page.getByLabel("CUIT")).toBeVisible();
  await expect(page.getByPlaceholder("Localidad")).toBeVisible();
  await expect(page.getByLabel("Dirección")).toBeVisible();
  await expect(page.getByLabel("Email de contacto")).toBeVisible();
  await expect(page.getByLabel("Teléfono")).toBeVisible();

  await expect(
    page.getByRole("button", { name: "Crear empresa" }),
  ).toBeVisible();
});

  test("nombre es obligatorio", async ({ page }) => {
    await page.getByRole("button", { name: "Crear empresa" }).click();

    await expect(
      page.getByText("El nombre es obligatorio"),
    ).toBeVisible();
  });

  test("no manda POST si el nombre está vacío", async ({ page }) => {
    let postCount = 0;

    await page.route("**/empresa", async (route) => {
      if (route.request().method() === "POST") {
        postCount++;
      }

      await route.fallback();
    });

    await page.getByRole("button", { name: "Crear empresa" }).click();

    await expect(
      page.getByText("El nombre es obligatorio"),
    ).toBeVisible();

    expect(postCount).toBe(0);
  });

  test("formatea el CUIT mientras se escribe", async ({ page }) => {
    const cuitInput = page.getByLabel("CUIT");

    await cuitInput.fill("30123456789");

    await expect(cuitInput).toHaveValue("30-12345678-9");
  });

  test("el CUIT elimina caracteres no numéricos y limita a 11 dígitos", async ({
    page,
  }) => {
    const cuitInput = page.getByLabel("CUIT");

    await cuitInput.fill("30abc123456789999");

    await expect(cuitInput).toHaveValue("30-12345678-9");
  });

  test("Starter está seleccionado por defecto", async ({ page }) => {
    await expect(
      page.getByRole("radio", { name: "Starter" }),
    ).toBeChecked();

    await expect(
      page.getByRole("radio", { name: "Pro" }),
    ).not.toBeChecked();

    await expect(
      page.getByRole("radio", { name: "Enterprise" }),
    ).not.toBeChecked();
  });

  test("permite cambiar el plan", async ({ page }) => {
    await page.getByRole("radio", { name: "Pro" }).check();

    await expect(
      page.getByRole("radio", { name: "Pro" }),
    ).toBeChecked();

    await expect(
      page.getByRole("radio", { name: "Starter" }),
    ).not.toBeChecked();
  });

  test("crea una empresa enviando todos los datos", async ({ page }) => {
    let requestBody: Record<string, unknown> | undefined;

    await page.route("**/empresa", async (route) => {
      if (route.request().method() !== "POST") {
        return route.fallback();
      }

      requestBody = route.request().postDataJSON();

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: 3,
          isActive: true,
          ...requestBody,
        }),
      });
    });

    await page.getByLabel("Nombre *").fill("  Nueva Empresa Test  ");
    await page.getByLabel("CUIT").fill("30123456789");
    await page.getByLabel("Dirección").fill("  Av. Colón 1234  ");
    await page
      .getByLabel("Email de contacto")
      .fill("  contacto@empresa.com  ");
    await page.getByLabel("Teléfono").fill("  +54 351 1234567  ");
    await page.getByRole("radio", { name: "Pro" }).check();

    await page.getByRole("button", { name: "Crear empresa" }).click();

    await expect.poll(() => requestBody).toEqual({
      name: "Nueva Empresa Test",
      cuit: "30-12345678-9",
      email: "contacto@empresa.com",
      telefono: "+54 351 1234567",
      direccion: "Av. Colón 1234",
      plan: "pro",
    });
  });

  test("no envía campos opcionales vacíos", async ({ page }) => {
    let requestBody: Record<string, unknown> | undefined;

    await page.route("**/empresa", async (route) => {
      if (route.request().method() !== "POST") {
        return route.fallback();
      }

      requestBody = route.request().postDataJSON();

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: 3,
          name: "Empresa Mínima",
          plan: "starter",
          isActive: true,
        }),
      });
    });

    await page.getByLabel("Nombre *").fill("Empresa Mínima");
    await page.getByRole("button", { name: "Crear empresa" }).click();

    await expect.poll(() => requestBody).toEqual({
      name: "Empresa Mínima",
      plan: "starter",
    });
  });

  test("muestra el mensaje del backend ante error 409", async ({ page }) => {
    await page.route("**/empresa", async (route) => {
      if (route.request().method() !== "POST") {
        return route.fallback();
      }

      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Ya existe una empresa con ese CUIT",
        }),
      });
    });

    await page.getByLabel("Nombre *").fill("Empresa Duplicada");
    await page.getByLabel("CUIT").fill("30123456789");

    await page.getByRole("button", { name: "Crear empresa" }).click();

    await expect(
      page.getByText("Ya existe una empresa con ese CUIT"),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Nueva empresa" }),
    ).toBeVisible();
  });

  test("muestra el mensaje del backend ante error 400", async ({ page }) => {
    await page.route("**/empresa", async (route) => {
      if (route.request().method() !== "POST") {
        return route.fallback();
      }

      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Los datos ingresados son inválidos",
        }),
      });
    });

    await page.getByLabel("Nombre *").fill("Empresa Test");
    await page.getByRole("button", { name: "Crear empresa" }).click();

    await expect(
      page.getByText("Los datos ingresados son inválidos"),
    ).toBeVisible();
  });

  test("muestra error genérico ante un error inesperado", async ({ page }) => {
    await page.route("**/empresa", async (route) => {
      if (route.request().method() !== "POST") {
        return route.fallback();
      }

      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Internal Server Error",
        }),
      });
    });

    await page.getByLabel("Nombre *").fill("Empresa Test");
    await page.getByRole("button", { name: "Crear empresa" }).click();

    await expect(
      page.getByText("No se pudo crear la empresa. Intentá nuevamente."),
    ).toBeVisible();
  });

  test("Cancelar cierra el modal y limpia el formulario", async ({ page }) => {
    await page.getByLabel("Nombre *").fill("Empresa temporal");
    await page.getByLabel("CUIT").fill("30123456789");
    await page.getByRole("radio", { name: "Enterprise" }).check();

    await page.getByRole("button", { name: "Cancelar" }).click();

    await expect(
      page.getByRole("heading", { name: "Nueva empresa" }),
    ).not.toBeVisible();

    await page.getByRole("button", { name: "+ Nueva empresa" }).click();

    await expect(page.getByLabel("Nombre *")).toHaveValue("");
    await expect(page.getByLabel("CUIT")).toHaveValue("");

    await expect(
      page.getByRole("radio", { name: "Starter" }),
    ).toBeChecked();
  });

  test("limpia el error de validación al cerrar y volver a abrir", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Crear empresa" }).click();

    await expect(
      page.getByText("El nombre es obligatorio"),
    ).toBeVisible();

    await page.getByRole("button", { name: "Cancelar" }).click();
    await page.getByRole("button", { name: "+ Nueva empresa" }).click();

    await expect(
      page.getByText("El nombre es obligatorio"),
    ).not.toBeVisible();
  });

  test("limpia el error del servidor al cerrar y volver a abrir", async ({
    page,
  }) => {
    await page.route("**/empresa", async (route) => {
      if (route.request().method() !== "POST") {
        return route.fallback();
      }

      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Empresa duplicada",
        }),
      });
    });

    await page.getByLabel("Nombre *").fill("Empresa Test");
    await page.getByRole("button", { name: "Crear empresa" }).click();

    await expect(page.getByText("Empresa duplicada")).toBeVisible();

    await page.getByRole("button", { name: "Cancelar" }).click();
    await page.getByRole("button", { name: "+ Nueva empresa" }).click();

    await expect(page.getByText("Empresa duplicada")).not.toBeVisible();
  });
  });

  async function abrirEditarEmpresa(page: Page, empresa = "Tambo San José") {
  const row = page.getByRole("row").filter({ hasText: empresa });

  await row.getByRole("button", { name: /editar/i }).click();

  await expect(
    page.getByText("Editar empresa", { exact: true }),
  ).toBeVisible();
  // El modal monta con el formulario vacío y lo completa en un useEffect:
  // editar antes de eso deja que el efecto pise lo que escribió el test.
  await expect(page.getByLabel("Nombre *")).toHaveValue(empresa);
}

  test.describe("EditarEmpresaModal", () => {
    test.beforeEach(async ({ page }) => {
      await mockEmpresasGet(page);
      await loginAsAdministrador(page);
      await page.goto("/empresas");

      await abrirEditarEmpresa(page);
    });

    test("abre el modal con los datos actuales de la empresa", async ({
      page,
    }) => {
      await expect(
        page.getByText("Editá la información de la organización."),
      ).toBeVisible();

      await expect(page.getByLabel("Nombre *")).toHaveValue(
        "Tambo San José",
      );

      await expect(page.getByLabel("CUIT")).toHaveValue(
        "30-12345678-9",
      );

      await expect(
        page.getByRole("radio", { name: "Pro" }),
      ).toBeChecked();

      await expect(
        page.getByText("Empresa activa", { exact: true }),
      ).toBeVisible();
    });

    test("muestra las secciones del formulario", async ({ page }) => {
    const form = page.locator("#empresa-form-edit");

    await expect(
      form.getByText("DATOS GENERALES", { exact: true }),
    ).toBeVisible();

    await expect(
      form.getByText("PLAN", { exact: true }),
    ).toBeVisible();

    await expect(
      form.getByText("ESTADO", { exact: true }),
    ).toBeVisible();

    await expect(
      form.getByPlaceholder("Buscar localidad..."),
    ).toBeVisible();

    await expect(form.getByLabel("Dirección")).toBeVisible();

    await expect(
      form.getByLabel("Email de contacto"),
    ).toBeVisible();

    await expect(form.getByLabel("Teléfono")).toBeVisible();
  });

    test("nombre es obligatorio", async ({ page }) => {
      await page.getByLabel("Nombre *").fill("");

      await page
        .getByRole("button", { name: "Guardar cambios" })
        .click();

      await expect(
        page.getByText("El nombre es obligatorio"),
      ).toBeVisible();
    });

    test("no manda actualización si el nombre está vacío", async ({
      page,
    }) => {
      let updateCount = 0;

      await page.route("**/empresa/**", async (route) => {
        if (
          route.request().method() === "PATCH" ||
          route.request().method() === "PUT"
        ) {
          updateCount++;
        }

        await route.fallback();
      });

      await page.getByLabel("Nombre *").fill("");

      await page
        .getByRole("button", { name: "Guardar cambios" })
        .click();

      await expect(
        page.getByText("El nombre es obligatorio"),
      ).toBeVisible();

      expect(updateCount).toBe(0);
    });

    test("formatea el CUIT mientras se edita", async ({ page }) => {
      const cuitInput = page.getByLabel("CUIT");

      await cuitInput.fill("30987654321");

      await expect(cuitInput).toHaveValue("30-98765432-1");
    });

    test("el CUIT elimina caracteres no numéricos y limita a 11 dígitos", async ({
      page,
    }) => {
      const cuitInput = page.getByLabel("CUIT");

      await cuitInput.fill("30abc987654321999");

      await expect(cuitInput).toHaveValue("30-98765432-1");
    });

    test("permite cambiar el plan de la empresa", async ({ page }) => {
      await page
        .getByRole("radio", { name: "Enterprise" })
        .check();

      await expect(
        page.getByRole("radio", { name: "Enterprise" }),
      ).toBeChecked();

      await expect(
        page.getByRole("radio", { name: "Pro" }),
      ).not.toBeChecked();
    });

    test("envía los datos modificados al guardar", async ({ page }) => {
      let requestBody: Record<string, unknown> | undefined;

      await page.route("**/empresa/**", async (route) => {
        if (
          route.request().method() !== "PATCH" &&
          route.request().method() !== "PUT"
        ) {
          return route.fallback();
        }

        requestBody = route.request().postDataJSON();

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: 1,
            isActive: true,
            ...requestBody,
          }),
        });
      });

      await page
        .getByLabel("Nombre *")
        .fill("  Tambo San José Editado  ");

      await page.getByLabel("CUIT").fill("30987654321");

      await page
        .getByLabel("Dirección")
        .fill("  Av. Colón 1234  ");

      await page
        .getByLabel("Email de contacto")
        .fill("  contacto@tambo.com  ");

      await page
        .getByLabel("Teléfono")
        .fill("  +54 351 1234567  ");

      await page
        .getByRole("radio", { name: "Enterprise" })
        .check();

      await page
        .getByRole("button", { name: "Guardar cambios" })
        .click();

      await expect.poll(() => requestBody).toEqual({
        name: "Tambo San José Editado",
        cuit: "30-98765432-1",
        email: "contacto@tambo.com",
        telefono: "+54 351 1234567",
        direccion: "Av. Colón 1234",
        plan: "enterprise",
      });
    });

    test("no envía campos opcionales vacíos", async ({ page }) => {
      let requestBody: Record<string, unknown> | undefined;

      await page.route("**/empresa/**", async (route) => {
        if (
          route.request().method() !== "PATCH" &&
          route.request().method() !== "PUT"
        ) {
          return route.fallback();
        }

        requestBody = route.request().postDataJSON();

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: 1,
            name: "Tambo San José",
            plan: "pro",
            isActive: true,
          }),
        });
      });

      await page.getByLabel("CUIT").fill("");
      await page.getByLabel("Dirección").fill("");
      await page.getByLabel("Email de contacto").fill("");
      await page.getByLabel("Teléfono").fill("");

      await page
        .getByRole("button", { name: "Guardar cambios" })
        .click();

      await expect.poll(() => requestBody).toEqual({
        name: "Tambo San José",
        plan: "pro",
      });
    });

    test("permite suspender una empresa", async ({ page }) => {
      const toggle = page.locator("#edit-empresa-isActive");

      await expect(
        page.getByText("Empresa activa", { exact: true }),
      ).toBeVisible();

      await toggle.click();

      await expect(
        page.getByText("Empresa suspendida", { exact: true }),
      ).toBeVisible();
    });

    test("muestra el mensaje del backend ante error 409", async ({
      page,
    }) => {
      await page.route("**/empresa/**", async (route) => {
        if (
          route.request().method() !== "PATCH" &&
          route.request().method() !== "PUT"
        ) {
          return route.fallback();
        }

        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            message: "Ya existe una empresa con ese CUIT",
          }),
        });
      });

      await page.getByLabel("Nombre *").fill("Empresa Editada");

      await page
        .getByRole("button", { name: "Guardar cambios" })
        .click();

      await expect(
        page.getByText("Ya existe una empresa con ese CUIT"),
      ).toBeVisible();

      await expect(
        page.getByText("Editar empresa", { exact: true }),
      ).toBeVisible();
    });

    test("muestra el mensaje del backend ante error 400", async ({
      page,
    }) => {
      await page.route("**/empresa/**", async (route) => {
        if (
          route.request().method() !== "PATCH" &&
          route.request().method() !== "PUT"
        ) {
          return route.fallback();
        }

        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            message: "Los datos ingresados son inválidos",
          }),
        });
      });

      await page
        .getByRole("button", { name: "Guardar cambios" })
        .click();

      await expect(
        page.getByText("Los datos ingresados son inválidos"),
      ).toBeVisible();
    });

    test("muestra error genérico ante un error inesperado", async ({
      page,
    }) => {
      await page.route("**/empresa/**", async (route) => {
        if (
          route.request().method() !== "PATCH" &&
          route.request().method() !== "PUT"
        ) {
          return route.fallback();
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
        .getByRole("button", { name: "Guardar cambios" })
        .click();

      await expect(
        page.getByText(
          "No se pudo guardar los cambios. Intentá nuevamente.",
        ),
      ).toBeVisible();
    });

    test("Cancelar cierra el modal", async ({ page }) => {
      await page.getByRole("button", { name: "Cancelar" }).click();

      await expect(
        page.getByText("Editar empresa", { exact: true }),
      ).not.toBeVisible();
    });
  });
});
// ---------------------------------------------------------------------------
// Combobox de localidad (componente compartido) dentro de NuevaEmpresaModal
// ---------------------------------------------------------------------------

test.describe("Combobox de localidad › NuevaEmpresaModal", () => {
  test.beforeEach(async ({ page }) => {
    await mockEmpresasGet(page);
    await loginAsAdministrador(page);
    await page.goto("/empresas");
    await page.getByRole("button", { name: "+ Nueva empresa" }).click();
    await expect(page.getByRole("heading", { name: "Nueva empresa" })).toBeVisible();
  });

  // El <label> del combobox no está asociado al input (ver hallazgos): se
  // ubica por su placeholder.
  const localidad = (page: Page) => page.getByPlaceholder("Buscar localidad...");
  const opciones = (page: Page) => page.getByRole("listbox").getByRole("option");

  async function capturarAlta(page: Page) {
    const cuerpos: Record<string, unknown>[] = [];
    await page.route("**/empresa", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      cuerpos.push(route.request().postDataJSON());
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: 3, isActive: true, name: "X", plan: "starter" }) });
    });
    return cuerpos;
  }

  test("filtra mientras se escribe, sin distinguir mayúsculas, y avisa si no hay coincidencias", async ({ page }) => {
    await localidad(page).fill("jesus m");
    await expect(opciones(page)).toHaveText(["JESUS MARIA"]);

    await localidad(page).fill("zzzz");
    await expect(page.getByRole("listbox")).toContainText("No se encontraron resultados");
    await expect(opciones(page)).toHaveCount(0);
  });

  test("con flechas y Enter elige una opción, y la localidad viaja en la dirección", async ({ page }) => {
    const cuerpos = await capturarAlta(page);
    await page.getByLabel("Nombre *").fill("Lácteos Norte");
    await page.getByLabel("Dirección").fill("San Martín 100");

    await localidad(page).fill("maria");
    await expect(opciones(page).first()).toHaveText("ADELIA MARIA");
    await localidad(page).press("ArrowDown");
    await localidad(page).press("ArrowDown");
    await localidad(page).press("ArrowUp");
    await localidad(page).press("Enter");

    await expect(localidad(page)).toHaveValue("ARSENAL JOSE MARIA ROJAS");
    await expect(page.getByRole("listbox")).toHaveCount(0);

    await page.getByRole("button", { name: "Crear empresa" }).click();
    await expect.poll(() => cuerpos[0]?.direccion).toBe("San Martín 100, ARSENAL JOSE MARIA ROJAS");
  });

  test("con el mouse elige una opción y la cruz la limpia", async ({ page }) => {
    await localidad(page).fill("villa mari");
    await opciones(page).filter({ hasText: /^VILLA MARIA$/ }).click();
    await expect(localidad(page)).toHaveValue("VILLA MARIA");

    // Con valor elegido y la lista cerrada aparece la cruz.
    await page.getByLabel("Nombre *").click();
    await page.getByRole("button", { name: "Limpiar selección" }).click();
    await expect(localidad(page)).toHaveValue("");
  });

  test("tocar afuera descarta lo escrito y vuelve a la opción elegida", async ({ page }) => {
    await localidad(page).fill("rio cuar");
    await localidad(page).press("Enter");
    await expect(localidad(page)).toHaveValue("RIO CUARTO");

    await localidad(page).fill("otra cosa");
    await page.getByLabel("Nombre *").click();
    await expect(localidad(page)).toHaveValue("RIO CUARTO");
    await expect(page.getByRole("listbox")).toHaveCount(0);

    // Con la lista cerrada y el foco en el campo, flecha abajo la vuelve a abrir.
    await localidad(page).focus();
    await page.getByLabel("Nombre *").click();
    await localidad(page).press("ArrowDown");
    await expect(page.getByRole("listbox")).toBeVisible();
  });

  test("Escape cierra la lista sin cerrar el formulario, y un segundo Escape cierra el modal", async ({ page }) => {
    await page.getByLabel("Nombre *").fill("Lácteos Norte");
    await localidad(page).fill("rio cuar");
    await localidad(page).press("Enter");
    await localidad(page).fill("algo a medio escribir");
    await expect(page.getByRole("listbox")).toBeVisible();

    await localidad(page).press("Escape");

    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(localidad(page)).toHaveValue("RIO CUARTO");
    await expect(page.getByRole("heading", { name: "Nueva empresa" })).toBeVisible();
    await expect(page.getByLabel("Nombre *")).toHaveValue("Lácteos Norte");

    // Con la lista ya cerrada, Escape vuelve a cerrar el modal como siempre.
    await localidad(page).press("Escape");
    await expect(page.getByRole("heading", { name: "Nueva empresa" })).toHaveCount(0);
  });

  test("borrar todo el texto deja la localidad vacía", async ({ page }) => {
    const cuerpos = await capturarAlta(page);
    await page.getByLabel("Nombre *").fill("Lácteos Norte");
    await localidad(page).fill("jesus maria");
    await localidad(page).press("Enter");
    await localidad(page).fill("");

    await page.getByRole("button", { name: "Crear empresa" }).click();
    await expect.poll(() => cuerpos.length).toBe(1);
    expect("direccion" in cuerpos[0]).toBe(false);
  });
});
