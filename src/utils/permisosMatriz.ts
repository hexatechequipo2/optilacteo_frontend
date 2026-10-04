import type {
  FlagsPermiso,
  ModuloAdministrativo,
  ModuloSistema,
} from "../types/permisos.types";

// Espejo de permiso-flags.ts del back: los presets de la matriz de roles y
// las reglas que el back aplica igual al guardar.

export type EstadoCelda = "SIN_ACCESO" | "SOLO_VER" | "VER_Y_MODIFICAR" | "PERSONALIZADO";

export const SIN_ACCESO: FlagsPermiso = {
  canRead: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
  canExport: false,
};

export const PRESETS: Record<Exclude<EstadoCelda, "PERSONALIZADO">, FlagsPermiso> = {
  SIN_ACCESO,
  SOLO_VER: { ...SIN_ACCESO, canRead: true },
  // Igual que el back: sin exportar.
  VER_Y_MODIFICAR: {
    ...SIN_ACCESO,
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
  },
};

export const ESTADO_LABEL: Record<EstadoCelda, string> = {
  SIN_ACCESO: "Sin acceso",
  SOLO_VER: "Solo ver",
  VER_Y_MODIFICAR: "Ver y modificar",
  PERSONALIZADO: "Personalizado",
};

export const ACCIONES: { flag: keyof FlagsPermiso; label: string }[] = [
  { flag: "canRead", label: "Ver" },
  { flag: "canCreate", label: "Crear" },
  { flag: "canUpdate", label: "Editar" },
  { flag: "canDelete", label: "Eliminar" },
  { flag: "canExport", label: "Exportar" },
];

const iguales = (a: FlagsPermiso, b: FlagsPermiso) =>
  ACCIONES.every(({ flag }) => a[flag] === b[flag]);

export function estadoDesdeFlags(f: FlagsPermiso): EstadoCelda {
  if (iguales(f, PRESETS.SIN_ACCESO)) return "SIN_ACCESO";
  if (iguales(f, PRESETS.SOLO_VER)) return "SOLO_VER";
  if (iguales(f, PRESETS.VER_Y_MODIFICAR)) return "VER_Y_MODIFICAR";
  return "PERSONALIZADO";
}

/**
 * Cambia un flag respetando que cualquier acción implica ver: marcar una
 * acción marca Ver, y desmarcar Ver limpia la fila.
 */
export function cambiarFlag(f: FlagsPermiso, flag: keyof FlagsPermiso, valor: boolean): FlagsPermiso {
  if (flag === "canRead" && !valor) return { ...SIN_ACCESO };
  const siguiente = { ...f, [flag]: valor };
  if (valor) siguiente.canRead = true;
  return siguiente;
}

export const gestionaRoles = (f?: FlagsPermiso) => !!f?.canRead && !!f?.canUpdate;

export const MODULOS_SISTEMA: { modulo: ModuloSistema; label: string }[] = [
  { modulo: "dashboard", label: "Dashboard" },
  { modulo: "recepcion", label: "Recepción" },
  { modulo: "destino_productivo_ia", label: "Destino productivo (IA)" },
  { modulo: "monitoreo_alertas", label: "Monitoreo y alertas" },
  { modulo: "sensores_iot", label: "Sensores IoT" },
  { modulo: "trazabilidad", label: "Trazabilidad" },
  { modulo: "reportes_forecast", label: "Reportes y forecast" },
  { modulo: "asistente_voz", label: "Asistente de voz" },
];

// MODULOS_ADMIN_OTORGABLES del back: plataforma nunca es otorgable.
export const MODULOS_ADMIN: { modulo: Exclude<ModuloAdministrativo, "plataforma">; label: string }[] =
  [
    { modulo: "gestion_roles", label: "Gestión de roles" },
    { modulo: "gestion_usuarios", label: "Gestión de usuarios" },
    { modulo: "auditoria", label: "Auditoría" },
    { modulo: "configuracion_empresa", label: "Configuración de la empresa" },
  ];
