import { useCallback, useEffect, useState } from "react";
import { configComparacionHistoricaService } from "../services/configComparacionHistorica.service";
import type {
  ConfigComparacionHistorica,
  UpdateConfigComparacionHistoricaDto,
} from "../types/configComparacionHistorica.types";

interface UseConfigComparacionHistoricaResult {
  config: ConfigComparacionHistorica | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateConfig: (dto: UpdateConfigComparacionHistoricaDto) => Promise<ConfigComparacionHistorica>;
}

export function useConfigComparacionHistorica(): UseConfigComparacionHistoricaResult {
  const [config, setConfig] = useState<ConfigComparacionHistorica | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setConfig(await configComparacionHistoricaService.get());
    } catch {
      setError("No se pudo cargar la configuración de comparación histórica.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateConfig = useCallback(async (dto: UpdateConfigComparacionHistoricaDto) => {
    const updated = await configComparacionHistoricaService.update(dto);
    setConfig(updated);
    return updated;
  }, []);

  return { config, isLoading, error, refetch: fetchConfig, updateConfig };
}
