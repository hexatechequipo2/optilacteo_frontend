import api from "./api";
import { loteService } from "./lote.service";
import { EstadoLote } from "../types/lote.types";
import type { LoteEnProceso, SemaforoLoteResponse } from "../types/monitoreoSemaforo.types";

export const monitoreoSemaforoService = {
  // GET /lotes?estado=en_proceso — Operario habilitado vía RECEPCION.
  // loteService.getAll ya pide limit=100 (no el default 20 del backend) y
  // la pestaña no pagina: con más de 100 lotes en proceso simultáneos se
  // cortaría la lista. Para una planta es un techo holgado; si deja de
  // serlo, hay que agregar paginación acá.
  getLotesEnProceso: async (): Promise<LoteEnProceso[]> => {
    const lotes = await loteService.getAll({ estado: EstadoLote.EN_PROCESO });
    return lotes.map((lote) => ({
      id: lote.id,
      codigo: lote.codigo,
      materiaPrima: lote.materiaPrima,
      ubicacionInicial: lote.ubicacionInicial ?? null,
    }));
  },

  // GET /dashboard/lote/:loteId/semaforo: última lectura efectiva por
  // parámetro (sensor o manual, la más reciente) con el estado ya calculado
  // por SemaforoService. Solo incluye parámetros con al menos una lectura.
  getSemaforoLote: async (loteId: number): Promise<SemaforoLoteResponse> => {
    const { data } = await api.get<SemaforoLoteResponse>(`/dashboard/lote/${loteId}/semaforo`);
    return data;
  },
};
