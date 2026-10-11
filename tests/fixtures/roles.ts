// HU-72: fixtures de GET /roles, GET /auth/me/permisos y la empresa con sus
// módulos contratados.
//
// TODO(Fase 5): reemplazar estos tipos locales por los de src/types
// (permisos.types, rol.types, empresa.types). Hoy tsconfig.node.json
// (module: nodenext) no resuelve los imports sin extensión de src/types.
export type ModuloPermiso =
  | "dashboard"
  | "recepcion"
  | "destino_productivo_ia"
  | "monitoreo_alertas"
  | "sensores_iot"
  | "trazabilidad"
  | "reportes_forecast"
  | "asistente_voz"
  | "gestion_roles"
  | "gestion_usuarios"
  | "auditoria"
  | "configuracion_empresa"
  | "plataforma";

export interface FlagsPermiso {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
}

export interface PermisoRol extends FlagsPermiso {
  modulo: ModuloPermiso;
}

export interface MisPermisos {
  esSistema: boolean;
  rolNombre: string;
  permisos: PermisoRol[];
}

export interface RolType {
  id: number;
  nombre: string;
  descripcion: string | null;
  esSistema: boolean;
  esCatalogo: boolean;
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

export interface EmpresaType {
  id: number;
  name: string;
  cuit: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  isActive: boolean;
  plan: string;
  modulos?: { modulo: ModuloPermiso; isActive: boolean }[];
}

// "RCUDE" → flags. R = ver, C = crear, U = editar, D = eliminar, E = exportar.
export function flags(letras: string): FlagsPermiso {
  return {
    canRead: letras.includes("R"),
    canCreate: letras.includes("C"),
    canUpdate: letras.includes("U"),
    canDelete: letras.includes("D"),
    canExport: letras.includes("E"),
  };
}

export function matriz(spec: Partial<Record<ModuloPermiso, string>>): PermisoRol[] {
  return (Object.entries(spec) as [ModuloPermiso, string][]).map(([modulo, letras]) => ({
    modulo,
    ...flags(letras),
  }));
}

// Espejo de la matriz por defecto del Gerente (mockAuth.ts).
export const MATRIZ_GERENTE = {
  dashboard: "RE",
  recepcion: "RCUDE",
  destino_productivo_ia: "RCE",
  monitoreo_alertas: "RUE",
  sensores_iot: "RCUDE",
  trazabilidad: "RCUDE",
  reportes_forecast: "RE",
  asistente_voz: "RE",
  configuracion_empresa: "RCUD",
  gestion_roles: "RCUD",
  gestion_usuarios: "RCU",
  auditoria: "RE",
} satisfies Partial<Record<ModuloPermiso, string>>;

export function misPermisos(
  rolNombre: string,
  spec: Partial<Record<ModuloPermiso, string>>,
): MisPermisos {
  return { esSistema: false, rolNombre, permisos: matriz(spec) };
}

export const ROL_ADMINISTRADOR = {
  id: 1,
  nombre: "Administrador",
  descripcion: null,
  esSistema: true,
  esCatalogo: true,
  usuarios: 1,
  permisos: [],
} satisfies RolType;

export const ROL_GERENTE = {
  id: 2,
  nombre: "Gerente",
  descripcion: "Gestión integral de la planta",
  esSistema: false,
  esCatalogo: true,
  usuarios: 3,
  permisos: matriz(MATRIZ_GERENTE),
} satisfies RolType;

export const ROL_SUPERVISOR = {
  id: 10,
  nombre: "Supervisor de turno",
  descripcion: "Rol propio de la empresa",
  esSistema: false,
  esCatalogo: false,
  usuarios: 0,
  permisos: matriz({ dashboard: "R", monitoreo_alertas: "RCUD" }),
} satisfies RolType;

export const ROL_ANALISTA = {
  id: 11,
  nombre: "Analista externo",
  descripcion: null,
  esSistema: false,
  esCatalogo: false,
  usuarios: 2,
  permisos: matriz({ reportes_forecast: "RE" }),
} satisfies RolType;

export const ROLES_MOCK: RolType[] = [ROL_ADMINISTRADOR, ROL_GERENTE, ROL_SUPERVISOR, ROL_ANALISTA];

// Contrata 5 de los 8 módulos de sistema: destino_productivo_ia,
// reportes_forecast y asistente_voz no se pueden otorgar.
export const EMPRESA_ROLES = {
  id: 10,
  name: "Lácteos del Sur",
  cuit: "30-11111111-1",
  email: "contacto@lacteosdelsur.com",
  telefono: null,
  direccion: null,
  isActive: true,
  plan: "pro",
  modulos: [
    { modulo: "dashboard", isActive: true },
    { modulo: "recepcion", isActive: true },
    { modulo: "monitoreo_alertas", isActive: true },
    { modulo: "sensores_iot", isActive: true },
    { modulo: "trazabilidad", isActive: true },
  ],
} satisfies EmpresaType;

// Para el selector del Administrador: otra empresa con solo 2 módulos.
export const EMPRESA_CHICA = {
  id: 7,
  name: "Tambo La Esperanza",
  cuit: null,
  email: null,
  telefono: null,
  direccion: null,
  isActive: true,
  plan: "basic",
  modulos: [
    { modulo: "dashboard", isActive: true },
    { modulo: "trazabilidad", isActive: true },
  ],
} satisfies EmpresaType;
