import { useEffect, useMemo, useState } from "react";
import { createSocket } from "../services/socket";
import { notificacionService } from "../services/notificacion.service";
import type { Notificacion } from "../types/notificacion.types";
import { usePermisos } from "./usePermisos";
import { RETENCION_AVISOS_MOCK } from "../constants/retencion";
import { esAvisoRetencionMock, useAvisosRetencionMock } from "./useAvisosRetencionMock";

interface UseNotificacionesResult {
  notificaciones: Notificacion[];
  noLeidasCount: number;
  isLoading: boolean;
  error: string | null;
  marcarLeida: (id: number) => Promise<void>;
}

// Carga inicial por REST (GET /notificaciones, ya vienen ordenadas por el
// backend) + suscripción al WS /notificaciones (HU-21, AC4) para que las
// nuevas notificaciones de "lote No Apto" aparezcan sin refrescar. Mismo
// patrón que useSensoresRealtime.ts (HU-13).
export function useNotificaciones(): UseNotificacionesResult {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // HU-48 (AC4): avisos de retención mock, para quien puede consultar los
  // registros próximos a vencer (GET /retencion/proximos-a-vencer,
  // configuracion_empresa:ver). Ver constants/retencion.ts para apagarlo
  // cuando el backend los emita.
  const { puede } = usePermisos();
  const avisosRetencion = useAvisosRetencionMock(
    RETENCION_AVISOS_MOCK && puede("configuracion_empresa", "ver"),
  );

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const result = await notificacionService.getAll();
        if (!cancelado) setNotificaciones(result);
      } catch {
        if (!cancelado) setError("No se pudieron cargar las notificaciones.");
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

    socket.on("notificacion:nueva", (notificacion: Notificacion) => {
      setNotificaciones((prev) => [notificacion, ...prev]);
    });

    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [isLoading]);

  // TODO(backend): no existe forma de volver una notificación a "no leída"
  // (notificacion.repository.ts:markAsLeida hardcodea { leida: true }, sin
  // endpoint ni parámetro para el sentido inverso) — por eso no hay un
  // marcarNoLeida acá. Agregar cuando el backend lo soporte.
  const marcarLeida = async (id: number) => {
    // HU-48: aviso mock (id negativo) → se resuelve local, sin request.
    if (esAvisoRetencionMock(id)) {
      avisosRetencion.marcarLeida(id);
      return;
    }
    // Optimista: la campana no debería tildarse de vuelta si el PATCH falla
    // por un problema de red pasajero, así que revertimos ante error.
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    try {
      await notificacionService.marcarLeida(id);
    } catch {
      setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: false } : n)));
    }
  };

  const todas = useMemo(
    () =>
      avisosRetencion.avisos.length === 0
        ? notificaciones
        : [...notificaciones, ...avisosRetencion.avisos].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
    [notificaciones, avisosRetencion.avisos],
  );

  const noLeidasCount = useMemo(() => todas.filter((n) => !n.leida).length, [todas]);

  return { notificaciones: todas, noLeidasCount, isLoading, error, marcarLeida };
}
