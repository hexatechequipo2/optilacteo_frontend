// HU-43: espejo del módulo audit del backend (optilacteo-backend, PR #142,
// src/module/audit). No confundir con auditoria.types.ts, que espeja el
// bloque de trazabilidad por entidad de HU-63.

// Espejo de TipoAccion (enums/tipo-accion.enum.ts): mismos valores, se
// mandan tal cual como query param `tipo`.
export const TIPOS_ACCION = [
  "ALTA",
  "BAJA",
  "EDICION",
  "EXPORTACION",
  "LOGIN",
  "LOGOUT",
  "CONFIGURACION",
  "OTRO",
] as const;

export type TipoAccion = (typeof TIPOS_ACCION)[number];

// Mismas etiquetas que TIPO_ACCION_LABELS del backend (también las expone
// GET /audit-log/tipos; son fijas, así que se espejan acá como roles.ts).
export const TIPO_ACCION_LABELS: Record<TipoAccion, string> = {
  ALTA: "Alta",
  BAJA: "Baja",
  EDICION: "Edición",
  EXPORTACION: "Exportación",
  LOGIN: "Inicio de sesión",
  LOGOUT: "Cierre de sesión",
  CONFIGURACION: "Configuración",
  OTRO: "Otro",
};

// Resultado de la acción: el AuditInterceptor lo agrega como sufijo de
// `accion` (ej. "LOGIN_FAILURE"), no hay columna propia.
export type EstadoAuditLog = "SUCCESS" | "FAILURE";

export interface AuditLog {
  id: number;
  userId: number | null;
  userEmail: string;
  // null en los LOGIN: el backend no tiene el nombre en ese request.
  userNombre: string | null;
  userRol: string | null;
  empresaId: number | null;
  // Acción base + sufijo de resultado, ej. "LOTE_ACTUALIZAR_SUCCESS".
  accion: string;
  entidad: string;
  entidadId: number | null;
  tipo: TipoAccion;
  descripcion: string | null;
  detalle: Record<string, unknown> | null;
  createdAt: string; // ISO 8601; timestamptz, viene con Z (sin el +3h)
}

// Query params de GET /audit-log y /audit-log/export (QueryAuditLogDto). El
// backend usa forbidNonWhitelisted: un param fuera del DTO es 400. `accion`
// existe en el DTO pero esta pantalla no lo usa.
export interface AuditLogFilterQuery {
  userId?: number;
  tipo?: TipoAccion;
  // Sin `accion`, el backend filtra por el sufijo de `accion`.
  estado?: EstadoAuditLog;
  fechaDesde?: string; // ISO 8601 con hora, inclusive
  fechaHasta?: string; // ISO 8601 con hora, inclusive
  page?: number;
  limit?: number; // backend: default 50, máx 200
}

// El controller devuelve el [registros, total] de getManyAndCount tal cual,
// sin { data, meta } — el service lo normaliza a AuditLogResponse.
export type AuditLogRawResponse = [AuditLog[], number];

export interface AuditLogResponse {
  data: AuditLog[];
  total: number;
}
