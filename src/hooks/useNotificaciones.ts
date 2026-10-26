import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSocket } from "../services/socket";
import { notificacionService } from "../services/notificacion.service";
import type { Notificacion } from "../types/notificacion.types";
import { usePermisos } from "./usePermisos";
import { RETENCION_AVISOS_MOCK } from "../constants/retencion";
import { esAvisoRetencionMock, useAvisosRetencionMock } from "./useAvisosRetencionMock";

interface UseNotificacionesResult {
  notificaciones: Notificacion[];
  // null = todavía no se pudo obtener el total del backend (la campana no
  // muestra badge en vez de un 0 engañoso).
  noLeidasCount: number | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  marcarLeida: (id: number) => Promise<void>;
  marcarTodasLeidas: () => Promise<void>;
  marcandoTodas: boolean;
  errorMarcarTodas: string | null;
  limpiarErrorMarcarTodas: () => void;
}

// Carga inicial por REST (GET /notificaciones, ya vienen ordenadas por el
// backend) + suscripción al WS /notificaciones (HU-21, AC4) para que las
// nuevas notificaciones de "lote No Apto" aparezcan sin refrescar. Mismo
// patrón que useSensoresRealtime.ts (HU-13).
export function useNotificaciones(): UseNotificacionesResult {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // HU-79: el contador sale de GET /notificaciones/no-leidas/count, no de la
  // lista (paginada a 20). Los eventos locales lo ajustan al instante y
  // después se resincroniza con el backend.
  const [noLeidasServidor, setNoLeidasServidor] = useState<number | null>(null);
  const conteoSeqRef = useRef(0);
  const [marcandoTodas, setMarcandoTodas] = useState(false);
  const [errorMarcarTodas, setErrorMarcarTodas] = useState<string | null>(null);
  // HU-48 (AC4): avisos de retención mock, para quien puede actuar sobre la
  // política y los registros próximos a vencer (configuracion_empresa:editar).
  // Ver constants/retencion.ts para apagarlo cuando el backend los emita.
  const { puede, esSistema } = usePermisos();
  const avisosRetencion = useAvisosRetencionMock(
    RETENCION_AVISOS_MOCK && !esSistema && puede("configuracion_empresa", "editar"),
  );

  const sincronizarConteo = useCallback(async () => {
    const seq = ++conteoSeqRef.current;
    try {
      const total = await notificacionService.contarNoLeidas();
      if (seq === conteoSeqRef.current) setNoLeidasServidor(total);
    } catch {
      // Se conserva el último valor conocido: ocultar el badge por un fallo
      // pasajero se leería como "no hay nada sin leer".
    }
  }, []);

  // Invalida las respuestas de conteo que ya estaban en vuelo: se pidieron
  // antes del ajuste y lo pisarían con un valor viejo.
  const ajustarConteo = useCallback((delta: number) => {
    conteoSeqRef.current++;
    setNoLeidasServidor((prev) => (prev === null ? prev : Math.max(0, prev + delta)));
  }, []);

  const cargarNotificaciones = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    void sincronizarConteo();
    try {
      const result = await notificacionService.getAll();
      setNotificaciones(result);
    } catch {
      setError("No se pudieron cargar las notificaciones.");
    } finally {
      setIsLoading(false);
    }
  }, [sincronizarConteo]);

  useEffect(() => {
    void cargarNotificaciones();
  }, [cargarNotificaciones]);

  useEffect(() => {
    if (isLoading) return;

    const socket = createSocket("/notificaciones");

    socket.on("notificacion:nueva", (notificacion: Notificacion) => {
      setNotificaciones((prev) => [notificacion, ...prev]);
      ajustarConteo(1);
      void sincronizarConteo();
    });

    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [isLoading, ajustarConteo, sincronizarConteo]);

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
    ajustarConteo(-1);
    try {
      await notificacionService.marcarLeida(id);
    } catch {
      setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: false } : n)));
      ajustarConteo(1);
    }
    void sincronizarConteo();
  };

  // Mismo patrón optimista que marcarLeida. Los avisos mock de retención se
  // marcan local junto con el resto y se revierten con ellos.
  const marcarTodasLeidas = async () => {
    const idsNoLeidas = notificaciones.filter((n) => !n.leida).map((n) => n.id);
    const idsAvisos = avisosRetencion.avisos.filter((a) => !a.leida).map((a) => a.id);
    const conteoPrevio = noLeidasServidor;
    setErrorMarcarTodas(null);
    setMarcandoTodas(true);
    setNotificaciones((prev) => prev.map((n) => (n.leida ? n : { ...n, leida: true })));
    avisosRetencion.actualizarLeidos(idsAvisos, true);
    conteoSeqRef.current++;
    setNoLeidasServidor((prev) => (prev === null ? prev : 0));
    try {
      await notificacionService.marcarTodasLeidas();
    } catch {
      setNotificaciones((prev) =>
        prev.map((n) => (idsNoLeidas.includes(n.id) ? { ...n, leida: false } : n)),
      );
      avisosRetencion.actualizarLeidos(idsAvisos, false);
      // Suma en vez de pisar: conserva las que hayan llegado por WS mientras tanto.
      ajustarConteo(conteoPrevio ?? 0);
      setErrorMarcarTodas("No se pudieron marcar como leídas. Intentá nuevamente.");
    } finally {
      setMarcandoTodas(false);
    }
    void sincronizarConteo();
  };

  const limpiarErrorMarcarTodas = useCallback(() => setErrorMarcarTodas(null), []);

  const todas = useMemo(
    () =>
      avisosRetencion.avisos.length === 0
        ? notificaciones
        : [...notificaciones, ...avisosRetencion.avisos].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
    [notificaciones, avisosRetencion.avisos],
  );

  // HU-48: los avisos mock de retención no existen en el backend, se suman acá.
  const noLeidasCount = useMemo(
    () =>
      noLeidasServidor === null
        ? null
        : noLeidasServidor + avisosRetencion.avisos.filter((a) => !a.leida).length,
    [noLeidasServidor, avisosRetencion.avisos],
  );

  return {
    notificaciones: todas,
    noLeidasCount,
    isLoading,
    error,
    refetch: cargarNotificaciones,
    marcarLeida,
    marcarTodasLeidas,
    marcandoTodas,
    errorMarcarTodas,
    limpiarErrorMarcarTodas,
  };
}
