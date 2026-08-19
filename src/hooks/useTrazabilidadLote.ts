import { useCallback, useEffect, useState } from "react";
import { extraerMensajeError, loteService } from "../services/lote.service";
import type { EventoTrazabilidad } from "../types/trazabilidad.types";

interface UseTrazabilidadLoteResult {
  eventos: EventoTrazabilidad[];
  codigoLote: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// HU-32: GET /lotes/:id/trazabilidad. Solo se dispara cuando loteId no es
// null (mismo patrón que useConsumosLote) — no pegarle al endpoint mientras
// el modal está cerrado.
//
// A diferencia de useConsumosLote (que trae un mensaje genérico fijo), acá
// se propaga el mensaje real del backend con extraerMensajeError: el 404
// "Lote X no encontrado" es un caso esperado que hay que mostrarle al
// usuario (AC2), no un error de red a ocultar.
export function useTrazabilidadLote(loteId: number | null): UseTrazabilidadLoteResult {
  const [eventos, setEventos] = useState<EventoTrazabilidad[]>([]);
  const [codigoLote, setCodigoLote] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrazabilidad = useCallback(async () => {
    if (loteId === null) {
      setEventos([]);
      setCodigoLote(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await loteService.getTrazabilidad(loteId);
      setEventos(result.eventos);
      setCodigoLote(result.codigoLote);
    } catch (err) {
      setError(extraerMensajeError(err, "No se pudo cargar la trazabilidad del lote."));
      setEventos([]);
    } finally {
      setIsLoading(false);
    }
  }, [loteId]);

  useEffect(() => {
    fetchTrazabilidad();
  }, [fetchTrazabilidad]);

  return { eventos, codigoLote, isLoading, error, refetch: fetchTrazabilidad };
}
