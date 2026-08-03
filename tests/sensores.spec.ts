import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import {
  loginAsResponsableProduccion,
  loginAsAdministrador,
  loginAsOperario,
} from "./fixtures/mockAuth.ts";

// ---------------------------------------------------------------------------
// Datos de prueba
// ---------------------------------------------------------------------------

const SENSOR_1 = {
  id: 1,
  nombre: "Sensor pH Laboratorio",
  tipo: "analogico",
  parametro: "ph",
  ubicacion: "laboratorio",
  rangoMinFavor: 6.0,
  rangoMaxFavor: 7.5,
  estado: "activo",
  empresaId: 10,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

const SENSOR_2 = {
  id: 2,
  nombre: "Sensor Temperatura Caldera",
  tipo: "digital",
  parametro: "temperatura",
  ubicacion: "caldera",
  rangoMinFavor: 2.0,
  rangoMaxFavor: 4.0,
  estado: "inactivo",
  empresaId: 10,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

const SENSORES_MOCK = [SENSOR_1, SENSOR_2];

async function mockSensoresDeps(page: Page) {
  await page.route("**/*", async (route) => {
    const rt = route.request().resourceType();
    if (rt === "xhr" || rt === "fetch") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      });
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
      body: JSON.stringify({
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
      }),
    });
  });

  // POST y PATCH los intercepta cada test inline (LIFO)
  await page.route("**/sensores*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(SENSORES_MOCK),
    });
  });
}

// ---------------------------------------------------------------------------
// SensoresPage
// ---------------------------------------------------------------------------

test.describe("SensoresPage", () => {
  test("muestra los sensores registrados en la tabla", async ({ page }) => {
    await mockSensoresDeps(page);
    await loginAsResponsableProduccion(page);
    await page.goto("/sensores");

    await expect(
      page.getByRole("table").getByText("Sensor pH Laboratorio"),
    ).toBeVisible();
    await expect(
      page.getByRole("table").getByText("Sensor Temperatura Caldera"),
    ).toBeVisible();
  });

  test("muestra estado vacío cuando no hay sensores registrados", async ({ page }) => {
    await mockSensoresDeps(page);

    // LIFO: devuelve lista vacía en lugar de SENSORES_MOCK
    await page.route("**/sensores*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await loginAsResponsableProduccion(page);
    await page.goto("/sensores");

    await expect(page.getByText("No hay sensores registrados")).toBeVisible();
  });

  test("un Responsable de Producción ve el botón de agregar sensor", async ({ page }) => {
    await mockSensoresDeps(page);
    await loginAsResponsableProduccion(page);
    await page.goto("/sensores");

    await expect(
      page.getByRole("button", { name: "+ Agregar sensor" }),
    ).toBeVisible();
  });

  test("un Administrador no ve el botón de agregar sensor", async ({ page }) => {
    await mockSensoresDeps(page);
    await loginAsAdministrador(page);
    await page.goto("/sensores");

    await expect(
      page.getByRole("button", { name: "+ Agregar sensor" }),
    ).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// SensoresPage › NuevoSensorModal
// ---------------------------------------------------------------------------

test.describe("SensoresPage › NuevoSensorModal", () => {
  test.beforeEach(async ({ page }) => {
    await mockSensoresDeps(page);
    await loginAsResponsableProduccion(page);
    await page.goto("/sensores");

    await page.getByRole("button", { name: "+ Agregar sensor" }).click();
    await expect(page.getByRole("heading", { name: "Nuevo sensor" })).toBeVisible();
  });

  test("abre el modal con los campos del formulario", async ({ page }) => {
    await expect(page.getByLabel("Nombre / identificador *")).toBeVisible();
    await expect(page.getByLabel("Tipo de sensor *")).toBeVisible();
    await expect(page.getByLabel("Parámetro que mide *")).toBeVisible();
    await expect(page.getByLabel("Ubicación *")).toBeVisible();
    await expect(page.getByLabel("Mínimo *")).toBeVisible();
    await expect(page.getByLabel("Máximo *")).toBeVisible();
    await expect(page.getByRole("button", { name: "Registrar sensor" })).toBeVisible();
  });

  test("muestra errores de validación al intentar registrar sin completar datos", async ({ page }) => {
    await page.getByRole("button", { name: "Registrar sensor" }).click();

    await expect(page.getByText("El nombre es obligatorio")).toBeVisible();
    await expect(page.getByText("El tipo es obligatorio")).toBeVisible();
    await expect(page.getByText("El parámetro es obligatorio")).toBeVisible();
    await expect(page.getByText("La ubicación es obligatoria")).toBeVisible();
  });

  test("muestra error cuando el rango máximo no supera al mínimo", async ({ page }) => {
    await page.getByLabel("Nombre / identificador *").fill("Sensor test");
    await page.getByLabel("Tipo de sensor *").selectOption({ value: "analogico" });
    await page.getByLabel("Parámetro que mide *").selectOption({ value: "ph" });
    await page.getByLabel("Ubicación *").selectOption({ value: "laboratorio" });
    await page.getByLabel("Mínimo *").fill("8");
    await page.getByLabel("Máximo *").fill("6");

    await page.getByRole("button", { name: "Registrar sensor" }).click();

    await expect(page.getByText("Debe ser mayor al rango mínimo")).toBeVisible();
  });

  test("Cancelar cierra el modal", async ({ page }) => {
    await page.getByRole("button", { name: "Cancelar" }).click();

    await expect(
      page.getByRole("heading", { name: "Nuevo sensor" }),
    ).not.toBeVisible();
  });

    test("registra un sensor correctamente y cierra el modal", async ({ page }) => {
    await page.route("**/sensores*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ ...SENSOR_1, id: 99, nombre: "Sensor test" }),
      });
    });

    await page.getByLabel("Nombre / identificador *").fill("Sensor test");
    await page.getByLabel("Tipo de sensor *").selectOption({ value: "analogico" });
    await page.getByLabel("Parámetro que mide *").selectOption({ value: "ph" });
    await page.getByLabel("Ubicación *").selectOption({ value: "laboratorio" });
    await page.getByLabel("Mínimo *").fill("6");
    await page.getByLabel("Máximo *").fill("7.5");

    await page.getByRole("button", { name: "Registrar sensor" }).click();

    await expect(
      page.getByRole("heading", { name: "Nuevo sensor" }),
    ).not.toBeVisible();
  });

  test("muestra error del servidor al fallar el registro", async ({ page }) => {
    await page.route("**/sensores*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({ status: 500, body: "" });
    });

    await page.getByLabel("Nombre / identificador *").fill("Sensor test");
    await page.getByLabel("Tipo de sensor *").selectOption({ value: "analogico" });
    await page.getByLabel("Parámetro que mide *").selectOption({ value: "ph" });
    await page.getByLabel("Ubicación *").selectOption({ value: "laboratorio" });
    await page.getByLabel("Mínimo *").fill("6");
    await page.getByLabel("Máximo *").fill("7.5");

    await page.getByRole("button", { name: "Registrar sensor" }).click();

    await expect(
      page.getByText("No se pudo registrar el sensor. Intentá nuevamente."),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// SensoresPage › EditarSensorModal
// ---------------------------------------------------------------------------

async function abrirEditarSensor(page: Page, nombre = "Sensor pH Laboratorio") {
  const row = page.getByRole("row").filter({ hasText: nombre });
  await row.getByTitle("Editar sensor").click();
  await expect(page.getByRole("heading", { name: "Editar sensor" })).toBeVisible();
}

test.describe("SensoresPage › EditarSensorModal", () => {
  test.beforeEach(async ({ page }) => {
    await mockSensoresDeps(page);
    await loginAsResponsableProduccion(page);
    await page.goto("/sensores");
    await abrirEditarSensor(page);
  });

  test("abre el modal con los datos actuales del sensor", async ({ page }) => {
    await expect(page.getByLabel("Nombre / identificador *")).toHaveValue("Sensor pH Laboratorio");
    await expect(page.getByLabel("Tipo de sensor *")).toHaveValue("analogico");
    await expect(page.getByLabel("Parámetro que mide *")).toHaveValue("ph");
    await expect(page.getByLabel("Mínimo *")).toHaveValue("6");
    await expect(page.getByLabel("Máximo *")).toHaveValue("7.5");
  });

  test("la ubicación está deshabilitada en modo edición", async ({ page }) => {
    await expect(page.getByLabel("Ubicación *")).toBeDisabled();
  });

  test("muestra error cuando el rango máximo no supera al mínimo", async ({ page }) => {
    await page.getByLabel("Mínimo *").fill("8");
    await page.getByLabel("Máximo *").fill("6");

    await page.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(page.getByText("Debe ser mayor al rango mínimo")).toBeVisible();
  });

  test("guarda los cambios correctamente y cierra el modal", async ({ page }) => {
    await page.route(/\/sensores\/\d+/, async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "PATCH") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...SENSOR_1, nombre: "Sensor pH Editado" }),
      });
    });

    await page.getByLabel("Nombre / identificador *").fill("Sensor pH Editado");
    await page.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(
      page.getByRole("heading", { name: "Editar sensor" }),
    ).not.toBeVisible();
  });

  test("muestra error del servidor al fallar la actualización", async ({ page }) => {
    await page.route(/\/sensores\/\d+/, async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "PATCH") return route.continue();
      await route.fulfill({ status: 500, body: "" });
    });

    await page.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(
      page.getByText("No se pudo actualizar el sensor. Intentá nuevamente."),
    ).toBeVisible();
  });

  test("Cancelar cierra el modal", async ({ page }) => {
    await page.getByRole("button", { name: "Cancelar" }).click();

    await expect(
      page.getByRole("heading", { name: "Editar sensor" }),
    ).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// SensoresPage › EstadoDiagnosticoTab
// ---------------------------------------------------------------------------
test.describe("SensoresPage › EstadoDiagnosticoTab", () => {
  test.beforeEach(async ({ page }) => {
    await mockSensoresDeps(page);
    await loginAsResponsableProduccion(page);
    await page.goto("/sensores");
    await page.getByRole("button", { name: "Estado y diagnóstico" }).click();
  });

  test("muestra las tarjetas de cada sensor registrado", async ({ page }) => {
    await expect(page.getByText("Sensor pH Laboratorio")).toBeVisible();
    await expect(page.getByText("Sensor Temperatura Caldera")).toBeVisible();
  });

  test("muestra el conteo de sensores activos, con falla e inactivos", async ({ page }) => {
    await expect(page.getByText("1 activos")).toBeVisible();
    await expect(page.getByText("0 con falla")).toBeVisible();
    await expect(page.getByText("1 inactivos")).toBeVisible();
    await expect(page.getByText("1 de 2 conectados")).toBeVisible();
  });

  test("muestra mensaje cuando no hay sensores registrados", async ({ page }) => {
    await mockSensoresDeps(page);
    await page.route("**/sensores*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });
    await loginAsResponsableProduccion(page);
    await page.goto("/sensores");
    await page.getByRole("button", { name: "Estado y diagnóstico" }).click();
    await expect(page.getByText("No hay sensores registrados.")).toBeVisible();
  });

  test("un usuario sin rol de Operario no ve el formulario de ingreso manual", async ({ page }) => {
    await expect(page.locator("[id^='lectura-manual-']")).toHaveCount(0);
  });

  test("muestra 'Reconectando...' cuando no hay conexión de tiempo real", async ({ page }) => {
    // Sin servidor WebSocket isRealtimeConnected = false → indicador de reconexión
    await expect(page.getByText("Reconectando...")).toBeVisible();
  });

  test("muestra 'Sin lote asociado' cuando el sensor no tiene lote asignado", async ({ page }) => {
    // SENSOR_1 y SENSOR_2 no tienen loteActualId → loteId = null
    await expect(page.getByText("Sin lote asociado").first()).toBeVisible();
  });

  test("muestra 'Lote #X' cuando el sensor tiene un lote asociado", async ({ page }) => {
    await page.route("**/sensores*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify([{ ...SENSOR_1, loteActualId: 1 }]),
      });
    });
    await page.reload();
    await page.getByRole("button", { name: "Estado y diagnóstico" }).click();
    await expect(page.getByText("Lote #1")).toBeVisible();
  });

  test.describe("SensoresPage › IngresoManualFallback", () => {
    test.beforeEach(async ({ page }) => {
      await mockSensoresDeps(page);
      await loginAsOperario(page);
      await page.goto("/sensores");
      await page.getByRole("button", { name: "Estado y diagnóstico" }).click();
    });

    test("campo de ingreso manual deshabilitado cuando el sensor está activo", async ({ page }) => {
      await expect(page.locator("#lectura-manual-1")).toBeDisabled();
    });

    test("campo de ingreso manual habilitado cuando el sensor está inactivo", async ({ page }) => {
      await expect(page.locator("#lectura-manual-2")).toBeEnabled();
    });

    test("muestra error al intentar registrar sin valor", async ({ page }) => {
      await page.locator("form:has(#lectura-manual-2)").getByRole("button", { name: "Cargar" }).click();
      await expect(page.getByText("Ingresá un valor.")).toBeVisible();
    });

    test("muestra error cuando el valor no es numérico", async ({ page }) => {
      await page.locator("#lectura-manual-2").fill("abc");
      await page.locator("form:has(#lectura-manual-2)").getByRole("button", { name: "Cargar" }).click();
      await expect(page.getByText("Debe ser numérico.")).toBeVisible();
    });

    test("muestra error cuando el valor está fuera del rango físico del parámetro", async ({ page }) => {
      await page.locator("#lectura-manual-2").fill("200");
      await page.locator("form:has(#lectura-manual-2)").getByRole("button", { name: "Cargar" }).click();
      await expect(page.getByText("Debe estar entre -20 y 100.")).toBeVisible();
    });

    test("registra el valor manual correctamente", async ({ page }) => {
      await page.locator("#lectura-manual-2").fill("25");
      await page.locator("form:has(#lectura-manual-2)").getByRole("button", { name: "Cargar" }).click();
      await expect(page.getByText("Valor manual registrado.")).toBeVisible();
    });

    test("muestra error del servidor al fallar el registro manual", async ({ page }) => {
      await page.route("**/sensores/lecturas/manual", async (route) => {
        if (route.request().method() !== "POST") return route.continue();
        await route.fulfill({ status: 500, body: "" });
      });
      await page.locator("#lectura-manual-2").fill("25");
      await page.locator("form:has(#lectura-manual-2)").getByRole("button", { name: "Cargar" }).click();
      await expect(page.getByText("No se pudo registrar el valor manual.")).toBeVisible();
    });
  });

    test("un sensor en estado de falla muestra el badge 'Con falla'", async ({ page }) => {
    await page.route("**/sensores*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify([{ ...SENSOR_1, estado: "falla" }]),
      });
    });
    await page.reload();
    await page.getByRole("button", { name: "Estado y diagnóstico" }).click();
    await expect(page.getByText("Con falla", { exact: true })).toBeVisible();
    await expect(page.getByText("1 con falla")).toBeVisible();
  });

  test("un sensor activo no muestra alerta de falla", async ({ page }) => {
    await expect(page.getByText("Activo", { exact: true })).toBeVisible();
    await expect(page.getByText("Con falla", { exact: true })).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// SensoresPage › SensorLoteHistorialModal
// ---------------------------------------------------------------------------

async function abrirHistorialModal(page: Page, sensorNombre = "Sensor pH Laboratorio") {
  const row = page.getByRole("row").filter({ hasText: sensorNombre });
  await row.waitFor();
  await row.getByTitle("Asociación a lote / historial").click();
  await expect(
    page.getByRole("heading", { name: `Asociación a lote — ${sensorNombre}` }),
  ).toBeVisible();
}

test.describe("SensoresPage › SensorLoteHistorialModal", () => {
  test.beforeEach(async ({ page }) => {
    await mockSensoresDeps(page);

    // GET /sensores/:id/historial — vacío por defecto
    await page.route(/\/sensores\/\d+\/historial/, async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    // GET /lotes — el modal llama a loteService.getAll() al abrirse
    await page.route("**/lotes*", async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [{ id: 1, codigo: "LOT-2026-001", materiaPrima: "leche_cruda", empresaId: 10 }],
          total: 1,
          page: 1,
          limit: 100,
        }),
      });
    });

    await loginAsOperario(page);
    await page.goto("/sensores");
    await abrirHistorialModal(page);
  });

  test("abre el modal y muestra Sin asociar cuando no hay historial", async ({ page }) => {
    await expect(page.getByText("Sin asociar")).toBeVisible();
    await expect(
      page.getByText("Este sensor todavía no fue asociado a ningún lote."),
    ).toBeVisible();
  });

  test("muestra error al intentar asociar sin seleccionar un lote", async ({ page }) => {
    await page.getByRole("button", { name: "Asociar" }).click();

    await expect(
      page.getByText("Seleccioná un lote para asociar."),
    ).toBeVisible();
  });

  test("asocia el sensor a un lote correctamente", async ({ page }) => {
    await page.route(/\/sensores\/lote\/\d+\/asociar/, async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "PATCH") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([SENSOR_1]),
      });
    });

    await page.getByLabel("Lote nuevo").selectOption({ label: "LOT-2026-001" });
    await page.getByRole("button", { name: "Asociar" }).click();

    await expect(page.getByText("Seleccioná un lote para asociar.")).not.toBeVisible();
  });

  test("muestra error del servidor al fallar la asociación", async ({ page }) => {
    await page.route(/\/sensores\/lote\/\d+\/asociar/, async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "PATCH") return route.continue();
      await route.fulfill({ status: 500, body: "" });
    });

    await page.getByLabel("Lote nuevo").selectOption({ label: "LOT-2026-001" });
    await page.getByRole("button", { name: "Asociar" }).click();

    await expect(
      page.getByText("No se pudo asociar el sensor a ese lote."),
    ).toBeVisible();
  });
});

test("SensoresPage - muestra el historial de asociaciones cuando hay registros", async ({ page }) => {
  await mockSensoresDeps(page);

  await page.route(/\/sensores\/\d+\/historial/, async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: 1,
          sensorId: 1,
          loteIdAnterior: null,
          loteIdNuevo: 1,
          userId: 5,
          fecha: "2026-08-01T10:00:00.000Z",
        },
      ]),
    });
  });

  await page.route("**/lotes*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [{ id: 1, codigo: "LOT-2026-001", materiaPrima: "leche_cruda", empresaId: 10 }],
        total: 1,
        page: 1,
        limit: 100,
      }),
    });
  });

  await loginAsOperario(page);
  await page.goto("/sensores");
  await abrirHistorialModal(page);

  await expect(page.getByRole("strong").filter({ hasText: "LOT-2026-001" })).toBeVisible();
  await expect(page.getByText(/^Vos ·/)).toBeVisible();
});

// ---------------------------------------------------------------------------
// SensoresPage › HistorialMedicionesTab (HU-19)
// ---------------------------------------------------------------------------

const HISTORIAL_MEDICION_ITEM = {
  id: 1,
  valor: 6.8,
  unidad: "pH",
  sensorNombre: "Sensor pH Laboratorio",
  parametro: "pH",
  loteCodigo: "LOT-2026-001",
  timestampLectura: "2026-08-01T08:00:00.000Z",
  estado: "NORMAL",
};

test.describe("SensoresPage › HistorialMedicionesTab", () => {
  test.beforeEach(async ({ page }) => {
    await mockSensoresDeps(page);
    // LIFO: prioridad mayor que **/sensores* para el endpoint de historial
    await page.route("**/sensores/lecturas/historial-mediciones*", async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], total: 0, page: 1, limit: 20, rangoAmplio: false }),
      });
    });
    await loginAsResponsableProduccion(page);
    await page.goto("/sensores");
    await page.getByRole("button", { name: "Historial de mediciones" }).click();
  });

  test("muestra estado vacío cuando no hay mediciones", async ({ page }) => {
    await expect(
      page.getByText("No hay mediciones para los filtros seleccionados"),
    ).toBeVisible();
  });

  test("muestra las mediciones registradas en la tabla", async ({ page }) => {
    // LIFO: devuelve un item para este test
    await page.route("**/sensores/lecturas/historial-mediciones*", async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [HISTORIAL_MEDICION_ITEM],
          total: 1,
          page: 1,
          limit: 20,
          rangoAmplio: false,
        }),
      });
    });
    // Cambiar un filtro para disparar un nuevo fetch con la ruta LIFO
    await page.locator("input[type='date']").nth(0).fill("2026-07-01");
    await page.getByRole("button", { name: "Buscar" }).click();

    const row = page.getByRole("row").filter({ hasText: "LOT-2026-001" });
    await expect(row).toBeVisible();
    await expect(row.getByText("Sensor pH Laboratorio")).toBeVisible();
    await expect(row.getByText("Normal")).toBeVisible();
  });

  test("muestra error de validación cuando fecha hasta es anterior a fecha desde", async ({ page }) => {
    await page.locator("input[type='date']").nth(0).fill("2026-08-05");
    await page.locator("input[type='date']").nth(1).fill("2026-08-01");
    await page.getByRole("button", { name: "Buscar" }).click();

    await expect(
      page.getByText("La fecha hasta no puede ser anterior a la fecha desde."),
    ).toBeVisible();
  });

  test("muestra error del servidor al cargar el historial", async ({ page }) => {
    await page.route("**/sensores/lecturas/historial-mediciones*", async (route) => {
      const rt = route.request().resourceType();
      if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
        return route.continue();
      await route.fulfill({ status: 500, body: "" });
    });
    await page.locator("input[type='date']").nth(0).fill("2026-07-01");
    await page.getByRole("button", { name: "Buscar" }).click();

    await expect(
      page.getByText("No se pudo cargar el historial de mediciones."),
    ).toBeVisible();
  });

  test("filtrar por código de lote muestra las mediciones de ese lote", async ({ page }) => {
  // LIFO: devuelve un item cuando se aplica el filtro
  await page.route("**/sensores/lecturas/historial-mediciones*", async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [HISTORIAL_MEDICION_ITEM],
        total: 1,
        page: 1,
        limit: 20,
        rangoAmplio: false,
      }),
    });
  });
  await page.getByPlaceholder("LOTE-1-00001").fill("LOT-2026-001");
  await page.getByRole("button", { name: "Buscar" }).click();

  await expect(
    page.getByRole("row").filter({ hasText: "LOT-2026-001" }),
  ).toBeVisible();
});

test("el botón limpiar filtros aparece al aplicar un filtro y desaparece al limpiarlo", async ({ page }) => {
  // Sin filtros aplicados el botón no existe
  await expect(
    page.getByRole("button", { name: "Limpiar filtros" }),
  ).not.toBeVisible();

  // Aplicar filtro de fecha
  await page.locator("input[type='date']").nth(0).fill("2026-07-01");
  await page.getByRole("button", { name: "Buscar" }).click();

  // Ahora sí aparece
  await expect(
    page.getByRole("button", { name: "Limpiar filtros" }),
  ).toBeVisible();

  // Limpiar → desaparece
  await page.getByRole("button", { name: "Limpiar filtros" }).click();

  await expect(
    page.getByRole("button", { name: "Limpiar filtros" }),
  ).not.toBeVisible();
});

  
});

test(
  "SensoresPage - un usuario sin permiso de ver historial no ve la pestaña de historial de mediciones",
  async ({ page }) => {
    await mockSensoresDeps(page);
    await loginAsOperario(page);
    await page.goto("/sensores");

    await expect(
      page.getByRole("button", { name: "Historial de mediciones" }),
    ).not.toBeVisible();
  },
);

test("SensoresPage - un usuario sin permiso de asociación no ve la sección de reasignación", async ({ page }) => {
  await mockSensoresDeps(page);

  await page.route(/\/sensores\/\d+\/historial/, async (route) => {
    const rt = route.request().resourceType();
    if (route.request().method() !== "GET" || (rt !== "fetch" && rt !== "xhr"))
      return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
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

  await loginAsResponsableProduccion(page);
  await page.goto("/sensores");
  const row = page.getByRole("row").filter({ hasText: "Sensor pH Laboratorio" });
  await row.waitFor();
  await row.getByTitle("Asociación a lote / historial").click();
  await expect(
    page.getByRole("heading", { name: "Asociación a lote — Sensor pH Laboratorio" }),
  ).toBeVisible();

  await expect(page.getByRole("button", { name: "Asociar" })).not.toBeVisible();
});