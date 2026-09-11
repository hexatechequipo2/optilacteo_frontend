// HU-69 (Sprint 4, mock visual): número de remito del proveedor anexado al
// lote al registrarlo. El backend todavía no tiene columna ni endpoint para
// esto — se guarda en localStorage hasta que exista, mismo criterio que
// destinoProductivoManual.types.ts. A diferencia del destino productivo, el
// remito no tiene historial de cambios: se carga una sola vez al crear el
// lote (AC1) y no es editable después (PATCH /lotes/:id tampoco acepta este
// campo, ver UpdateLoteDto).
export interface RemitoLote {
  numeroRemito: string;
  registradoEn: string;
}
