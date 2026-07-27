import api from "./api";
import type {
  HistorialMedicionesFilterQuery,
  HistorialMedicionesResponse,
} from "../types/historialMediciones.types";

// El backend valida fechaFin >= fechaInicio (400 si no) y normaliza fechaFin
// sin hora al final del día; no hace falta duplicar eso acá. loteCodigo
// inexistente devuelve listado vacío, no error.
export const historialMedicionesService = {
  getHistorial: async (
    filters: HistorialMedicionesFilterQuery = {},
  ): Promise<HistorialMedicionesResponse> => {
    const { data } = await api.get<HistorialMedicionesResponse>(
      "/sensores/lecturas/historial-mediciones",
      { params: filters },
    );
    return data;
  },

  // Mismo filtro que getHistorial pero sin paginar: el backend devuelve el
  // CSV ya armado. Dispara la descarga directa en el navegador.
  exportCsv: async (
    filters: Omit<HistorialMedicionesFilterQuery, "page" | "limit"> = {},
  ): Promise<void> => {
    const { data } = await api.get<Blob>(
      "/sensores/lecturas/historial-mediciones/export",
      { params: filters, responseType: "blob" },
    );

    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = `historial-mediciones-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
