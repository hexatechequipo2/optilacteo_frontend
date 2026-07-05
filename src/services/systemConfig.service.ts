import api from "./api";
import type { SystemConfigResponse } from "../types/systemConfig.types";

export const systemConfigService = {
  getInactivityTimeout: async (): Promise<SystemConfigResponse> => {
    const { data } = await api.get<SystemConfigResponse>(
      "/system-config/inactivity-timeout",
    );
    return data;
  },
};