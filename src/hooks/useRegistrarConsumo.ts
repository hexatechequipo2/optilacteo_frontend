import { useCallback, useState } from "react";
import { extraerMensajeError } from "../services/lote.service";
import { loteConsumoService } from "../services/loteConsumo.service";
import type { CreateLoteConsumoDto, LoteConsumo } from "../types/loteConsumo.types";

interface UseRegistrarConsumoResult {
  registrar: (loteIngresoId: number, dto: CreateLoteConsumoDto) => Promise<LoteConsumo>;
  isSubmitting: boolean;
  error: string | null;
  resetError: () => void;
}

// HU-68: mutación de POST /lotes/:id/consumos. El error se guarda tal cual
// lo devuelve la API (400 saldo insuficiente / estado no admite consumo /
// falta nuevo análisis, 404 lote o lote de producción inexistente) para
// mostrarlo sin traducir, mismo criterio que useRevisarLote.
export function useRegistrarConsumo(): UseRegistrarConsumoResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registrar = useCallback(
    async (loteIngresoId: number, dto: CreateLoteConsumoDto) => {
      setIsSubmitting(true);
      setError(null);
      try {
        return await loteConsumoService.registrarConsumo(loteIngresoId, dto);
      } catch (err) {
        const mensaje = extraerMensajeError(err, "No se pudo registrar el consumo parcial.");
        setError(mensaje);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  // Memoizado a propósito: TrazabilidadLoteModal lo incluye en el array de
  // dependencias de un useEffect (reset del form al abrir/cambiar de lote).
  // Sin useCallback acá, esta función tenía una identidad nueva en cada
  // render → el efecto se disparaba de nuevo en cada render → cada tecla
  // tipeada en "Cantidad" (que re-renderiza el modal) volvía a resetear el
  // campo a "" inmediatamente, dando la sensación de que el input no
  // reaccionaba a lo que se tipeaba.
  const resetError = useCallback(() => setError(null), []);

  return { registrar, isSubmitting, error, resetError };
}
