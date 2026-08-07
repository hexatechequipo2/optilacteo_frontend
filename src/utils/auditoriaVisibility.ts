// HU-63: la tabla de auditoría (creadoPor / ultimaModificacion) viaja en el
// bloque `auditoria` de las respuestas GET de lotes, proveedores, sensores
// y config-parametros para cualquier rol que pueda leer esos endpoints — el
// backend no la gatea por rol (ver lote.controller.ts: el GET de listado
// también lo devuelve para Operario de línea y Responsable de producción).
// La restricción a Gerente/Administrador de la HU-63 se resuelve acá, único
// punto de verdad reutilizado por los íconos/modales de auditoría de cada
// módulo, en vez de repetir la comparación de rolNombre en cada pantalla.
export function puedeVerAuditoria(rolNombre?: string | null): boolean {
  const rol = (rolNombre ?? "").trim().toLowerCase();
  return rol === "gerente" || rol === "administrador";
}
