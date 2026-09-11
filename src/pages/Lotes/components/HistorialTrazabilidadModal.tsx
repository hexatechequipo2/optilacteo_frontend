import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  CheckCircle2,
  ClipboardCheck,
  Download,
  GitBranch,
  HelpCircle,
  MapPin,
  PackagePlus,
  Snowflake,
} from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { Badge } from "../../../components/ui/Badge";
import { ClasificacionLoteBadge } from "../../../components/ClasificacionLoteBadge";
import { SectionHeader } from "../../../components/ui/SectionHeader";
import { useTrazabilidadLote } from "../../../hooks/useTrazabilidadLote";
import { useDestinoProductivoLote } from "../../../hooks/useDestinoProductivoLote";
import { useRemitoLote } from "../../../hooks/useRemitoLote";
import { exportarTrazabilidadCsv } from "../../../utils/exportarTrazabilidadCsv";
import { TIPO_MATERIA_PRIMA_TABS } from "../../Configuracion/constants/parametrosCalidad";
import { UBICACION_LABEL } from "../../Sensores/constants/parametroSensor";
import { UNIDAD_RENDIMIENTO_SIMBOLO } from "../constants/unidadRendimiento";
import { ClasificacionLote, DecisionRevision, UnidadRendimiento } from "../../../types/lote.types";
import type { Lote } from "../../../types/lote.types";
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
  [TipoEventoTrazabilidad.RECOMENDACION_DESTINO]: {
    label: "Recomendación de destino",
    icon: GitBranch,
  },
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
    case TipoEventoTrazabilidad.RECOMENDACION_DESTINO: {
      const destinoRecomendadoNombre = d.destinoRecomendadoNombre as string | undefined;
      const destinoRealNombre = d.destinoRealNombre as string | null | undefined;
      const divergencia = d.divergencia as boolean | undefined;
      const justificacion = d.justificacion as string | null | undefined;
      const usuarioId = d.usuarioId as number | null | undefined;
      return (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Recomendado:{" "}
            <strong className="text-slate-700 dark:text-slate-300">
              {destinoRecomendadoNombre ?? "—"}
            </strong>
            {" · "}Elegido:{" "}
            <strong className="text-slate-700 dark:text-slate-300">
              {destinoRealNombre ?? "—"}
            </strong>
          </p>
          {divergencia && <Badge variant="warning">Divergencia justificada</Badge>}
          {justificacion && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Justificación: {justificacion}
            </p>
          )}
          {usuarioId != null && (
            // TODO(backend): el evento solo trae usuarioId numérico (ver
            // lote-trazabilidad.service.ts) — pedir que resuelva a nombre o
            // email, igual que ya se muestra en otros eventos del
            // historial. No disimular con un fallback mientras tanto.
            <p className="text-xs text-slate-400 dark:text-slate-500">Usuario ID: {usuarioId}</p>
          )}
        </div>
      );
    }
    default:
      return null;
  }
}

interface HistorialTrazabilidadModalProps {
  isOpen: boolean;
  loteId: number | null;
  // HU-69: para mostrar proveedor/tambo/remito y armar el nombre del CSV
  // exportado. Puede llegar null en el instante entre "se cerró el lote
  // seleccionado" y "se cerró el modal" (mismo patrón que TrazabilidadLoteModal).
  lote: Lote | null;
  proveedorMap: Map<number, string>;
  tamboMap: Map<number, string>;
  onClose: () => void;
}

// HU-32: historial completo e inmutable, GET /lotes/:id/trazabilidad. A
// diferencia de TrazabilidadLoteModal (HU-68, panel de consumo parcial con
// acción de escritura), este componente es 100% de solo lectura — no hay
// ningún control de edición/borrado sobre los eventos.
export function HistorialTrazabilidadModal({
  isOpen,
  loteId,
  lote,
  proveedorMap,
  tamboMap,
  onClose,
}: HistorialTrazabilidadModalProps) {
  const { eventos, codigoLote, isLoading, error, refetch } = useTrazabilidadLote(loteId);
  const { historial: historialDestino, destinoVigente } = useDestinoProductivoLote(loteId);
  // HU-69 (mock visual): ver useRemitoLote.ts — el backend todavía no tiene
  // columna para esto, se guarda en localStorage al crear el lote.
  const numeroRemito = useRemitoLote(loteId);

  const nombreProveedor = lote ? (proveedorMap.get(lote.proveedorId) ?? `Proveedor #${lote.proveedorId}`) : "—";
  const nombreTambo = lote ? (tamboMap.get(lote.tamboId) ?? `Tambo #${lote.tamboId}`) : "—";

  const handleExportar = () => {
    if (!lote) return;
    const fecha = new Date().toISOString().slice(0, 10);
    exportarTrazabilidadCsv({
      codigoLote: lote.codigo,
      proveedor: nombreProveedor,
      tambo: nombreTambo,
      numeroRemito,
      eventos,
      nombreArchivo: `trazabilidad-${lote.codigo}-${fecha}.csv`,
    });
  };

  // HU-34: acá solo interesan las asignaciones manuales — las de origen
  // "recomendacion_ml" (aceptadas o con divergencia) ya se muestran en el
  // timeline real como evento RECOMENDACION_DESTINO (HU-37), listarlas
  // también acá sería duplicar el mismo dato. El backend ya devuelve
  // historialDestino ordenado del más nuevo al más viejo, no hace falta
  // revertir el array.
  const asignacionesManuales = historialDestino.filter((h) => h.origen === "manual");

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      title="Historial de trazabilidad completo"
      description={codigoLote ?? undefined}
      onClose={onClose}
    >
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <SectionHeader>DATOS DE INGRESO</SectionHeader>
          <button
            type="button"
            onClick={handleExportar}
            disabled={!lote || isLoading}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </button>
        </div>
        {/* HU-69: mismo estilo de tarjetas que "DATOS DE INGRESO" en
            TrazabilidadLoteModal — proveedor y tambo de origen ya existían en
            el lote, acá se suman para dar contexto junto al remito nuevo. */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Proveedor</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{nombreProveedor}</p>
          </div>
          <div className="flex flex-col gap-1 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Tambo de origen</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{nombreTambo}</p>
          </div>
          <div className="flex flex-col gap-1 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Nº de remito</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {numeroRemito ?? "Sin remito"}
            </p>
          </div>
        </div>
      </div>

      {/* HU-34/HU-37: destino vigente + asignaciones manuales, aparte del
          timeline real de arriba — GET /lotes/:id/destino-productivo/historial
          (ver useDestinoProductivoLote.ts). Las de origen "recomendacion_ml"
          no se listan acá (ver el comentario de asignacionesManuales). */}
      {destinoVigente && (
        <div className="mb-6 flex flex-col gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <SectionHeader>DESTINO PRODUCTIVO</SectionHeader>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Destino vigente:{" "}
            <strong className="text-slate-900 dark:text-white">
              {destinoVigente.destinoActualNombre}
            </strong>
          </p>
          {asignacionesManuales.length > 0 && (
            <ol className="flex flex-col gap-3">
              {asignacionesManuales.map((cambio) => (
                <li key={cambio.id} className="flex items-start gap-3">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <GitBranch className="h-4 w-4" />
                  </span>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {cambio.destinoAnteriorNombre ? (
                          <>
                            <strong>{cambio.destinoAnteriorNombre}</strong> →{" "}
                          </>
                        ) : null}
                        <strong>{cambio.destinoProductivoNombre}</strong>
                      </p>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {formatFecha(cambio.createdAt)}
                      </span>
                    </div>
                    {/* TODO(backend): igual que en RECOMENDACION_DESTINO más
                        abajo, solo llega usuarioId numérico — no disimular
                        con un fallback. */}
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Usuario ID: {cambio.usuarioId}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

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
