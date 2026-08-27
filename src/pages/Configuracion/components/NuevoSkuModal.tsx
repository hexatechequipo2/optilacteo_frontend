import { useState, type FormEvent } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { extraerMensajeError } from "../../../services/sku.service";
import { UnidadMedidaSku, type CreateSkuDto } from "../../../types/sku.types";

const UNIDAD_OPTIONS = [
  { value: UnidadMedidaSku.UNIDADES, label: "Unidades" },
  { value: UnidadMedidaSku.KG, label: "Kilogramos (kg)" },
];

interface FormValues {
  nombre: string;
  unidadMedida: UnidadMedidaSku;
}

interface FormErrors {
  nombre?: string;
}

const INITIAL_VALUES: FormValues = {
  nombre: "",
  unidadMedida: UnidadMedidaSku.UNIDADES,
};

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.nombre.trim()) errors.nombre = "El nombre del SKU es obligatorio";
  return errors;
}

interface NuevoSkuModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onCreate: (dto: CreateSkuDto) => Promise<unknown>;
}

// HU-67: alta de SKU desde Configuración de empresa (solo Gerente, ver
// gating en ConfiguracionPage.tsx). El backend valida unicidad de `nombre`
// por empresa y devuelve 409 si ya existe.
export function NuevoSkuModal({ isOpen, isSubmitting, onClose, onCreate }: NuevoSkuModalProps) {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");

  const handleClose = () => {
    setValues(INITIAL_VALUES);
    setErrors({});
    setServerError("");
    onClose();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setServerError("");
    try {
      await onCreate({
        nombre: values.nombre.trim(),
        unidadMedida: values.unidadMedida,
      });
      handleClose();
    } catch (error) {
      setServerError(extraerMensajeError(error, "No se pudo crear el SKU. Intentá nuevamente."));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Nuevo SKU"
      description="Dá de alta un producto terminado para el catálogo de tu empresa"
      onClose={handleClose}
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="sku-form"
            disabled={isSubmitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Creando..." : "Crear SKU"}
          </button>
        </div>
      }
    >
      <form id="sku-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          id="sku-nombre"
          label="Nombre *"
          placeholder="Ej: Manteca x 200g"
          value={values.nombre}
          onChange={(e) => setValues((prev) => ({ ...prev, nombre: e.target.value }))}
          error={errors.nombre}
          autoFocus
        />

        <Select
          id="sku-unidad-medida"
          label="Unidad de medida *"
          options={UNIDAD_OPTIONS}
          value={values.unidadMedida}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, unidadMedida: e.target.value as UnidadMedidaSku }))
          }
        />

        {serverError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
            {serverError}
          </p>
        )}
      </form>
    </Modal>
  );
}
