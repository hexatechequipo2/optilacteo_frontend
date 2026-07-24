// Espeja el módulo real de Sensores en optilacteo-backend
// (src/module/sensor: entities, DTOs, enums), mergeado en develop
// (HU-17 registro de sensores + HU-33 asociación sensor-lote).
import type { Parametro } from "./configParametro.types";

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
}

// El backend no acepta "estado" ni "codigo" en el alta: el estado arranca
// siempre en ACTIVO y el sensor no tiene identificador manual.
export interface CreateSensorDto {
  nombre: string;
  tipo: TipoSensor;
  parametro: Parametro;
  ubicacion: Ubicacion;
  rangoMinFavor: number;
  rangoMaxFavor: number;
}

// UpdateSensorDto real = PartialType(OmitType(CreateSensorDto, ['ubicacion'])):
// la ubicación no se puede cambiar una vez creado el sensor, y tampoco existe
// hoy un endpoint para cambiar el estado del sensor.
export type UpdateSensorDto = Partial<Omit<CreateSensorDto, "ubicacion">>;

export interface SensorFilterQuery {
  nombre?: string;
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
  fecha: string; // ISO datetime
}
