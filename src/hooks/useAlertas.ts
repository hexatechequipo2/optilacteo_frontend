import { useCallback, useEffect, useMemo, useState } from "react";
import { createSocket } from "../services/socket";
import { notificacionService } from "../services/notificacion.service";
import type { Notificacion } from "../types/notificacion.types";
import { esAlertaUmbral, type AlertaNotificacion } from "../types/notificacion.types";

interface UseAlertasResult {
  alertas: AlertaNotificacion[];
  isLoading: boolean;
  error: string | null;
  isRealtimeConnected: boolean;
  marcarLeida: (id: number) => Promise<void>;
}

// HU-25: mismo patrón que useNotificaciones.ts (HU-21) — carga inicial por
// REST + suscripción al WS /notificaciones para que las alertas nuevas
// aparezcan sin recargar (AC4). Se separa de useNotificaciones() en vez de
// reusarlo porque esta pantalla necesita un limit más alto (es la vista
// principal de trabajo de Responsable de producción, no una campana) y solo
// le interesa el subconjunto de tipo alerta_umbral.
export function useAlertas(): UseAlertasResult {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const result = await notificacionService.getAll({ limit: 100 });
        if (!cancelado) setNotificaciones(result);
      } catch {
        if (!cancelado) setError("No se pudieron cargar las alertas.");
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const socket = createSocket("/notificaciones");

    socket.on("connect", () => setIsRealtimeConnected(true));
    socket.on("disconnect", () => setIsRealtimeConnected(false));
    socket.on("connect_error", () => setIsRealtimeConnected(false));

    socket.on("notificacion:nueva", (notificacion: Notificacion) => {
      setNotificaciones((prev) => [notificacion, ...prev]);
    });

    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [isLoading]);

  // TODO(backend): no existe forma de volver una notificación a "no leída"
  // (mismo gap que useNotificaciones.ts) — no hay marcarNoLeida acá tampoco.
  const marcarLeida = useCallback(async (id: number) => {
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    try {
      await notificacionService.marcarLeida(id);
    } catch {
      setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: false } : n)));
    }
  }, []);

  const alertas = useMemo(() => notificaciones.filter(esAlertaUmbral), [notificaciones]);

  return { alertas, isLoading, error, isRealtimeConnected, marcarLeida };
}
