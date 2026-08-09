// Espeja el módulo real de Sensores en optilacteo-backend
// (src/module/sensor: entities, DTOs, enums), mergeado en develop
// (HU-17 registro de sensores + HU-33 asociación sensor-lote).
import type { Parametro } from "./configParametro.types";
import type { TrazabilidadEntidad } from "./auditoria.types";

export enum TipoSensor {
  DIGITAL = "digital",
  ANALOGICO = "analogico",
  MANUAL = "manual",
}

export enum EstadoSensor {
  ACTIVO = "activo",
  INACTIVO = "inactivo",
  FALLA = "falla",
}

// Ubicación física fija del sensor: obligatoria al alta, no editable
// (no aparece en UpdateSensorDto). Determina qué sensores se sugieren
// al crear un lote con esa misma ubicación inicial (ver lote.types.ts).
export enum Ubicacion {
  CALDERA = "caldera",
  LABORATORIO = "laboratorio",
  CAMARA_FRIGORIFICA_1 = "camara_frigorifica_1",
  CAMARA_FRIGORIFICA_2 = "camara_frigorifica_2",
  SECTOR_ENVASADO = "sector_envasado",
  SECTOR_SELLADO = "sector_sellado",
  SECTOR_EMBALAJE = "sector_embalaje",
}

export interface Sensor {
  id: number;
  nombre: string;
  marca: string;
  tipo: TipoSensor;
  parametro: Parametro;
  ubicacion: Ubicacion;
  rangoMinFavor: number;
  rangoMaxFavor: number;
  estado: EstadoSensor;
  ultimaLectura?: string | null;
  // Derivado del historial de asociaciones, no es una columna propia del sensor.
  loteActualId?: number | null;
  empresaId: number;
  createdAt: string;
  updatedAt: string;
  // HU-63: quién creó el sensor y, si aplica, quién lo modificó por última
  // vez. El backend lo manda para cualquier rol que pueda leer /sensores —
  // la restricción a Gerente/Administrador se aplica en el frontend (ver
  // puedeVerAuditoria).
  auditoria?: TrazabilidadEntidad;
}

// El backend no acepta "estado" ni "codigo" en el alta: el estado arranca
// siempre en ACTIVO y el sensor no tiene identificador manual.
export interface CreateSensorDto {
  nombre: string;
  marca: string;
  tipo: TipoSensor;
  parametro: Parametro;
  ubicacion: Ubicacion;
  rangoMinFavor: number;
  rangoMaxFavor: number;
}

// UpdateSensorDto real = PartialType(OmitType(CreateSensorDto, ['ubicacion'])):
// la ubicación no se puede cambiar una vez creado el sensor. El estado se
// cambia por endpoints dedicados (DELETE para baja lógica, PATCH /activar
// para reactivar, ver sensorService.desactivar/activar), no por este DTO.
export type UpdateSensorDto = Partial<Omit<CreateSensorDto, "ubicacion">>;

export interface SensorFilterQuery {
  nombre?: string;
  marca?: string;
  tipo?: TipoSensor;
  parametro?: Parametro;
  estado?: EstadoSensor;
  ubicacion?: Ubicacion;
}

export interface SensorLoteHistorial {
  id: number;
  sensorId: number;
  loteIdAnterior: number | null; // null si es la primera asociación del sensor
  loteIdNuevo: number;
  userId: number;
  userEmail?: string; // puede faltar en historial viejo o si el usuario fue borrado
  fecha: string; // ISO datetime
}

// Espeja OrigenLectura en optilacteo-backend
// (src/module/lectura-sensor/enums/origen-lectura.enum.ts, HU-15).
export enum OrigenLectura {
  SENSOR = "sensor",
  MANUAL = "manual",
}

// Payloads del WS /sensores (HU-13, LecturasGateway en el backend). Es el
// mismo LecturaResponseDto que devuelve tanto la ingesta automática
// (POST /sensores/lecturas) como el fallback manual (HU-15,
// POST /sensores/lecturas/manual) - no son parte del modelo Sensor: solo
// llegan en vivo o como respuesta de esos dos POST, nunca por GET /sensores.
export interface LecturaNuevaEvent {
  id: number;
  sensorId: number;
  loteId: number;
  valor: number;
  timestampLectura: string;
  empresaId: number;
  origen: OrigenLectura;
  usuarioId: number | null;
  createdAt: string;
}

export interface SensorFallaEvent {
  sensorId: number;
  nombre: string;
}

export type SensorRecuperadoEvent = SensorFallaEvent;

// HU-15: fallback manual mientras el sensor no está ACTIVO (inactivo o en
// falla). El backend resuelve loteId a partir de la última asociación del
// sensor (sensor_lote_historial), por eso el DTO no lo pide.
export interface IngresarLecturaManualDto {
  sensorId: number;
  valor: number;
}
