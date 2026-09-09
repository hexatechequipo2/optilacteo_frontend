// HU-37 (Sprint 4): destino resultante de aceptar o rechazar (con
// divergencia) una recomendación de destino por ML. La recomendación en sí
// ya viene del backend (ver useRecomendacionDestino.ts) — lo que falta
// conectar es Lote.destinoProductivoId, así que este resultado se guarda en
// localStorage hasta que ese endpoint exista. Ver
// useDestinoProductivoRecomendacion.ts.
//
// Separado de destinoProductivoManual.types.ts (HU-34): ver el comentario
// ahí para el motivo de la separación.
export interface CambioDestinoRecomendacion {
  destinoAnteriorId: number | null;
  destinoAnteriorNombre: string | null;
  destinoNuevoId: number;
  destinoNuevoNombre: string;
  usuario: string;
  timestamp: string;
  // true solo cuando el destino elegido difiere del recomendado (aceptar la
  // recomendación tal cual también pasa por acá, pero no es una divergencia).
  esDivergencia: boolean;
  // Destino que el sistema recomendó en el momento del cambio — permite
  // mostrar "recomendado vs elegido" y, en esDivergenciaVigente, validar que
  // una divergencia tenga una recomendación identificable detrás.
  destinoRecomendadoId: number | null;
  destinoRecomendadoNombre: string | null;
  // Solo presente cuando esDivergencia es true (HU-37 AC1/AC2).
  justificacion?: string;
}

export interface DestinoRecomendacionState {
  destinoActualId: number;
  destinoActualNombre: string;
  historial: CambioDestinoRecomendacion[];
}
