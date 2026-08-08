import { useCallback, useState } from "react";
import { extraerMensajeError, loteService } from "../services/lote.service";
import type { Lote, RevisarLoteDto } from "../types/lote.types";

interface UseRevisarLoteResult {
  revisar: (id: number, dto: RevisarLoteDto) => Promise<Lote>;
  isSubmitting: boolean;
  error: string | null;
  resetError: () => void;
}

// HU-22: mutación de POST /lotes/:id/revision. El error se guarda tal cual
// lo devuelve la API (400 lote ya no está en No Apto, 409 revisión ya
// vigente) para mostrarlo sin traducir en el modal.
export function useRevisarLote(): UseRevisarLoteResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revisar = useCallback(async (id: number, dto: RevisarLoteDto) => {
    setIsSubmitting(true);
    setError(null);
    try {
      return await loteService.revisar(id, dto);
    } catch (err) {
      const mensaje = extraerMensajeError(err, "No se pudo registrar la revisión del lote.");
      setError(mensaje);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { revisar, isSubmitting, error, resetError: () => setError(null) };
}
