import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import { loginAsOperario, loginAsResponsableProduccion } from "./fixtures/mockAuth.ts";

const LOTE_1 = {
  id: 1, codigo: "LOT-2026-001", materiaPrima: "leche_cruda",
  estado: "registrado", empresaId: 10,
  createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z",
};

const LOTE_2 = {
  id: 2, codigo: "LOT-2026-002", materiaPrima: "leche_cruda",
  estado: "en_proceso", empresaId: 10,
  createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z",
};

async function mockMedicionManualDeps(page: Page) {
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
      status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
    });
  });

  await page.route("**/sensores*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  // Lotes (glob genérico — registrado ANTES que la ruta de historial para que
  // el historial tenga mayor prioridad por LIFO)
  await page.route("**/lotes*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [LOTE_1], total: 1, page: 1, limit: 20 }),
    });
  });

  // Historial de mediciones (LIFO: mayor prioridad que **/lotes*)
  await page.route(/\/lotes\/\d+\/mediciones-manuales/, async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [], total: 0, limit: 20 }),
    });
  });
}

test.describe("MedicionManualPage", () => {
  test.beforeEach(async ({ page }) => {
    await mockMedicionManualDeps(page);
    await loginAsOperario(page);
    await page.goto("/mediciones-manuales");
  });

  test("muestra el selector con el lote activo disponible", async ({ page }) => {
    const selector = page.locator("select");
    await expect(selector).toBeVisible();
    await expect(selector.locator("option", { hasText: "LOT-2026-001" })).toBeAttached();
  });

  test("muestra estado vacío cuando no hay lotes elegibles", async ({ page }) => {
    await page.route("**/lotes*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ data: [], total: 0, page: 1, limit: 20 }),
      });
    });
    await page.reload();
    await expect(page.getByText("No hay lotes pendientes de medición manual")).toBeVisible();
  });

  test("solo incluye lotes sin sensor asociado en el selector", async ({ page }) => {
    await page.route("**/lotes*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ data: [LOTE_1, LOTE_2], total: 2, page: 1, limit: 20 }),
      });
    });
    await page.route("**/sensores*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify([
          {
            id: 1, nombre: "Sensor pH", tipo: "analogico", parametro: "ph",
            ubicacion: "laboratorio", rangoMinFavor: 6.0, rangoMaxFavor: 7.5,
            estado: "activo", empresaId: 10, loteActualId: 2,
            createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z",
          },
        ]),
      });
    });
    await page.reload();
    const selector = page.locator("select");
    await expect(selector.locator("option")).toHaveCount(1);
    await expect(selector.locator("option", { hasText: "LOT-2026-001" })).toBeAttached();
  });

    test.describe("RegistrarMedicionManualTab", () => {
    test.beforeEach(async ({ page }) => {
      // Espera a que el lote se auto-seleccione y el tab renderice los campos
      await expect(page.locator("#medicion-manual-ph")).toBeVisible();
    });

    test("muestra los campos de parámetros medidos", async ({ page }) => {
      await expect(page.locator("#medicion-manual-ph")).toBeVisible();
      await expect(page.locator("#medicion-manual-temperatura")).toBeVisible();
    });

    test("muestra error al enviar sin completar ningún campo", async ({ page }) => {
      await page.locator('button[type="submit"]').click();
      await expect(page.getByText("Cargá al menos un parámetro.")).toBeVisible();
    });

    test("muestra error cuando un valor no es numérico", async ({ page }) => {
      await page.locator("#medicion-manual-ph").fill("abc");
      await page.locator('button[type="submit"]').click();
      await expect(page.getByText("Debe ser numérico")).toBeVisible();
    });

    test("registra la medición correctamente y muestra el resultado", async ({ page }) => {
      await page.route(/\/lotes\/\d+\/mediciones-manuales/, async (route) => {
        const rt = route.request().resourceType();
        if (rt !== "fetch" && rt !== "xhr") return route.continue();
        if (route.request().method() !== "POST") return route.continue();
        await route.fulfill({
          status: 201, contentType: "application/json",
          body: JSON.stringify({
            id: 1, loteId: 1, userId: 5,
            mediciones: [
              { id: 1, parametro: "ph", valor: 7.0, estado: "NORMAL",
                createdAt: "2026-08-01T10:00:00.000Z" },
            ],
          }),
        });
      });
      await page.locator("#medicion-manual-ph").fill("7");
      await page.locator('button[type="submit"]').click();
      await expect(page.getByText("MEDICIÓN REGISTRADA")).toBeVisible();
      await expect(page.getByText(/pH: 7/)).toBeVisible();
      await expect(page.getByText("Normal")).toBeVisible();
    });

    test("acepta un valor numérico y muestra el resultado como fuera de rango según el backend", async ({ page }) => {
      await page.route(/\/lotes\/\d+\/mediciones-manuales/, async (route) => {
        const rt = route.request().resourceType();
        if (rt !== "fetch" && rt !== "xhr") return route.continue();
        if (route.request().method() !== "POST") return route.continue();
        await route.fulfill({
          status: 201, contentType: "application/json",
          body: JSON.stringify({
            id: 1, loteId: 1, userId: 5,
            mediciones: [
              { id: 1, parametro: "ph", valor: 12.0, estado: "FUERA_DE_RANGO",
                createdAt: "2026-08-01T10:00:00.000Z" },
            ],
          }),
        });
      });
      await page.locator("#medicion-manual-ph").fill("12");
      await page.locator('button[type="submit"]').click();
      await expect(page.getByText("MEDICIÓN REGISTRADA")).toBeVisible();
      await expect(page.getByText("Fuera de rango")).toBeVisible();
    });

    test("muestra error del servidor al fallar el registro", async ({ page }) => {
      await page.route(/\/lotes\/\d+\/mediciones-manuales/, async (route) => {
        const rt = route.request().resourceType();
        if (rt !== "fetch" && rt !== "xhr") return route.continue();
        if (route.request().method() !== "POST") return route.continue();
        await route.fulfill({ status: 500, body: "" });
      });
      await page.locator("#medicion-manual-ph").fill("7");
      await page.locator('button[type="submit"]').click();
      await expect(
        page.getByText("No se pudo registrar la medición manual. Intentá nuevamente."),
      ).toBeVisible();
    });
  });

  test.describe("HistorialMedicionesManualesTab", () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole("button", { name: "Historial" }).click();
    });

    test("muestra estado vacío cuando no hay mediciones", async ({ page }) => {
      await expect(
        page.getByText("No hay mediciones manuales para los filtros seleccionados"),
      ).toBeVisible();
    });

    test("muestra las mediciones registradas en la tabla", async ({ page }) => {
      await page.route(/\/lotes\/\d+\/mediciones-manuales/, async (route) => {
        const rt = route.request().resourceType();
        if (rt !== "fetch" && rt !== "xhr") return route.continue();
        if (route.request().method() !== "GET") return route.continue();
        await route.fulfill({
          status: 200, contentType: "application/json",
          body: JSON.stringify({
            data: [
              { id: 1, loteId: 1, parametro: "ph", valor: 7.0, estado: "NORMAL",
                createdAt: "2026-08-01T10:00:00.000Z" },
            ],
            total: 1, limit: 20,
          }),
        });
      });
      await page.goto("/mediciones-manuales");
      await page.getByRole("button", { name: "Historial" }).click();
      await expect(page.getByRole("row").filter({ hasText: "pH" })).toBeVisible();
      await expect(page.getByRole("row").filter({ hasText: "pH" }).getByText("Normal")).toBeVisible();
    });

    test("muestra error cuando la fecha hasta es anterior a la fecha desde", async ({ page }) => {
      await page.locator("input[type='date']").nth(0).fill("2026-07-10"); 
      await page.locator("input[type='date']").nth(1).fill("2026-07-01");
      await page.getByRole("button", { name: "Buscar" }).click();
      await expect(
        page.getByText("La fecha hasta no puede ser anterior a la fecha desde."),
      ).toBeVisible();
    });

    test("muestra error del servidor al cargar el historial", async ({ page }) => {
      await page.route(/\/lotes\/\d+\/mediciones-manuales/, async (route) => {
        const rt = route.request().resourceType();
        if (rt !== "fetch" && rt !== "xhr") return route.continue();
        if (route.request().method() !== "GET") return route.continue();
        await route.fulfill({ status: 500, body: "" });
      });
      await page.goto("/mediciones-manuales");
      await page.getByRole("button", { name: "Historial" }).click();
      await expect(
        page.getByText("No se pudo cargar el historial de mediciones manuales."),
      ).toBeVisible();
    });
  });
});
test("MedicionManualPage - un usuario sin rol de Operario ve acceso no autorizado", async ({ page }) => {
  await mockMedicionManualDeps(page);
  await loginAsResponsableProduccion(page);
  await page.goto("/mediciones-manuales");
  await expect(page.getByText("Acceso no autorizado")).toBeVisible();
});

// ---------------------------------------------------------------------------
// HU-55 — Registro de parámetros por voz
// ---------------------------------------------------------------------------

// Reemplaza la Web Speech API real por un mock controlable desde el test:
// el navegador (Chromium) sí trae `webkitSpeechRecognition` nativo, pero
// depende de un servicio de reconocimiento remoto que no está disponible en
// un entorno de test headless — sin esto, .start() nunca dispararía
// resultados reales ni de forma determinística. Se guarda la instancia en
// window.__mockRecognitionInstance para poder disparar onresult/onerror/
// onend a mano desde cada test.
async function mockSpeechRecognitionSoportado(page: Page) {
  await page.addInitScript(() => {
    const w = globalThis as any;
    function MockSpeechRecognition(this: any) {
      this.lang = "";
      this.continuous = false;
      this.interimResults = false;
      this.onresult = null;
      this.onerror = null;
      this.onend = null;
      w.__mockRecognitionInstance = this;
    }
    MockSpeechRecognition.prototype.start = function () {};
    MockSpeechRecognition.prototype.stop = function () {};
    w.webkitSpeechRecognition = MockSpeechRecognition;
    w.SpeechRecognition = undefined;
  });
}

// Fuerza el camino "no soportado" (Firefox/Safari real) borrando lo que
// Chromium trae nativo.
async function mockSpeechRecognitionNoSoportado(page: Page) {
  await page.addInitScript(() => {
    const w = globalThis as any;
    w.webkitSpeechRecognition = undefined;
    w.SpeechRecognition = undefined;
  });
}

async function simularResultadoFinal(page: Page, texto: string) {
  await page.evaluate((t) => {
    const instancia = (globalThis as any).__mockRecognitionInstance;
    instancia.onresult({
      resultIndex: 0,
      results: [{ 0: { transcript: t }, isFinal: true, length: 1 }],
    });
  }, texto);
}

async function simularError(page: Page, error: string) {
  await page.evaluate((e) => {
    (globalThis as any).__mockRecognitionInstance.onerror({ error: e });
  }, error);
}

test.describe("HU-55 — Registro de parámetros por voz", () => {
  test.beforeEach(async ({ page }) => {
    await mockMedicionManualDeps(page);
  });

  test("el botón 'Dictar valores' abre el modal y arranca escuchando", async ({ page }) => {
    await mockSpeechRecognitionSoportado(page);
    await loginAsOperario(page);
    await page.goto("/mediciones-manuales");

    await page.getByRole("button", { name: "Dictar valores", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Dictando valores" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Escuchando")).toBeVisible();
  });

  test("transcribe el dictado y lo muestra en pantalla antes de confirmar", async ({ page }) => {
    await mockSpeechRecognitionSoportado(page);
    await loginAsOperario(page);
    await page.goto("/mediciones-manuales");
    await page.getByRole("button", { name: "Dictar valores", exact: true }).click();

    const dialog = page.getByRole("dialog", { name: "Dictando valores" });
    await simularResultadoFinal(page, "ph 6.8, temperatura 4 grados");
    await expect(dialog.getByText("ph 6.8, temperatura 4 grados")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Revisar y confirmar" })).toBeEnabled();
  });

  test("dicta varios parámetros con terminología técnica y los interpreta correctamente", async ({ page }) => {
    await mockSpeechRecognitionSoportado(page);
    await page.route(/\/lotes\/\d+\/dictado\/parsear/, async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          textoOriginal: "ph 6.8, materia grasa 3.4 por ciento",
          parametros: [
            { parametro: "ph", valor: 6.8, confianza: "alta", fueraDeRangoFisico: false, fueraDeUmbralEmpresa: false, textoOriginal: "ph 6.8" },
            { parametro: "grasa", valor: 3.4, confianza: "alta", fueraDeRangoFisico: false, fueraDeUmbralEmpresa: null, textoOriginal: "materia grasa 3.4 por ciento" },
          ],
          noReconocido: [],
          obligatoriosFaltantes: [],
        }),
      });
    });
    await loginAsOperario(page);
    await page.goto("/mediciones-manuales");
    await page.getByRole("button", { name: "Dictar valores", exact: true }).click();
    await simularResultadoFinal(page, "ph 6.8, materia grasa 3.4 por ciento");
    await page.getByRole("dialog", { name: "Dictando valores" })
      .getByRole("button", { name: "Revisar y confirmar" }).click();

    const revision = page.getByRole("dialog", { name: "Revisar dictado" });
    await expect(revision).toBeVisible();
    await expect(revision.locator("#revision-dictado-ph")).toHaveValue("6.8");
    await expect(revision.locator("#revision-dictado-grasa")).toHaveValue("3.4");
  });

  test("texto no reconocido se lista aparte con el motivo", async ({ page }) => {
    await mockSpeechRecognitionSoportado(page);
    await page.route(/\/lotes\/\d+\/dictado\/parsear/, async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          textoOriginal: "temperatura",
          parametros: [],
          noReconocido: [{ texto: "temperatura", motivo: "sin_valor_asociado" }],
          obligatoriosFaltantes: [],
        }),
      });
    });
    await loginAsOperario(page);
    await page.goto("/mediciones-manuales");
    await page.getByRole("button", { name: "Dictar valores", exact: true }).click();
    await simularResultadoFinal(page, "temperatura");
    await page.getByRole("dialog", { name: "Dictando valores" })
      .getByRole("button", { name: "Revisar y confirmar" }).click();

    const revision = page.getByRole("dialog", { name: "Revisar dictado" });
    await expect(revision.getByText("No se reconoció ningún parámetro en el dictado.")).toBeVisible();
    await expect(revision.getByText('"temperatura"')).toBeVisible();
    await expect(
      revision.getByText("Se nombró el parámetro pero no se detectó un valor"),
    ).toBeVisible();
  });

  test("corrige manualmente un valor reconocido antes de confirmar el registro", async ({ page }) => {
    await mockSpeechRecognitionSoportado(page);
    await page.route(/\/lotes\/\d+\/dictado\/parsear/, async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          textoOriginal: "ph 6.8",
          parametros: [
            { parametro: "ph", valor: 6.8, confianza: "media", fueraDeRangoFisico: false, fueraDeUmbralEmpresa: false, textoOriginal: "ph 6.8" },
          ],
          noReconocido: [],
          obligatoriosFaltantes: [],
        }),
      });
    });
    let payloadEnviado: unknown = null;
    await page.route(/\/lotes\/\d+\/mediciones-manuales/, async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      payloadEnviado = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          loteId: 1, tipoMateriaPrima: "leche_cruda", usuarioId: 5,
          mediciones: [{ id: 1, parametro: "ph", valor: 7.0, estado: "NORMAL", createdAt: "2026-08-01T10:00:00.000Z" }],
        }),
      });
    });
    await loginAsOperario(page);
    await page.goto("/mediciones-manuales");
    await page.getByRole("button", { name: "Dictar valores", exact: true }).click();
    await simularResultadoFinal(page, "ph 6.8");
    await page.getByRole("dialog", { name: "Dictando valores" })
      .getByRole("button", { name: "Revisar y confirmar" }).click();

    const revision = page.getByRole("dialog", { name: "Revisar dictado" });
    await revision.locator("#revision-dictado-ph").fill("7.0");
    await revision.getByRole("button", { name: "Confirmar registro" }).click();

    await expect(revision.getByText("MEDICIÓN REGISTRADA")).toBeVisible();
    expect(payloadEnviado).toEqual({
      tipoMateriaPrima: "leche_cruda",
      parametros: [{ parametro: "ph", valor: 7 }],
    });
  });

  test("cancelar a mitad del dictado pide confirmación y no registra nada", async ({ page }) => {
    let seEnvioParseo = false;
    await mockSpeechRecognitionSoportado(page);
    await page.route(/\/lotes\/\d+\/dictado\/parsear/, async (route) => {
      seEnvioParseo = true;
      await route.continue();
    });
    await loginAsOperario(page);
    await page.goto("/mediciones-manuales");
    await page.getByRole("button", { name: "Dictar valores", exact: true }).click();
    await simularResultadoFinal(page, "ph 6.8");

    const dialog = page.getByRole("dialog", { name: "Dictando valores" });
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialog.getByText("¿Descartar el dictado en curso?")).toBeVisible();
    await dialog.getByRole("button", { name: "Sí, descartar" }).click();

    await expect(page.getByRole("dialog")).not.toBeVisible();
    expect(seEnvioParseo).toBe(false);
  });

  test("seguir dictando desde la confirmación de cancelar no pierde el texto", async ({ page }) => {
    await mockSpeechRecognitionSoportado(page);
    await loginAsOperario(page);
    await page.goto("/mediciones-manuales");
    await page.getByRole("button", { name: "Dictar valores", exact: true }).click();
    await simularResultadoFinal(page, "ph 6.8");

    const dialog = page.getByRole("dialog", { name: "Dictando valores" });
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await dialog.getByRole("button", { name: "Seguir dictando" }).click();

    await expect(dialog.getByText("ph 6.8")).toBeVisible();
  });

  test("reconocimiento no soportado ofrece pasar al ingreso manual", async ({ page }) => {
    await mockSpeechRecognitionNoSoportado(page);
    await loginAsOperario(page);
    await page.goto("/mediciones-manuales");
    await page.getByRole("button", { name: "Dictar valores", exact: true }).click();

    const dialog = page.getByRole("dialog", { name: "Dictando valores" });
    await expect(dialog.getByText("No disponible")).toBeVisible();
    await expect(
      dialog.getByText("Este navegador no soporta dictado por voz."),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Ir al ingreso manual" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.locator("#medicion-manual-ph")).toBeVisible();
  });

  test("permiso de micrófono denegado ofrece pasar al ingreso manual", async ({ page }) => {
    await mockSpeechRecognitionSoportado(page);
    await loginAsOperario(page);
    await page.goto("/mediciones-manuales");
    await page.getByRole("button", { name: "Dictar valores", exact: true }).click();
    await simularError(page, "not-allowed");

    const dialog = page.getByRole("dialog", { name: "Dictando valores" });
    await expect(dialog.getByText("Permiso denegado")).toBeVisible();
    await expect(
      dialog.getByText("No pudimos acceder al micrófono."),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Ir al ingreso manual" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("error al interpretar el dictado permite reintentar sin perder el texto", async ({ page }) => {
    await mockSpeechRecognitionSoportado(page);
    await page.route(/\/lotes\/\d+\/dictado\/parsear/, async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Error del servidor" }) });
    });
    await loginAsOperario(page);
    await page.goto("/mediciones-manuales");
    await page.getByRole("button", { name: "Dictar valores", exact: true }).click();
    await simularResultadoFinal(page, "ph 6.8");
    const dialog = page.getByRole("dialog", { name: "Dictando valores" });
    await dialog.getByRole("button", { name: "Revisar y confirmar" }).click();

    await expect(dialog.getByText("Error del servidor")).toBeVisible();
    // El texto dictado sigue disponible para reintentar, no se perdió.
    await expect(dialog.getByText("ph 6.8")).toBeVisible();
  });
});