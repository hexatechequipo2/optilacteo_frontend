import api from "./api";
import type { LoginResponse } from "../types/usuario.types";

export interface LoginDto {
  email: string;
  password: string;
}

export const authService = {
  login: async (credentials: LoginDto): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>("/login", credentials);
    return data;
  },
  logout: async (): Promise<void> => {
    await api.post("/logout");
  },
  requestPasswordReset: async (email: string): Promise<void> => {
    await api.post("/request-password-reset", { email });
  },
  resetPassword: async (token: string, newPassword: string, confirmPassword: string): Promise<void> => {
    await api.post("/reset-password", { token, newPassword, confirmPassword });
  },
};