// Espeja TrazabilidadLoteResponseDto / EventoTrazabilidadDto y el enum
// TipoEventoTrazabilidad de optilacteo-backend (src/module/lote:
// lote-trazabilidad.service.ts, dto/trazabilidad-lote-response.dto.ts,
// enums/tipo-evento-trazabilidad.enum.ts) — HU-32, ya mergeado a develop
// (PR #107). Endpoint: GET /lotes/:id/trazabilidad.
export const TipoEventoTrazabilidad = {
  RECEPCION: "RECEPCION",
  CLASIFICACION: "CLASIFICACION",
  REVISION_CALIDAD: "REVISION_CALIDAD",
  CAMBIO_UBICACION: "CAMBIO_UBICACION",
  INGRESO_CAMARA: "INGRESO_CAMARA",
  CONSUMO_PARCIAL: "CONSUMO_PARCIAL",
  FINALIZACION: "FINALIZACION",
} as const;

export type TipoEventoTrazabilidad =
  (typeof TipoEventoTrazabilidad)[keyof typeof TipoEventoTrazabilidad];

// `detalle` queda tipado como Record abierto a propósito — mismo criterio
// que el backend (EventoTrazabilidadDto): cada `tipo` trae una forma
// distinta y no vale la pena forzar una interfaz común artificial. El cast
// puntual por campo se hace en HistorialTrazabilidadModal, según `tipo`.
export interface EventoTrazabilidad {
  tipo: TipoEventoTrazabilidad;
  fecha: string; // ISO datetime
  descripcion: string;
  detalle: Record<string, unknown>;
}

// Roles habilitados en el backend (lote.controller.ts): Responsable de
// calidad, Gerente, Administrador. NO incluye a Responsable de producción
// (a diferencia de GET /lotes/:id/consumos) — ver puedeVerTrazabilidadCompleta
// en LotesPage.
export interface TrazabilidadLoteResponse {
  loteId: number;
  codigoLote: string;
  eventos: EventoTrazabilidad[];
}
