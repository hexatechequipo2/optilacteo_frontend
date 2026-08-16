import { useEffect, useState, type FormEvent } from "react";
import { Combobox } from "../../components/ui/Combobox";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import {
  LOTES_ORIGEN_MOCK,
  SIN_REFERENCIA_LOTE_ORIGEN,
  SKUS_CATALOGO_MOCK,
} from "./constants/ingresoCamaraFormMock";
import type { IngresoCamara } from "../../types/ingresoCamara.types";

const LOTE_ORIGEN_OPTIONS = [
  { value: SIN_REFERENCIA_LOTE_ORIGEN, label: SIN_REFERENCIA_LOTE_ORIGEN },
  ...LOTES_ORIGEN_MOCK.map((lote) => ({ value: lote, label: lote })),
];

function hoyComoInputDate(): string {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function formatearFecha(fechaInput: string): string {
  const [anio, mes, dia] = fechaInput.split("-");
  return `${dia}/${mes}/${anio}`;
}

interface FormValues {
  sku: string;
  cantidad: string;
  loteOrigen: string;
  fecha: string;
}

interface FormErrors {
  sku?: string;
  cantidad?: string;
  fecha?: string;
}

function buildInitialValues(): FormValues {
  return {
    sku: "",
    cantidad: "",
    loteOrigen: SIN_REFERENCIA_LOTE_ORIGEN,
    fecha: hoyComoInputDate(),
  };
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.sku.trim()) errors.sku = "El SKU es obligatorio";

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
  onClose: () => void;
  onSubmit: (ingreso: Omit<IngresoCamara, "id">) => void;
}

// HU-67 Parte 2/2: formulario de maquetado — valida en el cliente y agrega
// el ingreso al array mock local de la Pantalla 10. Sin conexión a backend;
// falta conectar al endpoint real de producto terminado.
export function IngresoCamaraFormModal({ isOpen, onClose, onSubmit }: IngresoCamaraFormModalProps) {
  const [values, setValues] = useState<FormValues>(buildInitialValues);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!isOpen) return;
    setValues(buildInitialValues());
    setErrors({});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    onSubmit({
      sku: values.sku,
      cantidad: Number(values.cantidad),
      unidad: "unidades",
      loteOrigen: values.loteOrigen,
      fecha: formatearFecha(values.fecha),
    });
    onClose();
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
          <Button type="submit" form="ingreso-camara-form" className="!w-auto px-6">
            Registrar ingreso
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
        <Combobox
          id="ingreso-camara-sku"
          label="SKU *"
          placeholder="Buscar SKU..."
          value={values.sku}
          onChange={(value) => setValues((prev) => ({ ...prev, sku: value }))}
          options={SKUS_CATALOGO_MOCK}
          error={errors.sku}
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
          options={LOTE_ORIGEN_OPTIONS}
          value={values.loteOrigen}
          onChange={(e) => setValues((prev) => ({ ...prev, loteOrigen: e.target.value }))}
        />

        <Input
          id="ingreso-camara-fecha"
          type="date"
          label="Fecha de ingreso a cámara *"
          value={values.fecha}
          onChange={(e) => setValues((prev) => ({ ...prev, fecha: e.target.value }))}
          error={errors.fecha}
        />
      </form>
    </Modal>
  );
}
