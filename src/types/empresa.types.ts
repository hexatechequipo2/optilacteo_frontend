export type PlanEmpresa = 'starter' | 'pro' | 'enterprise';

export type ModuloEnum =
  | 'dashboard'
  | 'recepcion'
  | 'destino_productivo_ia'
  | 'monitoreo_alertas'
  | 'sensores_iot'
  | 'trazabilidad'
  | 'reportes_forecast'
  | 'asistente_voz';

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
  /** HU-12: URL pública del logo (R2) o null si la empresa no tiene uno */
  logoUrl?: string | null;
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
