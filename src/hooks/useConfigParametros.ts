import { useCallback, useEffect, useState } from "react";
import { configParametroService } from "../services/configParametro.service";
import type {
  ConfigParametro,
  Parametro,
  TipoMateriaPrima,
} from "../types/configParametro.types";

interface SaveConfigParams {
  id?: number;
  parametro: Parametro;
  tipoMateriaPrima: TipoMateriaPrima;
  umbralMin: number;
  umbralMax: number;
}

interface UseConfigParametrosResult {
  configs: ConfigParametro[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  saveConfig: (params: SaveConfigParams) => Promise<ConfigParametro>;
}

export function useConfigParametros(): UseConfigParametrosResult {
  const [configs, setConfigs] = useState<ConfigParametro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await configParametroService.getAll();
      setConfigs(result);
    } catch {
      setError("No se pudieron cargar los umbrales de calidad.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  // No hace refetch completo: reemplaza/agrega solo la config guardada,
  // así el resto de las tarjetas no parpadea con cada guardado individual.
  const saveConfig = useCallback(async ({ id, parametro, tipoMateriaPrima, umbralMin, umbralMax }: SaveConfigParams) => {
    const saved = id
      ? await configParametroService.update(id, { umbralMin, umbralMax })
      : await configParametroService.create({ parametro, tipoMateriaPrima, umbralMin, umbralMax });

    setConfigs((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx === -1) return [...prev, saved];
      const next = [...prev];
      next[idx] = saved;
      return next;
    });

    return saved;
  }, []);

  return { configs, isLoading, error, refetch: fetchConfigs, saveConfig };
}
