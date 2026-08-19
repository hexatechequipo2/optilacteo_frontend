import { useEffect, useState, type FormEvent } from "react";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { extraerMensajeError } from "../../services/tambo.service";
import type { Tambo, CreateTamboDto, UpdateTamboDto } from "../../types/tambo.types";
import type { Proveedor } from "../../types/proveedor.types";

interface FormValues {
  proveedorId: string;
  nombre: string;
  ubicacion: string;
}

interface FormErrors {
  proveedorId?: string;
  nombre?: string;
}

function buildInitialValues(tambo?: Tambo): FormValues {
  if (!tambo) {
    return { proveedorId: "", nombre: "", ubicacion: "" };
  }
  return {
    proveedorId: String(tambo.proveedorId),
    nombre: tambo.nombre,
    ubicacion: tambo.ubicacion ?? "",
  };
}

function validate(values: FormValues, esEdicion: boolean): FormErrors {
  const errors: FormErrors = {};
  // Igual que en LoteFormModal: proveedorId solo se valida en alta — en
  // edición ya viene fijo y deshabilitado (UpdateTamboDto ni siquiera lo
  // acepta, ver update-tambo.dto.ts en el backend).
  if (!esEdicion && !values.proveedorId) {
    errors.proveedorId = "El proveedor es obligatorio";
  }
  if (!values.nombre.trim()) {
    errors.nombre = "El nombre del tambo es obligatorio";
  } else if (values.nombre.trim().length > 150) {
    errors.nombre = "No puede superar los 150 caracteres";
  }
  return errors;
}

interface TamboFormModalProps {
  isOpen: boolean;
  proveedores: Proveedor[];
  tambo?: Tambo; // presente = modo edición
  isSubmitting: boolean;
  onClose: () => void;
  onCreate: (dto: CreateTamboDto) => Promise<Tambo>;
  onUpdate: (id: number, dto: UpdateTamboDto) => Promise<Tambo>;
}

export function TamboFormModal({
  isOpen,
  proveedores,
  tambo,
  isSubmitting,
  onClose,
  onCreate,
  onUpdate,
}: TamboFormModalProps) {
  const esEdicion = !!tambo;
  const [values, setValues] = useState<FormValues>(() => buildInitialValues(tambo));
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setValues(buildInitialValues(tambo));
    setErrors({});
    setServerError("");
  }, [isOpen, tambo]);

  if (!isOpen) return null;

  const proveedorOptions = [
    { value: "", label: "Seleccioná un proveedor" },
    ...proveedores.map((p) => ({ value: String(p.id), label: `${p.razonSocial} (${p.cuit})` })),
  ];

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError("");
    const validationErrors = validate(values, esEdicion);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      if (esEdicion) {
        await onUpdate(tambo!.id, {
          nombre: values.nombre.trim(),
          ubicacion: values.ubicacion.trim() || undefined,
        });
      } else {
        await onCreate({
          proveedorId: Number(values.proveedorId),
          nombre: values.nombre.trim(),
          ubicacion: values.ubicacion.trim() || undefined,
        });
      }
      onClose();
    } catch (err) {
      setServerError(
        extraerMensajeError(
          err,
          esEdicion
            ? "No se pudo actualizar el tambo. Intentá nuevamente."
            : "No se pudo registrar el tambo. Intentá nuevamente.",
        ),
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title={esEdicion ? "Editar tambo" : "Nuevo tambo"}
      description={
        esEdicion
          ? `Actualizá los datos editables de ${tambo!.nombre}`
          : "Registrá un tambo de origen bajo un proveedor existente"
      }
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
          <Button type="submit" form="tambo-form" isLoading={isSubmitting} className="!w-auto px-6">
            {esEdicion ? "Guardar cambios" : "Registrar tambo"}
          </Button>
        </div>
      }
    >
      <form id="tambo-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <SectionHeader>DATOS DEL TAMBO</SectionHeader>
          <Select
            id="tambo-proveedor"
            label="Proveedor *"
            options={proveedorOptions}
            value={values.proveedorId}
            disabled={esEdicion}
            onChange={(e) => setValues((prev) => ({ ...prev, proveedorId: e.target.value }))}
            error={errors.proveedorId}
          />
          {esEdicion && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              El proveedor no se puede modificar una vez creado el tambo. Si cambió de proveedor,
              dalo de baja y creá uno nuevo bajo el proveedor correcto.
            </p>
          )}

          <Input
            id="tambo-nombre"
            label="Nombre *"
            placeholder="Ej: Tambo La Esperanza"
            value={values.nombre}
            onChange={(e) => setValues((prev) => ({ ...prev, nombre: e.target.value }))}
            error={errors.nombre}
            autoFocus
          />

          <Input
            id="tambo-ubicacion"
            label="Ubicación (opcional)"
            placeholder="Ej: Ruta 6 km 12, Cañuelas"
            value={values.ubicacion}
            onChange={(e) => setValues((prev) => ({ ...prev, ubicacion: e.target.value }))}
          />
        </div>

        {serverError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
            {serverError}
          </p>
        )}
      </form>
    </Modal>
  );
}
