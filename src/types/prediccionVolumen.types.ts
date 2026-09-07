// HU-51 (Sprint 4, EP-9 IA y recomendaciones): tipos del mock visual de
// predicción de volumen de producción semanal. Ver mockPrediccionVolumen.ts
// para el detalle de por qué esto es mock (consigna explícita de la HU: no
// conectar contra backend, el modelo de ML todavía no está listo).
export type EstadoSeccionPrediccion =
  | "normal"
  | "cargando"
  | "datos_insuficientes"
  | "baja_precision"
  | "error";

export type NivelConfianza = "alta" | "media" | "baja";

export interface PuntoHistoricoVolumen {
  fecha: string;
  litros: number;
}

export interface PuntoPrediccionVolumen {
  fecha: string;
  esperado: number;
  minimo: number;
  maximo: number;
}

export interface PrediccionVolumenData {
  actualizadoEn: string;
  historico: PuntoHistoricoVolumen[];
  prediccion: PuntoPrediccionVolumen[];
  confianzaPorcentaje: number;
  nivelConfianza: NivelConfianza;
  diasHistoricosDisponibles: number;
  diasHistoricosRequeridos: number;
}
