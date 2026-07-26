import { useEffect, useRef, useState } from "react";
import { createSocket } from "../services/socket";
import { sensorService } from "../services/sensor.service";
import { EstadoSensor } from "../types/sensor.types";
import type {
  LecturaNuevaEvent,
  Sensor,
  SensorFallaEvent,
  SensorRecuperadoEvent,
} from "../types/sensor.types";

export interface LecturaRuntime {
  valorActual: number;
  timestampLectura: string;
  loteId: number;
}

interface UseSensoresRealtimeResult {
  sensores: Sensor[];
  lecturas: Record<number, LecturaRuntime>;
  isLoading: boolean;
  error: string | null;
  isRealtimeConnected: boolean;
}

// Carga inicial por REST (GET /sensores) + suscripción al WS /sensores
// (HU-13) para la pestaña "Estado y diagnóstico". Las lecturas en vivo se
// guardan aparte de `sensores` porque el backend no las modela como parte
// del sensor (solo llegan por WS, nunca por REST).
export function useSensoresRealtime(): UseSensoresRealtimeResult {
  const [sensores, setSensores] = useState<Sensor[]>([]);
  const [lecturas, setLecturas] = useState<Record<number, LecturaRuntime>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Los listeners del socket se registran una sola vez; este ref les da
  // una forma de leer el listado de sensores más reciente sin quedar
  // atados al closure (obsoleto) del momento en que se registraron.
  const sensorIdsRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    sensorIdsRef.current = new Set(sensores.map((s) => s.id));
  }, [sensores]);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const result = await sensorService.getAll();
        if (!cancelado) setSensores(result);
      } catch {
        if (!cancelado) setError("No se pudieron cargar los sensores.");
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    // Espera a que termine la carga inicial para evitar procesar eventos
    // de sensores que todavía no están en el estado.
    if (isLoading) return;

    const socket = createSocket("/sensores");

    socket.on("connect", () => setIsRealtimeConnected(true));
    socket.on("disconnect", () => setIsRealtimeConnected(false));
    socket.on("connect_error", () => setIsRealtimeConnected(false));

    socket.on("lectura:nueva", (evento: LecturaNuevaEvent) => {
      if (!sensorIdsRef.current.has(evento.sensorId)) {
        console.warn(
          `[sensores WS] lectura:nueva de un sensor desconocido (id=${evento.sensorId}), se ignora.`,
        );
        return;
      }

      setLecturas((prev) => ({
        ...prev,
        [evento.sensorId]: {
          valorActual: evento.valor,
          timestampLectura: evento.timestampLectura,
          loteId: evento.loteId,
        },
      }));
    });

    socket.on("sensor:falla", (evento: SensorFallaEvent) => {
      if (!sensorIdsRef.current.has(evento.sensorId)) {
        console.warn(
          `[sensores WS] sensor:falla de un sensor desconocido (id=${evento.sensorId}), se ignora.`,
        );
        return;
      }
      setSensores((prev) =>
        prev.map((s) => (s.id === evento.sensorId ? { ...s, estado: EstadoSensor.FALLA } : s)),
      );
    });

    // El backend emite este evento antes de lectura:nueva cuando una
    // lectura válida saca a un sensor de estado FALLA, así que no hace
    // falta que lectura:nueva también intente cambiar el estado.
    socket.on("sensor:recuperado", (evento: SensorRecuperadoEvent) => {
      if (!sensorIdsRef.current.has(evento.sensorId)) {
        console.warn(
          `[sensores WS] sensor:recuperado de un sensor desconocido (id=${evento.sensorId}), se ignora.`,
        );
        return;
      }
      setSensores((prev) =>
        prev.map((s) => (s.id === evento.sensorId ? { ...s, estado: EstadoSensor.ACTIVO } : s)),
      );
    });

    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [isLoading]);

  return { sensores, lecturas, isLoading, error, isRealtimeConnected };
}
