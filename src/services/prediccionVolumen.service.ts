import api from "./api";
import type {
  PrediccionVolumenQuery,
  PrediccionVolumenResponse,
} from "../types/prediccionVolumen.types";

// HU-51: espeja PrediccionVolumenController real en optilacteo-backend
// (rama feature/prediccion-volumen-produccion, módulo prediccion-volumen).
// GET /prediccion-volumen nunca dispara el modelo ML — solo lee la última
// predicción persistida por el cron diario (PrediccionVolumenTask). El caso
// "datos insuficientes" viaja en el body (status="insufficient_data"),
// siempre con HTTP 200, así que acá no hay ningún manejo especial de status
// code para eso.
export const prediccionVolumenService = {
  obtener: async (
    query: PrediccionVolumenQuery,
  ): Promise<PrediccionVolumenResponse> => {
    const { data } = await api.get<PrediccionVolumenResponse>(
      "/prediccion-volumen",
      { params: query },
    );
    return data;
  },

  // Mismo filtro que obtener() pero el backend devuelve el CSV ya armado
  // (historicoReciente + prediccion con mínimo/esperado/máximo). Dispara la
  // descarga directa en el navegador, mismo criterio que
  // historialMediciones.service.ts (exportCsv).
  exportarCsv: async (query: PrediccionVolumenQuery): Promise<void> => {
    const { data } = await api.get<Blob>("/prediccion-volumen/exportar/csv", {
      params: query,
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = `prediccion-volumen-${query.tipoMateriaPrima}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
