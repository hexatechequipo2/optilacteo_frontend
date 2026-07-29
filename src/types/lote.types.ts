// Espeja el módulo real de Lotes en optilacteo-backend
// (src/module/lote: entities, DTOs y mapper), mergeado en develop (HU-60).
import type { Parametro, TipoMateriaPrima } from "./configParametro.types";
import type { Sensor, Ubicacion } from "./sensor.types";

// HU-21: resultado de la clasificación automática (Apto/No Apto), calculada
// por el backend a partir de los parámetros del lote y los umbrales
// configurados. No es editable a mano — viaja siempre en GET /lotes y
// GET /lotes/:id.
export const ClasificacionLote = {
  APTO: "apto",
  NO_APTO: "no_apto",
} as const;

export type ClasificacionLote = (typeof ClasificacionLote)[keyof typeof ClasificacionLote];

export const DestinoLote = {
  PRODUCCION: "produccion",
  ALMACENAMIENTO: "almacenamiento",
  TRATAMIENTO: "tratamiento",
  DESCARTE: "descarte",
} as const;

export type DestinoLote = (typeof DestinoLote)[keyof typeof DestinoLote];

export const EstadoLote = {
  REGISTRADO: "registrado",
  EN_PROCESO: "en_proceso",
  FINALIZADO: "finalizado",
  RECHAZADO: "rechazado",
} as const;

export type EstadoLote = (typeof EstadoLote)[keyof typeof EstadoLote];

export interface LoteParametro {
  parametro: Parametro;
  valor: number;
}

export interface Lote {
  id: number;
  codigo: string; // identificador único, generado por el backend si no se envía uno
  empresaId: number;
  proveedorId: number;
  materiaPrima: TipoMateriaPrima;
  fechaIngreso: string; // ISO datetime
  clasificacion: ClasificacionLote | null;
  destinoInicial: DestinoLote | null;
  ubicacionInicial?: Ubicacion | null;
  estado: EstadoLote;
  parametros: LoteParametro[];
  createdAt: string;
  warning?: string;
}

export interface CreateLoteDto {
  codigo?: string;
  proveedorId: number;
  materiaPrima: TipoMateriaPrima;
  fechaIngreso: string;
  destinoInicial?: DestinoLote;
  ubicacionInicial?: Ubicacion;
  parametros: LoteParametro[];
}

// PATCH /lotes/:id (LoteService.update en el backend) solo aplica estos 3
// campos aunque UpdateLoteDto sea un PartialType completo de CreateLoteDto:
// no se puede editar código, proveedor, ubicacionInicial, parametros ni
// clasificacion (autocalculada) de un lote ya registrado.
export interface UpdateLoteDto {
  materiaPrima?: TipoMateriaPrima;
  fechaIngreso?: string;
  destinoInicial?: DestinoLote;
}

// POST /lotes ahora devuelve esta forma en vez de solo el Lote:
// sensoresDisponibles son los sensores activos ya filtrados por la
// ubicacionInicial del lote, para ofrecerlos como candidatos a asociar.
export interface LoteCreateResponse {
  lote: Lote;
  sensoresDisponibles: Sensor[];
  warnings?: string[];
}

export interface LoteFilterQuery {
  estado?: EstadoLote;
  clasificacion?: ClasificacionLote;
  proveedorId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedLotes {
  data: Lote[];
  total: number;
  page: number;
  limit: number;
}
