// Espeja TrazabilidadEntidadDto / AuditoriaUsuarioDto del backend
// (src/module/audit/dto/trazabilidad.dto.ts), mergeado en develop vía
// "feat(auditoria-transversal): integración y validación HU-63". Bloque
// opcional que viaja en las respuestas GET de lotes, proveedores, sensores
// y config-parametros — el backend no gatea el campo por rol, así que la
// visibilidad Gerente/Administrador (HU-63) se resuelve en el frontend
// (ver puedeVerAuditoria en utils/auditoriaVisibility.ts).
export interface AuditoriaUsuario {
  userId: number | null;
  userEmail: string;
  fecha: string; // ISO 8601
}

export interface TrazabilidadEntidad {
  creadoPor?: AuditoriaUsuario;
  // Presente solo si el registro fue modificado después de creado.
  ultimaModificacion?: AuditoriaUsuario;
}
