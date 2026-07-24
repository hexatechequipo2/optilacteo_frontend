import { useEffect, useMemo, useState } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Select } from "../../../components/ui/Select";
import { Button } from "../../../components/ui/Button";
import { SectionHeader } from "../../../components/ui/SectionHeader";
import { useAuth } from "../../../hooks/useAuth";
import { useSensorLoteHistorial } from "../../../hooks/useSensorLoteHistorial";
import { extraerMensajeError } from "../../../services/sensor.service";
import { loteService } from "../../../services/lote.service";
import type { Sensor } from "../../../types/sensor.types";
import type { Lote } from "../../../types/lote.types";

interface SensorLoteHistorialModalProps {
  isOpen: boolean;
  sensor: Sensor | null;
  puedeAsociar: boolean;
  onClose: () => void;
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SensorLoteHistorialModal({
  isOpen,
  sensor,
  puedeAsociar,
  onClose,
}: SensorLoteHistorialModalProps) {
  const { user } = useAuth();
  const sensorId = sensor?.id ?? null;
  const { historial, vigente, isLoading, error, asociarLote, isAsociando } =
    useSensorLoteHistorial(sensorId);

  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loteSeleccionado, setLoteSeleccionado] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setLoteSeleccionado("");
    setFormError("");
    // Universo completo de lotes de la empresa para el selector de reasignación;
    // loteService ya está conectado al backend real (HU-60), a diferencia del
    // mock de sensores.
    loteService
      .getAll()
      .then(setLotes)
      .catch(() => setLotes([]));
  }, [isOpen]);

  const loteMap = useMemo(() => new Map(lotes.map((l) => [l.id, l.codigo])), [lotes]);

  if (!isOpen || !sensor) return null;

  const loteOptions = [
    { value: "", label: "Seleccioná un lote" },
    ...lotes
      .filter((l) => l.id !== vigente?.loteIdNuevo)
      .map((l) => ({ value: String(l.id), label: l.codigo })),
  ];

  const handleAsociar = async () => {
    setFormError("");
    if (!loteSeleccionado) {
      setFormError("Seleccioná un lote para asociar.");
      return;
    }
    try {
      await asociarLote(Number(loteSeleccionado));
      setLoteSeleccionado("");
    } catch (err) {
      setFormError(extraerMensajeError(err, "No se pudo asociar el sensor a ese lote."));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title={`Asociación a lote — ${sensor.nombre}`}
      description="Lote vigente, reasignación y trazabilidad de cambios"
      onClose={onClose}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <SectionHeader>ASOCIACIÓN VIGENTE</SectionHeader>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            {vigente ? (loteMap.get(vigente.loteIdNuevo) ?? `Lote #${vigente.loteIdNuevo}`) : "Sin asociar"}
          </p>
        </div>

        {puedeAsociar && (
          <div className="flex flex-col gap-3">
            <SectionHeader>REASIGNAR A OTRO LOTE</SectionHeader>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Select
                  id="historial-lote"
                  label="Lote nuevo"
                  options={loteOptions}
                  value={loteSeleccionado}
                  onChange={(e) => setLoteSeleccionado(e.target.value)}
                />
              </div>
              <Button
                type="button"
                className="!w-auto px-6"
                isLoading={isAsociando}
                onClick={handleAsociar}
              >
                Asociar
              </Button>
            </div>
            {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <SectionHeader>HISTORIAL DE ASOCIACIONES</SectionHeader>
          {isLoading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Cargando historial...</p>
          ) : error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : historial.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Este sensor todavía no fue asociado a ningún lote.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {[...historial].reverse().map((fila) => (
                <li
                  key={fila.id}
                  className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
                >
                  <span className="text-slate-700 dark:text-slate-300">
                    {fila.loteIdAnterior ? (loteMap.get(fila.loteIdAnterior) ?? `Lote #${fila.loteIdAnterior}`) : "Sin asociar"}
                    {" → "}
                    <strong>{loteMap.get(fila.loteIdNuevo) ?? `Lote #${fila.loteIdNuevo}`}</strong>
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {fila.userId === user?.id ? "Vos" : `Usuario #${fila.userId}`} · {formatFecha(fila.fecha)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
