export type ModuloSistema =
  | "dashboard"
  | "recepcion"
  | "destino_productivo_ia"
  | "monitoreo_alertas"
  | "sensores_iot"
  | "trazabilidad"
  | "reportes_forecast"
  | "asistente_voz";

export interface PermisoType {
  id:number;
  modulo: ModuloSistema;
  canRead: boolean;
  canWrite: boolean;
}

export interface RolType {
  id: number;
  nombre: string;
  descripcion: string | null;
  isActive: boolean;
  permisos: PermisoType[];
}

export interface UpdatePermisoDto {
  modulo: ModuloSistema;
  canRead: boolean;
  canWrite: boolean;
}

export interface PermisoActualizadoType {
  id: number;
  modulo: ModuloSistema;
  canRead: boolean;
  canWrite: boolean;
  rol: {
    id: number;
    nombre: string;
  };
}