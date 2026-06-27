import api from "./api";
import type { LoginResponse } from "../types/usuario.types";

export interface LoginDto {
  email: string;
  password: string;
}

export const authService = {
  login: async (credentials: LoginDto): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>(
      "/api/v1/auth/login",
      credentials
    );
    return data;
  },
  logout: async (): Promise<void> => {
    // Llamada al endpoint para invalidar el token en el servidor
    await api.post("/api/v1/auth/logout");
  },
};