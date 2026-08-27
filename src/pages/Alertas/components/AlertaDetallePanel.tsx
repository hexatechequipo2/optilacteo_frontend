import { useEffect, useState, type ReactNode } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { FieldError } from "../../../components/ui/FieldError";
import { ValorConUnidad } from "../../../components/ValorConUnidad";
import type { AlertaUmbralConCierre } from "../../../types/alertaCierre.types";
import { EstadoAlerta } from "../../../types/alertaCierre.types";
import { ESTADO_ALERTA_META, NIVEL_ALERTA_META, PARAMETRO_LABEL, UNIDAD_POR_PARAMETRO } from "../constants/alertas.constants";

interface AlertaDetallePanelProps {
  // HU-31: específico de alerta_umbral, ver mismo comentario en AlertaCard.tsx.
  alerta: AlertaUmbralConCierre | null;
  onClose: () => void;
  // HU-27: guarda el cierre (mock por ahora, ver alertaCierre.service.ts).
  onCerrar: (id: number, accionCorrectiva: string) => Promise<void>;
  // HU-27 AC: "un usuario sin el rol habilitado no debe poder cerrar una
  // alerta". La ruta /alertas ya es exclusiva de Responsable de producción
  // (App.tsx), así que hoy esto siempre es true — se deja como defensa en
  // profundidad por si el día de mañana se suma otro rol con acceso de
  // lectura a esta pantalla.
  puedeCerrar: boolean;
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

// HU-27: panel lateral que se abre al clickear una AlertaCard. Reusa
// Modal.tsx tal cual — ya es un drawer de borde derecho (justify-end +
// slide-in-from-right), no hace falta un componente nuevo para esto.
export function AlertaDetallePanel({ alerta, onClose, onCerrar, puedeCerrar }: AlertaDetallePanelProps) {
  const [accionCorrectiva, setAccionCorrectiva] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Limpia el form cada vez que se abre una alerta distinta.
  useEffect(() => {
    setAccionCorrectiva("");
    setError(null);
    setIsSubmitting(false);
  }, [alerta?.id]);

  if (!alerta) return null;

  const { data } = alerta;
  const nivelMeta = NIVEL_ALERTA_META[alerta.nivelAlerta];
  const estadoMeta = ESTADO_ALERTA_META[alerta.estado];
  const NivelIcon = nivelMeta.icon;
  const EstadoIcon = estadoMeta.icon;
  const unidad = UNIDAD_POR_PARAMETRO[data.parametro];
  const estaCerrada = alerta.estado === EstadoAlerta.CERRADA;

  const handleResolver = async () => {
    if (!accionCorrectiva.trim()) {
      setError("Ingresá la acción correctiva tomada.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onCerrar(alerta.id, accionCorrectiva.trim());
      onClose();
    } catch {
      setError("No se pudo cerrar la alerta. Reintentá en unos segundos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={!!alerta}
      title="Detalle de alerta"
      description={alerta.mensaje}
      onClose={onClose}
      footer={
        !estaCerrada && puedeCerrar ? (
          <Button type="button" onClick={handleResolver} isLoading={isSubmitting} className="w-full">
            Marcar como resuelto
          </Button>
        ) : undefined
      }
    >
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
          <CampoDetalle label="Parámetro afectado">{PARAMETRO_LABEL[data.parametro]}</CampoDetalle>
          <CampoDetalle label="Lote">{data.loteCodigo}</CampoDetalle>
          <CampoDetalle label="Valor registrado">
            <ValorConUnidad valor={data.valor} unidad={unidad} />
          </CampoDetalle>
          <CampoDetalle label="Umbral configurado">
            {data.umbralMin}–{data.umbralMax}
            {unidad ? ` ${unidad}` : ""}
          </CampoDetalle>
          <CampoDetalle label="Fecha y hora">{formatearFecha(alerta.createdAt)}</CampoDetalle>
        </div>

        <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
          {estaCerrada ? (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Acción correctiva tomada</p>
              <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                {alerta.accionCorrectiva}
              </p>
              {alerta.cerradaEn && (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Resuelta el {formatearFecha(alerta.cerradaEn)}
                </p>
              )}
            </div>
          ) : puedeCerrar ? (
            <div className="flex flex-col gap-1">
              <label
                htmlFor="alerta-accion-correctiva"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Acción correctiva tomada
              </label>
              <textarea
                id="alerta-accion-correctiva"
                value={accionCorrectiva}
                onChange={(e) => setAccionCorrectiva(e.target.value)}
                rows={4}
                placeholder="Describí qué se hizo para resolver el incidente..."
                aria-invalid={!!error}
                className={`w-full rounded-md border px-3 py-2 text-base text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 ${
                  error ? "border-red-500" : "border-slate-300 dark:border-slate-700"
                }`}
              />
              {error && <FieldError message={error} />}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Tu rol no tiene permiso para cerrar esta alerta.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
