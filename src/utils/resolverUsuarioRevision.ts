// HU-22: GET /lotes/:id/revisiones solo trae usuarioId (la relación
// `usuario` de LoteRevisionCalidad no es eager y el service no la
// selecciona), y GET /users es exclusivo de Gerente/Administrador — un
// Responsable de Calidad no tiene forma de resolver el email de OTRO
// usuario sin un cambio de backend. Como paliativo sin tocar backend: si la
// revisión es la del usuario logueado, ya tenemos su email en la sesión
// (useAuth) y lo mostramos; para el resto, queda "Usuario #<id>".
// TODO(backend): incluir `usuario.email` en la respuesta de
// GET /lotes/:id/revisiones (relations: ['usuario']) para resolver todos
// los casos, no solo el propio.
export function resolverUsuarioRevision(
  usuarioId: number,
  currentUser: { id: number; email: string } | null | undefined,
): string {
  if (currentUser && currentUser.id === usuarioId) {
    return currentUser.email;
  }
  return `Usuario #${usuarioId}`;
}
