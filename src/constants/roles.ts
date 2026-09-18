// Espejo de src/module/rol/constants/roles.constants.ts en el backend. Los
// nombres de rol son texto libre en la tabla `roles` (sin enum del lado de
// la base), así que quedan sueltos por archivo hoy en ~110 lugares del
// frontend — hardcodear un string más ahí perpetúa el 403 mudo que HU-34
// busca evitar: un typo o una tilde distinta rompe el gating en silencio.
// Este archivo es el primer consumidor (LoteFormModal, HU-34); migrar el
// resto de los usos existentes a esta constante es un refactor aparte, no
// de esta HU.
export const ROLES = {
  ADMINISTRADOR: "Administrador",
  GERENTE: "Gerente",
  OPERARIO_LINEA: "Operario de línea",
  RESPONSABLE_PRODUCCION: "Responsable de producción",
  RESPONSABLE_CALIDAD: "Responsable de calidad",
} as const;

export type RolNombre = (typeof ROLES)[keyof typeof ROLES];
