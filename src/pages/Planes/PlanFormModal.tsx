import { useState, useEffect, type FormEvent } from "react";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import type { Plan, CreatePlanDto } from "../../types/plan.types";

interface PlanFormModalProps {
  isOpen: boolean;
  plan: Plan | null;
  isSubmitting: boolean;
  onClose: () => void;
  onUpdate: (id: number, dto: Partial<CreatePlanDto>) => Promise<void>;
}

interface FormValues {
  nombre: string;
  precio: string;
  maxUsuarios: string;
  maxSensores: string;
}

function planToFormValues(plan: Plan): FormValues {
  return {
    nombre: plan.nombre,
    precio: String(plan.precio),
    maxUsuarios: String(plan.maxUsuarios),
    maxSensores: String(plan.maxSensores),
  };
}

export function PlanFormModal({
  isOpen,
  plan,
  isSubmitting,
  onClose,
  onUpdate,
}: PlanFormModalProps) {
  const [values, setValues] = useState<FormValues>(() =>
    plan
      ? planToFormValues(plan)
      : { nombre: "", precio: "", maxUsuarios: "", maxSensores: "" },
  );
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (plan) {
      setValues(planToFormValues(plan));
      setServerError("");
    }
  }, [plan]);

  if (!plan) return null;

  const set =
    (field: keyof FormValues) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError("");
    try {
      await onUpdate(plan.id, {
        nombre: values.nombre.trim(),
        precio: Number(values.precio),
        maxUsuarios: Number(values.maxUsuarios),
        maxSensores: Number(values.maxSensores),
      });
      onClose();
    } catch {
      setServerError("No se pudo guardar los cambios. Intentá nuevamente.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Editar plan"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="plan-form-edit"
            disabled={isSubmitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      }
    >
      <p className="mb-6 text-sm text-slate-500">
        Editá la información del plan de suscripción.
      </p>

      <form
        id="plan-form-edit"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-4"
      >
        <Input
          id="plan-nombre"
          label="Nombre *"
          placeholder="Ej: Pro"
          value={values.nombre}
          onChange={set("nombre")}
        />
        <Input
          id="plan-precio"
          label="Precio (US$/mes) *"
          type="number"
          placeholder="Ej: 99"
          value={values.precio}
          onChange={set("precio")}
        />
        <Input
          id="plan-maxUsuarios"
          label="Máx. usuarios *"
          type="number"
          placeholder="Ej: 10"
          value={values.maxUsuarios}
          onChange={set("maxUsuarios")}
        />
        <Input
          id="plan-maxSensores"
          label="Máx. sensores *"
          type="number"
          placeholder="Ej: 20"
          value={values.maxSensores}
          onChange={set("maxSensores")}
        />

        {serverError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        )}
      </form>
    </Modal>
  );
}
