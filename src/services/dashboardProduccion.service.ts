import api from "./api";
import type { DashboardProduccionResponse } from "../types/dashboardProduccion.types";

export const dashboardProduccionService = {
  // TODO(backend): confirmar el path exacto con el módulo de Hebee
  // (src/module/dashboard) cuando lo suba — hoy no existe en develop.
  getResumenHoy: async (): Promise<DashboardProduccionResponse> => {
    const { data } = await api.get<DashboardProduccionResponse>(
      "/dashboard/produccion",
    );
    return data;
  },
};
