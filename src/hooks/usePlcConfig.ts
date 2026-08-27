import { useCallback, useEffect, useState } from "react";
import { plcConfigService } from "../services/plcConfig.service";
import type { PlcConfig, UpdatePlcConfigDto } from "../types/plcConfig.types";

interface UsePlcConfigResult {
  config: PlcConfig | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateConfig: (dto: UpdatePlcConfigDto) => Promise<PlcConfig>;
}

export function usePlcConfig(): UsePlcConfigResult {
  const [config, setConfig] = useState<PlcConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setConfig(await plcConfigService.get());
    } catch {
      setError("No se pudo cargar la configuración de conexión PLC.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateConfig = useCallback(async (dto: UpdatePlcConfigDto) => {
    const updated = await plcConfigService.update(dto);
    setConfig(updated);
    return updated;
  }, []);

  return { config, isLoading, error, refetch: fetchConfig, updateConfig };
}
