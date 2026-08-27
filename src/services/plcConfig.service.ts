import api from "./api";
import type {
  PlcConfig,
  TestConnectionDto,
  TestConnectionResult,
  UpdatePlcConfigDto,
} from "../types/plcConfig.types";

const BASE_URL = "/plc-config";

export const plcConfigService = {
  get: async (): Promise<PlcConfig> => {
    const { data } = await api.get<PlcConfig>(BASE_URL);
    return data;
  },

  update: async (dto: UpdatePlcConfigDto): Promise<PlcConfig> => {
    const { data } = await api.put<PlcConfig>(BASE_URL, dto);
    return data;
  },

  testConnection: async (dto: TestConnectionDto): Promise<TestConnectionResult> => {
    const { data } = await api.post<TestConnectionResult>(`${BASE_URL}/test-connection`, dto);
    return data;
  },
};
