import { useCallback, useEffect, useState } from "react";
import { extraerMensajeError, loteService } from "../services/lote.service";
import { recomendacionService } from "../services/recomendacion.service";
import type {
  DestinoHistorialItem,
  OrigenDestinoHistorial,
} from "../types/destinoProductivoHistorial.types";

export interface DestinoVigente {
  destinoActualId: number;
  destinoActualNombre: string;
  origen: OrigenDestinoHistorial;
  timestamp: string;
}

export interface DivergenciaVigente {
  destinoRecomendadoNombre: string;
  justificacion: string | null;
}

interface UseDestinoProductivoLoteResult {
  historial: DestinoHistorialItem[];
  destinoVigente: DestinoVigente | null;
  // Solo distinto de null cuando el cambio vigente vino de RECHAZAR una
  // recomendación ML — una asignación manual (HU-34) nunca es "divergencia",
  // ese concepto solo existe relativo a una recomendación del sistema.
  divergenciaVigente: DivergenciaVigente | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// HU-34/HU-37: reemplaza los dos stores en localStorage
// (useDestinoProductivoManual.ts / useDestinoProductivoRecomendacion.ts,
// borrados en esta migración) ahora que el backend expone el historial
// unificado real: GET /lotes/:id/destino-productivo/historial (tabla
// lote_destino_historial), que ya viene ordenado del más reciente al más
// viejo — el destino vigente es directamente el primer elemento.
//
// Cuando ese primer elemento vino de responder una recomendación ML, se
// busca la recomendación original en GET /recomendaciones/todas para saber
// si fue una divergencia (estado "rechazada") y traer su justificación —
// el historial unificado no la incluye a propósito (vive en
// RecomendacionDestino, ver el comentario en lote-destino-historial.entity.ts
// del backend).
export function useDestinoProductivoLote(
  loteId: number | null,
): UseDestinoProductivoLoteResult {
  const [historial, setHistorial] = useState<DestinoHistorialItem[]>([]);
  const [divergenciaVigente, setDivergenciaVigente] = useState<DivergenciaVigente | null>(null);
  // Arranca en true (no en false, como otros hooks de este mismo patrón)
  // cuando hay un loteId: LoteFormModal usa esta bandera para saber cuándo
  // ya se puede confiar en destinoVigente y aplicarlo al selector una sola
  // vez — si arrancara en false, ese efecto correría antes de que el fetch
  // inicial siquiera empiece.
  const [isLoading, setIsLoading] = useState(loteId !== null);
  const [error, setError] = useState<string | null>(null);

  const fetchHistorial = useCallback(async () => {
    if (loteId === null) {
      setHistorial([]);
      setDivergenciaVigente(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await loteService.getHistorialDestino(loteId);
      setHistorial(result);

      const ultimo = result[0];
      if (ultimo?.origen === "recomendacion_ml" && ultimo.recomendacionDestinoId != null) {
        // TODO(backend): no hay GET /recomendaciones/:id puntual — se trae
        // la lista completa de recomendaciones de la empresa y se filtra
        // acá. Ver el comentario de getTodas() en recomendacion.service.ts.
        const todas = await recomendacionService.getTodas();
        const recomendacion = todas.find(
          (r) => r.recomendacionId === ultimo.recomendacionDestinoId,
        );
        setDivergenciaVigente(
          recomendacion && recomendacion.estado === "rechazada"
            ? {
                destinoRecomendadoNombre: recomendacion.destinoRecomendadoNombre ?? "—",
                justificacion: recomendacion.justificacion,
              }
            : null,
        );
      } else {
        setDivergenciaVigente(null);
      }
    } catch (err) {
      setError(
        extraerMensajeError(err, "No se pudo cargar el historial de destino productivo."),
      );
      setHistorial([]);
      setDivergenciaVigente(null);
    } finally {
      setIsLoading(false);
    }
  }, [loteId]);

  useEffect(() => {
    fetchHistorial();
  }, [fetchHistorial]);

  const ultimo = historial[0];
  const destinoVigente: DestinoVigente | null = ultimo
    ? {
        destinoActualId: ultimo.destinoProductivoId,
        destinoActualNombre: ultimo.destinoProductivoNombre,
        origen: ultimo.origen,
        timestamp: ultimo.createdAt,
      }
    : null;

  return { historial, destinoVigente, divergenciaVigente, isLoading, error, refetch: fetchHistorial };
}
