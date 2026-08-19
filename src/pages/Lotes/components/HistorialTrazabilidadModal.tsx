import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  CheckCircle2,
  ClipboardCheck,
  HelpCircle,
  MapPin,
  PackagePlus,
  Snowflake,
} from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { Badge } from "../../../components/ui/Badge";
import { ClasificacionLoteBadge } from "../../../components/ClasificacionLoteBadge";
import { useTrazabilidadLote } from "../../../hooks/useTrazabilidadLote";
import { TIPO_MATERIA_PRIMA_TABS } from "../../Configuracion/constants/parametrosCalidad";
import { UBICACION_LABEL } from "../../Sensores/constants/parametroSensor";
import { UNIDAD_RENDIMIENTO_SIMBOLO } from "../constants/unidadRendimiento";
import { ClasificacionLote, DecisionRevision, UnidadRendimiento } from "../../../types/lote.types";
import type { TipoMateriaPrima } from "../../../types/configParametro.types";
import { Ubicacion } from "../../../types/sensor.types";
import { TipoEventoTrazabilidad, type EventoTrazabilidad } from "../../../types/trazabilidad.types";

const TIPO_MATERIA_PRIMA_LABEL = new Map(TIPO_MATERIA_PRIMA_TABS.map((t) => [t.value, t.label]));

const DECISION_LABEL: Record<DecisionRevision, string> = {
  [DecisionRevision.APROBADO]: "Aprobado",
  [DecisionRevision.RECHAZADO]: "Rechazado",
};
const DECISION_VARIANT: Record<DecisionRevision, "success" | "danger"> = {
  [DecisionRevision.APROBADO]: "success",
  [DecisionRevision.RECHAZADO]: "danger",
};

// Ícono + etiqueta por tipo de evento — mismo criterio que RESULTADO_META en
// ClasificacionLoteBadge (dict fijo + fallback defensivo si el backend llega
// a mandar un tipo fuera del enum vigente).
const TIPO_EVENTO_META: Record<TipoEventoTrazabilidad, { label: string; icon: LucideIcon }> = {
  [TipoEventoTrazabilidad.RECEPCION]: { label: "Recepción", icon: PackagePlus },
  [TipoEventoTrazabilidad.CLASIFICACION]: {
    label: "Clasificación automática",
    icon: ClipboardCheck,
  },
  [TipoEventoTrazabilidad.REVISION_CALIDAD]: { label: "Revisión de calidad", icon: ClipboardCheck },
  [TipoEventoTrazabilidad.CAMBIO_UBICACION]: { label: "Cambio de ubicación", icon: MapPin },
  [TipoEventoTrazabilidad.INGRESO_CAMARA]: { label: "Ingreso a cámara", icon: Snowflake },
  [TipoEventoTrazabilidad.CONSUMO_PARCIAL]: {
    label: "Consumo hacia producción",
    icon: ArrowRightLeft,
  },
  [TipoEventoTrazabilidad.FINALIZACION]: { label: "Finalización", icon: CheckCircle2 },
};
const TIPO_EVENTO_FALLBACK = { label: "Evento", icon: HelpCircle };

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Segunda línea de cada evento: un resumen corto y específico por tipo, no
// un volcado genérico de `detalle` — el objetivo es que se lea como una
// bitácora de auditoría, no como JSON crudo. Los campos no cubiertos por
// ningún caso puntual simplemente no se muestran (quedan en `detalle` por si
// hiciera falta en el futuro, pero hoy no hay AC que los pida).
function DetalleEvento({ evento }: { evento: EventoTrazabilidad }) {
  const d = evento.detalle;

  switch (evento.tipo) {
    case TipoEventoTrazabilidad.RECEPCION: {
      const materiaPrima = d.materiaPrima as TipoMateriaPrima | undefined;
      const cantidad = d.cantidad as number | null | undefined;
      return (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {materiaPrima ? (TIPO_MATERIA_PRIMA_LABEL.get(materiaPrima) ?? materiaPrima) : "—"}
          {cantidad != null && ` · ${cantidad} L`}
        </p>
      );
    }
    case TipoEventoTrazabilidad.CLASIFICACION: {
      const clasificacion = d.clasificacion as ClasificacionLote | undefined;
      return clasificacion ? <ClasificacionLoteBadge resultado={clasificacion} /> : null;
    }
    case TipoEventoTrazabilidad.REVISION_CALIDAD: {
      const decision = d.decision as DecisionRevision | undefined;
      const justificacion = d.justificacion as string | undefined;
      return (
        <div className="flex flex-col gap-1">
          {decision && (
            <Badge variant={DECISION_VARIANT[decision]}>{DECISION_LABEL[decision]}</Badge>
          )}
          {justificacion && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{justificacion}</p>
          )}
        </div>
      );
    }
    case TipoEventoTrazabilidad.CAMBIO_UBICACION: {
      const anterior = d.ubicacionAnterior as Ubicacion | null | undefined;
      const nueva = d.ubicacionNueva as Ubicacion | undefined;
      return (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {anterior ? UBICACION_LABEL[anterior] : "Sin ubicación previa"} →{" "}
          {nueva ? UBICACION_LABEL[nueva] : "—"}
        </p>
      );
    }
    case TipoEventoTrazabilidad.INGRESO_CAMARA: {
      const skuNombre = d.skuNombre as string | undefined;
      const skuId = d.skuId as number | undefined;
      const cantidad = d.cantidad as number | undefined;
      return (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {skuNombre ?? `SKU #${skuId}`}
          {cantidad != null && ` · ${cantidad}`}
        </p>
      );
    }
    case TipoEventoTrazabilidad.CONSUMO_PARCIAL: {
      const cantidad = d.cantidad as number | undefined;
      const loteProduccionCodigo = d.loteProduccionCodigo as string | undefined;
      return (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {cantidad} L → {loteProduccionCodigo ?? "—"}
        </p>
      );
    }
    case TipoEventoTrazabilidad.FINALIZACION: {
      const rendimiento = d.rendimiento as number | null | undefined;
      const unidad = d.unidadRendimiento as UnidadRendimiento | null | undefined;
      if (rendimiento == null) return null;
      return (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Rendimiento: {rendimiento} {unidad ? UNIDAD_RENDIMIENTO_SIMBOLO[unidad] : ""}
        </p>
      );
    }
    default:
      return null;
  }
}

interface HistorialTrazabilidadModalProps {
  isOpen: boolean;
  loteId: number | null;
  onClose: () => void;
}

// HU-32: historial completo e inmutable, GET /lotes/:id/trazabilidad. A
// diferencia de TrazabilidadLoteModal (HU-68, panel de consumo parcial con
// acción de escritura), este componente es 100% de solo lectura — no hay
// ningún control de edición/borrado sobre los eventos.
export function HistorialTrazabilidadModal({
  isOpen,
  loteId,
  onClose,
}: HistorialTrazabilidadModalProps) {
  const { eventos, codigoLote, isLoading, error, refetch } = useTrazabilidadLote(loteId);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      title="Historial de trazabilidad completo"
      description={codigoLote ?? undefined}
      onClose={onClose}
    >
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="ml-4 rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30"
          >
            Reintentar
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando trazabilidad...</p>
      ) : eventos.length === 0 && !error ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Este lote todavía no tiene eventos de trazabilidad registrados.
        </p>
      ) : (
        <ol className="flex flex-col gap-4">
          {eventos.map((evento, i) => {
            const meta = TIPO_EVENTO_META[evento.tipo] ?? TIPO_EVENTO_FALLBACK;
            const Icon = meta.icon;
            return (
              <li key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <Icon className="h-4 w-4" />
                  </span>
                  {i < eventos.length - 1 && (
                    <span className="mt-1 w-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {evento.descripcion}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {formatFecha(evento.fecha)}
                    </span>
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {meta.label}
                  </span>
                  <DetalleEvento evento={evento} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Modal>
  );
}
