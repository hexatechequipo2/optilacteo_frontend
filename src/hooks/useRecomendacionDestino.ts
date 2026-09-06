import { useCallback, useEffect, useState } from "react";
import {
  recomendacionService,
  extraerMensajeError,
} from "../services/recomendacion.service";
import { destinoProductivoService } from "../services/destinoProductivo.service";
import type { RecomendacionDestinoIA } from "../types/recomendacionDestino.types";
import type { DestinoProductivo } from "../types/destinoProductivo.types";

interface RespuestaConfirmada {
  estado: "aceptada" | "rechazada";
  destino: DestinoProductivo;
}

interface ResponderDto {
  aceptada: boolean;
  destinoRealId?: number;
}

interface UseRecomendacionDestinoResult {
  recomendacion: RecomendacionDestinoIA | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  destinosProductivos: DestinoProductivo[];
  isLoadingDestinos: boolean;
  errorDestinos: string | null;
  responder: (dto: ResponderDto) => Promise<boolean>;
  isResponding: boolean;
  errorResponder: string | null;
  respuestaConfirmada: RespuestaConfirmada | null;
}

// HU-49: GET de la recomendación pendiente de un lote + catálogo de
// destinos productivos para el flujo de rechazo, todo autocontenido para
// que RecomendacionDestinoCard no dependa de LoteFormModal.
export function useRecomendacionDestino(
  loteId: number,
): UseRecomendacionDestinoResult {
  const [recomendacion, setRecomendacion] = useState<RecomendacionDestinoIA | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [destinosProductivos, setDestinosProductivos] = useState<DestinoProductivo[]>([]);
  const [isLoadingDestinos, setIsLoadingDestinos] = useState(true);
  const [errorDestinos, setErrorDestinos] = useState<string | null>(null);

  const [isResponding, setIsResponding] = useState(false);
  const [errorResponder, setErrorResponder] = useState<string | null>(null);
  const [respuestaConfirmada, setRespuestaConfirmada] = useState<RespuestaConfirmada | null>(null);

  const fetchRecomendacion = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await recomendacionService.getPendientePorLote(loteId);
      setRecomendacion(result);
      // Recalcular manual: se descarta cualquier confirmación previa que
      // se estuviera mostrando.
      setRespuestaConfirmada(null);
    } catch (err) {
      setError(
        extraerMensajeError(err, "No se pudo cargar la recomendación de destino."),
      );
      setRecomendacion(null);
    } finally {
      setIsLoading(false);
    }
  }, [loteId]);

  const fetchDestinos = useCallback(async () => {
    setIsLoadingDestinos(true);
    setErrorDestinos(null);
    try {
      const result = await destinoProductivoService.getActivos();
      setDestinosProductivos(result);
    } catch (err) {
      setErrorDestinos(
        extraerMensajeError(err, "No se pudieron cargar los destinos productivos."),
      );
      setDestinosProductivos([]);
    } finally {
      setIsLoadingDestinos(false);
    }
  }, []);

  useEffect(() => {
    fetchRecomendacion();
    fetchDestinos();
  }, [fetchRecomendacion, fetchDestinos]);

  const responder = useCallback(
    async (dto: ResponderDto): Promise<boolean> => {
      if (!recomendacion) return false;
      setIsResponding(true);
      setErrorResponder(null);
      try {
        await recomendacionService.responder(recomendacion.id, dto);
        // El PATCH real no trae destinoRecomendado cargado (ver
        // recomendacion.service.ts) — el destino final ya se conoce del
        // lado del cliente: si se acepta, es el recomendado; si se
        // rechaza, es el elegido del catálogo.
        const destino = dto.aceptada
          ? recomendacion.destinoRecomendado
          : (destinosProductivos.find((d) => d.id === dto.destinoRealId) ??
            recomendacion.destinoRecomendado);
        setRespuestaConfirmada({
          estado: dto.aceptada ? "aceptada" : "rechazada",
          destino,
        });
        // Ya no hay recomendación pendiente para este lote (el backend la
        // pasó a aceptada/rechazada).
        setRecomendacion(null);
        return true;
      } catch (err) {
        setErrorResponder(
          extraerMensajeError(err, "No se pudo registrar la respuesta. Intentá nuevamente."),
        );
        return false;
      } finally {
        setIsResponding(false);
      }
    },
    [recomendacion, destinosProductivos],
  );

  return {
    recomendacion,
    isLoading,
    error,
    refetch: fetchRecomendacion,
    destinosProductivos,
    isLoadingDestinos,
    errorDestinos,
    responder,
    isResponding,
    errorResponder,
    respuestaConfirmada,
  };
}
