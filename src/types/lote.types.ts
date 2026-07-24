// Espeja el módulo real de Lotes en optilacteo-backend
// (src/module/lote: entities, DTOs y mapper), mergeado en develop (HU-60).
import type { Parametro, TipoMateriaPrima } from "./configParametro.types";
import type { Sensor, Ubicacion } from "./sensor.types";

export enum ClasificacionLote {
  PRIMERA = "primera",
  SEGUNDA = "segunda",
  TERCERA = "tercera",
  RECHAZADO = "rechazado",
}

export enum DestinoLote {
  PRODUCCION = "produccion",
  ALMACENAMIENTO = "almacenamiento",
  TRATAMIENTO = "tratamiento",
  DESCARTE = "descarte",
}

export enum EstadoLote {
  REGISTRADO = "registrado",
  EN_PROCESO = "en_proceso",
  FINALIZADO = "finalizado",
  RECHAZADO = "rechazado",
}

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
}

export interface CreateLoteDto {
  codigo?: string;
  proveedorId: number;
  materiaPrima: TipoMateriaPrima;
  fechaIngreso: string;
  clasificacion?: ClasificacionLote;
  destinoInicial?: DestinoLote;
  ubicacionInicial?: Ubicacion;
  parametros: LoteParametro[];
}

// PATCH /lotes/:id (LoteService.update en el backend) solo aplica estos 4
// campos aunque UpdateLoteDto sea un PartialType completo de CreateLoteDto:
// no se puede editar código, proveedor, ubicacionInicial ni parametros de un
// lote ya registrado.
export interface UpdateLoteDto {
  materiaPrima?: TipoMateriaPrima;
  fechaIngreso?: string;
  clasificacion?: ClasificacionLote;
  destinoInicial?: DestinoLote;
}

// POST /lotes ahora devuelve esta forma en vez de solo el Lote:
// sensoresDisponibles son los sensores activos ya filtrados por la
// ubicacionInicial del lote, para ofrecerlos como candidatos a asociar.
export interface LoteCreateResponse {
  lote: Lote;
  sensoresDisponibles: Sensor[];
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
