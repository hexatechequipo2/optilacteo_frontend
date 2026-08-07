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