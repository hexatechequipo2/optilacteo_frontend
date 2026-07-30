import api from "./api";
import type {
  DashboardHistoricoResponse,
  DashboardResumenResponse,
} from "../types/dashboardProduccion.types";

export const dashboardProduccionService = {
  getResumenHoy: async (): Promise<DashboardResumenResponse> => {
    const { data } = await api.get<DashboardResumenResponse>("/dashboard");
    return data;
  },

  getHistoricoLotesProcesados: async (
    dias: number = 7,
  ): Promise<DashboardHistoricoResponse> => {
    const { data } = await api.get<DashboardHistoricoResponse>(
      "/dashboard/lotes-procesados/historico",
      { params: { dias } },
    );
    return data;
  },
};
