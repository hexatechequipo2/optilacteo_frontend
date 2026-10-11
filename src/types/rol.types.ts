import type { FlagsPermiso, ModuloPermiso } from "./permisos.types";

export type { ModuloSistema } from "./permisos.types";

export interface PermisoRol extends FlagsPermiso {
  modulo: ModuloPermiso;
}

// GET /roles (rol.service.ts listar en el back): catálogo global + roles
// propios de la empresa, con la matriz de ESTA empresa.
export interface RolType {
  id: number;
  nombre: string;
  descripcion: string | null;
  // Administrador: acceso total, no se edita ni se elimina.
  esSistema: boolean;
  // Rol global del catálogo: no se renombra ni se elimina.
  esCatalogo: boolean;
  // Usuarios de esta empresa con el rol asignado.
  usuarios: number;
  permisos: PermisoRol[];
}

export interface GuardarRolDto {
  nombre: string;
  descripcion?: string;
  permisos: PermisoRol[];
}

export interface RolGuardadoResponse {
  id: number;
  nombre: string;
}

export interface AsignarRolResponse {
  usuarioId: number;
  rolAnterior: string | null;
  rolNuevo: string;
}
