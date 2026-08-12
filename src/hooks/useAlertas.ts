import { useCallback, useEffect, useMemo, useState } from "react";
import { createSocket } from "../services/socket";
import { notificacionService } from "../services/notificacion.service";
import { alertaCierreService } from "../services/alertaCierre.service";
import type { Notificacion } from "../types/notificacion.types";
import { esAlertaUmbral } from "../types/notificacion.types";
import { EstadoAlerta, type AlertaConCierre, type CierreAlerta } from "../types/alertaCierre.types";

interface UseAlertasResult {
  alertas: AlertaConCierre[];
  isLoading: boolean;
  error: string | null;
  isRealtimeConnected: boolean;
  marcarLeida: (id: number) => Promise<void>;
  cerrarAlerta: (id: number, accionCorrectiva: string) => Promise<void>;
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
  // HU-27: cierres mockeados (ver alertaCierre.service.ts), por id de
  // notificación.
  const [cierres, setCierres] = useState<Record<number, CierreAlerta>>({});

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const result = await notificacionService.getAll({ limit: 100 });
        if (!cancelado) {
          setNotificaciones(result);
          // Rehidrata los cierres ya guardados en el mock (alertaCierreService
          // persiste a nivel de módulo, no de este hook) — si no, una alerta
          // cerrada vuelve a mostrarse "Abierta" cada vez que se remonta este
          // hook (ej. navegar a otra pantalla y volver a /alertas).
          setCierres((prev) => {
            const hidratado = { ...prev };
            for (const n of result) {
              const cierre = alertaCierreService.getCierre(n.id);
              if (cierre) hidratado[n.id] = cierre;
            }
            return hidratado;
          });
        }
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

  // HU-27: cerrar una alerta con su acción correctiva. También la marca como
  // leída (si no lo estaba) para que "deje de notificar" — AC de HU-27 — y
  // el badge de HU-26 (Layout.tsx) refleje que ya no requiere atención. No
  // usa el `marcarLeida` de arriba (que traga el error y solo hace
  // rollback): acá si el PATCH real falla hay que abortar el cierre, para no
  // mostrar "Cerrada" en esta pantalla mientras el backend todavía la
  // cuenta como no leída en la campana. Por esto mismo se mantiene
  // secuencial a propósito (no Promise.all) — el cierre no debe dispararse
  // si el marcado como leída falló.
  const cerrarAlerta = useCallback(
    async (id: number, accionCorrectiva: string) => {
      const notificacion = notificaciones.find((n) => n.id === id);
      if (notificacion && !notificacion.leida) {
        setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
        try {
          await notificacionService.marcarLeida(id);
        } catch (err) {
          setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: false } : n)));
          throw err;
        }
      }
      const cierre = await alertaCierreService.cerrarAlerta(id, accionCorrectiva);
      setCierres((prev) => ({ ...prev, [id]: cierre }));
    },
    [notificaciones],
  );

  const alertas = useMemo<AlertaConCierre[]>(
    () =>
      notificaciones.filter(esAlertaUmbral).map((alerta) => ({
        ...alerta,
        ...(cierres[alerta.id] ?? {
          estado: EstadoAlerta.ABIERTA,
          accionCorrectiva: null,
          cerradaEn: null,
        }),
      })),
    [notificaciones, cierres],
  );

  return { alertas, isLoading, error, isRealtimeConnected, marcarLeida, cerrarAlerta };
}
