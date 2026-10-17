import { useEffect, useRef, useState } from "react";
import { createSocket } from "../services/socket";
import { sensorService } from "../services/sensor.service";
import { EstadoSensor } from "../types/sensor.types";
import type {
  LecturaNuevaEvent,
  OrigenLectura,
  Sensor,
  SensorFallaEvent,
  SensorRecuperadoEvent,
} from "../types/sensor.types";

export interface LecturaRuntime {
  valorActual: number;
  timestampLectura: string;
  loteId: number;
  // HU-15: permite mostrar en vivo si el último valor vino de un ingreso
  // manual de fallback en vez del sensor real.
  origen: OrigenLectura;
}

interface UseSensoresRealtimeResult {
  sensores: Sensor[];
  lecturas: Record<number, LecturaRuntime>;
  isLoading: boolean;
  error: string | null;
  isRealtimeConnected: boolean;
}

interface UseSensoresRealtimeOptions {
  // Si se pasa, vuelve a pedir GET /sensores cada tantos ms (solo con la
  // pestaña visible) para tomar nombre y lote asociado, y altas o bajas de
  // sensores. Estado y lecturas siguen viniendo del WS.
  refrescoMetadatosMs?: number;
}

// Del REST se toman solo nombre y lote asociado: el estado lo maneja el WS
// (sensor:falla / sensor:recuperado) y un refresco no lo debe pisar. Los
// sensores nuevos entran tal cual vienen. Si nada cambió devuelve `prev`,
// así el polling no re-renderiza la pantalla cada vez.
function fusionarMetadatos(prev: Sensor[], recibidos: Sensor[]): Sensor[] {
  const previos = new Map(prev.map((s) => [s.id, s]));
  let cambio = prev.length !== recibidos.length;
  const next = recibidos.map((r) => {
    const p = previos.get(r.id);
    if (!p) {
      cambio = true;
      return r;
    }
    if (p.nombre === r.nombre && (p.loteActualId ?? null) === (r.loteActualId ?? null)) return p;
    cambio = true;
    return { ...p, nombre: r.nombre, loteActualId: r.loteActualId };
  });
  return cambio ? next : prev;
}

// Carga inicial por REST (GET /sensores) + suscripción al WS /sensores
// (HU-13) para la pestaña "Estado y diagnóstico". Las lecturas en vivo se
// guardan aparte de `sensores` porque el backend no las modela como parte
// del sensor (solo llegan por WS, nunca por REST).
export function useSensoresRealtime({
  refrescoMetadatosMs,
}: UseSensoresRealtimeOptions = {}): UseSensoresRealtimeResult {
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
    if (!refrescoMetadatosMs || isLoading || error) return;

    let cancelado = false;
    let enCurso = false;
    let intervalo: ReturnType<typeof setInterval> | null = null;

    const refrescar = async () => {
      if (enCurso) return;
      enCurso = true;
      try {
        const result = await sensorService.getAll();
        if (!cancelado) setSensores((prev) => fusionarMetadatos(prev, result));
      } catch {
        // Un refresco fallido se ignora: queda lo último que se tenía.
      } finally {
        enCurso = false;
      }
    };
    const iniciar = () => {
      if (intervalo === null) intervalo = setInterval(refrescar, refrescoMetadatosMs);
    };
    const detener = () => {
      if (intervalo !== null) {
        clearInterval(intervalo);
        intervalo = null;
      }
    };
    // Con la pestaña oculta no se consulta; al volver, refresca enseguida.
    const onVisibilidad = () => {
      if (document.visibilityState === "visible") {
        void refrescar();
        iniciar();
      } else {
        detener();
      }
    };

    if (document.visibilityState === "visible") iniciar();
    document.addEventListener("visibilitychange", onVisibilidad);

    return () => {
      cancelado = true;
      detener();
      document.removeEventListener("visibilitychange", onVisibilidad);
    };
  }, [refrescoMetadatosMs, isLoading, error]);

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
          origen: evento.origen,
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
