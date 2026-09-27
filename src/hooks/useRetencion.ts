import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EVENTO_RETENCION_ACTUALIZADA,
  retencionService,
} from "../services/retencion.service";
import {
  ClasificacionRetencion,
  EstadoRegistroRetencion,
  type PoliticaRetencion,
  type PoliticaRetencionInput,
  type RegistroRetencion,
  type ResolucionAccionPolitica,
  type ResolucionEliminacion,
} from "../types/retencion.types";
import {
  clasificarRegistro,
  diasRestantes,
  puedeEliminar,
  resolverAccionPolitica,
  resolverEliminacion,
} from "../utils/retencion";

export interface RegistroRetencionEvaluado extends RegistroRetencion {
  diasRestantes: number;
  clasificacion: ClasificacionRetencion;
  accionPolitica: ResolucionAccionPolitica;
  eliminacion: ResolucionEliminacion;
}

export interface ContadoresRetencion {
  protegidos: number;
  proximosAVencer: number;
  vencidosPendientes: number;
  archivados: number;
  enRevision: number;
  bajasLogicas: number;
}

interface UseRetencionResult {
  politica: PoliticaRetencion | null;
  // Todos los registros evaluados, días restantes asc (alcance por entidad).
  registros: RegistroRetencionEvaluado[];
  // Vencidos + próximos a vencer (cualquier estado), días restantes asc.
  proximosAVencer: RegistroRetencionEvaluado[];
  contadores: ContadoresRetencion;
  isLoading: boolean;
  error: string | null;
  guardarPolitica: (input: PoliticaRetencionInput) => Promise<PoliticaRetencion>;
  isGuardando: boolean;
  aplicarAccionPolitica: (registro: RegistroRetencion) => Promise<void>;
  darDeBaja: (registro: RegistroRetencion) => Promise<void>;
  // `${entidad}:${id}` de la fila con una acción en vuelo.
  procesandoClave: string | null;
  // Re-export del punto de enganche (utils/retencion.ts) para pantallas
  // que ya consumen este hook.
  puedeEliminar: typeof puedeEliminar;
}

export const claveRegistro = (r: RegistroRetencion) => `${r.entidad}:${r.id}`;

// HU-48: contadores y listado salen del MISMO array evaluado (AC3), así no
// pueden quedar incoherentes. La clasificación usa el período de la
// política y la ventana del aviso anticipado (60 días).
export function useRetencion(): UseRetencionResult {
  const [politica, setPolitica] = useState<PoliticaRetencion | null>(null);
  const [registrosBase, setRegistrosBase] = useState<RegistroRetencion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGuardando, setIsGuardando] = useState(false);
  const [procesandoClave, setProcesandoClave] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      try {
        const [p, r] = await Promise.all([
          retencionService.getPolitica(),
          retencionService.getRegistros(),
        ]);
        if (cancelado) return;
        setPolitica(p);
        setRegistrosBase(r);
        setError(null);
      } catch {
        if (!cancelado) setError("No se pudo cargar la política de retención.");
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    };
    void cargar();
    // Mismo evento que dispara el service al escribir: mantiene sincronizado
    // este hook con el de avisos (campanita) y con otras pestañas.
    const recargar = () => void cargar();
    window.addEventListener(EVENTO_RETENCION_ACTUALIZADA, recargar);
    window.addEventListener("storage", recargar);
    return () => {
      cancelado = true;
      window.removeEventListener(EVENTO_RETENCION_ACTUALIZADA, recargar);
      window.removeEventListener("storage", recargar);
    };
  }, []);

  const registros = useMemo<RegistroRetencionEvaluado[]>(() => {
    if (!politica) return [];
    const hoy = new Date();
    return registrosBase
      .map((registro) => {
        const dias = diasRestantes(registro.fechaCreacion, politica.periodoMeses, hoy);
        return {
          ...registro,
          diasRestantes: dias,
          clasificacion: clasificarRegistro(dias, politica.avisoAnticipado.diasAntes),
          accionPolitica: resolverAccionPolitica(registro, politica, hoy),
          eliminacion: resolverEliminacion(registro, politica, hoy),
        };
      })
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [registrosBase, politica]);

  const proximosAVencer = useMemo(
    () => registros.filter((r) => r.clasificacion !== ClasificacionRetencion.PROTEGIDO),
    [registros],
  );

  const contadores = useMemo<ContadoresRetencion>(() => {
    const activos = registros.filter((r) => r.estado === EstadoRegistroRetencion.ACTIVO);
    const porClasificacion = (clasificacion: ClasificacionRetencion) =>
      activos.filter((r) => r.clasificacion === clasificacion).length;
    const porEstado = (estado: EstadoRegistroRetencion) =>
      registros.filter((r) => r.estado === estado).length;
    return {
      protegidos: porClasificacion(ClasificacionRetencion.PROTEGIDO),
      proximosAVencer: porClasificacion(ClasificacionRetencion.PROXIMO_A_VENCER),
      vencidosPendientes: porClasificacion(ClasificacionRetencion.VENCIDO),
      archivados: porEstado(EstadoRegistroRetencion.ARCHIVADO),
      enRevision: porEstado(EstadoRegistroRetencion.EN_REVISION),
      bajasLogicas: porEstado(EstadoRegistroRetencion.BAJA_LOGICA),
    };
  }, [registros]);

  const guardarPolitica = useCallback(async (input: PoliticaRetencionInput) => {
    setIsGuardando(true);
    try {
      const guardada = await retencionService.guardarPolitica(input);
      setPolitica(guardada);
      return guardada;
    } finally {
      setIsGuardando(false);
    }
  }, []);

  // Las acciones relanzan el error: el componente lo muestra con
  // extraerMensajeError (retencion.service.ts).
  const ejecutarEnFila = useCallback(
    async (registro: RegistroRetencion, accion: () => Promise<RegistroRetencion>) => {
      setProcesandoClave(claveRegistro(registro));
      try {
        const actualizado = await accion();
        setRegistrosBase((prev) =>
          prev.map((r) => (claveRegistro(r) === claveRegistro(actualizado) ? actualizado : r)),
        );
      } finally {
        setProcesandoClave(null);
      }
    },
    [],
  );

  const aplicarAccionPolitica = useCallback(
    (registro: RegistroRetencion) =>
      ejecutarEnFila(registro, () =>
        retencionService.aplicarAccionPolitica(registro.entidad, registro.id),
      ),
    [ejecutarEnFila],
  );

  const darDeBaja = useCallback(
    (registro: RegistroRetencion) =>
      ejecutarEnFila(registro, () => retencionService.darDeBaja(registro.entidad, registro.id)),
    [ejecutarEnFila],
  );

  return {
    politica,
    registros,
    proximosAVencer,
    contadores,
    isLoading,
    error,
    guardarPolitica,
    isGuardando,
    aplicarAccionPolitica,
    darDeBaja,
    procesandoClave,
    puedeEliminar,
  };
}
