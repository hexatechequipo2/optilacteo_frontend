// HU-37 (Sprint 4, mock visual): registro de una divergencia entre el
// destino recomendado por ML y el destino real elegido. El backend de
// HU-49 todavía no persiste justificación/usuario/timestamp de esto (la
// entidad RecomendacionDestino solo guarda destinoRealId + estado) — hasta
// que exista ese endpoint, este registro se guarda en localStorage del
// navegador. Ver useDivergenciasDestino.ts.
export interface DivergenciaDestino {
  loteId: number;
  destinoRecomendado: string;
  destinoElegido: string;
  justificacion: string;
  usuario: string;
  timestamp: string;
}
