import { useEffect, useState, type FormEvent } from "react";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { loteService } from "../../services/lote.service";
import { extraerMensajeError } from "../../services/ingresoCamara.service";
import type { Lote } from "../../types/lote.types";
import type { CreateIngresoCamaraDto, IngresoCamara } from "../../types/ingresoCamara.types";
import type { Sku } from "../../types/sku.types";

const SIN_LOTE_ORIGEN = "";

function hoyComoInputDate(): string {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

// El backend espera fechaIngreso como ISO datetime (@IsDateString). El
// input date del form solo tiene día/mes/año; se envía a medianoche UTC.
function fechaInputAIso(fechaInput: string): string {
  return new Date(`${fechaInput}T00:00:00.000Z`).toISOString();
}

interface FormValues {
  skuId: string;
  cantidad: string;
  loteId: string;
  fecha: string;
}

interface FormErrors {
  skuId?: string;
  cantidad?: string;
  fecha?: string;
}

function buildInitialValues(): FormValues {
  return {
    skuId: "",
    cantidad: "",
    loteId: SIN_LOTE_ORIGEN,
    fecha: hoyComoInputDate(),
  };
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.skuId) errors.skuId = "El SKU es obligatorio";

  if (values.cantidad.trim() === "") {
    errors.cantidad = "La cantidad es obligatoria";
  } else if (Number.isNaN(Number(values.cantidad)) || Number(values.cantidad) <= 0) {
    errors.cantidad = "Debe ser un número mayor a 0";
  }

  if (!values.fecha) errors.fecha = "La fecha es obligatoria";

  return errors;
}

interface IngresoCamaraFormModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  skus: Sku[];
  onClose: () => void;
  onCreate: (dto: CreateIngresoCamaraDto) => Promise<IngresoCamara>;
}

// HU-67: formulario conectado al catálogo de SKU real (prop `skus`, ya
// cargado por la página) y a POST /ingresos-camara. El SKU pasa a
// seleccionarse por id (Select), no por nombre libre (Combobox) — el
// backend exige `skuId` numérico.
export function IngresoCamaraFormModal({
  isOpen,
  isSubmitting,
  skus,
  onClose,
  onCreate,
}: IngresoCamaraFormModalProps) {
  const [values, setValues] = useState<FormValues>(buildInitialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");
  const [lotes, setLotes] = useState<Lote[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setValues(buildInitialValues());
    setErrors({});
    setServerError("");
    // Se carga recién al abrir el modal (no en cada render de la página) —
    // el "lote de origen" es opcional, no vale la pena pedir /lotes si el
    // usuario nunca abre el formulario.
    loteService
      .getAll()
      .then(setLotes)
      .catch(() => setLotes([]));
  }, [isOpen]);

  if (!isOpen) return null;

  const skuOptions = [
    { value: "", label: "Seleccioná un SKU..." },
    ...skus.map((sku) => ({ value: String(sku.id), label: sku.nombre })),
  ];

  const loteOptions = [
    { value: SIN_LOTE_ORIGEN, label: "Sin referencia" },
    ...lotes.map((lote) => ({ value: String(lote.id), label: lote.codigo })),
  ];

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setServerError("");
    try {
      await onCreate({
        skuId: Number(values.skuId),
        cantidad: Number(values.cantidad),
        ...(values.loteId && { loteId: Number(values.loteId) }),
        fechaIngreso: fechaInputAIso(values.fecha),
      });
      onClose();
    } catch (error) {
      setServerError(
        extraerMensajeError(error, "No se pudo registrar el ingreso. Intentá nuevamente."),
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Nuevo ingreso a cámara"
      description="Registrá el ingreso a cámara de un SKU de producto terminado"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <Button
            type="submit"
            form="ingreso-camara-form"
            className="!w-auto px-6"
            disabled={isSubmitting || skus.length === 0}
          >
            {isSubmitting ? "Registrando..." : "Registrar ingreso"}
          </Button>
        </div>
      }
    >
      <form
        id="ingreso-camara-form"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-4"
      >
        {skus.length === 0 && (
          <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
            Tu empresa todavía no tiene SKUs cargados. Pedile a un Gerente que dé de alta uno
            desde Configuración → Catálogo de SKUs.
          </p>
        )}

        <Select
          id="ingreso-camara-sku"
          label="SKU *"
          options={skuOptions}
          value={values.skuId}
          onChange={(e) => setValues((prev) => ({ ...prev, skuId: e.target.value }))}
          error={errors.skuId}
        />

        <Input
          id="ingreso-camara-cantidad"
          type="number"
          inputMode="numeric"
          min={1}
          label="Cantidad *"
          value={values.cantidad}
          onChange={(e) => setValues((prev) => ({ ...prev, cantidad: e.target.value }))}
          error={errors.cantidad}
        />

        <Select
          id="ingreso-camara-lote-origen"
          label="Lote de producción de origen"
          options={loteOptions}
          value={values.loteId}
          onChange={(e) => setValues((prev) => ({ ...prev, loteId: e.target.value }))}
        />

        <Input
          id="ingreso-camara-fecha"
          type="date"
          label="Fecha de ingreso a cámara *"
          value={values.fecha}
          onChange={(e) => setValues((prev) => ({ ...prev, fecha: e.target.value }))}
          error={errors.fecha}
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
