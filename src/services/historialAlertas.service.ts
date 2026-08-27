// HU-28: "Historial de alertas por lote y período" — conectado al backend
// real (optilacteo-backend, PR #98, module/notificaciones). El controller
// (NotificacionesController) restringe estos tres endpoints a
// tipo=alerta_umbral y a la empresa del tenant actual server-side — acá solo
// se mandan los filtros que el usuario eligió en pantalla.
//
// GET /notificaciones/historial            -> paginado (AC1/AC2/AC4)
// GET /notificaciones/historial/exportar/csv -> export sin paginar (AC3)
// GET /notificaciones/historial/exportar/pdf -> export sin paginar (AC3)
//
// No hay endpoint de Excel en el backend — el botón de exportación de esta
// pantalla es CSV + PDF (ver HistorialAlertasFiltros.tsx).
import api from "./api";
import type {
  HistorialAlertasFilterQuery,
  HistorialAlertasResponse,
} from "../types/historialAlertas.types";

function nombreArchivo(extension: string): string {
  return `historial-alertas-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

// Mismo patrón que historialMedicionesService.exportCsv (HU-19): blob +
// link temporal, sin librerías de generación en el cliente — el archivo ya
// viene armado del backend.
function descargarBlob(data: BlobPart, mimeType: string, nombre: string): void {
  const url = window.URL.createObjectURL(new Blob([data], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = nombre;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export const historialAlertasService = {
  getHistorial: async (
    filters: HistorialAlertasFilterQuery = {},
  ): Promise<HistorialAlertasResponse> => {
    const { data } = await api.get<HistorialAlertasResponse>("/notificaciones/historial", {
      params: filters,
    });
    return data;
  },

  // AC3: exporta TODO lo que matchea los filtros (no solo la página actual
  // en pantalla) — el backend usa findHistorialCompleto (sin skip/take) para
  // esto, igual que el listado paginado pero con el mismo query.
  exportCsv: async (
    filters: Omit<HistorialAlertasFilterQuery, "page" | "limit"> = {},
  ): Promise<void> => {
    const { data } = await api.get<Blob>("/notificaciones/historial/exportar/csv", {
      params: filters,
      responseType: "blob",
    });
    descargarBlob(data, "text/csv", nombreArchivo("csv"));
  },

  exportPdf: async (
    filters: Omit<HistorialAlertasFilterQuery, "page" | "limit"> = {},
  ): Promise<void> => {
    const { data } = await api.get<Blob>("/notificaciones/historial/exportar/pdf", {
      params: filters,
      responseType: "blob",
    });
    descargarBlob(data, "application/pdf", nombreArchivo("pdf"));
  },
};
