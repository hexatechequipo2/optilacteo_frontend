import api from "./api";
import type { LoginResponse } from "../types/usuario.types";

export interface LoginDto {
  email: string;
  password: string;
}

export const authService = {
  login: async (credentials: LoginDto): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>("/auth/login", credentials);
    return data;
  },
};
