import { useCallback, useState } from "react";
import {
  dictadoVozService,
  extraerMensajeError,
} from "../services/dictadoVoz.service";
import type { ParsearDictadoResponse } from "../types/dictadoVoz.types";

interface UseDictadoVozParseoResult {
  parsear: (loteId: number, texto: string) => Promise<ParsearDictadoResponse>;
  isParsing: boolean;
  error: string | null;
  resetError: () => void;
}

// POST /lotes/:id/dictado/parsear. El error se guarda para mostrarlo en el
// modal de captura sin perder el texto dictado (sigue en transcripcionAcumulada
// de useSpeechRecognition, este hook no lo toca).
export function useDictadoVozParseo(): UseDictadoVozParseoResult {
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsear = useCallback(async (loteId: number, texto: string) => {
    setIsParsing(true);
    setError(null);
    try {
      return await dictadoVozService.parsear(loteId, texto);
    } catch (err) {
      const mensaje = extraerMensajeError(
        err,
        "No se pudo interpretar el dictado. Intentá nuevamente.",
      );
      setError(mensaje);
      throw err;
    } finally {
      setIsParsing(false);
    }
  }, []);

  return { parsear, isParsing, error, resetError: () => setError(null) };
}
