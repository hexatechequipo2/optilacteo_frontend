import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSocket } from "../services/socket";
import { notificacionService } from "../services/notificacion.service";
import { alertaCierreService } from "../services/alertaCierre.service";
import type { Notificacion } from "../types/notificacion.types";
import { EstadoAlerta, esAlertaSensorDesconectado, esAlertaUmbral } from "../types/notificacion.types";
import type { AlertaConCierre } from "../types/alertaCierre.types";

// HU-31: a diferencia de la creación (push por WS, evento "notificacion:nueva"),
// el backend resuelve una alerta de sensor desconectado con un UPDATE directo
// al repositorio (resolverAlertaSensorDesconectado, disparado desde
// LecturaSensorService.ingresar) sin emitir ningún evento — no hay forma de
// enterarse en vivo de que se cerró. TODO(backend): emitir algo como
// "notificacion:actualizada" para poder sacar este polling. Mientras tanto,
// se refresca la lista cada 30s (bastante más laxo que el "EN VIVO" del WS,
// que sigue cubriendo la aparición de alertas nuevas) para que el cierre
// automático (AC4) se refleje sin que el usuario tenga que recargar.
const POLLING_RESOLUCION_MS = 30_000;

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

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        // El estado de cierre (estado/accionCorrectiva/fechaResolucion) ya
        // viene resuelto en la misma respuesta — NotificacionMapper.toResponse
        // (backend) lo serializa siempre, no hace falta pedirlo aparte ni
        // rehidratarlo desde otro lado.
        const result = await notificacionService.getAll({ limit: 100 });
        if (!cancelado) {
          setNotificaciones(result);
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

  // HU-31: ver comentario de POLLING_RESOLUCION_MS arriba — solo pega contra
  // el backend si hay alguna alerta de sensor desconectado todavía abierta
  // en pantalla (el ref evita cerrar sobre un `notificaciones` desactualizado
  // dentro del interval sin tener que reiniciarlo en cada cambio de estado).
  const hayAlertasDesconexionAbiertasRef = useRef(false);
  hayAlertasDesconexionAbiertasRef.current = notificaciones.some(
    (n) => esAlertaSensorDesconectado(n) && n.estado === EstadoAlerta.ABIERTA,
  );

  useEffect(() => {
    if (isLoading) return;

    const interval = setInterval(async () => {
      if (!hayAlertasDesconexionAbiertasRef.current) return;
      try {
        const result = await notificacionService.getAll({ limit: 100 });
        setNotificaciones(result);
      } catch {
        // Silencioso a propósito: es un refresh de background, no hay
        // acción del usuario que abortar ni feedback útil que mostrarle
        // por un fallo puntual — el próximo tick reintenta solo.
      }
    }, POLLING_RESOLUCION_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setNotificaciones((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                estado: cierre.estado,
                accionCorrectiva: cierre.accionCorrectiva,
                fechaResolucion: cierre.cerradaEn,
              }
            : n,
        ),
      );
    },
    [notificaciones],
  );

  // HU-31: el listado ahora combina alerta_umbral (HU-25) y
  // alerta_sensor_desconectado — AlertasPage.tsx decide con qué card/panel
  // renderizar cada una según `alerta.tipo`.
  const alertas = useMemo<AlertaConCierre[]>(
    () =>
      notificaciones
        .filter((n) => esAlertaUmbral(n) || esAlertaSensorDesconectado(n))
        .map((alerta) => ({
          ...alerta,
          cerradaEn: alerta.fechaResolucion ?? null,
        })) as AlertaConCierre[],
    [notificaciones],
  );

  return { alertas, isLoading, error, isRealtimeConnected, marcarLeida, cerrarAlerta };
}
