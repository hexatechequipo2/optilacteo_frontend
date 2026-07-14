import api from "./api";
import type { LoginResponse, RefreshTokenResponse } from "../types/usuario.types";

export interface LoginDto {
  email: string;
  password: string;
  rememberMe: boolean;
}

export const authService = {
  login: async (credentials: LoginDto): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>("/login", credentials);
    return data;
  },
  refresh: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const { data } = await api.post<RefreshTokenResponse>("/refresh", {
      refresh_token: refreshToken,
    });
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