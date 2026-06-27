import api from "./api";
import type { LoginResponse } from "../types/usuario.types";

export interface LoginDto {
  email: string;
  password: string;
}

export const authService = {
  login: async (credentials: LoginDto): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>("/api/v1/auth/login", credentials);
    return data;
  },
  logout: async (): Promise<void> => {
    await api.post("/api/v1/auth/logout");
  },
  requestPasswordReset: async (email: string): Promise<void> => {
    await api.post("/auth/request-password-reset", { email });
  },
  resetPassword: async (token: string, newPassword: string, confirmPassword: string): Promise<void> => {
    await api.post("/auth/reset-password", { token, newPassword, confirmPassword });
  },
};