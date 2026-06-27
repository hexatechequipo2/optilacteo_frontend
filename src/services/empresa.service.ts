import api from "./api";
import type { EmpresaType } from "../types/empresa.types";

export const empresasService = {
  /** Trae todas las empresas registradas (para filtros y formularios) */
  getAll: async (): Promise<EmpresaType[]> => {
    const { data } = await api.get<EmpresaType[]>("/empresa");
    return data;
  },
};