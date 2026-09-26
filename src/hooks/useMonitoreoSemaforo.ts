import { useCallback, useEffect, useRef, useState } from "react";
import { createSocket } from "../services/socket";
import { sensorService } from "../services/sensor.service";
import { monitoreoSemaforoService } from "../services/monitoreoSemaforo.service";
import type { Parametro } from "../types/configParametro.types";
import { OrigenLectura } from "../types/sensor.types";
import type {
  LecturaNuevaSemaforoEvent,
  LecturaSemaforo,
  LoteEnProceso,
} from "../types/monitoreoSemaforo.types";
import { normalizarEstadoSemaforo } from "../utils/estadoSemaforo";

export type LecturasPorParametro = Partial<Record<Parametro, LecturaSemaforo>>;

interface UseMonitoreoSemaforoResult {
  lotes: LoteEnProceso[];
  loteSeleccionado: LoteEnProceso | null;
  seleccionarLote: (loteId: number) => void;
  // Última lectura por parámetro del lote seleccionado; un parámetro sin
  // lecturas no tiene clave (el componente lo muestra como "Sin lecturas").
  lecturas: LecturasPorParametro;
  isLoading: boolean;
  error: string | null;
  reintentar: () => void;
  isLoadingLecturas: boolean;
  errorLecturas: string | null;
  reintentarLecturas: () => void;
  isRealtimeConnected: boolean;
}

// Se queda con la lectura más nueva por parámetro: la respuesta REST puede
// llegar después de un evento WS más reciente. Con timestamp igual gana la
// nueva, así un refetch trae el estado recalculado si el Gerente cambió el
// umbral.
function mergeLectura(prev: LecturasPorParametro, lectura: LecturaSemaforo): LecturasPorParametro {
  const actual = prev[lectura.parametro];
  if (actual && new Date(actual.timestamp) > new Date(lectura.timestamp)) return prev;
  return { ...prev, [lectura.parametro]: lectura };
}

// HU-40: lotes en proceso + estado inicial por parámetro (REST) y
// actualizaciones en vivo por el WS /sensores, mismo patrón que
// useSensoresRealtime (un socket por pestaña). "lectura:nueva" no trae el
// parámetro, así que se resuelve sensorId -> parametro con GET /sensores.
//
// La lista de lotes en proceso se carga una sola vez: un lote que pasa a
// en_proceso después de la carga no aparece hasta "Reintentar" o recargar
// la página (el backend no emite un evento de cambio de estado de lote).
// Lo mismo con sensores dados de alta después: sus lecturas se ignoran.
export function useMonitoreoSemaforo(): UseMonitoreoSemaforoResult {
  const [lotes, setLotes] = useState<LoteEnProceso[]>([]);
  const [loteSeleccionadoId, setLoteSeleccionadoId] = useState<number | null>(null);
  const [lecturasPorLote, setLecturasPorLote] = useState<Record<number, LecturasPorParametro>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intentoCarga, setIntentoCarga] = useState(0);
  const [isLoadingLecturas, setIsLoadingLecturas] = useState(false);
  const [errorLecturas, setErrorLecturas] = useState<string | null>(null);
  const [intentoLecturas, setIntentoLecturas] = useState(0);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Los listeners del socket se registran una sola vez; los refs les dan el
  // dato más reciente sin quedar atados al closure del momento del registro.
  const parametroPorSensorRef = useRef<Map<number, Parametro>>(new Map());
  const loteIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    let cancelado = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const [lotesEnProceso, sensores] = await Promise.all([
          monitoreoSemaforoService.getLotesEnProceso(),
          sensorService.getAll(),
        ]);
        if (cancelado) return;
        parametroPorSensorRef.current = new Map(sensores.map((s) => [s.id, s.parametro]));
        loteIdsRef.current = new Set(lotesEnProceso.map((l) => l.id));
        setLotes(lotesEnProceso);
        setLoteSeleccionadoId((prev) =>
          prev !== null && lotesEnProceso.some((l) => l.id === prev)
            ? prev
            : (lotesEnProceso[0]?.id ?? null),
        );
      } catch {
        if (!cancelado) setError("No se pudieron cargar los lotes en proceso.");
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [intentoCarga]);

  // Se vuelve a pedir en cada cambio de lote (no solo la primera vez): así
  // un cambio de umbral del Gerente se refleja también al volver a un lote.
  useEffect(() => {
    if (loteSeleccionadoId === null) return;
    const loteId = loteSeleccionadoId;
    let cancelado = false;
    setIsLoadingLecturas(true);
    setErrorLecturas(null);

    (async () => {
      try {
        const { parametros } = await monitoreoSemaforoService.getSemaforoLote(loteId);
        if (cancelado) return;
        setLecturasPorLote((prev) => {
          let lecturasLote = prev[loteId] ?? {};
          for (const p of parametros) {
            lecturasLote = mergeLectura(lecturasLote, {
              ...p,
              estado: normalizarEstadoSemaforo(p.estado),
            });
          }
          return { ...prev, [loteId]: lecturasLote };
        });
      } catch {
        if (!cancelado) setErrorLecturas("No se pudo cargar el estado de los parámetros del lote.");
      } finally {
        if (!cancelado) setIsLoadingLecturas(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [loteSeleccionadoId, intentoLecturas]);

  useEffect(() => {
    // Igual que useSensoresRealtime: el socket se abre recién con los
    // sensores cargados, para poder resolver el parámetro de cada lectura.
    if (isLoading || error) return;

    const socket = createSocket("/sensores");

    socket.on("connect", () => setIsRealtimeConnected(true));
    socket.on("disconnect", () => setIsRealtimeConnected(false));
    socket.on("connect_error", () => setIsRealtimeConnected(false));

    socket.on("lectura:nueva", (evento: LecturaNuevaSemaforoEvent) => {
      // Lecturas de lotes que no están en proceso no se muestran acá.
      if (!loteIdsRef.current.has(evento.loteId)) return;

      const parametro = parametroPorSensorRef.current.get(evento.sensorId);
      if (!parametro) {
        console.warn(
          `[semaforo WS] lectura:nueva de un sensor desconocido (id=${evento.sensorId}), se ignora.`,
        );
        return;
      }

      const lectura: LecturaSemaforo = {
        parametro,
        valor: evento.valor,
        estado: normalizarEstadoSemaforo(evento.estado),
        origen: evento.origen === OrigenLectura.MANUAL ? "MANUAL" : "SENSOR",
        timestamp: evento.timestampLectura,
      };

      setLecturasPorLote((prev) => ({
        ...prev,
        [evento.loteId]: mergeLectura(prev[evento.loteId] ?? {}, lectura),
      }));
    });

    socket.connect();

    return () => {
      socket.off();
      socket.disconnect();
      setIsRealtimeConnected(false);
    };
  }, [isLoading, error]);

  const reintentar = useCallback(() => setIntentoCarga((n) => n + 1), []);
  const reintentarLecturas = useCallback(() => setIntentoLecturas((n) => n + 1), []);

  const loteSeleccionado = lotes.find((l) => l.id === loteSeleccionadoId) ?? null;
  const lecturas = loteSeleccionadoId !== null ? (lecturasPorLote[loteSeleccionadoId] ?? {}) : {};

  return {
    lotes,
    loteSeleccionado,
    seleccionarLote: setLoteSeleccionadoId,
    lecturas,
    isLoading,
    error,
    reintentar,
    isLoadingLecturas,
    errorLecturas,
    reintentarLecturas,
    isRealtimeConnected,
  };
}
