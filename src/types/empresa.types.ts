export type PlanEmpresa = 'starter' | 'pro' | 'enterprise';

export type ModuloEnum =
  | 'usuarios'
  | 'reportes'
  | 'inventario'
  | 'produccion'
  | 'calidad';

/** El backend no devuelve id ni empresaId en el mapper de respuesta */
export interface EmpresaModulo {
  modulo: ModuloEnum;
  isActive: boolean;
}

export interface EmpresaType {
  id: number;
  /** El backend devuelve 'name', no 'nombre' */
  name: string;
  cuit: string | null;
  email: string | null;
  telefono: string | null;
  /** El backend devuelve la ubicación como string único */
  direccion: string | null;
  isActive: boolean;
  plan: string;
  cantidadUsuarios?: number;
  modulos?: EmpresaModulo[];
}

/** Todos los campos son opcionales — refleja UpdateEmpresaDto del backend (PartialType) */
export interface UpdateEmpresaDto {
  name?: string;
  cuit?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  plan?: string;
}
