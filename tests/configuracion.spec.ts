import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import { loginAsGerente, loginAsResponsableCalidad } from "./fixtures/mockAuth.ts";

// ---------------------------------------------------------------------------
// Datos de prueba
// ---------------------------------------------------------------------------

const PH_CONFIG_LECHE = {
  id: 1,
  empresaId: 10,
  parametro: "ph",
  tipoMateriaPrima: "leche_cruda",
  umbralMin: 6.0,
  umbralMax: 7.5,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

const COMPARACION_HISTORICA_CONFIG = {
  desvioSignificativoPorcentaje: 10,
  cantidadRegistrosHistoricos: 5,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function mockConfiguracionDeps(page: Page) {
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

  // Estabiliza EmpresaContext — sin este mock la página hace un re-render
  // justo cuando Playwright intenta clickear los tabs, desconectando el elemento del DOM.
  await page.route("**/empresa/me", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: 10, name: "Lácteos del Sur S.A.",
        rut: "30-12345678-9", planId: 1, isActive: true,
      }),
    });
  });

  // Genérico para umbrales (GET /config-parametros → [])
  await page.route("**/config-parametros*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  
  await page.route("**/config-parametros/comparacion-historica*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(COMPARACION_HISTORICA_CONFIG),
    });
  });
}

// ---------------------------------------------------------------------------
// ConfiguracionPage
// ---------------------------------------------------------------------------

test.describe("ConfiguracionPage", () => {
  test.beforeEach(async ({ page }) => {
    await mockConfiguracionDeps(page);
    await loginAsGerente(page);
    await page.goto("/configuracion");
  });

  test.describe("UmbralesCalidadTab", () => {
    test.beforeEach(async ({ page }) => {
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Umbrales de calidad" }).click();
      await expect(page.getByText("7 parámetros por tipo de materia prima")).toBeVisible();
    });

    test("muestra los umbrales guardados de la empresa en los inputs", async ({ page }) => {
      // LIFO: devuelve una config guardada para pH leche cruda
      await page.route("**/config-parametros*", async (route) => {
        const rt = route.request().resourceType();
        if (rt !== "fetch" && rt !== "xhr") return route.continue();
        if (route.request().method() !== "GET") return route.continue();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([PH_CONFIG_LECHE]),
        });
      });
      await page.goto("/configuracion");
      await page.getByRole("button", { name: "Umbrales de calidad" }).click();
      await expect(page.getByText("7 parámetros por tipo de materia prima")).toBeVisible();

      const pHCard = page.locator("xpath=//h3[normalize-space()='pH']/..");
      await expect(pHCard.locator("input").nth(0)).toHaveValue("6");
      await expect(pHCard.locator("input").nth(1)).toHaveValue("7.5");
    });

    test("muestra error al ingresar un valor fuera del rango físico del parámetro", async ({ page }) => {
      const pHCard = page.locator("xpath=//h3[normalize-space()='pH']/..");
      await pHCard.locator("input").nth(0).fill("-1"); // pH negativo: fuera del rango físico 0–14
      await pHCard.locator("input").nth(1).fill("7");
      await pHCard.locator("input").nth(1).blur();

      await expect(
        pHCard.getByText("Los valores deben estar entre 0 y 14"),
      ).toBeVisible();
    });

    test("muestra error cuando el umbral mínimo es mayor o igual al máximo", async ({ page }) => {
      const pHCard = page.locator("xpath=//h3[normalize-space()='pH']/..");
      await pHCard.locator("input").nth(0).fill("8");
      await pHCard.locator("input").nth(1).fill("6");
      await pHCard.locator("input").nth(1).blur();

      await expect(
        pHCard.getByText("El mínimo debe ser menor al máximo"),
      ).toBeVisible();
    });

    test("guarda los umbrales válidos al completar los campos y salir del input", async ({ page }) => {
      await page.route("**/config-parametros*", async (route) => {
        const rt = route.request().resourceType();
        if (rt !== "fetch" && rt !== "xhr") return route.continue();
        if (route.request().method() !== "POST") return route.continue();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: 99, empresaId: 10, parametro: "ph", tipoMateriaPrima: "leche_cruda",
            umbralMin: 6.0, umbralMax: 7.5,
            createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z",
          }),
        });
      });

      const pHCard = page.locator("xpath=//h3[normalize-space()='pH']/..");
      await pHCard.locator("input").nth(0).fill("6");
      await pHCard.locator("input").nth(1).fill("7.5");

      // Verifica que el backend fue llamado al salir del campo
      const savePromise = page.waitForRequest(
        (req) => req.url().includes("/config-parametros") && req.method() === "POST",
      );
      await pHCard.locator("input").nth(1).blur();
      await savePromise;

      await expect(
        pHCard.getByText("No se pudo guardar. Intentá nuevamente."),
      ).not.toBeVisible();
    });

    test("los umbrales de distintos tipos de materia prima son independientes", async ({ page }) => {
      // LIFO: solo hay config para leche cruda
      await page.route("**/config-parametros*", async (route) => {
        const rt = route.request().resourceType();
        if (rt !== "fetch" && rt !== "xhr") return route.continue();
        if (route.request().method() !== "GET") return route.continue();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([PH_CONFIG_LECHE]),
        });
      });
      await page.goto("/configuracion");
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Umbrales de calidad" }).click();
      await expect(page.getByText("7 parámetros por tipo de materia prima")).toBeVisible();

      const pHCard = page.locator("xpath=//h3[normalize-space()='pH']/..");
      // Leche cruda: inputs con valores guardados
      await expect(pHCard.locator("input").nth(0)).toHaveValue("6");
      await expect(pHCard.locator("input").nth(1)).toHaveValue("7.5");

      // Cambiar a Crema de leche: inputs vacíos (sin config para ese tipo)
      await page.getByRole("button", { name: "Crema de leche" }).click();
      await expect(pHCard.locator("input").nth(0)).toHaveValue("");
      await expect(pHCard.locator("input").nth(1)).toHaveValue("");
    });

    test("muestra error del servidor al fallar el guardado", async ({ page }) => {
      await page.route("**/config-parametros*", async (route) => {
        const rt = route.request().resourceType();
        if (rt !== "fetch" && rt !== "xhr") return route.continue();
        if (route.request().method() !== "POST") return route.continue();
        await route.fulfill({ status: 500, body: "" });
      });

      const pHCard = page.locator("xpath=//h3[normalize-space()='pH']/..");
      await pHCard.locator("input").nth(0).fill("6");
      await pHCard.locator("input").nth(1).fill("7.5");
      await pHCard.locator("input").nth(1).blur();

      await expect(
        pHCard.getByText("No se pudo guardar. Intentá nuevamente."),
      ).toBeVisible();
    });
  });

    test.describe("ComparacionHistoricaConfigTab", () => {
    test.beforeEach(async ({ page }) => {
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Comparación histórica" }).click();
      // Espera a que el hook cargue y el useEffect rellene los inputs
      await expect(page.locator("#comparacion-historica-desvio")).toHaveValue("10");
    });

    test("muestra los valores de configuración actuales en los inputs", async ({ page }) => {
      await expect(page.locator("#comparacion-historica-desvio")).toHaveValue("10");
      await expect(page.locator("#comparacion-historica-cantidad")).toHaveValue("5");
    });

    test("muestra error al ingresar un desvío mayor a 100", async ({ page }) => {
      await page.locator("#comparacion-historica-desvio").fill("150");
      await page.getByRole("button", { name: "Guardar" }).click();
      await expect(page.getByText("Debe estar entre 0 y 100")).toBeVisible();
    });

    test("muestra error al ingresar una cantidad de registros menor a 1", async ({ page }) => {
      await page.locator("#comparacion-historica-cantidad").fill("0");
      await page.getByRole("button", { name: "Guardar" }).click();
      await expect(page.getByText("Debe ser al menos 1")).toBeVisible();
    });

    test("guarda la configuración y muestra mensaje de éxito", async ({ page }) => {
      await page.route("**/config-parametros/comparacion-historica*", async (route) => {
        const rt = route.request().resourceType();
        if (rt !== "fetch" && rt !== "xhr") return route.continue();
        if (route.request().method() !== "PATCH") return route.continue();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ desvioSignificativoPorcentaje: 15, cantidadRegistrosHistoricos: 5 }),
        });
      });
      await page.locator("#comparacion-historica-desvio").fill("15");
      await page.getByRole("button", { name: "Guardar" }).click();
      await expect(page.getByText("La configuración se actualizó correctamente.")).toBeVisible();
    });

    test("muestra error del servidor al fallar el guardado", async ({ page }) => {
      await page.route("**/config-parametros/comparacion-historica*", async (route) => {
        const rt = route.request().resourceType();
        if (rt !== "fetch" && rt !== "xhr") return route.continue();
        if (route.request().method() !== "PATCH") return route.continue();
        await route.fulfill({ status: 500, body: "" });
      });
      await page.locator("#comparacion-historica-desvio").fill("15");
      await page.getByRole("button", { name: "Guardar" }).click();
      await expect(
        page.getByText("No se pudo guardar la configuración. Intentá nuevamente."),
      ).toBeVisible();
    });
  });
});

test("ConfiguracionPage - un Responsable de calidad ve los inputs de Comparación histórica deshabilitados", async ({ page }) => {
  await mockConfiguracionDeps(page);
  await loginAsResponsableCalidad(page);
  await page.goto("/configuracion");
  await page.waitForLoadState("networkidle");

  await expect(page.locator("#comparacion-historica-desvio")).toHaveValue("10");
  await expect(page.locator("#comparacion-historica-desvio")).toBeDisabled();
  await expect(page.locator("#comparacion-historica-cantidad")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Guardar" })).not.toBeAttached();
});

test("ConfiguracionPage - un Responsable de calidad no ve la pestaña de Umbrales de calidad", async ({ page }) => {
  await mockConfiguracionDeps(page);
  await loginAsResponsableCalidad(page);
  await page.goto("/configuracion");
  await page.waitForLoadState("networkidle");

  await expect(
    page.getByRole("button", { name: "Umbrales de calidad" }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Comparación histórica" }),
  ).toBeVisible();
});
