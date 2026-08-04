import api from "./api";
import type {
  DashboardHistoricoResponse,
  DashboardResumenResponse,
  GranularidadHistorico,
} from "../types/dashboardProduccion.types";

export const dashboardProduccionService = {
  getResumenHoy: async (
    granularidad: GranularidadHistorico = "dia",
  ): Promise<DashboardResumenResponse> => {
    const { data } = await api.get<DashboardResumenResponse>("/dashboard", {
      params: { granularidad },
    });
    return data;
  },

  getHistoricoLotesProcesados: async (
    granularidad: GranularidadHistorico = "dia",
    cantidad: number = 7,
  ): Promise<DashboardHistoricoResponse> => {
    const { data } = await api.get<DashboardHistoricoResponse>(
      "/dashboard/lotes-procesados/historico",
      { params: { granularidad, cantidad } },
    );
    return data;
  },
};
