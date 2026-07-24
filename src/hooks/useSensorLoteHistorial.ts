import { useCallback, useEffect, useState } from "react";
import { sensorService } from "../services/sensor.service";
import type { SensorLoteHistorial } from "../types/sensor.types";

interface UseSensorLoteHistorialResult {
  historial: SensorLoteHistorial[];
  vigente: SensorLoteHistorial | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  asociarLote: (loteId: number) => Promise<void>;
  isAsociando: boolean;
}

// sensorId null (modal cerrado / sin sensor seleccionado) deja todo en blanco
// sin pedir nada al service.
export function useSensorLoteHistorial(sensorId: number | null): UseSensorLoteHistorialResult {
  const [historial, setHistorial] = useState<SensorLoteHistorial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAsociando, setIsAsociando] = useState(false);

  const fetchHistorial = useCallback(async () => {
    if (sensorId === null) {
      setHistorial([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await sensorService.getHistorial(sensorId);
      setHistorial(result);
    } catch {
      setError("No se pudo cargar el historial del sensor.");
    } finally {
      setIsLoading(false);
    }
  }, [sensorId]);

  useEffect(() => {
    fetchHistorial();
  }, [fetchHistorial]);

  // El PATCH /sensores/lote/:loteId/asociar devuelve el sensor actualizado,
  // no una fila de historial: se refetchea el historial real después para
  // reflejar la nueva asociación (append-only en el backend).
  const asociarLote = useCallback(
    async (loteId: number) => {
      if (sensorId === null) throw new Error("No hay un sensor seleccionado.");
      setIsAsociando(true);
      try {
        await sensorService.asociarALote(loteId, [sensorId]);
        await fetchHistorial();
      } finally {
        setIsAsociando(false);
      }
    },
    [sensorId, fetchHistorial],
  );

  return {
    historial,
    vigente: historial.at(-1) ?? null,
    isLoading,
    error,
    refetch: fetchHistorial,
    asociarLote,
    isAsociando,
  };
}
