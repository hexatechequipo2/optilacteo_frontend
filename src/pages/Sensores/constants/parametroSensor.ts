import { Parametro } from "../../../types/configParametro.types";
import { TipoSensor, Ubicacion } from "../../../types/sensor.types";

// Cubre las 7 variantes de Parametro (incluye CONDUCTIVIDAD, que en la
// pantalla de umbrales HU-09 todavía no se configura pero acá sí puede
// existir como parámetro medido por un sensor).
export const PARAMETRO_LABEL: Record<Parametro, string> = {
  [Parametro.PH]: "pH",
  [Parametro.TEMPERATURA]: "Temperatura",
  [Parametro.DENSIDAD]: "Densidad",
  [Parametro.GRASA]: "Materia grasa",
  [Parametro.PROTEINA]: "Proteínas",
  [Parametro.ACIDEZ]: "Acidez titulable",
  [Parametro.CONDUCTIVIDAD]: "Conductividad",
};

// Unidad de presentación por parámetro medido. El backend no modela esto
// (una lectura es solo { valor: number }) — es puramente de UI, para la
// pestaña "Estado y diagnóstico".
export const UNIDAD_POR_PARAMETRO: Record<Parametro, string | undefined> = {
  [Parametro.PH]: undefined,
  [Parametro.TEMPERATURA]: "°C",
  [Parametro.DENSIDAD]: "g/mL",
  [Parametro.GRASA]: "%",
  [Parametro.PROTEINA]: "%",
  [Parametro.ACIDEZ]: "°D",
  [Parametro.CONDUCTIVIDAD]: "mS/cm",
};

export const TIPO_SENSOR_LABEL: Record<TipoSensor, string> = {
  [TipoSensor.DIGITAL]: "Digital",
  [TipoSensor.ANALOGICO]: "Analógico",
  [TipoSensor.MANUAL]: "Manual",
};

export const UBICACION_LABEL: Record<Ubicacion, string> = {
  [Ubicacion.CALDERA]: "Caldera",
  [Ubicacion.LABORATORIO]: "Laboratorio",
  [Ubicacion.CAMARA_FRIGORIFICA_1]: "Cámara frigorífica 1",
  [Ubicacion.CAMARA_FRIGORIFICA_2]: "Cámara frigorífica 2",
  [Ubicacion.SECTOR_ENVASADO]: "Sector envasado",
  [Ubicacion.SECTOR_SELLADO]: "Sector sellado",
  [Ubicacion.SECTOR_EMBALAJE]: "Sector embalaje",
};
