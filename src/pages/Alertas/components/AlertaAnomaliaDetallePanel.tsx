import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { Badge } from "../../../components/ui/Badge";
import type { AlertaAnomaliaConCierre } from "../../../types/alertaCierre.types";
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
  // HU-50 criterio 4: la acción "Marcar como falso positivo" (servicio +
  // diálogo de confirmación) se agrega en el próximo paso sobre este mismo
  // panel — por ahora solo muestra el detalle de la anomalía (criterio 3).
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
export function AlertaAnomaliaDetallePanel({ alerta, onClose }: AlertaAnomaliaDetallePanelProps) {
  if (!alerta) return null;

  const { data } = alerta;
  const estadoMeta = ESTADO_ALERTA_META[alerta.estado];
  const EstadoIcon = estadoMeta.icon;
  const confianzaMeta = NIVEL_CONFIANZA_META[getNivelConfianza(alerta.confianza)];

  return (
    <Modal isOpen={!!alerta} title="Detalle de alerta" description={alerta.mensaje} onClose={onClose}>
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
      </div>
    </Modal>
  );
}
