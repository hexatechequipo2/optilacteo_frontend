import { useCallback, useEffect, useState } from "react";
import { prediccionVolumenService } from "../services/prediccionVolumen.service";
import type {
  EstadoSeccionPrediccion,
  PrediccionVolumenResponse,
} from "../types/prediccionVolumen.types";
import { TipoMateriaPrima } from "../types/configParametro.types";

const DIAS_HISTORICO_DEFAULT = 14;

interface UsePrediccionVolumenResult {
  data: PrediccionVolumenResponse | null;
  estado: EstadoSeccionPrediccion;
  tipoMateriaPrima: TipoMateriaPrima;
  setTipoMateriaPrima: (tipo: TipoMateriaPrima) => void;
  refetch: () => Promise<void>;
  isExporting: boolean;
  exportError: string | null;
  exportarCsv: () => Promise<void>;
}

// HU-51: reemplaza el switcher manual de demo. El estado de la sección se
// deriva del ciclo real de fetch ("cargando"/"error") + el campo `status`
// que trae la respuesta real del backend ("normal"/"datos_insuficientes") —
// ver comentario en prediccionVolumen.types.ts sobre por qué ya no existe
// un estado "baja_precision".
export function usePrediccionVolumen(): UsePrediccionVolumenResult {
  const [tipoMateriaPrima, setTipoMateriaPrima] = useState<TipoMateriaPrima>(
    TipoMateriaPrima.LECHE_CRUDA,
  );
  const [data, setData] = useState<PrediccionVolumenResponse | null>(null);
  const [estado, setEstado] = useState<EstadoSeccionPrediccion>("cargando");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const fetchPrediccion = useCallback(async () => {
    setEstado("cargando");
    try {
      const result = await prediccionVolumenService.obtener({
        tipoMateriaPrima,
        diasHistorico: DIAS_HISTORICO_DEFAULT,
      });
      setData(result);
      setEstado(result.status === "insufficient_data" ? "datos_insuficientes" : "normal");
    } catch {
      setData(null);
      setEstado("error");
    }
  }, [tipoMateriaPrima]);

  useEffect(() => {
    fetchPrediccion();
  }, [fetchPrediccion]);

  const exportarCsv = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      await prediccionVolumenService.exportarCsv({
        tipoMateriaPrima,
        diasHistorico: DIAS_HISTORICO_DEFAULT,
      });
    } catch {
      setExportError("No se pudo descargar el CSV.");
    } finally {
      setIsExporting(false);
    }
  }, [tipoMateriaPrima]);

  return {
    data,
    estado,
    tipoMateriaPrima,
    setTipoMateriaPrima,
    refetch: fetchPrediccion,
    isExporting,
    exportError,
    exportarCsv,
  };
}
