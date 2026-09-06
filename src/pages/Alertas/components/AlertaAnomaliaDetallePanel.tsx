import { useEffect, useState, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { Badge } from "../../../components/ui/Badge";
import { ConfirmModal } from "../../../components/ui/ConfirmModal";
import { useAuth } from "../../../hooks/useAuth";
import { resolverUsuarioRevision } from "../../../utils/resolverUsuarioRevision";
import type { AlertaAnomaliaConCierre } from "../../../types/alertaCierre.types";
import { EstadoAlerta } from "../../../types/alertaCierre.types";
import { getNivelConfianza } from "../../../utils/confianza";
import {
  ESTADO_ALERTA_META,
  NIVEL_CONFIANZA_META,
  PARAMETRO_LABEL,
  TIPO_DESVIO_LABEL,
} from "../constants/alertas.constants";

interface AlertaAnomaliaDetallePanelProps {
  alerta: AlertaAnomaliaConCierre | null;
  onClose: () => void;
  // HU-50 criterio 4.
  onMarcarFalsoPositivo: (id: number) => Promise<void>;
  // Mismo criterio de defensa en profundidad que puedeCerrar en
  // AlertaDetallePanel.tsx — la ruta /alertas ya es exclusiva de
  // Responsable de producción (App.tsx), que es el mismo rol que exige el
  // backend acá (@Roles(RESPONSABLE_PRODUCCION) en marcarFalsoPositivo).
  puedeMarcarFalsoPositivo: boolean;
}

function formatearFecha(timestamp: string): string {
  return new Date(timestamp).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CampoDetalle({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
      <div className="text-sm text-slate-700 dark:text-slate-300">{children}</div>
    </div>
  );
}

// HU-50 criterios 3/4: hermano de AlertaDetallePanel.tsx (HU-27) y
// AlertaSensorDesconectadoDetallePanel.tsx (HU-31), con la forma de datos
// propia de alerta_anomalia. No hay campo de serie histórica en el DTO
// (NotificacionResponseDto) — el gráfico con el patrón detectado por el
// modelo queda fuera de alcance de esta HU, documentado acá a propósito.
export function AlertaAnomaliaDetallePanel({
  alerta,
  onClose,
  onMarcarFalsoPositivo,
  puedeMarcarFalsoPositivo,
}: AlertaAnomaliaDetallePanelProps) {
  const { user } = useAuth();
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Limpia el estado del diálogo cada vez que se abre una alerta distinta —
  // mismo criterio que AlertaDetallePanel.tsx.
  useEffect(() => {
    setMostrarConfirmacion(false);
    setError(null);
    setIsSubmitting(false);
  }, [alerta?.id]);

  if (!alerta) return null;

  const { data } = alerta;
  const estadoMeta = ESTADO_ALERTA_META[alerta.estado];
  const EstadoIcon = estadoMeta.icon;
  const confianzaMeta = NIVEL_CONFIANZA_META[getNivelConfianza(alerta.confianza)];
  const estaAbierta = alerta.estado === EstadoAlerta.ABIERTA;
  const esFalsoPositivo = alerta.estado === EstadoAlerta.FALSO_POSITIVO;

  const handleConfirmarFalsoPositivo = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await onMarcarFalsoPositivo(alerta.id);
      setMostrarConfirmacion(false);
      onClose();
    } catch {
      setError("No se pudo marcar la alerta como falso positivo. Reintentá en unos segundos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={!!alerta}
        title="Detalle de alerta"
        description={alerta.mensaje}
        onClose={onClose}
        footer={
          estaAbierta && puedeMarcarFalsoPositivo ? (
            <button
              type="button"
              onClick={() => setMostrarConfirmacion(true)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Marcar como falso positivo
            </button>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">
              <Sparkles className="h-3 w-3" />
              Anomalía detectada
            </Badge>
            <Badge variant={confianzaMeta.badgeVariant}>{confianzaMeta.label}</Badge>
            <Badge variant={estadoMeta.badgeVariant}>
              <EstadoIcon className="h-3 w-3" />
              {estadoMeta.label}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <CampoDetalle label="Parámetro afectado">{PARAMETRO_LABEL[data.parametro]}</CampoDetalle>
            <CampoDetalle label="Lote">{data.loteCodigo}</CampoDetalle>
            <CampoDetalle label="Tipo de desvío">{TIPO_DESVIO_LABEL[alerta.tipoDesvio]}</CampoDetalle>
            <CampoDetalle label="Confianza del modelo">{alerta.confianza}%</CampoDetalle>
            <CampoDetalle label="Versión del modelo">{alerta.modeloVersion}</CampoDetalle>
            <CampoDetalle label="Fecha y hora">{formatearFecha(alerta.createdAt)}</CampoDetalle>
          </div>

          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            {esFalsoPositivo ? (
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Marcada como falso positivo
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Por{" "}
                  {alerta.marcadaFalsoPositivoPorId != null
                    ? resolverUsuarioRevision(alerta.marcadaFalsoPositivoPorId, user)
                    : "—"}
                  {alerta.fechaMarcadoFalsoPositivo
                    ? ` el ${formatearFecha(alerta.fechaMarcadoFalsoPositivo)}`
                    : ""}
                </p>
              </div>
            ) : !puedeMarcarFalsoPositivo ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tu rol no tiene permiso para marcar esta alerta como falso positivo.
              </p>
            ) : null}
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={mostrarConfirmacion}
        title="¿Marcar esta anomalía como falso positivo?"
        description={
          error ??
          "Esta acción retroalimenta al modelo de ML como una detección incorrecta, antes del próximo reentrenamiento. No se puede deshacer."
        }
        confirmLabel="Marcar como falso positivo"
        isLoading={isSubmitting}
        onConfirm={handleConfirmarFalsoPositivo}
        onCancel={() => setMostrarConfirmacion(false)}
      />
    </>
  );
}
