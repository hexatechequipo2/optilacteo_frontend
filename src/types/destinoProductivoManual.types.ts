// HU-34 (Sprint 4, mock visual): asignación manual del destino productivo de
// un lote desde el form de edición (LoteFormModal). El backend ya tiene la
// columna Lote.destinoProductivoId pero todavía no expone ningún endpoint
// para leerla ni escribirla — hasta que exista, este historial se guarda en
// localStorage. Ver useDestinoProductivoManual.ts.
//
// Separado de destinoProductivoRecomendacion.types.ts (HU-37): son dos
// orígenes de cambio con forma y ciclo de vida distintos — HU-37 ya empezó a
// migrar a datos reales del backend (PR #117), HU-34 todavía no tiene
// endpoint a la vista. El día que lo tenga, este archivo y su hook se borran
// enteros en vez de desenredar campos de un store mixto.
export interface CambioDestinoManual {
  destinoAnteriorId: number | null;
  destinoAnteriorNombre: string | null;
  destinoNuevoId: number;
  destinoNuevoNombre: string;
  usuario: string;
  timestamp: string;
}

export interface DestinoManualState {
  destinoActualId: number;
  destinoActualNombre: string;
  historial: CambioDestinoManual[];
}
