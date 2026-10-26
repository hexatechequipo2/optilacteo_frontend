import { mensajeErrorApi } from "../utils/mensajeErrorApi";
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
  return mensajeErrorApi(err, fallback);
}
