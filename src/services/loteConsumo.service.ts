import api from "./api";
import type {
  CreateLoteConsumoDto,
  LoteConsumo,
  LoteProduccion,
} from "../types/loteConsumo.types";

// HU-68: registro/consulta de consumos parciales de un lote de ingreso, y
// selector de lotes de producción destino. El backend valida existencia del
// lote, estado, saldo disponible y requisito de parámetros (400/404 con
// mensaje); no hace falta duplicar esas validaciones acá (mismo criterio que
// lote.service.ts — usar extraerMensajeError de ahí).
export const loteConsumoService = {
  registrarConsumo: async (
    loteIngresoId: number,
    dto: CreateLoteConsumoDto,
  ): Promise<LoteConsumo> => {
    const { data } = await api.post<LoteConsumo>(
      `/lotes/${loteIngresoId}/consumos`,
      dto,
    );
    return data;
  },

  getHistorial: async (loteIngresoId: number): Promise<LoteConsumo[]> => {
    const { data } = await api.get<LoteConsumo[]>(
      `/lotes/${loteIngresoId}/consumos`,
    );
    return data;
  },

  getLotesProduccion: async (): Promise<LoteProduccion[]> => {
    const { data } = await api.get<LoteProduccion[]>("/lotes/producciones");
    return data;
  },
};
