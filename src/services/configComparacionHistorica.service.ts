import api from "./api";
import type {
  ConfigComparacionHistorica,
  UpdateConfigComparacionHistoricaDto,
} from "../types/configComparacionHistorica.types";

const BASE_URL = "/config-parametros/comparacion-historica";

export const configComparacionHistoricaService = {
  get: async (): Promise<ConfigComparacionHistorica> => {
    const { data } = await api.get<ConfigComparacionHistorica>(BASE_URL);
    return data;
  },

  update: async (
    dto: UpdateConfigComparacionHistoricaDto,
  ): Promise<ConfigComparacionHistorica> => {
    const { data } = await api.patch<ConfigComparacionHistorica>(BASE_URL, dto);
    return data;
  },
};
