// HU-34/HU-37 (Sprint 4, mock visual): estado local del destino productivo
// de un lote. El backend ya tiene la columna Lote.destinoProductivoId
// (entidad lista) pero todavía no expone ningún endpoint para leerla ni
// escribirla — hasta que exista, este estado (destino vigente + historial
// de cambios) se guarda en localStorage. Ver useDestinoProductivoLote.ts.
//
// Un cambio puede originarse de dos formas que conviven en el mismo
// historial: una asignación manual (HU-34, selector en el form de lote) o
// el rechazo de una recomendación de ML con un destino distinto al
// sugerido (HU-37, RecomendacionDestinoCard) — en ese caso además queda la
// justificación de la divergencia.
export type OrigenCambioDestino = "manual" | "recomendacion_ml";

export interface CambioDestinoProductivo {
  destinoAnteriorId: number | null;
  destinoAnteriorNombre: string | null;
  destinoNuevoId: number;
  destinoNuevoNombre: string;
  usuario: string;
  timestamp: string;
  origen: OrigenCambioDestino;
  // HU-37: true solo cuando origen es "recomendacion_ml" Y el destino
  // elegido difiere del recomendado (aceptar la recomendación tal cual
  // también pasa por acá, pero no es una divergencia).
  esDivergencia: boolean;
  // Solo presente cuando esDivergencia es true (HU-37 AC1/AC2).
  justificacion?: string;
}

export interface DestinoProductivoLoteState {
  destinoActualId: number;
  destinoActualNombre: string;
  historial: CambioDestinoProductivo[];
}
