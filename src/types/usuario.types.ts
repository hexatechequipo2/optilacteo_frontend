/** Roles reales que maneja el backend (columna role en la tabla users) */
export const Role = {
  ADMIN: "admin",
  OPERARIO_LINEA: "op_linea",
  GERENTE: "gerente",
  RESPONSABLE_CALIDAD: "responsable_calidad",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

/** Etiqueta legible en español para mostrar en la UI */
export const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: "Administrador",
  [Role.OPERARIO_LINEA]: "Operador de Línea",
  [Role.GERENTE]: "Gerente",
  [Role.RESPONSABLE_CALIDAD]: "Responsable de Calidad",
};

/** Traduce el valor crudo del backend a una etiqueta legible; si no matchea ningún Role conocido, lo muestra tal cual */
export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role as Role] ?? role;
}

export interface UsuarioType {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  empresa: {
    id: number;
    name: string;
  };
}

export interface CreateUsuarioDto {
  name: string;
  email: string;
  password: string;
  role: Role;
  empresaId: number;
}

/**
 * Refleja UpdateUserDto del backend (PartialType de CreateUserDto).
 * No incluimos password: el cambio de contraseña es un flujo aparte.
 */
export interface UpdateUsuarioDto {
  name?: string;
  email?: string;
  role?: Role;
  empresaId?: number;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: number;
    email: string;
    role: string;
    empresa: string;
  };
}