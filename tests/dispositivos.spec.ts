import { test, expect, type Page } from "./fixtures/coverageFixtures.ts";
import { loginAsAdministrador, loginAsGerente } from "./fixtures/mockAuth.ts";

// HU-71: gestión del hardware de sensores relevado en planta. Es un mock
// visual (construirDispositivosMock en constants/dispositivos.ts, estado en
// memoria): no hay endpoints, así que acá no se mockea ninguno — se prueba
// la UI contra la carga inicial del relevamiento (AC2).
//
// Las fechas del mock son relativas a "hoy". Se fija el reloj a las 10:00
// de Córdoba: diasHastaCalibracion redondea la diferencia contra la hora
// actual y desde el mediodía da un día menos (ver hallazgos), así los
// conteos quedan iguales al prototipo del documento (14 d vencida, 19 d por
// vencer, etc.) sin depender de a qué hora corre el test.
test.use({ timezoneId: "America/Argentina/Cordoba", locale: "es-AR" });

const AHORA = new Date("2026-10-10T10:00:00-03:00");

async function abrirDispositivos(page: Page) {
  await page.clock.setFixedTime(AHORA);
  await loginAsAdministrador(page);
  await page.goto("/dispositivos");
  await expect(page.getByRole("heading", { name: "Dispositivos" })).toBeVisible();
}

const fila = (page: Page, nombre: string) => page.getByRole("row", { name: new RegExp(nombre) });
const filas = (page: Page) => page.locator("tbody tr");
const filtro = (page: Page, label: string) => page.getByLabel(label, { exact: true });
const modal = (page: Page) => page.getByRole("dialog");

async function completarAlta(page: Page, valores: Partial<Record<string, string>> = {}) {
  const v = {
    "Nombre *": "Temperatura de tanque de leche cruda",
    "Número de serie *": "EH-TR10-99001",
    "Marca *": "Endress+Hauser",
    "Modelo *": "PT100",
    "Ubicación en planta *": "Recepción – tanque 1",
    "Rango mínimo *": "-5",
    "Rango máximo *": "40",
    "Unidad *": "°C",
    ...valores,
  };
  for (const [label, valor] of Object.entries(v)) {
    await modal(page).getByLabel(label, { exact: true }).fill(valor ?? "");
  }
}

test.describe("DispositivosPage (HU-71) › Acceso", () => {
  test("el Administrador ve 'Dispositivos' en el menú y entra a la pantalla", async ({ page }) => {
    await page.clock.setFixedTime(AHORA);
    await loginAsAdministrador(page);

    await page.getByRole("complementary").getByRole("button", { name: "Dispositivos", exact: true }).click();

    await expect(page).toHaveURL("/dispositivos");
    await expect(page.getByRole("heading", { name: "Dispositivos" })).toBeVisible();
  });

  test("un rol de empresa no ve la opción y la ruta responde acceso no autorizado", async ({ page }) => {
    await loginAsGerente(page);

    await expect(page.getByRole("complementary").getByRole("button", { name: "Dispositivos" })).toHaveCount(0);

    await page.goto("/dispositivos");
    await expect(page.getByRole("heading", { name: "Acceso no autorizado" })).toBeVisible();
  });
});

test.describe("DispositivosPage (HU-71) › Inventario", () => {
  test.beforeEach(async ({ page }) => {
    await abrirDispositivos(page);
  });

  test("muestra los contadores del relevamiento sin contar los dados de baja", async ({ page }) => {
    await expect(
      page.getByText("17 dispositivos en servicio · 15 sensores y 2 actuadores · 1 dado de baja"),
    ).toBeVisible();
    await expect(filas(page)).toHaveCount(17);
  });

  test("agrupa los dispositivos por equipo con su sector y cantidad", async ({ page }) => {
    for (const [equipo, sector, cantidad] of [
      ["Pasteurizador", "Sala de proceso", 5],
      ["Caudalímetro", "Línea de recepción", 2],
      ["Fraccionadora 100 g", "Envasado", 4],
      // El dado de baja no se muestra por defecto: 2 de 3.
      ["Fraccionadora 200 g", "Envasado", 2],
      ["Chiller", "Sala de frío", 2],
      ["Soplador de caldera", "Sala de calderas", 2],
    ] as const) {
      const grupo = page.locator("div.rounded-xl").filter({ has: page.getByText(equipo, { exact: true }) });
      await expect(grupo).toContainText(sector);
      await expect(grupo).toContainText(`${cantidad} dispositivos`);
      await expect(grupo.locator("tbody tr")).toHaveCount(cantidad);
    }
  });

  test("cada fila muestra código, serie, categoría, estado y origen del dato", async ({ page }) => {
    const entrada = fila(page, "Temperatura entrada pasteurizador");
    await expect(entrada).toContainText("D-01 · EH-TR10-44821");
    await expect(entrada).toContainText("Sensor de proceso");
    await expect(entrada).toContainText("Activo");
    await expect(entrada).toContainText("Conexión directa posible");

    const presostato = fila(page, "Presostato de alta");
    await expect(presostato).toContainText("Sensor de estado/evento");
    await expect(presostato).toContainText("Carga manual");

    await expect(fila(page, "Sonda de agua helada — retorno")).toContainText("Falla de sensor");
    await expect(fila(page, "Fotocélula de presencia de envase 100 g")).toContainText("Sin señal");
  });

  test("el último dato se muestra relativo a ahora y los actuadores figuran sin reportes", async ({ page }) => {
    await expect(fila(page, "Temperatura entrada pasteurizador")).toContainText(/09:58.*\(hace 2 min\)/);
    await expect(fila(page, "Caudal de retorno")).toContainText("(hace 40 min)");
    // 26 h → se muestra la fecha y los días.
    await expect(fila(page, "Fotocélula de presencia de envase 100 g")).toContainText("9/10/2026 (hace 1 d)");
    await expect(fila(page, "Válvula lineal de vapor")).toContainText("Sin reportes");
  });

  test("la calibración se marca vencida, próxima a vencer o vigente", async ({ page }) => {
    await expect(fila(page, "Presión de vapor")).toContainText("Vencida hace 14 d");
    await expect(fila(page, "Sensor de vibración del soplador")).toContainText("Vencida hace 5 d");
    await expect(fila(page, "Temperatura salida pasteurizador")).toContainText("Vence en 19 d");
    await expect(fila(page, "Célula de carga dosificadora 100 g")).toContainText("Vence en 7 d");
    // +570 días.
    await expect(fila(page, "Temperatura entrada pasteurizador")).toContainText("Vigente hasta 2/5/2028");
  });

  test("resume fallas, falta de señal y calibraciones en el encabezado", async ({ page }) => {
    await expect(page.getByText("Falla de sensor: 1 dispositivo", { exact: true })).toBeVisible();
    await expect(page.getByText("Sin señal: 1 dispositivo", { exact: true })).toBeVisible();
    await expect(page.getByText("Calibración vencida: 3 dispositivos")).toBeVisible();
    await expect(
      page.getByText(
        "Presión de vapor (calibración vencida hace 14 d) · Temperatura de barra de sellado 100 g (calibración vencida hace 42 d) · Sensor de vibración del soplador (calibración vencida hace 5 d)",
      ),
    ).toBeVisible();
    // El dado de baja (vence en 30 d) no cuenta.
    await expect(page.getByText("Calibración próxima a vencer: 3 dispositivos")).toBeVisible();
    await expect(page.getByText(/Célula de carga dosificadora 100 g \(calibración vence en 7 d\)/)).toBeVisible();
  });

  test("'Ver' en un aviso lleva el filtro de equipo al del dispositivo", async ({ page }) => {
    // El contenedor más interno que tiene el título del aviso y su botón.
    const aviso = page
      .locator("div")
      .filter({ has: page.getByText("Falla de sensor: 1 dispositivo", { exact: true }) })
      .filter({ has: page.getByRole("button", { name: "Ver", exact: true }) })
      .last();
    await aviso.getByRole("button", { name: "Ver", exact: true }).click();

    await expect(filtro(page, "Equipo")).toHaveValue("Chiller");
    // Al elegir otro equipo a mano, el filtro vuelve a mandar.
    await filtro(page, "Equipo").selectOption("Pasteurizador");
    await expect(filtro(page, "Equipo")).toHaveValue("Pasteurizador");
    await expect(filas(page)).toHaveCount(5);
  });
});

test.describe("DispositivosPage (HU-71) › Filtros", () => {
  test.beforeEach(async ({ page }) => {
    await abrirDispositivos(page);
  });

  test("filtra por equipo", async ({ page }) => {
    await filtro(page, "Equipo").selectOption("Chiller");

    await expect(filas(page)).toHaveCount(2);
    await expect(fila(page, "Sonda de agua helada — retorno")).toBeVisible();
    await expect(fila(page, "Sonda de agua helada — envío")).toBeVisible();
  });

  test("filtra por categoría: los actuadores quedan solo como inventario", async ({ page }) => {
    await filtro(page, "Categoría").selectOption({ label: "Actuador" });

    await expect(filas(page)).toHaveCount(2);
    await expect(fila(page, "Válvula lineal de vapor")).toBeVisible();
    await expect(fila(page, "Solenoide de salida 200 g")).toBeVisible();
  });

  test("filtra por estado", async ({ page }) => {
    await filtro(page, "Estado").selectOption({ label: "Falla de sensor" });

    await expect(filas(page)).toHaveCount(1);
    await expect(fila(page, "Sonda de agua helada — retorno")).toBeVisible();
  });

  test("combina filtros y avisa cuando no hay resultados", async ({ page }) => {
    await filtro(page, "Equipo").selectOption("Pasteurizador");
    await filtro(page, "Categoría").selectOption({ label: "Sensor de estado/evento" });
    await expect(filas(page)).toHaveCount(1);
    await expect(fila(page, "Presostato de alta")).toBeVisible();

    await filtro(page, "Estado").selectOption({ label: "En mantenimiento" });
    await expect(page.getByText("No se encontraron dispositivos")).toBeVisible();
    await expect(page.getByText("Probá ajustar los filtros seleccionados.")).toBeVisible();
    await expect(filas(page)).toHaveCount(0);
  });

  test("'Incluir dados de baja' muestra los dispositivos con baja lógica", async ({ page }) => {
    await expect(fila(page, "Sensor reflectivo de tapa 200 g")).toHaveCount(0);

    await page.getByLabel("Incluir dados de baja").check();

    await expect(filas(page)).toHaveCount(18);
    await expect(fila(page, "Sensor reflectivo de tapa 200 g")).toContainText("(dado de baja)");
    await expect(fila(page, "Sensor reflectivo de tapa 200 g")).toContainText("Inactivo");
  });
});

test.describe("DispositivosPage (HU-71) › Ficha del dispositivo", () => {
  test.beforeEach(async ({ page }) => {
    await abrirDispositivos(page);
  });

  test("muestra la ficha completa de un sensor", async ({ page }) => {
    await page.getByRole("button", { name: "Ver Temperatura entrada pasteurizador" }).click();

    const ficha = modal(page);
    await expect(ficha.getByRole("heading", { name: "Temperatura entrada pasteurizador" })).toBeVisible();
    await expect(ficha).toContainText("D-01 · EH-TR10-44821");
    for (const texto of [
      "Activo",
      "Sensor de proceso",
      "Endress+Hauser",
      "PT100",
      "Pasteurizador – entrada",
      "Conexión directa",
      "Conexión directa posible",
      "4-20 mA",
      "24V DC",
      "0 a 120 °C",
      "2/5/2028",
    ]) {
      await expect(ficha).toContainText(texto);
    }
    await expect(ficha).toContainText(/10\/10\/2026,? 0?9:58/);
    await expect(ficha).not.toContainText("Sin acciones de comando");

    await ficha.getByRole("button", { name: "Cerrar" }).click();
    await expect(modal(page)).toHaveCount(0);
  });

  test("la ficha de un actuador aclara que no tiene acciones de comando", async ({ page }) => {
    await page.getByRole("button", { name: "Ver Válvula lineal de vapor" }).click();

    const ficha = modal(page);
    await expect(ficha).toContainText("Actuador");
    await expect(ficha).toContainText("Sin acciones de comando disponibles desde la plataforma.");
    await expect(ficha).toContainText("Vía PLC Siemens");
    await expect(ficha).toContainText("Carga manual");
    await expect(ficha).toContainText("Sin reportes");
  });

  test("la ficha de un dispositivo dado de baja lo indica", async ({ page }) => {
    await page.getByLabel("Incluir dados de baja").check();
    await page.getByRole("button", { name: "Ver Sensor reflectivo de tapa 200 g" }).click();

    await expect(modal(page)).toContainText("Dado de baja");
    await expect(modal(page)).toContainText("Inactivo");

    // Escape también cierra la ficha.
    await page.keyboard.press("Escape");
    await expect(modal(page)).toHaveCount(0);
  });
});

test.describe("DispositivosPage (HU-71) › Alta", () => {
  test.beforeEach(async ({ page }) => {
    await abrirDispositivos(page);
    await page.getByRole("button", { name: "Nuevo dispositivo" }).click();
    await expect(modal(page).getByRole("heading", { name: "Nuevo dispositivo" })).toBeVisible();
  });

  test("registra un dispositivo nuevo y lo suma al inventario", async ({ page }) => {
    await expect(modal(page)).toContainText("Registrá un sensor o actuador relevado en planta");
    await completarAlta(page);
    await modal(page).getByLabel("Equipo *").selectOption("Caudalímetro");
    await modal(page).getByLabel("Forma de conexión *").selectOption({ label: "Vía gateway" });
    await modal(page).getByLabel("Tipo de señal *").selectOption({ label: "Analógica" });
    await modal(page).getByLabel("Fecha de calibración *").fill("2027-01-15");
    await modal(page).getByRole("button", { name: "Registrar dispositivo" }).click();

    await expect(modal(page)).toHaveCount(0);
    const nuevo = fila(page, "Temperatura de tanque de leche cruda");
    await expect(nuevo).toContainText("D-19 · EH-TR10-99001");
    await expect(nuevo).toContainText("Activo");
    await expect(nuevo).toContainText("Sin reportes");
    await expect(nuevo).toContainText("Carga manual");
    await expect(nuevo).toContainText("Vigente hasta 15/1/2027");
    await expect(
      page.getByText("18 dispositivos en servicio · 16 sensores y 2 actuadores · 1 dado de baja"),
    ).toBeVisible();
    const caudalimetro = page.locator("div.rounded-xl").filter({ has: page.getByText("Caudalímetro", { exact: true }) });
    await expect(caudalimetro).toContainText("3 dispositivos");

    // La ficha muestra "—" cuando no se cargó la alimentación.
    await page.getByRole("button", { name: "Ver Temperatura de tanque de leche cruda" }).click();
    await expect(modal(page)).toContainText("Alimentación—");
    await expect(modal(page)).toContainText("-5 a 40 °C");
    await expect(modal(page)).toContainText("Vía gateway");
    await expect(modal(page)).toContainText("Analógica");
  });

  test("valida todos los campos obligatorios", async ({ page }) => {
    await modal(page).getByRole("button", { name: "Registrar dispositivo" }).click();

    for (const error of [
      "El nombre es obligatorio",
      "El número de serie es obligatorio",
      "La marca es obligatoria",
      "El modelo es obligatorio",
      "La ubicación en planta es obligatoria",
      "La unidad es obligatoria",
    ]) {
      await expect(modal(page).getByText(error)).toBeVisible();
    }
    await expect(modal(page).getByText("Ingresá un valor numérico")).toHaveCount(2);
    await expect(modal(page)).toBeVisible();

    // Solo espacios cuenta como vacío.
    await modal(page).getByLabel("Nombre *").fill("   ");
    await modal(page).getByRole("button", { name: "Registrar dispositivo" }).click();
    await expect(modal(page).getByText("El nombre es obligatorio")).toBeVisible();
  });

  test("la fecha de calibración es obligatoria", async ({ page }) => {
    await completarAlta(page);
    await modal(page).getByLabel("Fecha de calibración *").fill("");
    await modal(page).getByRole("button", { name: "Registrar dispositivo" }).click();

    await expect(modal(page).getByText("La fecha de calibración es obligatoria")).toBeVisible();
    await expect(fila(page, "Temperatura de tanque de leche cruda")).toHaveCount(0);
  });

  test("el rango máximo tiene que ser mayor al mínimo", async ({ page }) => {
    await completarAlta(page, { "Rango mínimo *": "10", "Rango máximo *": "10" });
    await modal(page).getByRole("button", { name: "Registrar dispositivo" }).click();
    await expect(modal(page).getByText("Debe ser mayor al mínimo")).toBeVisible();

    await modal(page).getByLabel("Rango máximo *").fill("9.5");
    await modal(page).getByRole("button", { name: "Registrar dispositivo" }).click();
    await expect(modal(page).getByText("Debe ser mayor al mínimo")).toBeVisible();

    // Límite: apenas por encima del mínimo ya es válido.
    await modal(page).getByLabel("Rango máximo *").fill("10.01");
    await modal(page).getByRole("button", { name: "Registrar dispositivo" }).click();
    await expect(modal(page)).toHaveCount(0);
    await expect(fila(page, "Temperatura de tanque de leche cruda")).toBeVisible();
  });

  test("no permite repetir un número de serie, sin importar mayúsculas ni espacios", async ({ page }) => {
    await completarAlta(page, { "Número de serie *": "  eh-tr10-44821  " });
    await modal(page).getByRole("button", { name: "Registrar dispositivo" }).click();

    await expect(modal(page).getByText("Ya existe un dispositivo con este número de serie")).toBeVisible();
    await expect(fila(page, "Temperatura de tanque de leche cruda")).toHaveCount(0);
  });

  test("cancelar no agrega nada y al reabrir el formulario está limpio", async ({ page }) => {
    await completarAlta(page);
    await modal(page).getByRole("button", { name: "Cancelar" }).click();

    await expect(modal(page)).toHaveCount(0);
    await expect(filas(page)).toHaveCount(17);

    await page.getByRole("button", { name: "Nuevo dispositivo" }).click();
    await expect(modal(page).getByLabel("Nombre *")).toHaveValue("");
    await expect(modal(page).getByLabel("Número de serie *")).toHaveValue("");
  });
});

test.describe("DispositivosPage (HU-71) › Edición", () => {
  test.beforeEach(async ({ page }) => {
    await abrirDispositivos(page);
  });

  test("precarga los datos y guarda los cambios en el inventario", async ({ page }) => {
    await page.getByRole("button", { name: "Editar Caudal de retorno" }).click();

    await expect(modal(page).getByRole("heading", { name: "Editar dispositivo" })).toBeVisible();
    await expect(modal(page)).toContainText("Actualizá los datos de Caudal de retorno");
    await expect(modal(page).getByLabel("Nombre *")).toHaveValue("Caudal de retorno");
    await expect(modal(page).getByLabel("Número de serie *")).toHaveValue("IFM-CQ-51202");
    await expect(modal(page).getByLabel("Rango máximo *")).toHaveValue("5000");
    await expect(modal(page).getByLabel("Forma de conexión *")).toHaveValue("plc_siemens");

    await modal(page).getByLabel("Nombre *").fill("Caudal de retorno a silo");
    await modal(page).getByRole("button", { name: "Guardar cambios" }).click();

    await expect(modal(page)).toHaveCount(0);
    const editado = fila(page, "Caudal de retorno a silo");
    // Conserva código, estado y origen.
    await expect(editado).toContainText("D-07 · IFM-CQ-51202");
    await expect(editado).toContainText("Activo");
    await expect(filas(page)).toHaveCount(17);
  });

  test("su propio número de serie no cuenta como duplicado, el de otro sí", async ({ page }) => {
    await page.getByRole("button", { name: "Editar Caudal de retorno" }).click();
    await modal(page).getByLabel("Número de serie *").fill("IFM-CQ-51201");
    await modal(page).getByRole("button", { name: "Guardar cambios" }).click();
    await expect(modal(page).getByText("Ya existe un dispositivo con este número de serie")).toBeVisible();

    await modal(page).getByLabel("Número de serie *").fill("IFM-CQ-51202");
    await modal(page).getByRole("button", { name: "Guardar cambios" }).click();
    await expect(modal(page)).toHaveCount(0);
  });

  test("recalibrar un dispositivo vencido actualiza su estado y el resumen", async ({ page }) => {
    await page.getByRole("button", { name: "Editar Presión de vapor" }).click();
    await modal(page).getByLabel("Fecha de calibración *").fill("2027-10-10");
    await modal(page).getByRole("button", { name: "Guardar cambios" }).click();

    await expect(fila(page, "Presión de vapor")).toContainText("Vigente hasta 10/10/2027");
    await expect(page.getByText("Calibración vencida: 2 dispositivos")).toBeVisible();
    await expect(page.getByText(/Presión de vapor \(calibración vencida/)).toHaveCount(0);
  });
});

test.describe("DispositivosPage (HU-71) › Reloj", () => {
  test("el último dato se actualiza solo con el paso del tiempo", async ({ page }) => {
    await page.clock.install({ time: AHORA });
    await loginAsAdministrador(page);
    await page.goto("/dispositivos");
    await expect(fila(page, "Caudal de leche entrante")).toContainText("(hace 1 min)");

    // La pantalla recalcula cada 15 s. Se avanza una hora en tramos con
    // actividad del usuario: si no, el cierre por inactividad (30 min) lo
    // saca de la sesión.
    for (let i = 0; i < 3; i++) {
      await page.clock.fastForward("20:00");
      await page.mouse.move(100 + i * 10, 200);
    }

    await expect(fila(page, "Caudal de leche entrante")).toContainText("(hace 1 h)");
  });
});
