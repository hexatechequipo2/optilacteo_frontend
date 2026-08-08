export function getRoleLanding(rolNombre?: string | null): string {
  switch (rolNombre) {
    case "Administrador":
      return "/dashboard";
    case "Gerente":
    case "Responsable de producción":
      return "/dashboard-produccion";
    case "Responsable de calidad":
      return "/lotes";
    case "Operario de línea":
      return "/sensores";
    default:
      return "/sin-funcionalidades";
  }
}
