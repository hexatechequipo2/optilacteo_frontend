// Espeja HU-40 en optilacteo-backend: SemaforoLoteResponseDto
// (src/module/dashboard/dto/semaforo-lote-response.dto.ts) y el campo
// `estado` que LecturaSensorService agrega al evento WS "lectura:nueva".
import type { Parametro, TipoMateriaPrima } from "./configParametro.types";
import type { LecturaNuevaEvent, Ubicacion } from "./sensor.types";

// Espeja EstadoMedicion (lectura-sensor/enums/estado-medicion.enum.ts).
// Local a HU-40 a propósito: EstadoLectura (historialMediciones.types.ts)
// todavía no tiene EN_LIMITE y su actualización va en otra rama.
export enum EstadoSemaforo {
  NORMAL = "NORMAL",
  EN_LIMITE = "EN_LIMITE",
  FUERA_DE_RANGO = "FUERA_DE_RANGO",
  SIN_UMBRAL_CONFIGURADO = "SIN_UMBRAL_CONFIGURADO",
}

// El dashboard lo manda en mayúsculas ("SENSOR" | "MANUAL") y el WS usa
// OrigenLectura en minúsculas; useMonitoreoSemaforo normaliza a este tipo.
export type OrigenLecturaSemaforo = "SENSOR" | "MANUAL";

export interface LecturaSemaforo {
  parametro: Parametro;
  valor: number;
  estado: EstadoSemaforo;
  origen: OrigenLecturaSemaforo;
  timestamp: string; // ISO datetime de la lectura real
}

export interface SemaforoLoteResponse {
  loteId: number;
  loteCodigo: string;
  parametros: LecturaSemaforo[];
}

// Subconjunto de Lote que usa la pestaña (GET /lotes?estado=en_proceso).
// El backend no modela "línea": se muestra ubicacionInicial.
export interface LoteEnProceso {
  id: number;
  codigo: string;
  materiaPrima: TipoMateriaPrima;
  ubicacionInicial: Ubicacion | null;
}

// "lectura:nueva" con el estado de semáforo que agrega HU-40. Se extiende
// acá en vez de tocar LecturaNuevaEvent (compartido con Estado y diagnóstico).
export interface LecturaNuevaSemaforoEvent extends LecturaNuevaEvent {
  estado?: EstadoSemaforo;
}
