import axios from "axios";
import api from "./api";
import type { ParsearDictadoResponse } from "../types/dictadoVoz.types";

export const dictadoVozService = {
  // Solo previsualiza: interpreta el texto dictado y devuelve los
  // parámetros reconocidos, sin persistir nada. El registro real es
  // medicionManualService.registrar (POST /lotes/:id/mediciones-manuales).
  parsear: async (
    loteId: number,
    texto: string,
  ): Promise<ParsearDictadoResponse> => {
    const { data } = await api.post<ParsearDictadoResponse>(
      `/lotes/${loteId}/dictado/parsear`,
      { texto },
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
