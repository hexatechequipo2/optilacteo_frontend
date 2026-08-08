import axios from "axios";
import api from "./api";
import type {
  ConfigParametro,
  CreateConfigParametroDto,
  UpdateConfigParametroDto,
} from "../types/configParametro.types";

export const configParametroService = {
  getAll: async (): Promise<ConfigParametro[]> => {
    const { data } = await api.get<ConfigParametro[]>("/config-parametros");
    return data;
  },

  create: async (dto: CreateConfigParametroDto): Promise<ConfigParametro> => {
    const { data } = await api.post<ConfigParametro>("/config-parametros", dto);
    return data;
  },

  update: async (id: number, dto: UpdateConfigParametroDto): Promise<ConfigParametro> => {
    const { data } = await api.put<ConfigParametro>(`/config-parametros/${id}`, dto);
    return data;
  },
};

export function extraerMensajeError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data?.message) {
    const { message } = err.response.data;
    return Array.isArray(message) ? message.join(" ") : message;
  }
  return fallback;
}
