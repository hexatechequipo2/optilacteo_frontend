import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { Badge } from "../../../components/ui/Badge";
import type { AlertaSensorDesconectadoConCierre } from "../../../types/alertaCierre.types";
import { EstadoAlerta } from "../../../types/alertaCierre.types";
import { ESTADO_ALERTA_META, NIVEL_ALERTA_META } from "../constants/alertas.constants";

interface AlertaSensorDesconectadoDetallePanelProps {
  alerta: AlertaSensorDesconectadoConCierre | null;
  onClose: () => void;
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

// HU-31: hermano de AlertaDetallePanel.tsx (HU-27), pero sin formulario de
// acción correctiva ni botón "Marcar como resuelto" — a diferencia de
// alerta_umbral, esta se cierra sola en el backend apenas el sensor vuelve
// a mandar una lectura (LecturaSensorService.ingresar ->
// resolverAlertaSensorDesconectado), sin acción manual del usuario (AC4).
export function AlertaSensorDesconectadoDetallePanel({
  alerta,
  onClose,
}: AlertaSensorDesconectadoDetallePanelProps) {
  if (!alerta) return null;

  const { data } = alerta;
  const nivelMeta = NIVEL_ALERTA_META[alerta.nivelAlerta];
  const estadoMeta = ESTADO_ALERTA_META[alerta.estado];
  const NivelIcon = nivelMeta.icon;
  const EstadoIcon = estadoMeta.icon;
  const estaCerrada = alerta.estado === EstadoAlerta.CERRADA;

  return (
    <Modal isOpen={!!alerta} title="Detalle de alerta" description={alerta.mensaje} onClose={onClose}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-2">
          <Badge variant={nivelMeta.badgeVariant}>
            <NivelIcon className="h-3 w-3" />
            {nivelMeta.label}
          </Badge>
          <Badge variant={estadoMeta.badgeVariant}>
            <EstadoIcon className="h-3 w-3" />
            {estadoMeta.label}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <CampoDetalle label="Sensor">{data.sensorNombre}</CampoDetalle>
          <CampoDetalle label="Tiempo sin datos">{data.minutosSinDatos} min</CampoDetalle>
          <CampoDetalle label="Última lectura">
            {data.ultimaLectura ? formatearFecha(data.ultimaLectura) : "Sin registro"}
          </CampoDetalle>
          <CampoDetalle label="Fecha y hora de la alerta">{formatearFecha(alerta.createdAt)}</CampoDetalle>
        </div>

        <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
          {estaCerrada ? (
            <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span>
                El sensor volvió a enviar datos y la alerta se resolvió automáticamente
                {alerta.cerradaEn ? ` el ${formatearFecha(alerta.cerradaEn)}` : ""}.
              </span>
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Esta alerta se resuelve automáticamente en cuanto el sensor vuelva a enviar datos — no
              requiere ninguna acción manual.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
