// HU-48 (mock funcional): política de retención de datos por empresa
// (Pantalla 4, tab "Retención de datos" de Configuración, solo Gerente). El
// backend no tiene entidad ni endpoints para esto todavía — se guarda en
// localStorage (retencion.service.ts), mismo criterio que
// horarioSilencio.types.ts.
//
// TODO(backend): cuando exista se espera:
//   GET   /config-retencion                  política de la empresa (tenant_id)
//   PUT   /config-retencion                  PoliticaRetencionInput; 400 si
//                                            periodoMeses < 24 (la validación
//                                            normativa tiene que vivir también
//                                            en el backend, no solo acá)
//   GET   /retencion/registros?diasHasta=60  RegistroRetencion[] próximos a
//                                            vencer, orden por vencimiento asc
//   PATCH /retencion/registros/:entidad/:id/aplicar-politica   sin body: aplica
//                                            la acción vigente de la política
//   PATCH /retencion/registros/:entidad/:id/baja-logica
// Rol: Gerente (lectura y escritura).

// Qué hacer con un registro una vez cumplido el período de la política.
// Aplica a TODAS las entidades (críticas incluidas): ninguna de las tres
// opciones es destructiva. No confundir con la eliminación (ver
// resolverEliminacion en utils/retencion.ts).
export const AccionVencimiento = {
  ARCHIVAR: "archivar",
  CONSERVAR_ACTIVO: "conservar_activo",
  REVISION_MANUAL: "revision_manual",
} as const;

export type AccionVencimiento = (typeof AccionVencimiento)[keyof typeof AccionVencimiento];

export const EntidadRetenible = {
  LOTE: "lote",
  MEDICION: "medicion",
  CONSUMO_LOTE: "consumo_lote",
  REGISTRO_AUDITORIA: "registro_auditoria",
} as const;

export type EntidadRetenible = (typeof EntidadRetenible)[keyof typeof EntidadRetenible];

// Estado persistido del registro respecto de la retención (lo cambia una
// acción del Gerente). No confundir con ClasificacionRetencion, que se
// deriva de la fecha de creación y nunca se guarda.
export const EstadoRegistroRetencion = {
  ACTIVO: "activo",
  ARCHIVADO: "archivado",
  EN_REVISION: "en_revision",
  BAJA_LOGICA: "baja_logica",
} as const;

export type EstadoRegistroRetencion =
  (typeof EstadoRegistroRetencion)[keyof typeof EstadoRegistroRetencion];

export const ClasificacionRetencion = {
  PROTEGIDO: "protegido",
  PROXIMO_A_VENCER: "proximo_a_vencer",
  VENCIDO: "vencido",
} as const;

export type ClasificacionRetencion =
  (typeof ClasificacionRetencion)[keyof typeof ClasificacionRetencion];

export interface AvisoAnticipadoRetencion {
  activo: boolean;
  diasAntes: number;
}

export interface PoliticaRetencion {
  periodoMeses: number;
  accionAlVencer: AccionVencimiento;
  avisoAnticipado: AvisoAnticipadoRetencion;
  actualizadoEn: string; // ISO
}

export type PoliticaRetencionInput = Omit<PoliticaRetencion, "actualizadoEn">;

export interface RegistroRetencion {
  id: number;
  entidad: EntidadRetenible;
  referencia: string; // ej. código de lote, id de medición
  // ISO completo con hora (como un createdAt del backend) o "YYYY-MM-DD";
  // siempre se lee con parsearFechaLocal (utils/retencion.ts).
  fechaCreacion: string;
  estado: EstadoRegistroRetencion;
}

// Acción de la política al vencer (archivar / revisión manual), por fila.
export type ResolucionAccionPolitica =
  | { tipo: "bloqueada"; motivo: string }
  | { tipo: "disponible"; accion: AccionVencimiento; ayuda: string }
  | { tipo: "sin_accion"; ayuda: string };

// Intento de eliminación, por fila. "eliminacion_fisica" solo es alcanzable
// por una entidad no crítica (hoy ninguna, ver ENTIDADES_CRITICAS).
export type ResolucionEliminacion =
  | { tipo: "bloqueada"; motivo: string }
  | { tipo: "baja_logica"; ayuda: string }
  | { tipo: "eliminacion_fisica"; ayuda: string }
  | { tipo: "sin_accion"; ayuda: string };
