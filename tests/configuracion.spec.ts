import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import { loginAsGerente, loginAsResponsableCalidad, quitarPermisos } from "./fixtures/mockAuth.ts";

// ---------------------------------------------------------------------------
// Datos de prueba
// ---------------------------------------------------------------------------

const PH_CONFIG_LECHE = {
  id: 1,
  empresaId: 10,
  parametro: "ph",
  tipoMateriaPrima: "leche_cruda",
  umbralAlertaMin: 5.5,
  umbralMin: 6.0,
  umbralMax: 7.5,
  umbralAlertaMax: 8.0,
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
    const pHCardDe = (page: Page) => page.locator("xpath=//h3[normalize-space()='pH']/..");

    // HU-40: los 4 umbrales en el orden de la cadena del backend.
    async function completarUmbrales(
      page: Page,
      valores: { alertaMin: string; min: string; max: string; alertaMax: string },
    ) {
      const card = pHCardDe(page);
      await card.getByLabel("Alerta mín", { exact: true }).fill(valores.alertaMin);
      await card.getByLabel("Mín", { exact: true }).fill(valores.min);
      await card.getByLabel("Máx", { exact: true }).fill(valores.max);
      await card.getByLabel("Alerta máx", { exact: true }).fill(valores.alertaMax);
      await card.getByLabel("Alerta máx", { exact: true }).blur();
    }

    async function guardarYConfirmar(page: Page) {
      await pHCardDe(page).getByRole("button", { name: "Guardar" }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Guardar" }).click();
    }

    async function abrirConConfigGuardada(page: Page) {
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
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Umbrales de calidad" }).click();
      await expect(page.getByText("7 parámetros por tipo de materia prima")).toBeVisible();
    }

    test.beforeEach(async ({ page }) => {
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Umbrales de calidad" }).click();
      await expect(page.getByText("7 parámetros por tipo de materia prima")).toBeVisible();
    });

    test("muestra los 4 umbrales guardados y las zonas del semáforo", async ({ page }) => {
      await abrirConConfigGuardada(page);

      const pHCard = pHCardDe(page);
      await expect(pHCard.getByLabel("Alerta mín", { exact: true })).toHaveValue("5.5");
      await expect(pHCard.getByLabel("Mín", { exact: true })).toHaveValue("6");
      await expect(pHCard.getByLabel("Máx", { exact: true })).toHaveValue("7.5");
      await expect(pHCard.getByLabel("Alerta máx", { exact: true })).toHaveValue("8");

      await expect(pHCard.getByText("Normal: 6 a 7.5")).toBeVisible();
      await expect(pHCard.getByText("En límite: 5.5 a 6 · 7.5 a 8")).toBeVisible();
      await expect(pHCard.getByText("Fuera de rango: < 5.5 · > 8")).toBeVisible();
      // Sin cambios no hay nada para guardar.
      await expect(pHCard.getByRole("button", { name: "Guardar" })).toBeDisabled();
    });

    test("muestra error al ingresar un valor fuera del rango físico del parámetro", async ({ page }) => {
      // pH negativo: fuera del rango físico 0–14
      await completarUmbrales(page, { alertaMin: "-1", min: "6", max: "7", alertaMax: "8" });

      await expect(pHCardDe(page).getByText("Debe estar entre 0 y 14")).toBeVisible();
    });

    test("muestra error cuando el umbral mínimo es mayor o igual al máximo", async ({ page }) => {
      await completarUmbrales(page, { alertaMin: "5", min: "8", max: "6", alertaMax: "9" });

      await expect(pHCardDe(page).getByText("Debe ser mayor al mínimo")).toBeVisible();
    });

    test("muestra error en las bandas de alerta que invaden el rango normal", async ({ page }) => {
      await completarUmbrales(page, { alertaMin: "6.5", min: "6", max: "7.5", alertaMax: "7" });

      const pHCard = pHCardDe(page);
      await expect(pHCard.getByText("Debe ser menor o igual al mínimo")).toBeVisible();
      await expect(pHCard.getByText("Debe ser mayor o igual al máximo")).toBeVisible();
    });

    test("con errores de validación no abre el aviso ni envía nada", async ({ page }) => {
      let posted = false;
      await page.route("**/config-parametros*", async (route) => {
        if (route.request().method() === "POST") posted = true;
        return route.fallback();
      });

      await completarUmbrales(page, { alertaMin: "5", min: "8", max: "6", alertaMax: "9" });
      await pHCardDe(page).getByRole("button", { name: "Guardar" }).click();

      await expect(page.getByRole("alertdialog")).not.toBeVisible();
      expect(posted).toBe(false);
    });

    test("crea la config con los 4 umbrales tras confirmar el aviso (POST)", async ({ page }) => {
      let postBody: unknown;
      await page.route("**/config-parametros*", async (route) => {
        const rt = route.request().resourceType();
        if (rt !== "fetch" && rt !== "xhr") return route.continue();
        if (route.request().method() !== "POST") return route.continue();
        postBody = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ ...PH_CONFIG_LECHE, id: 99 }),
        });
      });

      await completarUmbrales(page, { alertaMin: "5.5", min: "6", max: "7.5", alertaMax: "8" });
      await pHCardDe(page).getByRole("button", { name: "Guardar" }).click();

      const aviso = page.getByRole("alertdialog");
      await expect(aviso.getByText("afecta el semáforo de todos los lotes de leche cruda")).toBeVisible();
      await aviso.getByRole("button", { name: "Guardar" }).click();

      await expect(aviso).not.toBeVisible();
      expect(postBody).toEqual({
        parametro: "ph",
        tipoMateriaPrima: "leche_cruda",
        umbralAlertaMin: 5.5,
        umbralMin: 6,
        umbralMax: 7.5,
        umbralAlertaMax: 8,
      });
      await expect(
        pHCardDe(page).getByText("No se pudo guardar. Intentá nuevamente."),
      ).not.toBeVisible();
    });

    test("cancelar el aviso no envía nada", async ({ page }) => {
      let posted = false;
      await page.route("**/config-parametros*", async (route) => {
        if (route.request().method() === "POST") posted = true;
        return route.fallback();
      });

      await completarUmbrales(page, { alertaMin: "5.5", min: "6", max: "7.5", alertaMax: "8" });
      await pHCardDe(page).getByRole("button", { name: "Guardar" }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Cancelar" }).click();

      await expect(page.getByRole("alertdialog")).not.toBeVisible();
      expect(posted).toBe(false);
    });

    test("edita una config existente mandando los 4 umbrales (PUT)", async ({ page }) => {
      // A diferencia del test de creación, acá YA existe una config guardada
      // (con id) para pH/leche_cruda: saveConfig() toma la rama update()
      // (PUT), no create() (POST) — ver useConfigParametros.saveConfig.
      await abrirConConfigGuardada(page);

      let putBody: unknown;
      await page.route("**/config-parametros/1", async (route) => {
        const rt = route.request().resourceType();
        if (rt !== "fetch" && rt !== "xhr") return route.continue();
        if (route.request().method() !== "PUT") return route.continue();
        putBody = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...PH_CONFIG_LECHE, umbralAlertaMax: 8.5 }),
        });
      });

      const pHCard = pHCardDe(page);
      await pHCard.getByLabel("Alerta máx", { exact: true }).fill("8.5");
      await guardarYConfirmar(page);

      await expect(page.getByRole("alertdialog")).not.toBeVisible();
      expect(putBody).toEqual({
        umbralAlertaMin: 5.5,
        umbralMin: 6,
        umbralMax: 7.5,
        umbralAlertaMax: 8.5,
      });
      await expect(pHCard.getByLabel("Alerta máx", { exact: true })).toHaveValue("8.5");
    });

    test("los umbrales de distintos tipos de materia prima son independientes", async ({ page }) => {
      // Solo hay config para leche cruda
      await abrirConConfigGuardada(page);

      const pHCard = pHCardDe(page);
      // Leche cruda: inputs con valores guardados
      await expect(pHCard.getByLabel("Mín", { exact: true })).toHaveValue("6");
      await expect(pHCard.getByLabel("Alerta máx", { exact: true })).toHaveValue("8");

      // Cambiar a Crema de leche: inputs vacíos (sin config para ese tipo)
      await page.getByRole("button", { name: "Crema de leche" }).click();
      for (const label of ["Alerta mín", "Mín", "Máx", "Alerta máx"]) {
        await expect(pHCard.getByLabel(label, { exact: true })).toHaveValue("");
      }
    });

    test("muestra error del servidor al fallar el guardado", async ({ page }) => {
      await page.route("**/config-parametros*", async (route) => {
        const rt = route.request().resourceType();
        if (rt !== "fetch" && rt !== "xhr") return route.continue();
        if (route.request().method() !== "POST") return route.continue();
        await route.fulfill({ status: 500, body: "" });
      });

      await completarUmbrales(page, { alertaMin: "5.5", min: "6", max: "7.5", alertaMax: "8" });
      await guardarYConfirmar(page);

      await expect(
        pHCardDe(page).getByText("No se pudo guardar. Intentá nuevamente."),
      ).toBeVisible();
    });

    test("muestra los mensajes del backend cuando el guardado falla con 400", async ({ page }) => {
      await page.route("**/config-parametros*", async (route) => {
        const rt = route.request().resourceType();
        if (rt !== "fetch" && rt !== "xhr") return route.continue();
        if (route.request().method() !== "POST") return route.continue();
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          // Mismo formato que ConfigParametroService.validarUmbrales: string[].
          body: JSON.stringify({
            statusCode: 400,
            error: "Bad Request",
            message: [
              "umbralAlertaMin debe ser <= umbralMin y umbralAlertaMax debe ser >= umbralMax",
            ],
          }),
        });
      });

      await completarUmbrales(page, { alertaMin: "5.5", min: "6", max: "7.5", alertaMax: "8" });
      await guardarYConfirmar(page);

      // Con response.data.message presente, configParametroService.
      // extraerMensajeError() devuelve el mensaje real en vez del fallback.
      await expect(
        pHCardDe(page).getByText(
          "umbralAlertaMin debe ser <= umbralMin y umbralAlertaMax debe ser >= umbralMax",
        ),
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

  test.describe("LogoIdentidadTab", () => {
    test.beforeEach(async ({ page }) => {
      await page.waitForLoadState("networkidle");
      // timeout extendido por si networkidle resuelve antes de que
      // EmpresaContext complete el fetch y el useEffect pueble el input
      await expect(page.locator("#configuracion-empresa-nombre")).toHaveValue("Lácteos del Sur S.A.", { timeout: 10000 });
    });

    test("rechaza un archivo con formato no permitido", async ({ page }) => {
      await page.locator('input[type="file"]').setInputFiles({
        name: "logo.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("fake pdf content"),
      });
      await expect(page.getByText("El logo debe ser formato PNG o JPG.")).toBeVisible();
    });

    test("rechaza un archivo que supera los 2 MB", async ({ page }) => {
      await page.locator('input[type="file"]').setInputFiles({
        name: "big-logo.png",
        mimeType: "image/png",
        buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
      });
      await expect(page.getByText("El logo no puede superar los 2MB.")).toBeVisible();
    });

        test("rechaza guardar identidad con nombre vacío", async ({ page }) => {
      await page.locator("#configuracion-empresa-nombre").fill("");
      await page.getByRole("button", { name: "Guardar identidad" }).click();
      await expect(page.getByText("El nombre es obligatorio")).toBeVisible();
    });

    test("guarda el nombre de la empresa y muestra mensaje de éxito", async ({ page }) => {
      await page.locator("#configuracion-empresa-nombre").fill("Nuevo Nombre S.A.");
      await page.getByRole("button", { name: "Guardar identidad" }).click();
      await expect(page.getByText("Los cambios se guardaron correctamente.")).toBeVisible();
    });

        test("muestra el preview al seleccionar un logo válido y guarda con éxito", async ({ page }) => {
      await page.locator('input[type="file"]').setInputFiles({
        name: "logo.png",
        mimeType: "image/png",
        buffer: Buffer.from("fake png content"),
      });
      
      await expect(page.getByAltText("Logo de la empresa")).toBeVisible();

      await page.getByRole("button", { name: "Guardar identidad" }).click();
      await expect(page.getByText("Los cambios se guardaron correctamente.")).toBeVisible();
    });

    test("muestra error del servidor al fallar la subida del logo", async ({ page }) => {
      await page.route("**/empresa/me/logo*", async (route) => {
        const rt = route.request().resourceType();
        if (rt !== "fetch" && rt !== "xhr") return route.continue();
        if (route.request().method() !== "POST") return route.continue();
        await route.fulfill({ status: 500, body: "" });
      });

      await page.locator('input[type="file"]').setInputFiles({
        name: "logo.png",
        mimeType: "image/png",
        buffer: Buffer.from("fake png content"),
      });
      await page.getByRole("button", { name: "Guardar identidad" }).click();
      await expect(
        page.getByText("No se pudo subir el logo. Intentá nuevamente."),
      ).toBeVisible();
    });

      test("elimina el logo guardado y vuelve al estado por defecto", async ({ page }) => {
      const EMPRESA_CON_LOGO = {
        id: 10, name: "Lácteos del Sur S.A.", rut: "30-12345678-9", planId: 1, isActive: true,
        // data URI evita la request HTTP externa al cargar el preview
        logoUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII=",
      };

      await page.unroute("**/empresa/me");
      let logoEliminado = false;
      await page.route("**/empresa/me", async (route) => {
        const rt = route.request().resourceType();
        if (rt !== "fetch" && rt !== "xhr") return route.continue();
        if (route.request().method() !== "GET") return route.continue();
        await route.fulfill({
          status: 200, contentType: "application/json",
          body: JSON.stringify(
            logoEliminado
              ? { id: 10, name: "Lácteos del Sur S.A.", rut: "30-12345678-9", planId: 1, isActive: true }
              : EMPRESA_CON_LOGO
          ),
        });
      });

      await page.goto("/configuracion");
      await page.waitForLoadState("networkidle");

      await expect(page.getByRole("button", { name: "Quitar logo" })).toBeVisible();
      await expect(page.getByAltText("Logo de la empresa")).toBeVisible();

      logoEliminado = true; // el refetch tras DELETE devuelve empresa sin logo
      await page.getByRole("button", { name: "Quitar logo" }).click();

      await expect(page.getByRole("button", { name: "Quitar logo" })).not.toBeVisible();
      await expect(page.getByAltText("Logo de la empresa")).not.toBeVisible();
    });

    test("muestra error del servidor al fallar el guardado del nombre", async ({ page }) => {
      await page.route("**/empresa/me/identidad*", async (route) => {
        const rt = route.request().resourceType();
        if (rt !== "fetch" && rt !== "xhr") return route.continue();
        if (route.request().method() !== "PATCH") return route.continue();
        await route.fulfill({ status: 500, body: "" });
      });

      await page.locator("#configuracion-empresa-nombre").fill("Nuevo Nombre S.A.");
      await page.getByRole("button", { name: "Guardar identidad" }).click();
      await expect(page.getByText("No se pudo guardar el nombre. Intentá nuevamente.")).toBeVisible();
    });

    test("muestra error del servidor al eliminar el logo", async ({ page }) => {
      const EMPRESA_CON_LOGO = {
        id: 10, name: "Lácteos del Sur S.A.", rut: "30-12345678-9", planId: 1, isActive: true,
        logoUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII=",
      };

      await page.unroute("**/empresa/me");
      await page.route("**/empresa/me", async (route) => {
        const rt = route.request().resourceType();
        if (rt !== "fetch" && rt !== "xhr") return route.continue();
        if (route.request().method() !== "GET") return route.continue();
        await route.fulfill({
          status: 200, contentType: "application/json",
          body: JSON.stringify(EMPRESA_CON_LOGO),
        });
      });

      await page.route("**/empresa/me/logo*", async (route) => {
        const rt = route.request().resourceType();
        if (rt !== "fetch" && rt !== "xhr") return route.continue();
        if (route.request().method() !== "DELETE") return route.continue();
        await route.fulfill({ status: 500, body: "" });
      });

      await page.goto("/configuracion");
      await page.waitForLoadState("networkidle");

      await expect(page.getByRole("button", { name: "Quitar logo" })).toBeVisible();
      await page.getByRole("button", { name: "Quitar logo" }).click();

      await expect(page.getByText("No se pudo eliminar el logo. Intentá nuevamente.")).toBeVisible();
    });
  });

  test.describe("HorariosSilencioConfigTab", () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() =>
      localStorage.removeItem("optilacteo:horarios-silencio"),
    );
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Horarios de silencio" }).click();
  });

  test("muestra estado vacío cuando no hay horarios configurados", async ({ page }) => {
    await expect(
      page.getByText("Todavía no hay horarios de silencio configurados."),
    ).toBeVisible();
    await expect(page.getByText("0 de 0 activos")).toBeVisible();
  });

  test("crear un horario nuevo lo agrega a la lista", async ({ page }) => {
    await page.getByRole("button", { name: "+ Nuevo horario de silencio" }).click();
    await page.getByRole("dialog").waitFor({ state: "visible" });
    await page.locator("#horario-silencio-nombre").fill("Turno mañana");
    await page.locator("#horario-silencio-inicio").fill("08:00");
    await page.locator("#horario-silencio-fin").fill("12:00");
    await page.getByTitle("lun").click();
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByText("Turno mañana")).toBeVisible();
    await expect(page.getByText("08:00 - 12:00")).toBeVisible();
    await expect(page.getByText("1 de 1 activos")).toBeVisible();
  });

    test("validación: muestra errores si se guarda sin completar el formulario", async ({ page }) => {
    await page.getByRole("button", { name: "+ Nuevo horario de silencio" }).click();
    await page.getByRole("dialog").waitFor({ state: "visible" });
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("El nombre es obligatorio.")).toBeVisible();
    await expect(page.getByText("Elegí hora de inicio y de fin.")).toBeVisible();
    await expect(page.getByText("Elegí al menos un día.")).toBeVisible();
  });

    test("toggle activo/inactivo cambia el badge del horario", async ({ page }) => {
    await page.evaluate(() =>
      localStorage.setItem(
        "optilacteo:horarios-silencio",
        JSON.stringify([{
          id: "1", nombre: "Turno noche", horaInicio: "22:00", horaFin: "06:00",
          dias: ["lun"], activo: true, creadoEn: "2026-09-16T00:00:00.000Z",
        }]),
      ),
    );
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Horarios de silencio" }).click();
    await expect(page.getByText("Activo", { exact: true })).toBeVisible();
    await page.getByRole("switch").click();
    await expect(page.getByText("Inactivo", { exact: true })).toBeVisible();
    await expect(page.getByText("0 de 1 activos")).toBeVisible();
  });

    test("editar un horario actualiza sus datos en la lista", async ({ page }) => {
    await page.evaluate(() =>
      localStorage.setItem(
        "optilacteo:horarios-silencio",
        JSON.stringify([{
          id: "1", nombre: "Turno mañana", horaInicio: "08:00", horaFin: "12:00",
          dias: ["lun"], activo: true, creadoEn: "2026-09-16T00:00:00.000Z",
        }]),
      ),
    );
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Horarios de silencio" }).click();
    await page.getByTitle("Editar").click();
    await page.getByRole("dialog").waitFor({ state: "visible" });
    await expect(page.locator("#horario-silencio-nombre")).toHaveValue("Turno mañana");
    await page.locator("#horario-silencio-nombre").fill("Turno tarde");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByText("Turno tarde")).toBeVisible();
    await expect(page.getByText("Turno mañana")).not.toBeVisible();
  });

    test("eliminar un horario lo quita de la lista tras confirmar", async ({ page }) => {
    await page.evaluate(() =>
      localStorage.setItem(
        "optilacteo:horarios-silencio",
        JSON.stringify([{
          id: "1", nombre: "Turno noche", horaInicio: "22:00", horaFin: "06:00",
          dias: ["lun"], activo: true, creadoEn: "2026-09-16T00:00:00.000Z",
        }]),
      ),
    );
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Horarios de silencio" }).click();
    await expect(page.getByText("Turno noche")).toBeVisible();
    await page.getByTitle("Eliminar").click();
    await page.getByRole("alertdialog").waitFor({ state: "visible" });
    await expect(page.getByText("Eliminar horario de silencio")).toBeVisible();
    await page.getByRole("alertdialog").getByRole("button", { name: "Eliminar" }).click();
    await expect(page.getByText("Turno noche")).not.toBeVisible();
    await expect(
      page.getByText("Todavía no hay horarios de silencio configurados."),
    ).toBeVisible();
  });
});

test.describe("DestinosProductivosConfigTab", () => {
  const DESTINOS_MOCK = [
    { id: 1, nombre: "Queso", activo: true },
    { id: 2, nombre: "Yogur", activo: true },
    { id: 3, nombre: "Crema", activo: false },
  ];

  test.beforeEach(async ({ page }) => {
    await page.route("**/destinos-productivos*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(DESTINOS_MOCK),
      });
    });
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Destinos productivos" }).click();
    await page.waitForLoadState("networkidle");
  });

  test("muestra el catálogo de destinos productivos cargado desde la API", async ({ page }) => {
    await expect(page.getByText("Queso")).toBeVisible();
    await expect(page.getByText("Yogur")).toBeVisible();
    await expect(page.getByText("Crema")).toBeVisible();
    await expect(page.getByText("Activo").first()).toBeVisible();
  });

  test("agregar un destino nuevo lo muestra en la lista con etiqueta local", async ({ page }) => {
    await page.locator("#nuevo-destino-productivo").fill("Ricota");
    await page.getByRole("button", { name: "+ Agregar destino" }).click();
    await expect(page.getByText("Ricota")).toBeVisible();
    await expect(page.getByText("(agregado localmente)")).toBeVisible();
  });

  test("desactivar un destino cambia su badge a Inactivo", async ({ page }) => {
  const filaQueso = page.locator("tr").filter({ hasText: "Queso" });
  await filaQueso.getByRole("button", { name: "Desactivar" }).click();

  await expect(filaQueso.getByText("Inactivo")).toBeVisible();
  await expect(filaQueso.getByRole("button", { name: "Reactivar" })).toBeVisible();
  });

  test("editar nombre inline actualiza el destino en la lista", async ({ page }) => {
  const filaQueso = page.locator("tr").filter({ hasText: "Queso" });
  await filaQueso.getByRole("button", { name: "Editar nombre" }).click();

  // Después del click, "Queso" deja de ser texto DOM (pasa a value del input),
  // así que hasText ya no matchea. Usar la fila que muestra "Guardar" en su lugar.
  const filaEditando = page.locator("tr").filter({ hasText: "Guardar" });
  const inputInline = filaEditando.locator("input");
  await inputInline.clear();
  await inputInline.fill("Queso artesanal");
  await inputInline.press("Enter");

  await expect(page.getByText("Queso artesanal")).toBeVisible();
  await expect(page.getByText("Queso", { exact: true })).not.toBeVisible();
});
});

});

test("ConfiguracionPage - un Responsable de calidad ve los inputs de Comparación histórica deshabilitados", async ({ page }) => {
  await mockConfiguracionDeps(page);
  await loginAsResponsableCalidad(page);
  await page.goto("/configuracion");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Comparación histórica" }).click();

  await expect(page.locator("#comparacion-historica-desvio")).toHaveValue("10");
  await expect(page.locator("#comparacion-historica-desvio")).toBeDisabled();
  await expect(page.locator("#comparacion-historica-cantidad")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Guardar" })).not.toBeAttached();
});

// HU-72: con la matriz por defecto Calidad tiene configuracion_empresa:ver,
// así que ve Umbrales (en solo lectura); sin el módulo no la ve.
test("ConfiguracionPage - un Responsable de calidad sin configuracion_empresa no ve la pestaña de Umbrales de calidad", async ({ page }) => {
  await mockConfiguracionDeps(page);
  await loginAsResponsableCalidad(page);
  await quitarPermisos(page, "Responsable de calidad", ["configuracion_empresa"]);
  await page.goto("/configuracion");
  await page.waitForLoadState("networkidle");

  await expect(
    page.getByRole("button", { name: "Umbrales de calidad" }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Comparación histórica" }),
  ).not.toBeVisible();
});
