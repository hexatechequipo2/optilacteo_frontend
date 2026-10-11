import type { TrazabilidadEntidad } from "./auditoria.types";

export type TipoProveedor = "tambo" | "transporte" | "insumos" | "laboratorio";
export type EstadoProveedor = "activa" | "trial" | "suspendida";

export interface Proveedor {
  id: number;
  razonSocial: string;
  cuit: string;
  telefono: string | null;
  emailContacto: string | null;
  tipo: TipoProveedor;
  empresaId: number;
  provincia: string | null;
  localidad: string | null;
  capacidad: number | null;
  estado: EstadoProveedor;
  createdAt: string;
  updatedAt: string;
  // HU-63: quién creó el proveedor y, si aplica, quién lo modificó por
  // última vez. El backend lo manda para cualquier rol que pueda leer
  // /proveedores — la restricción a Gerente/Administrador se aplica en el
  // frontend (ver puedeVerAuditoria).
  auditoria?: TrazabilidadEntidad;
  // HU-64: solo viene en GET /proveedores/:id (el listado paginado no lo
  // trae). El backend lo recalcula al crear un lote; el GET solo lee lo
  // persistido.
  estabilidad?: EstabilidadProveedor;
}

export type ClasificacionEstabilidad = "estable" | "moderada" | "inestable";

export interface DetalleEstabilidad {
  parametro: string;
  materiaPrima: string;
  n: number;
  media: number;
  desvio: number;
  desvioNormalizado: number;
  clasificacion: string;
}

// El backend manda null explícito (no omite el campo) en los opcionales que
// no aplican al status — ej. status "ok" trae minimoLotes: null.
export interface EstabilidadProveedor {
  status: "ok" | "insufficient_data";
  mensaje?: string | null;
  clasificacion?: ClasificacionEstabilidad | null;
  // 0..1, promedio de desvíos normalizados.
  score?: number | null;
  detalle?: DetalleEstabilidad[];
  cantidadLotes: number;
  minimoLotes?: number | null;
  calculadoEn?: string | null;
}

export interface CreateProveedorDto {
  razonSocial: string;
  cuit: string;
  tipo: TipoProveedor;
  empresaId: number;
  estado: EstadoProveedor;
  telefono?: string | null;
  emailContacto?: string | null;
  provincia?: string | null;
  localidad?: string | null;
  capacidad?: number | null;
}

export interface ProveedoresFilters {
  tipo?: TipoProveedor;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}