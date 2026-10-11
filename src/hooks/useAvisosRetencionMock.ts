import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EVENTO_RETENCION_ACTUALIZADA,
  retencionService,
} from "../services/retencion.service";
import {
  NivelAlerta,
  TipoNotificacion,
  type Notificacion,
} from "../types/notificacion.types";
import {
  ClasificacionRetencion,
  EntidadRetenible,
  EstadoRegistroRetencion,
  type PoliticaRetencion,
  type RegistroRetencion,
} from "../types/retencion.types";
import { clasificarRegistro, diasRestantes, fechaVencimiento } from "../utils/retencion";

// HU-48 (AC4, mock aislado): arma los avisos de "registro próximo a vencer"
// con la misma forma que una Notificacion del backend, para que la campanita
// del header (Layout → useNotificaciones) los muestre sin un sistema
// paralelo. Todo lo de este archivo desaparece cuando se apague
// RETENCION_AVISOS_MOCK (constants/retencion.ts).
//
// Ids NEGATIVOS: nunca chocan con ids reales (autoincrement > 0) y permiten
// que useNotificaciones reconozca un aviso mock y resuelva marcarLeida
// localmente, sin request. Las leídas se guardan en localStorage porque
// Layout se remonta en cada navegación.

const STORAGE_LEIDOS = "optilacteo:retencion:avisos-leidos";
const ORDEN_ENTIDAD = Object.values(EntidadRetenible);
const MS_POR_DIA = 86_400_000;
// Por debajo de este umbral el aviso sube de informativo a advertencia.
const DIAS_AVISO_ADVERTENCIA = 15;

export function esAvisoRetencionMock(id: number): boolean {
  return id < 0;
}

// Estable por (entidad, id): los ids del backend se repiten entre entidades.
function idAviso(registro: RegistroRetencion): number {
  return -((ORDEN_ENTIDAD.indexOf(registro.entidad) + 1) * 1_000_000 + registro.id);
}

function leerLeidos(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_LEIDOS);
    return new Set(raw ? (JSON.parse(raw) as number[]) : []);
  } catch {
    return new Set();
  }
}

function construirAvisos(
  politica: PoliticaRetencion,
  registros: RegistroRetencion[],
  leidos: Set<number>,
): Notificacion[] {
  const hoy = new Date();
  const { diasAntes } = politica.avisoAnticipado;
  return registros.flatMap((registro) => {
    if (registro.estado !== EstadoRegistroRetencion.ACTIVO) return [];
    const dias = diasRestantes(registro.fechaCreacion, politica.periodoMeses, hoy);
    if (clasificarRegistro(dias, diasAntes) !== ClasificacionRetencion.PROXIMO_A_VENCER) return [];

    const vencimiento = fechaVencimiento(registro.fechaCreacion, politica.periodoMeses);
    const id = idAviso(registro);
    return [
      {
        id,
        tipo: TipoNotificacion.RETENCION_PROXIMO_VENCIMIENTO,
        mensaje:
          `Retención de datos: ${registro.referencia} cumple el período de conservación ` +
          `en ${dias} ${dias === 1 ? "día" : "días"} (${vencimiento.toLocaleDateString("es-AR")}).`,
        nivelAlerta: dias <= DIAS_AVISO_ADVERTENCIA ? NivelAlerta.ADVERTENCIA : NivelAlerta.INFORMATIVA,
        data: { entidad: registro.entidad, registroId: registro.id },
        leida: leidos.has(id),
        // Momento en que el backend lo habría emitido: vencimiento - ventana.
        createdAt: new Date(vencimiento.getTime() - diasAntes * MS_POR_DIA).toISOString(),
      },
    ];
  });
}

export function useAvisosRetencionMock(habilitado: boolean) {
  const [politica, setPolitica] = useState<PoliticaRetencion | null>(null);
  const [registros, setRegistros] = useState<RegistroRetencion[]>([]);
  const [leidos, setLeidos] = useState<Set<number>>(() => leerLeidos());

  useEffect(() => {
    if (!habilitado) return;
    let cancelado = false;
    const cargar = async () => {
      const [p, r] = await Promise.all([
        retencionService.getPolitica(),
        retencionService.getRegistros(),
      ]);
      if (cancelado) return;
      setPolitica(p);
      setRegistros(r);
    };
    void cargar();
    const recargar = () => void cargar();
    window.addEventListener(EVENTO_RETENCION_ACTUALIZADA, recargar);
    window.addEventListener("storage", recargar);
    return () => {
      cancelado = true;
      window.removeEventListener(EVENTO_RETENCION_ACTUALIZADA, recargar);
      window.removeEventListener("storage", recargar);
    };
  }, [habilitado]);

  const avisos = useMemo(
    () =>
      habilitado && politica?.avisoAnticipado.activo
        ? construirAvisos(politica, registros, leidos)
        : [],
    [habilitado, politica, registros, leidos],
  );

  const marcarLeida = useCallback((id: number) => {
    setLeidos((prev) => {
      const siguiente = new Set(prev).add(id);
      localStorage.setItem(STORAGE_LEIDOS, JSON.stringify([...siguiente]));
      return siguiente;
    });
  }, []);

  return { avisos, marcarLeida };
}
