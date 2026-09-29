import type { BadgeVariant } from "../../../components/ui/Badge";

// HU-71 (Sprint 5, mock visual): "Gestión del hardware de sensores
// relevado en planta". A pedido explícito de la tarea, sin conexión a
// backend todavía (no está desarrollado para esta fecha) — los 18
// dispositivos de acá son la carga inicial del relevamiento (AC2), fijos
// en memoria: el alta/edición del formulario actualiza este mismo arreglo
// en el estado del componente, no hay ningún POST/PATCH real. Cuando el
// backend exponga el módulo de dispositivos, esto se reemplaza por un hook
// conectado — mismo patrón ya aplicado en el resto de los mocks de Sprint 5
// (HU-40, HU-43, HU-45, HU-64).

export type CategoriaDispositivo = "sensor_proceso" | "sensor_estado" | "actuador";

export type EstadoDispositivo =
  | "activo"
  | "inactivo"
  | "en_mantenimiento"
  | "sin_senal"
  | "falla_sensor";

export type TipoSenal = "4-20mA" | "digital" | "analogica";

export type FormaConexion = "directa" | "plc_siemens" | "plc_quemador" | "gateway";

export interface Dispositivo {
  id: number;
  codigo: string; // "D-01"
  nombre: string;
  numeroSerie: string;
  marca: string;
  modelo: string;
  categoria: CategoriaDispositivo;
  equipo: string;
  ubicacionPlanta: string; // ej. "Pasteurizador – entrada de agua caliente"
  tipoSenal: TipoSenal;
  alimentacion: string;
  rangoMin: number;
  rangoMax: number;
  unidad: string;
  fechaCalibracion: string; // ISO date (AAAA-MM-DD)
  formaConexion: FormaConexion;
  // AC2: la conexión real solo es posible para 4 de los 18 dispositivos del
  // relevamiento; el resto se cargaría por ahora vía medición manual.
  conexionPosible: boolean;
  estado: EstadoDispositivo;
  ultimoDato: string | null; // ISO datetime, null = nunca reportó
  bajaLogica: boolean; // HU-48: baja lógica, nunca se elimina físicamente
}

export const CATEGORIA_META: Record<CategoriaDispositivo, { label: string }> = {
  sensor_proceso: { label: "Sensor de proceso" },
  sensor_estado: { label: "Sensor de estado/evento" },
  actuador: { label: "Actuador" },
};

export const ESTADO_META: Record<EstadoDispositivo, { label: string; variant: BadgeVariant }> = {
  activo: { label: "Activo", variant: "success" },
  inactivo: { label: "Inactivo", variant: "neutral" },
  en_mantenimiento: { label: "En mantenimiento", variant: "info" },
  sin_senal: { label: "Sin señal", variant: "warning" },
  falla_sensor: { label: "Falla de sensor", variant: "danger" },
};

export const TIPO_SENAL_LABEL: Record<TipoSenal, string> = {
  "4-20mA": "4-20 mA",
  digital: "Digital",
  analogica: "Analógica",
};

export const FORMA_CONEXION_LABEL: Record<FormaConexion, string> = {
  directa: "Conexión directa",
  plc_siemens: "Vía PLC Siemens",
  plc_quemador: "Vía PLC del quemador",
  gateway: "Vía gateway",
};

export const EQUIPOS = [
  "Pasteurizador",
  "Caudalímetro",
  "Fraccionadora 100 g",
  "Fraccionadora 200 g",
  "Chiller",
  "Soplador de caldera",
] as const;

export const EQUIPO_SECTOR: Record<string, string> = {
  Pasteurizador: "Sala de proceso",
  Caudalímetro: "Línea de recepción",
  "Fraccionadora 100 g": "Envasado",
  "Fraccionadora 200 g": "Envasado",
  Chiller: "Sala de frío",
  "Soplador de caldera": "Sala de calderas",
};

// Días de anticipación para "calibración próxima a vencer" (AC7). Vencida =
// ya pasó la fecha; próxima a vencer = vence dentro de esta ventana.
export const DIAS_AVISO_CALIBRACION = 30;

export function diasHastaCalibracion(fechaCalibracion: string, ahora: Date): number {
  const fecha = new Date(`${fechaCalibracion}T00:00:00`);
  const msPorDia = 1000 * 60 * 60 * 24;
  return Math.round((fecha.getTime() - ahora.getTime()) / msPorDia);
}

// Carga inicial del relevamiento (AC2): 18 dispositivos — 16 sensores y 2
// actuadores — agrupados por equipo. Los estados de falla/sin señal/
// calibración de acá calzan con el prototipo del documento de Sprint 5
// (Figura 6: falla de sensor "Sonda de agua helada — retorno", sin señal
// "Fotocélula de presencia de envase 100 g", calibraciones vencidas de
// "Presión de vapor" / "Temperatura de barra de sellado 100 g" / "Sensor
// de vibración del soplador", próximas a vencer de "Temperatura salida
// pasteurizador" / "Célula de carga dosificadora 100 g" / "Presostato de
// alta"). Las fechas de calibración están calculadas para que esos
// desfasajes (14 d, 42 d, 5 d vencidos / 19 d, 7 d, 23 d por vencer) den
// siempre así sin importar qué día se abra la pantalla.
function fechaRelativa(hoy: Date, diasDesdeHoy: number): string {
  const fecha = new Date(hoy);
  fecha.setDate(fecha.getDate() + diasDesdeHoy);
  return fecha.toISOString().slice(0, 10);
}

function hace(hoy: Date, minutos: number): string {
  return new Date(hoy.getTime() - minutos * 60_000).toISOString();
}

export function construirDispositivosMock(hoy: Date = new Date()): Dispositivo[] {
  return [
    // Pasteurizador — 5 dispositivos
    {
      id: 1,
      codigo: "D-01",
      nombre: "Temperatura entrada pasteurizador",
      numeroSerie: "EH-TR10-44821",
      marca: "Endress+Hauser",
      modelo: "PT100",
      categoria: "sensor_proceso",
      equipo: "Pasteurizador",
      ubicacionPlanta: "Pasteurizador – entrada",
      tipoSenal: "4-20mA",
      alimentacion: "24V DC",
      rangoMin: 0,
      rangoMax: 120,
      unidad: "°C",
      fechaCalibracion: fechaRelativa(hoy, 570), // vigente ~1.5 años
      formaConexion: "directa",
      conexionPosible: true,
      estado: "activo",
      ultimoDato: hace(hoy, 2),
      bajaLogica: false,
    },
    {
      id: 2,
      codigo: "D-02",
      nombre: "Temperatura salida pasteurizador",
      numeroSerie: "EH-TR10-44822",
      marca: "Endress+Hauser",
      modelo: "PT100",
      categoria: "sensor_proceso",
      equipo: "Pasteurizador",
      ubicacionPlanta: "Pasteurizador – final",
      tipoSenal: "4-20mA",
      alimentacion: "24V DC",
      rangoMin: 0,
      rangoMax: 120,
      unidad: "°C",
      fechaCalibracion: fechaRelativa(hoy, 19),
      formaConexion: "directa",
      conexionPosible: true,
      estado: "activo",
      ultimoDato: hace(hoy, 2),
      bajaLogica: false,
    },
    {
      id: 3,
      codigo: "D-03",
      nombre: "Presión de vapor",
      numeroSerie: "IFM-PV-30051",
      marca: "ifm",
      modelo: "SM2100",
      categoria: "sensor_proceso",
      equipo: "Pasteurizador",
      ubicacionPlanta: "Pasteurizador – línea de vapor",
      tipoSenal: "4-20mA",
      alimentacion: "24V DC",
      rangoMin: 0,
      rangoMax: 10,
      unidad: "bar",
      fechaCalibracion: fechaRelativa(hoy, -14),
      formaConexion: "plc_quemador",
      conexionPosible: false,
      estado: "activo",
      ultimoDato: hace(hoy, 6),
      bajaLogica: false,
    },
    {
      id: 4,
      codigo: "D-04",
      nombre: "Presostato de alta",
      numeroSerie: "IFM-PA-30052",
      marca: "ifm",
      modelo: "PK6224",
      categoria: "sensor_estado",
      equipo: "Pasteurizador",
      ubicacionPlanta: "Pasteurizador – línea de vapor",
      tipoSenal: "digital",
      alimentacion: "24V DC",
      rangoMin: 0,
      rangoMax: 1,
      unidad: "on/off",
      fechaCalibracion: fechaRelativa(hoy, 23),
      formaConexion: "plc_quemador",
      conexionPosible: false,
      estado: "activo",
      ultimoDato: hace(hoy, 8),
      bajaLogica: false,
    },
    {
      id: 5,
      codigo: "D-05",
      nombre: "Válvula lineal de vapor",
      numeroSerie: "SIE-VL-90011",
      marca: "Siemens",
      modelo: "SKD32",
      categoria: "actuador",
      equipo: "Pasteurizador",
      ubicacionPlanta: "Pasteurizador – línea de vapor",
      tipoSenal: "analogica",
      alimentacion: "230V AC",
      rangoMin: 0,
      rangoMax: 100,
      unidad: "% apertura",
      fechaCalibracion: fechaRelativa(hoy, 300),
      formaConexion: "plc_siemens",
      conexionPosible: false,
      estado: "activo",
      ultimoDato: null,
      bajaLogica: false,
    },

    // Caudalímetro — 2 dispositivos
    {
      id: 6,
      codigo: "D-06",
      nombre: "Caudal de leche entrante",
      numeroSerie: "IFM-CQ-51201",
      marca: "ifm",
      modelo: "SM2100",
      categoria: "sensor_proceso",
      equipo: "Caudalímetro",
      ubicacionPlanta: "Recepción – línea principal",
      tipoSenal: "4-20mA",
      alimentacion: "24V DC",
      rangoMin: 0,
      rangoMax: 5000,
      unidad: "L/h",
      fechaCalibracion: fechaRelativa(hoy, 200),
      formaConexion: "directa",
      conexionPosible: true,
      estado: "activo",
      ultimoDato: hace(hoy, 1),
      bajaLogica: false,
    },
    {
      id: 7,
      codigo: "D-07",
      nombre: "Caudal de retorno",
      numeroSerie: "IFM-CQ-51202",
      marca: "ifm",
      modelo: "SM2100",
      categoria: "sensor_proceso",
      equipo: "Caudalímetro",
      ubicacionPlanta: "Recepción – retorno",
      tipoSenal: "4-20mA",
      alimentacion: "24V DC",
      rangoMin: 0,
      rangoMax: 5000,
      unidad: "L/h",
      fechaCalibracion: fechaRelativa(hoy, 200),
      formaConexion: "plc_siemens",
      conexionPosible: false,
      estado: "activo",
      ultimoDato: hace(hoy, 40),
      bajaLogica: false,
    },

    // Fraccionadora 100 g — 4 dispositivos
    {
      id: 8,
      codigo: "D-08",
      nombre: "Fotocélula de presencia de envase 100 g",
      numeroSerie: "PAN-FT-71001",
      marca: "Panasonic",
      modelo: "CX-441",
      categoria: "sensor_estado",
      equipo: "Fraccionadora 100 g",
      ubicacionPlanta: "Envasado – línea 100 g",
      tipoSenal: "digital",
      alimentacion: "24V DC",
      rangoMin: 0,
      rangoMax: 1,
      unidad: "on/off",
      fechaCalibracion: fechaRelativa(hoy, 150),
      formaConexion: "plc_siemens",
      conexionPosible: false,
      estado: "sin_senal",
      ultimoDato: hace(hoy, 60 * 26),
      bajaLogica: false,
    },
    {
      id: 9,
      codigo: "D-09",
      nombre: "Temperatura de barra de sellado 100 g",
      numeroSerie: "EH-TR10-71002",
      marca: "Endress+Hauser",
      modelo: "PT100",
      categoria: "sensor_proceso",
      equipo: "Fraccionadora 100 g",
      ubicacionPlanta: "Envasado – sellado 100 g",
      tipoSenal: "4-20mA",
      alimentacion: "24V DC",
      rangoMin: 0,
      rangoMax: 200,
      unidad: "°C",
      fechaCalibracion: fechaRelativa(hoy, -42),
      formaConexion: "gateway",
      conexionPosible: false,
      estado: "activo",
      ultimoDato: hace(hoy, 5),
      bajaLogica: false,
    },
    {
      id: 10,
      codigo: "D-10",
      nombre: "Célula de carga dosificadora 100 g",
      numeroSerie: "IFM-CC-71003",
      marca: "ifm",
      modelo: "KQ6102",
      categoria: "sensor_proceso",
      equipo: "Fraccionadora 100 g",
      ubicacionPlanta: "Envasado – dosificadora 100 g",
      tipoSenal: "analogica",
      alimentacion: "24V DC",
      rangoMin: 0,
      rangoMax: 500,
      unidad: "g",
      fechaCalibracion: fechaRelativa(hoy, 7),
      formaConexion: "gateway",
      conexionPosible: false,
      estado: "activo",
      ultimoDato: hace(hoy, 3),
      bajaLogica: false,
    },
    {
      id: 11,
      codigo: "D-11",
      nombre: "Sensor inductivo de envase 100 g",
      numeroSerie: "IFM-SI-71004",
      marca: "ifm",
      modelo: "IE5352",
      categoria: "sensor_estado",
      equipo: "Fraccionadora 100 g",
      ubicacionPlanta: "Envasado – línea 100 g",
      tipoSenal: "digital",
      alimentacion: "24V DC",
      rangoMin: 0,
      rangoMax: 1,
      unidad: "on/off",
      fechaCalibracion: fechaRelativa(hoy, 150),
      formaConexion: "plc_siemens",
      conexionPosible: false,
      estado: "activo",
      ultimoDato: hace(hoy, 4),
      bajaLogica: false,
    },

    // Fraccionadora 200 g — 3 dispositivos
    {
      id: 12,
      codigo: "D-12",
      nombre: "Fotocélula de presencia de envase 200 g",
      numeroSerie: "PAN-FT-72001",
      marca: "Panasonic",
      modelo: "CX-441",
      categoria: "sensor_estado",
      equipo: "Fraccionadora 200 g",
      ubicacionPlanta: "Envasado – línea 200 g",
      tipoSenal: "digital",
      alimentacion: "24V DC",
      rangoMin: 0,
      rangoMax: 1,
      unidad: "on/off",
      fechaCalibracion: fechaRelativa(hoy, 150),
      formaConexion: "plc_siemens",
      conexionPosible: false,
      estado: "activo",
      ultimoDato: hace(hoy, 3),
      bajaLogica: false,
    },
    {
      id: 13,
      codigo: "D-13",
      nombre: "Sensor reflectivo de tapa 200 g",
      numeroSerie: "PAN-RF-72002",
      marca: "Panasonic",
      modelo: "CX-442",
      categoria: "sensor_estado",
      equipo: "Fraccionadora 200 g",
      ubicacionPlanta: "Envasado – línea 200 g",
      tipoSenal: "digital",
      alimentacion: "24V DC",
      rangoMin: 0,
      rangoMax: 1,
      unidad: "on/off",
      fechaCalibracion: fechaRelativa(hoy, 30),
      formaConexion: "plc_siemens",
      conexionPosible: false,
      estado: "inactivo",
      ultimoDato: hace(hoy, 60 * 24 * 90),
      // HU-48: dado de baja lógica — reemplazado por el sensor inductivo,
      // pero sigue existiendo (nunca se elimina) y su historial es
      // consultable si se tilda "Incluir dados de baja".
      bajaLogica: true,
    },
    {
      id: 14,
      codigo: "D-14",
      nombre: "Solenoide de salida 200 g",
      numeroSerie: "SIE-SL-72003",
      marca: "Siemens",
      modelo: "MXG461",
      categoria: "actuador",
      equipo: "Fraccionadora 200 g",
      ubicacionPlanta: "Envasado – línea 200 g",
      tipoSenal: "digital",
      alimentacion: "24V DC",
      rangoMin: 0,
      rangoMax: 1,
      unidad: "on/off",
      fechaCalibracion: fechaRelativa(hoy, 300),
      formaConexion: "plc_siemens",
      conexionPosible: false,
      estado: "activo",
      ultimoDato: null,
      bajaLogica: false,
    },

    // Chiller — 2 dispositivos
    {
      id: 15,
      codigo: "D-15",
      nombre: "Sonda de agua helada — retorno",
      numeroSerie: "EH-TR10-81001",
      marca: "Endress+Hauser",
      modelo: "PT100",
      categoria: "sensor_proceso",
      equipo: "Chiller",
      ubicacionPlanta: "Chiller – retorno",
      tipoSenal: "4-20mA",
      alimentacion: "24V DC",
      rangoMin: -10,
      rangoMax: 40,
      unidad: "°C",
      fechaCalibracion: fechaRelativa(hoy, 100),
      formaConexion: "directa",
      conexionPosible: true,
      estado: "falla_sensor",
      ultimoDato: hace(hoy, 15),
      bajaLogica: false,
    },
    {
      id: 16,
      codigo: "D-16",
      nombre: "Sonda de agua helada — envío",
      numeroSerie: "EH-TR10-81002",
      marca: "Endress+Hauser",
      modelo: "PT100",
      categoria: "sensor_proceso",
      equipo: "Chiller",
      ubicacionPlanta: "Chiller – envío",
      tipoSenal: "4-20mA",
      alimentacion: "24V DC",
      rangoMin: -10,
      rangoMax: 40,
      unidad: "°C",
      fechaCalibracion: fechaRelativa(hoy, 100),
      formaConexion: "directa",
      conexionPosible: true,
      estado: "activo",
      ultimoDato: hace(hoy, 3),
      bajaLogica: false,
    },

    // Soplador de caldera — 2 dispositivos
    {
      id: 17,
      codigo: "D-17",
      nombre: "Sensor de vibración del soplador",
      numeroSerie: "IFM-VB-91001",
      marca: "ifm",
      modelo: "VSE100",
      categoria: "sensor_estado",
      equipo: "Soplador de caldera",
      ubicacionPlanta: "Sala de calderas – soplador",
      tipoSenal: "analogica",
      alimentacion: "24V DC",
      rangoMin: 0,
      rangoMax: 20,
      unidad: "mm/s",
      fechaCalibracion: fechaRelativa(hoy, -5),
      formaConexion: "plc_quemador",
      conexionPosible: false,
      estado: "activo",
      ultimoDato: hace(hoy, 10),
      bajaLogica: false,
    },
    {
      id: 18,
      codigo: "D-18",
      nombre: "Detector de llama",
      numeroSerie: "SIE-DL-91002",
      marca: "Siemens",
      modelo: "QRA53",
      categoria: "sensor_estado",
      equipo: "Soplador de caldera",
      ubicacionPlanta: "Sala de calderas – quemador",
      tipoSenal: "digital",
      alimentacion: "230V AC",
      rangoMin: 0,
      rangoMax: 1,
      unidad: "on/off",
      fechaCalibracion: fechaRelativa(hoy, 300),
      formaConexion: "plc_quemador",
      conexionPosible: false,
      estado: "activo",
      ultimoDato: hace(hoy, 2),
      bajaLogica: false,
    },
  ];
}
