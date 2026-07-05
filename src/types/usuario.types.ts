export interface UsuarioType {
  id: number;
  name: string;
  email: string;
  rolId: number | null;
  rolNombre: string | null;
  isActive: boolean;
  empresa: {
    id: number;
    name: string;
  } | null;
}

export interface CreateUsuarioDto {
  name: string;
  email: string;
  password: string;
  rolId: number;
  empresaId: number;
}

export interface UpdateUsuarioDto {
  name?: string;
  email?: string;
  rolId?: number;
  empresaId?: number;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: number;
    email: string;
    rolId: number | null;
    rolNombre: string | null;
    empresa: string;
  };
}