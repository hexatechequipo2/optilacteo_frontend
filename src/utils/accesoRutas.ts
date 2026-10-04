import type { AccionPermiso, ModuloPermiso } from "../types/permisos.types";

export interface ReglaAcceso {
  // OR entre módulos, igual que @Permissions([...]) en el back.
  modulos: ModuloPermiso[];
  accion?: AccionPermiso; // default "ver"
  // Administrador (esSistema) no tiene empresa: solo entra a lo de
  // plataforma y a las rutas marcadas acá. El resto le responde 400/403
  // en el back (lote/tambo/sensor exigen empresaId).
  paraSistema?: boolean;
}

// El orden es la prioridad de la landing: primera ruta a la que puede entrar.
export const REGLAS_RUTAS = {
  "/dashboard": { modulos: ["plataforma"] },
  "/dashboard-produccion": { modulos: ["dashboard"] },
  "/lotes": { modulos: ["recepcion", "trazabilidad"] },
  "/sensores": { modulos: ["sensores_iot"] },
  "/alertas": { modulos: ["monitoreo_alertas"] },
  "/empresas": { modulos: ["plataforma"] },
  "/planes": { modulos: ["plataforma"] },
  "/dispositivos": { modulos: ["plataforma"] },
  "/usuarios": { modulos: ["gestion_usuarios"], paraSistema: true },
  // Administrador elige la empresa adentro (?empresaId=).
  "/roles": { modulos: ["gestion_roles"], paraSistema: true },
  "/proveedores": { modulos: ["recepcion"], paraSistema: true },
  "/tambos": { modulos: ["recepcion", "trazabilidad"] },
  "/lotes/revision": { modulos: ["trazabilidad"] },
  "/mediciones-manuales": { modulos: ["monitoreo_alertas"], accion: "crear" },
  "/ingreso-camara": { modulos: ["trazabilidad"] },
  // Destinatarios por nivel y alerta de desconexión → configuracion_empresa;
  // horarios de silencio → monitoreo_alertas. Cada sección se gatea adentro.
  "/alertas/destinatarios": { modulos: ["configuracion_empresa", "monitoreo_alertas"] },
  "/alertas/historial": { modulos: ["monitoreo_alertas"] },
  // Cada pestaña se gatea adentro: PLC → sensores_iot; umbrales, comparación
  // histórica, retención y logo → configuracion_empresa.
  "/configuracion": { modulos: ["configuracion_empresa", "sensores_iot"] },
  "/auditoria": { modulos: ["auditoria"] },
} satisfies Record<string, ReglaAcceso>;

export type RutaApp = keyof typeof REGLAS_RUTAS;

interface ContextoAcceso {
  esSistema: boolean;
  puede: (modulo: ModuloPermiso[], accion: AccionPermiso) => boolean;
}

export function puedeEntrarA(ruta: RutaApp, { esSistema, puede }: ContextoAcceso): boolean {
  const regla: ReglaAcceso = REGLAS_RUTAS[ruta];
  if (esSistema) return regla.modulos.includes("plataforma") || !!regla.paraSistema;
  return puede(regla.modulos, regla.accion ?? "ver");
}

export function getLanding(ctx: ContextoAcceso): string {
  const ruta = (Object.keys(REGLAS_RUTAS) as RutaApp[]).find((r) => puedeEntrarA(r, ctx));
  return ruta ?? "/sin-funcionalidades";
}
