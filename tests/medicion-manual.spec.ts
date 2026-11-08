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
      await page.getByRole("button", { name: "Historial", exact: true }).click();
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
      await page.getByRole("button", { name: "Historial", exact: true }).click();
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
      await page.getByRole("button", { name: "Historial", exact: true }).click();
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

// Fuerza el camino "no soportado" (Firefox real) borrando lo que
// Chromium trae nativo.
async function mockSpeechRecognitionNoSoportado(page: Page) {
  await page.addInitScript(() => {
    const w = globalThis as any;
    w.webkitSpeechRecognition = undefined;
    w.SpeechRecognition = undefined;
  });
}

// HU-56: la revisión arranca sola la confirmación verbal (speechSynthesis).
// Sin esto el resultado dependería de la máquina: en macOS el Chromium
// headless trae voces y habla de verdad, en Linux/CI no. Sin síntesis la
// revisión cae directo a revisión manual (clic habilitado), que es el
// camino que verifican los specs de HU-55.
async function mockSpeechSynthesisNoDisponible(page: Page) {
  await page.addInitScript(() => {
    const w = globalThis as any;
    Object.defineProperty(w, "speechSynthesis", { value: undefined, configurable: true });
    Object.defineProperty(w, "SpeechSynthesisUtterance", { value: undefined, configurable: true });
  });
}

// HU-56: speechSynthesis controlable desde el test. Registra cada enunciado
// en window.__enunciados y deja las lecturas pendientes en
// window.__lecturasPendientes; el test las termina a mano con
// terminarLectura() (dispara onend), así no depende de las voces de la
// máquina ni de cuánto tarda en hablar.
async function mockSpeechSynthesisControlable(page: Page) {
  await page.addInitScript(() => {
    const w = globalThis as any;
    w.__enunciados = [];
    w.__lecturasPendientes = [];
    function MockUtterance(this: any, texto: string) {
      this.text = texto;
      this.lang = "";
      this.voice = null;
      this.onend = null;
      this.onerror = null;
    }
    Object.defineProperty(w, "SpeechSynthesisUtterance", { value: MockUtterance, configurable: true });
    Object.defineProperty(w, "speechSynthesis", {
      configurable: true,
      value: {
        speaking: false,
        pending: false,
        getVoices: () => [{ lang: "es-AR", name: "Mock es-AR" }],
        addEventListener() {},
        removeEventListener() {},
        speak(utterance: any) {
          w.__enunciados.push(utterance.text);
          w.__lecturasPendientes.push(utterance);
        },
        cancel() {
          for (const u of w.__lecturasPendientes.splice(0)) u.onerror?.({ error: "interrupted" });
        },
      },
    });
  });
}

// Termina la lectura en curso: dispara onend de cada enunciado pendiente,
// dejando que el hook encole el siguiente, hasta que no llegue ninguno más.
async function terminarLectura(page: Page) {
  await page.evaluate(async () => {
    const w = globalThis as any;
    const tick = () => new Promise((r) => setTimeout(r, 20));
    for (let vueltasSinPendientes = 0; vueltasSinPendientes < 5; ) {
      const utterance = w.__lecturasPendientes.shift();
      if (!utterance) {
        vueltasSinPendientes++;
        await tick();
        continue;
      }
      vueltasSinPendientes = 0;
      utterance.onend?.({});
      await tick();
    }
  });
}

async function enunciados(page: Page): Promise<string[]> {
  return page.evaluate(() => (globalThis as any).__enunciados);
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
    await mockSpeechSynthesisNoDisponible(page);
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

    await expect(dialog.getByText("No se pudo interpretar el dictado. Intentá nuevamente.")).toBeVisible();
    // El texto dictado sigue disponible para reintentar, no se perdió.
    await expect(dialog.getByText("ph 6.8")).toBeVisible();
  });
});
// ---------------------------------------------------------------------------
// HU-55 — Cambio de lote en la revisión y "Volver a dictar"
// ---------------------------------------------------------------------------

test.describe("HU-55 — Revisión del dictado › cambio de lote", () => {
  const respuestaParseo = (texto: string, ph: number) => ({
    textoOriginal: texto,
    parametros: [
      { parametro: "ph", valor: ph, confianza: "alta", fueraDeRangoFisico: false, fueraDeUmbralEmpresa: false, textoOriginal: texto },
    ],
    noReconocido: [],
    obligatoriosFaltantes: [],
  });

  // Dos lotes elegibles; el parseo responde distinto según el lote.
  async function prepararRevision(page: Page, falloLote2 = false) {
    await mockMedicionManualDeps(page);
    await mockSpeechRecognitionSoportado(page);
    await mockSpeechSynthesisNoDisponible(page);
    await page.route("**/lotes*", (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [LOTE_1, LOTE_2], total: 2, page: 1, limit: 20 }),
      });
    });
    const pedidos: { loteId: number; texto: string }[] = [];
    await page.route(/\/lotes\/\d+\/dictado\/parsear/, async (route) => {
      const loteId = Number(new URL(route.request().url()).pathname.split("/")[2]);
      const { texto } = route.request().postDataJSON() as { texto: string };
      pedidos.push({ loteId, texto });
      if (loteId === 2 && falloLote2) {
        return route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ message: "El lote LOT-2026-002 no tiene parámetros configurados." }),
        });
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(respuestaParseo(texto, loteId === 1 ? 6.8 : 7.1)),
      });
    });
    await loginAsOperario(page);
    await page.goto("/mediciones-manuales");
    await page.getByRole("button", { name: "Dictar valores", exact: true }).click();
    await simularResultadoFinal(page, "ph 6.8");
    await page.getByRole("dialog", { name: "Dictando valores" }).getByRole("button", { name: "Revisar y confirmar" }).click();
    const revision = page.getByRole("dialog", { name: "Revisar dictado" });
    await expect(revision.locator("#revision-dictado-ph")).toHaveValue("6.8");
    return { revision, pedidos };
  }

  test("cambiar de lote vuelve a interpretar el mismo texto contra el lote nuevo", async ({ page }) => {
    const { revision, pedidos } = await prepararRevision(page);

    await revision.getByRole("combobox").selectOption({ label: "LOT-2026-002" });

    await expect(revision.locator("#revision-dictado-ph")).toHaveValue("7.1");
    await expect(revision.getByRole("combobox")).toHaveValue("2");
    expect(pedidos.at(-1)).toEqual({ loteId: 2, texto: "ph 6.8" });
  });

  test("si falla la nueva interpretación conserva el lote y el resultado anteriores", async ({ page }) => {
    const { revision, pedidos } = await prepararRevision(page, true);

    await revision.getByRole("combobox").selectOption({ label: "LOT-2026-002" });

    await expect(revision.getByText("El lote LOT-2026-002 no tiene parámetros configurados.")).toBeVisible();
    await expect(revision.getByRole("combobox")).toHaveValue("1");
    await expect(revision.locator("#revision-dictado-ph")).toHaveValue("6.8");
    expect(pedidos).toHaveLength(2);
  });

  test("'Volver a dictar' regresa a la captura con la transcripción vacía", async ({ page }) => {
    const { revision } = await prepararRevision(page);

    await revision.getByRole("button", { name: "Volver a dictar" }).click();

    const captura = page.getByRole("dialog", { name: "Dictando valores" });
    await expect(captura).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Revisar dictado" })).toHaveCount(0);
    await expect(captura.getByText("ph 6.8", { exact: true })).toHaveCount(0);
    await expect(captura.getByRole("button", { name: "Revisar y confirmar" })).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// HU-56 — Confirmación verbal antes de guardar el registro
// ---------------------------------------------------------------------------

test.describe("HU-56 — Confirmación verbal antes de guardar", () => {
  const PARSEO = {
    textoOriginal: "ph 6.8 temperatura 4",
    parametros: [
      { parametro: "ph", valor: 6.8, confianza: "alta", fueraDeRangoFisico: false, fueraDeUmbralEmpresa: true, textoOriginal: "ph 6.8" },
      { parametro: "temperatura", valor: 4, confianza: "media", fueraDeRangoFisico: false, fueraDeUmbralEmpresa: false, textoOriginal: "temperatura 4" },
    ],
    noReconocido: [],
    obligatoriosFaltantes: ["grasa"],
  };

  // Llega a la revisión con la síntesis indicada y devuelve el diálogo y
  // los POST de registro que se hayan hecho.
  async function llegarARevision(page: Page, sintesis: "controlable" | "no_disponible") {
    await mockMedicionManualDeps(page);
    await mockSpeechRecognitionSoportado(page);
    if (sintesis === "controlable") await mockSpeechSynthesisControlable(page);
    else await mockSpeechSynthesisNoDisponible(page);
    await page.route(/\/lotes\/\d+\/dictado\/parsear/, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PARSEO) }),
    );
    const registros: unknown[] = [];
    await page.route(/\/lotes\/\d+\/mediciones-manuales/, async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      registros.push(route.request().postDataJSON());
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          loteId: 1, tipoMateriaPrima: "leche_cruda", usuarioId: 5,
          mediciones: [
            { id: 1, parametro: "ph", valor: 6.8, estado: "FUERA_DE_RANGO", createdAt: "2026-08-01T10:00:00.000Z" },
            { id: 2, parametro: "temperatura", valor: 4, estado: "NORMAL", createdAt: "2026-08-01T10:00:00.000Z" },
          ],
        }),
      });
    });
    await loginAsOperario(page);
    await page.goto("/mediciones-manuales");
    await page.getByRole("button", { name: "Dictar valores", exact: true }).click();
    await simularResultadoFinal(page, "ph 6.8 temperatura 4");
    await page.getByRole("dialog", { name: "Dictando valores" })
      .getByRole("button", { name: "Revisar y confirmar" }).click();
    const revision = page.getByRole("dialog", { name: "Revisar dictado" });
    await expect(revision).toBeVisible();
    return { revision, registros };
  }

  // Lee todo y queda escuchando el primer intento.
  async function hastaEscuchar(page: Page) {
    const resultado = await llegarARevision(page, "controlable");
    await expect(resultado.revision.getByText("Leyendo los valores en voz alta...")).toBeVisible();
    await terminarLectura(page);
    await expect(resultado.revision.getByText("Intento 1 de 3")).toBeVisible();
    return resultado;
  }

  test("lee el lote y los valores reconocidos antes de pedir la confirmación", async ({ page }) => {
    const { revision } = await hastaEscuchar(page);

    expect(await enunciados(page)).toEqual([
      "Lote LOT-2026-001.",
      "pH 6,8, fuera de rango.",
      "Temperatura 4 grados.",
      "Faltan obligatorios: Materia grasa.",
      "Decí confirmar para guardar, o cancelar.",
    ]);
    await expect(revision.getByRole("button", { name: "Confirmar registro" })).toBeDisabled();
  });

  test("'confirmar' por voz guarda el registro", async ({ page }) => {
    const { revision, registros } = await hastaEscuchar(page);

    await simularResultadoFinal(page, "Confirmar");

    await expect(revision.getByText("MEDICIÓN REGISTRADA")).toBeVisible();
    expect(registros).toEqual([
      {
        tipoMateriaPrima: "leche_cruda",
        parametros: [
          { parametro: "ph", valor: 6.8 },
          { parametro: "temperatura", valor: 4 },
        ],
      },
    ]);
  });

  test("'cancelar' por voz no guarda y deja la revisión abierta", async ({ page }) => {
    const { revision, registros } = await hastaEscuchar(page);

    await simularResultadoFinal(page, "cancelar");

    await expect(revision.getByText("Confirmación por voz cancelada. No se guardó nada.")).toBeVisible();
    await expect(revision.locator("#revision-dictado-ph")).toHaveValue("6.8");
    await expect(revision.getByRole("button", { name: "Confirmar registro" })).toBeDisabled();
    expect(registros).toHaveLength(0);
  });

  test("una palabra que no es comando pide reintentar", async ({ page }) => {
    const { revision, registros } = await hastaEscuchar(page);

    await simularResultadoFinal(page, "ok");

    await expect(revision.getByText("Leyendo los valores en voz alta...")).toBeVisible();
    expect((await enunciados(page)).at(-1)).toBe("No entendí. Decí confirmar o cancelar.");
    await terminarLectura(page);
    await expect(revision.getByText("Intento 2 de 3")).toBeVisible();
    expect(registros).toHaveLength(0);
  });

  test("tras 3 intentos fallidos pasa a revisión manual con confirmación por clic", async ({ page }) => {
    const { revision, registros } = await hastaEscuchar(page);

    await simularResultadoFinal(page, "sí");
    await terminarLectura(page);
    await expect(revision.getByText("Intento 2 de 3")).toBeVisible();
    await simularResultadoFinal(page, "no confirmo");
    await terminarLectura(page);
    await expect(revision.getByText("Intento 3 de 3")).toBeVisible();
    await simularResultadoFinal(page, "dale");

    await expect(revision.getByText("No pudimos confirmar por voz")).toBeVisible();
    const confirmar = revision.getByRole("button", { name: "Confirmar registro" });
    await expect(confirmar).toBeEnabled();
    expect(registros).toHaveLength(0);

    await confirmar.click();
    await expect(revision.getByText("MEDICIÓN REGISTRADA")).toBeVisible();
    expect(registros).toHaveLength(1);
  });

  test("sin síntesis de voz va directo a revisión manual con aviso", async ({ page }) => {
    const { revision } = await llegarARevision(page, "no_disponible");

    await expect(revision.getByText("No pudimos confirmar por voz")).toBeVisible();
    await expect(
      revision.getByText("Este navegador no puede leer los valores en voz alta."),
    ).toBeVisible();
    await expect(revision.getByRole("button", { name: "Confirmar registro" })).toBeEnabled();
  });
});
