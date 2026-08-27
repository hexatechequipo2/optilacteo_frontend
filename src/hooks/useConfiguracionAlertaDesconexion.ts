import { useCallback, useEffect, useState } from "react";
import {
  configuracionAlertaDesconexionService,
  extraerMensajeError,
} from "../services/notificacion.service";
import type { ConfiguracionAlertaDesconexion } from "../types/configuracionAlertaDesconexion.types";

interface UseConfiguracionAlertaDesconexionResult {
  configuracion: ConfiguracionAlertaDesconexion | null;
  isLoading: boolean;
  error: string | null;
  isSaving: boolean;
  actualizarUmbral: (umbralMinutos: number) => Promise<void>;
}

// HU-31: umbral (minutos) que dispara la alerta crítica de "sensor
// desconectado" a nivel empresa — mismo patrón que useConfiguracionAlertas.ts
// (HU-26/29), un único GET al montar + PATCH que persiste al toque (no hay
// guardado en lote, es una sola fila por empresa).
export function useConfiguracionAlertaDesconexion(): UseConfiguracionAlertaDesconexionResult {
  const [configuracion, setConfiguracion] = useState<ConfiguracionAlertaDesconexion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const data = await configuracionAlertaDesconexionService.get();
        if (!cancelado) setConfiguracion(data);
      } catch (err) {
        if (!cancelado) {
          setError(extraerMensajeError(err, "No se pudo cargar el umbral de desconexión."));
        }
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  const actualizarUmbral = useCallback(async (umbralMinutos: number) => {
    setError(null);
    setIsSaving(true);
    // Optimista: si el PATCH falla, se revierte al valor previo (mismo
    // criterio que quitarDestinatario en useConfiguracionAlertas.ts).
    const anterior = configuracion;
    setConfiguracion((prev) => (prev ? { ...prev, umbralMinutos } : prev));
    try {
      const actualizada = await configuracionAlertaDesconexionService.actualizar(umbralMinutos);
      setConfiguracion(actualizada);
    } catch (err) {
      setConfiguracion(anterior);
      setError(extraerMensajeError(err, "No se pudo actualizar el umbral de desconexión."));
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [configuracion]);

  return { configuracion, isLoading, error, isSaving, actualizarUmbral };
}
