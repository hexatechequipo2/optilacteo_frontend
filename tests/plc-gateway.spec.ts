import { expect, test } from "./fixtures/coverageFixtures.js";
import type { Page } from "@playwright/test";
import {
  loginAsGerente,
  loginAsResponsableProduccion,
  loginAsResponsableCalidad,
  loginAsOperario,
} from "./fixtures/mockAuth.js";

// ---------------------------------------------------------------------------
// Mocks compartidos
// ---------------------------------------------------------------------------

async function mockPlcDeps(
  page: Page,
  configInicial: { url: string | null; requierePlc: boolean } = { url: null, requierePlc: true },
  onPut?: (dto: Record<string, unknown>) => { url: string | null; requierePlc: boolean },
) {
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

  // Estabiliza EmpresaContext (mismo criterio que configuracion.spec.ts)
  await page.route("**/empresa/me", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: 10,
        name: "Lácteos del Sur S.A.",
        rut: "30-12345678-9",
        planId: 1,
        isActive: true,
      }),
    });
  });

  await page.route("**/config-parametros*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  // "**/config-parametros*" no matchea "/config-parametros/comparacion-historica"
  // (el "*" no cruza el "/"): la tab de Comparación histórica (landing por
  // defecto de Responsable de calidad) necesita su propio mock.
  await page.route("**/config-parametros/comparacion-historica*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ desvioSignificativoPorcentaje: 10, cantidadRegistrosHistoricos: 5 }),
    });
  });

  // GET/PUT /plc-config en un único registro: registrar dos handlers
  // separados para el mismo patrón "**/plc-config" no encadena de forma
  // confiable en Playwright (el último registrado puede reemplazar al
  // anterior en vez de hacer fallback), así que ambos métodos se resuelven acá.
  await page.route("**/plc-config", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(configInicial),
      });
    }
    if (route.request().method() === "PUT" && onPut) {
      const dto = route.request().postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(onPut(dto)),
      });
    }
    return route.continue();
  });
}

async function irATabPlc(page: Page) {
  await page.getByRole("button", { name: "Conexión PLC/Gateway" }).click();
  await expect(page.getByLabel("URL del endpoint *")).toBeVisible();
}

test.describe("PlcGatewayConfigTab (HU-61)", () => {
  test("un Responsable de producción llega directo a la tab, sin configuración previa", async ({
    page,
  }) => {
    await mockPlcDeps(page);
    await loginAsResponsableProduccion(page);
    await page.goto("/configuracion");

    await expect(page.getByLabel("URL del endpoint *")).toBeVisible();
    await expect(page.getByText("Todavía no se guardó ninguna configuración de conexión.")).toBeVisible();
    await expect(
      page.getByText("Esta configuración aplica solo a Lácteos del Sur S.A. — no afecta a otras"),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  });

  test("un Gerente navega a la tab haciendo click y ve la conexión ya configurada", async ({ page }) => {
    await mockPlcDeps(page, { url: "https://plc.miempresa.local:8080", requierePlc: true });
    await loginAsGerente(page);
    await page.goto("/configuracion");

    await irATabPlc(page);
    await expect(page.getByLabel("URL del endpoint *")).toHaveValue("https://plc.miempresa.local:8080");
    await expect(
      page.getByText("Conexión configurada previamente — los cambios se aplican de inmediato, sin reiniciar el sistema."),
    ).toBeVisible();
  });

  test("valida el formato de la URL antes de poder probar la conexión", async ({ page }) => {
    await mockPlcDeps(page);
    await loginAsGerente(page);
    await page.goto("/configuracion");
    await irATabPlc(page);

    await page.getByLabel("URL del endpoint *").fill("no-es-una-url");
    await page.getByRole("button", { name: "Probar conexión" }).click();

    await expect(
      page.getByText("El formato de la URL no es válido (ej: https://plc.miempresa.local:8080)"),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  });

  test("exige protocolo http o https", async ({ page }) => {
    await mockPlcDeps(page);
    await loginAsGerente(page);
    await page.goto("/configuracion");
    await irATabPlc(page);

    await page.getByLabel("URL del endpoint *").fill("ftp://plc.miempresa.local:21");
    await page.getByRole("button", { name: "Probar conexión" }).click();

    await expect(page.getByText("La URL debe usar protocolo http:// o https://")).toBeVisible();
  });

  test("prueba la conexión con éxito y habilita Guardar cambios", async ({ page }) => {
    await mockPlcDeps(page);
    await page.route("**/plc-config/test-connection", async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "POST" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, mensaje: "Conexión establecida con el PLC." }),
      });
    });

    await loginAsGerente(page);
    await page.goto("/configuracion");
    await irATabPlc(page);

    await page.getByLabel("URL del endpoint *").fill("https://plc.miempresa.local:8080");
    await page.getByRole("button", { name: "Probar conexión" }).click();

    await expect(page.getByText("Conexión establecida con el PLC.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();
  });

  test("prueba la conexión y muestra error cuando el PLC no responde", async ({ page }) => {
    await mockPlcDeps(page);
    await page.route("**/plc-config/test-connection", async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "POST" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, mensaje: "Sin respuesta del PLC" }),
      });
    });

    await loginAsGerente(page);
    await page.goto("/configuracion");
    await irATabPlc(page);

    await page.getByLabel("URL del endpoint *").fill("https://plc.miempresa.local:8080");
    await page.getByRole("button", { name: "Probar conexión" }).click();

    await expect(page.getByText("Sin respuesta del PLC")).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  });

  test("muestra error del servidor si falla el test de conexión", async ({ page }) => {
    await mockPlcDeps(page);
    await page.route("**/plc-config/test-connection", async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "POST" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    await loginAsGerente(page);
    await page.goto("/configuracion");
    await irATabPlc(page);

    await page.getByLabel("URL del endpoint *").fill("https://plc.miempresa.local:8080");
    await page.getByRole("button", { name: "Probar conexión" }).click();

    await expect(page.getByText("No se pudo probar la conexión. Intentá nuevamente.")).toBeVisible();
  });

  test("editar la URL después de un test exitoso vuelve a deshabilitar Guardar cambios", async ({
    page,
  }) => {
    await mockPlcDeps(page);
    await page.route("**/plc-config/test-connection", async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "POST" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, mensaje: "Conexión exitosa" }),
      });
    });

    await loginAsGerente(page);
    await page.goto("/configuracion");
    await irATabPlc(page);

    await page.getByLabel("URL del endpoint *").fill("https://plc.miempresa.local:8080");
    await page.getByRole("button", { name: "Probar conexión" }).click();
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();

    await page.getByLabel("URL del endpoint *").fill("https://plc.miempresa.local:9090");
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
    await expect(page.getByText("Conexión exitosa")).not.toBeVisible();
  });

  test("guarda la configuración y muestra el mensaje de éxito, sin reiniciar el sistema", async ({
    page,
  }) => {
    let putBody: Record<string, unknown> | undefined;
    await mockPlcDeps(page, undefined, (dto) => {
      putBody = dto;
      return { url: dto.url as string, requierePlc: true };
    });
    await page.route("**/plc-config/test-connection", async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "POST" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, mensaje: "Conexión exitosa" }),
      });
    });

    await loginAsGerente(page);
    await page.goto("/configuracion");
    await irATabPlc(page);

    await page.getByLabel("URL del endpoint *").fill("https://plc.miempresa.local:8080");
    await page.getByRole("button", { name: "Probar conexión" }).click();
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();

    await page.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(
      page.getByText("La configuración de conexión PLC se guardó correctamente."),
    ).toBeVisible();
    await expect(page.getByText("sin necesidad de reiniciar el sistema.", { exact: false })).toBeVisible();
    await expect.poll(() => putBody).toEqual({ url: "https://plc.miempresa.local:8080" });
  });

  test("un Responsable de calidad no ve la tab Conexión PLC/Gateway", async ({ page }) => {
    await mockPlcDeps(page);
    await loginAsResponsableCalidad(page);
    await page.goto("/configuracion");

    await expect(page.getByRole("button", { name: "Conexión PLC/Gateway" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Comparación histórica" })).toBeVisible();
  });

  test("un Operario de línea no tiene acceso a Configuración", async ({ page }) => {
    await mockPlcDeps(page);
    await loginAsOperario(page);
    await page.goto("/configuracion");

    await expect(page.getByText("Acceso no autorizado")).toBeVisible();
  });
});
