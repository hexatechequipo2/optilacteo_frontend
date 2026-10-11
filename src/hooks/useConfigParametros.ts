import { useCallback, useEffect, useState } from "react";
import { configParametroService } from "../services/configParametro.service";
import type {
  ConfigParametro,
  Parametro,
  TipoMateriaPrima,
  UmbralesConfig,
} from "../types/configParametro.types";

export interface SaveConfigParams extends UmbralesConfig {
  id?: number;
  parametro: Parametro;
  tipoMateriaPrima: TipoMateriaPrima;
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
  // HU-40: POST y PUT mandan siempre los 4 umbrales (ver UpdateConfigParametroDto).
  const saveConfig = useCallback(async ({ id, parametro, tipoMateriaPrima, ...umbrales }: SaveConfigParams) => {
    const saved = id
      ? await configParametroService.update(id, umbrales)
      : await configParametroService.create({ parametro, tipoMateriaPrima, ...umbrales });

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
