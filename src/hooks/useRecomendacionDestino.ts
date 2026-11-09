import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  recomendacionService,
  extraerMensajeError,
} from "../services/recomendacion.service";
import { destinoProductivoService } from "../services/destinoProductivo.service";
import type { RecomendacionDestinoIA } from "../types/recomendacionDestino.types";
import type { DestinoProductivo } from "../types/destinoProductivo.types";

const MENSAJE_TIMEOUT = "El servicio no respondió a tiempo. Intentá nuevamente.";

// axios marca el vencimiento del timeout con ECONNABORTED (o ETIMEDOUT si
// transitional.clarifyTimeoutError está activo).
function esTimeout(err: unknown): boolean {
  return axios.isAxiosError(err) && (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT");
}

interface RespuestaConfirmada {
  estado: "aceptada" | "rechazada";
  destino: DestinoProductivo;
}

interface ResponderDto {
  aceptada: boolean;
  destinoRealId?: number;
  // HU-37: requerida por el backend cuando aceptada = false (ver
  // ResponderRecomendacionDto en recomendacionDestino.types.ts).
  justificacion?: string;
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

  // HU-78: cada pedido cancela el anterior y solo el vigente toca el estado
  // (CA8: la carga siempre se apaga; CA10: ante error o timeout no queda a
  // la vista la recomendación anterior, se limpia al empezar).
  const pedidoRef = useRef<AbortController | null>(null);

  const fetchRecomendacion = useCallback(async () => {
    pedidoRef.current?.abort();
    const pedido = new AbortController();
    pedidoRef.current = pedido;

    setIsLoading(true);
    setError(null);
    setRecomendacion(null);
    setRespuestaConfirmada(null);
    try {
      const result = await recomendacionService.getPendientePorLote(loteId, {
        signal: pedido.signal,
      });
      if (pedidoRef.current !== pedido) return;
      setRecomendacion(result);
    } catch (err) {
      if (pedidoRef.current !== pedido || axios.isCancel(err)) return;
      setError(
        esTimeout(err)
          ? MENSAJE_TIMEOUT
          : extraerMensajeError(err, "No se pudo cargar la recomendación de destino."),
      );
    } finally {
      if (pedidoRef.current === pedido) setIsLoading(false);
    }
  }, [loteId]);

  useEffect(() => () => pedidoRef.current?.abort(), []);

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
