import axios from "axios";
import api from "./api";
import type {
  CreateMedicionManualDto,
  HistorialMedicionManualFilterQuery,
  HistorialMedicionManualResponse,
  MedicionManualLoteResponse,
} from "../types/medicionManual.types";

export const medicionManualService = {
  registrar: async (
    loteId: number,
    dto: CreateMedicionManualDto,
  ): Promise<MedicionManualLoteResponse> => {
    const { data } = await api.post<MedicionManualLoteResponse>(
      `/lotes/${loteId}/mediciones-manuales`,
      dto,
    );
    return data;
  },

  getHistorial: async (
    loteId: number,
    query: HistorialMedicionManualFilterQuery,
  ): Promise<HistorialMedicionManualResponse> => {
    const { data } = await api.get<HistorialMedicionManualResponse>(
      `/lotes/${loteId}/mediciones-manuales`,
      { params: query },
    );
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
