import { useCallback, useState } from "react";
import { extraerMensajeError, loteService } from "../services/lote.service";

interface UseReporteTrazabilidadResult {
  descargar: (loteId: number, codigoLote: string) => Promise<void>;
  isGenerando: boolean;
  error: string | null;
  resetError: () => void;
}

// HU-45: descarga del PDF de GET /lotes/:id/reporte-trazabilidad. El error
// se guarda tal cual lo devuelve la API (403/404), mismo criterio que
// useRegistrarConsumo. No relanza: el modal solo muestra el mensaje, no
// tiene nada que hacer después de una descarga fallida.
export function useReporteTrazabilidad(): UseReporteTrazabilidadResult {
  const [isGenerando, setIsGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const descargar = useCallback(async (loteId: number, codigoLote: string) => {
    setIsGenerando(true);
    setError(null);
    try {
      await loteService.descargarReporteTrazabilidad(loteId, codigoLote);
    } catch (err) {
      setError(extraerMensajeError(err, "No se pudo generar el reporte de trazabilidad."));
    } finally {
      setIsGenerando(false);
    }
  }, []);

  // Memoizado por el mismo motivo que en useRegistrarConsumo: el modal lo
  // usa en las dependencias del useEffect que resetea el estado al abrir.
  const resetError = useCallback(() => setError(null), []);

  return { descargar, isGenerando, error, resetError };
}
