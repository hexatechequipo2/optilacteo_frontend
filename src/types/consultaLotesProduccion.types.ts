import type { EventoTrazabilidad } from "./trazabilidad.types";

// HU-77: espeja LoteProduccionFilterQueryDto y LoteProduccionResumen de
// optilacteo-backend (src/module/lote: dto/lote-produccion-filter-query.dto.ts,
// lote-produccion-consulta.service.ts). Endpoint: GET /lotes/producciones/consulta.

// Estado DERIVADO de los lotes de ingreso consumidos (no es una columna de
// lote_produccion). Nada que ver con Apto/No Apto (HU-76).
export const EstadoProduccion = {
  SIN_CONSUMOS: "sin_consumos",
  EN_PROCESO: "en_proceso",
  FINALIZADO: "finalizado",
} as const;

export type EstadoProduccion = (typeof EstadoProduccion)[keyof typeof EstadoProduccion];

export type ProduccionSortField = "codigo" | "fecha" | "estado" | "lotesOrigen";
export type SortOrder = "ASC" | "DESC";

// fechaDesde/fechaHasta: días calendario "YYYY-MM-DD" (criterio HU-75). El
// back los toma como inclusivos en hora AR y responde 400 si desde > hasta.
export interface ConsultaLotesProduccionQuery {
  fechaDesde?: string;
  fechaHasta?: string;
  proveedorId?: number;
  tamboId?: number;
  estado?: EstadoProduccion;
  sortBy?: ProduccionSortField;
  sortOrder?: SortOrder;
  page?: number;
  limit?: number; // máx. 100 en el back
}

export interface ReferenciaNombre {
  id: number;
  nombre: string;
}

export interface LoteProduccionResumen {
  id: number;
  codigo: string;
  // ISO UTC: creación del lote de producción (primer consumo).
  // TODO(backend): lote_produccion.createdAt es `timestamp` sin zona
  // (lote-produccion.entity.ts:30) y el proceso corre con TZ AR (Dockerfile):
  // puede llegar +3h corrido. No se parchea en el front.
  fecha: string;
  estado: EstadoProduccion;
  estadoDescripcion: string;
  cantidadLotesOrigen: number;
  cantidadConsumidaPorUnidad: Record<string, number>;
  proveedores: ReferenciaNombre[];
  tambos: ReferenciaNombre[];
  lotesOrigen: { id: number; codigo: string }[];
  ultimoConsumo: string | null;
}

export interface ConsultaLotesProduccionResponse {
  data: LoteProduccionResumen[];
  total: number;
  page: number;
  limit: number;
  // Solo cuando total === 0: distingue "sin filtros" de "filtros sin resultados".
  mensaje?: string;
}

// HU-77 (criterio 7): GET /lotes/producciones/:id/trazabilidad
// (LoteProduccionConsultaService.getTrazabilidad). 404 si el lote de
// producción no existe o es de otra empresa.

// Un consumo de un lote de ingreso hacia este lote de producción.
export interface OrigenConsumoProduccion {
  consumoId: number;
  fecha: string; // ISO (lote_consumo.createdAt, mismo TODO(backend) de +3h)
  cantidad: number;
  unidad: string | null;
  parametros: unknown[];
  loteIngreso: {
    id: number;
    codigo: string;
    estado: string;
    proveedor: string | null;
    tambo: string | null;
  };
}

// Mismos eventos de HU-32 (GET /lotes/:id/trazabilidad) de cada lote de
// origen, con el lote al que pertenecen. Los CONSUMO_PARCIAL hacia otros
// lotes de producción ya vienen filtrados por el back.
export interface EventoTrazabilidadProduccion extends EventoTrazabilidad {
  loteOrigenId: number;
  loteOrigenCodigo: string;
}

export interface TrazabilidadProduccionResponse {
  loteProduccion: LoteProduccionResumen;
  origenes: OrigenConsumoProduccion[];
  // El back los ordena por fecha ASC; el front reordena igual por las dudas.
  // TODO(backend): las fechas pueden llegar +3h corridas (columnas
  // `timestamp` sin zona + TZ AR en el proceso). No se parchea en el front.
  eventos: EventoTrazabilidadProduccion[];
}
