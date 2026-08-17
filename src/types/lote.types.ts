// Espeja el módulo real de Lotes en optilacteo-backend
// (src/module/lote: entities, DTOs y mapper), mergeado en develop (HU-60).
import type { Parametro, TipoMateriaPrima } from "./configParametro.types";
import type { Sensor, Ubicacion } from "./sensor.types";
import type { TrazabilidadEntidad } from "./auditoria.types";

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

// HU-62 (extensión, PR #82 en optilacteo-backend): unidad del rendimiento
// cargado al finalizar. Espeja UnidadRendimiento del backend
// (src/module/lote/enums/unidad-rendimiento.enum.ts).
export const UnidadRendimiento = {
  LITROS: "litros",
  KILOGRAMOS: "kilogramos",
  PORCENTAJE: "porcentaje",
} as const;

export type UnidadRendimiento = (typeof UnidadRendimiento)[keyof typeof UnidadRendimiento];

export interface LoteParametro {
  parametro: Parametro;
  valor: number;
  // HU-66: valor comprometido por el proveedor según remito para este
  // parámetro. Nullable/opcional — solo tiene sentido si `valor` (medido
  // real) también está cargado; el desvío se calcula al leer, no se
  // persiste (ver GET /lotes/proveedor/:id/desvios).
  valorComprometido?: number | null;
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
  // HU-66: cantidad comprometida por el proveedor según remito. Nullable:
  // opcional si no se contaba con el remito al momento de la carga (AC4).
  cantidadComprometidaKg?: number | null;
  // HU-68: cantidad total ingresada y saldo remanente para consumo parcial.
  // Nullable: lotes registrados antes de HU-68 no lo tienen y no admiten
  // consumo parcial (ver lote-consumo.service.ts en el backend).
  cantidad?: number | null;
  cantidadDisponible?: number | null;
  createdAt: string;
  warning?: string;
  rendimiento?: number | null; // HU-62: cargado opcionalmente al finalizar
  unidadRendimiento?: UnidadRendimiento | null; // HU-62 (extensión): obligatoria si rendimiento viene cargado
  // HU-63: quién creó el lote y, si aplica, quién lo modificó por última vez.
  // El backend lo manda para cualquier rol que pueda leer /lotes — la
  // restricción a Gerente/Administrador se aplica en el frontend
  // (ver puedeVerAuditoria).
  auditoria?: TrazabilidadEntidad;
}

export interface CreateLoteDto {
  codigo?: string;
  proveedorId: number;
  materiaPrima: TipoMateriaPrima;
  fechaIngreso: string;
  destinoInicial?: DestinoLote;
  ubicacionInicial?: Ubicacion;
  parametros: LoteParametro[];
  // HU-68: obligatoria en el backend (CreateLoteDto.cantidad, @IsPositive).
  // Habilita el consumo parcial posterior (POST /lotes/:id/consumos).
  cantidad: number;
  // HU-66: opcional (AC4) — cantidad comprometida por el proveedor según
  // remito, a nivel lote.
  cantidadComprometidaKg?: number;
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

// HU-62: PATCH /lotes/:id/finalizar acepta este body opcional. Mismo
// criterio de validación que el backend (finalizar-lote.dto.ts): numérico
// y no negativo; si no se carga, no se envía la clave (nunca 0 por defecto).
// unidadRendimiento pasó a ser obligatoria del lado del backend cuando se
// informa rendimiento (@ValidateIf en FinalizarLoteDto) — se refleja acá
// como requerida solo dentro de esa combinación (ver FinalizarLoteModal).
export interface FinalizarLoteDto {
  rendimiento?: number | null;
  unidadRendimiento?: UnidadRendimiento;
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

// HU-22: aprobación o rechazo manual de un lote No Apto. Espeja
// RevisarLoteDto / DecisionRevision / LoteRevisionCalidad del backend
// (src/module/lote), mergeado en develop (PR #68).
export const DecisionRevision = {
  APROBADO: "aprobado",
  RECHAZADO: "rechazado",
} as const;

export type DecisionRevision = (typeof DecisionRevision)[keyof typeof DecisionRevision];

export interface RevisarLoteDto {
  decision: DecisionRevision;
  justificacion: string;
}

// GET /lotes/:id/revisiones devuelve la entidad tal cual (sin mapper a DTO),
// no trae el usuario resuelto (la relación no es eager y el endpoint no la
// selecciona) — solo usuarioId. TODO(backend): GET /users hoy es exclusivo
// de Gerente/Administrador, así que Responsable de Calidad no puede resolver
// ese id a un nombre; se muestra como "Usuario #<id>" hasta que se habilite.
export interface LoteRevision {
  id: number;
  loteId: number;
  decision: DecisionRevision;
  justificacion: string;
  usuarioId: number;
  empresaId: number;
  createdAt: string;
}
