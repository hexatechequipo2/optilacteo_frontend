// Espejo de modulo-sistema.enum.ts + modulo-administrativo.enum.ts del backend.
export type ModuloSistema =
  | "dashboard"
  | "recepcion"
  | "destino_productivo_ia"
  | "monitoreo_alertas"
  | "sensores_iot"
  | "trazabilidad"
  | "reportes_forecast"
  | "asistente_voz";

export type ModuloAdministrativo =
  | "gestion_roles"
  | "gestion_usuarios"
  | "auditoria"
  | "configuracion_empresa"
  // Solo el rol esSistema (Administrador); ninguna empresa puede otorgarlo.
  | "plataforma";

export type ModuloPermiso = ModuloSistema | ModuloAdministrativo;

export interface FlagsPermiso {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
}

export interface PermisoModulo extends FlagsPermiso {
  modulo: ModuloPermiso;
}

export interface MisPermisos {
  // Rol de sistema: el back lo deja pasar sin mirar la matriz, por eso
  // `permisos` viene vacío.
  esSistema: boolean;
  rolNombre: string;
  permisos: PermisoModulo[];
}

export type AccionPermiso = "ver" | "crear" | "editar" | "eliminar" | "exportar";

export const FLAG_POR_ACCION: Record<AccionPermiso, keyof FlagsPermiso> = {
  ver: "canRead",
  crear: "canCreate",
  editar: "canUpdate",
  eliminar: "canDelete",
  exportar: "canExport",
};
