import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { extraerMensajeError } from "../../../services/lote.service";
import { UnidadRendimiento, type FinalizarLoteDto, type Lote } from "../../../types/lote.types";
import { UNIDAD_RENDIMIENTO_SELECT_OPTIONS } from "../constants/unidadRendimiento";

// Mismo criterio de validación que el backend (finalizar-lote.dto.ts): el
// rendimiento es opcional, pero si se carga tiene que ser numérico y no
// negativo.
function validarRendimiento(raw: string): string | null {
  if (raw.trim() === "") return null;
  const valor = Number(raw);
  if (Number.isNaN(valor)) return "El rendimiento debe ser un valor numérico";
  if (valor < 0) return "El rendimiento no puede ser negativo";
  return null;
}

// HU-62 (extensión): el backend exige unidadRendimiento con @ValidateIf
// cuando viene rendimiento (finalizar-lote.dto.ts). Se replica acá mismo
// para no depender del 400 del servidor.
function validarUnidad(rendimientoRaw: string, unidad: string): string | null {
  if (rendimientoRaw.trim() === "") return null;
  return unidad === "" ? "Elegí la unidad del rendimiento cargado" : null;
}

interface FinalizarLoteModalProps {
  isOpen: boolean;
  lote: Lote | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (id: number, dto?: FinalizarLoteDto) => Promise<Lote>;
}

// HU-62: antes "finalizar" era una acción directa sin formulario (ver
// LotesPage). Ahora pasa por este modal para permitir cargar el
// rendimiento opcional del lote antes de cerrarlo, disponible tanto para
// Responsable de calidad como Responsable de Producción.
export function FinalizarLoteModal({
  isOpen,
  lote,
  isSubmitting,
  onClose,
  onConfirm,
}: FinalizarLoteModalProps) {
  const [rendimiento, setRendimiento] = useState("");
  const [unidadRendimiento, setUnidadRendimiento] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [unidadError, setUnidadError] = useState<string | null>(null);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setRendimiento("");
      setUnidadRendimiento("");
      setValidationError(null);
      setUnidadError(null);
      setServerError("");
    }
  }, [isOpen, lote?.id]);

  if (!isOpen || !lote) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const error = validarRendimiento(rendimiento);
    const errorUnidad = validarUnidad(rendimiento, unidadRendimiento);
    setValidationError(error);
    setUnidadError(errorUnidad);
    if (error || errorUnidad) return;

    setServerError("");
    // Si el campo quedó vacío no se manda ninguna de las dos claves (nunca
    // 0 por defecto, y la unidad no tiene sentido sin un rendimiento).
    const dto: FinalizarLoteDto | undefined =
      rendimiento.trim() === ""
        ? undefined
        : { rendimiento: Number(rendimiento), unidadRendimiento: unidadRendimiento as UnidadRendimiento };

    try {
      await onConfirm(lote.id, dto);
      onClose();
    } catch (err) {
      setServerError(extraerMensajeError(err, "No se pudo finalizar el lote. Intentá nuevamente."));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title={`Finalizar lote — ${lote.codigo}`}
      description="El lote pasa a estado finalizado. El rendimiento es opcional y no se puede modificar después."
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            Cancelar
          </button>
          <Button
            type="submit"
            form="finalizar-lote-form"
            isLoading={isSubmitting}
            className="!w-auto px-6"
          >
            Finalizar lote
          </Button>
        </div>
      }
    >
      <form
        id="finalizar-lote-form"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-4"
      >
        <Input
          id="finalizar-rendimiento"
          label="Rendimiento (opcional)"
          type="number"
          inputMode="decimal"
          step="any"
          placeholder="Ej: 92.5"
          value={rendimiento}
          onChange={(e) => setRendimiento(e.target.value)}
          error={validationError ?? undefined}
        />
        {rendimiento.trim() !== "" && (
          <Select
            id="finalizar-unidad-rendimiento"
            label="Unidad del rendimiento *"
            options={UNIDAD_RENDIMIENTO_SELECT_OPTIONS}
            value={unidadRendimiento}
            onChange={(e) => setUnidadRendimiento(e.target.value)}
            error={unidadError ?? undefined}
          />
        )}
        {serverError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
            {serverError}
          </p>
        )}
      </form>
    </Modal>
  );
}
