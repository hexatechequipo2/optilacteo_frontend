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
