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