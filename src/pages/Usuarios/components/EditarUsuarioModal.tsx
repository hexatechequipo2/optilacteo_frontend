import { Modal } from "../../../components/ui/Modal";
import type { EmpresaType } from "../../../types/empresa.types";
import type { RolType } from "../../../types/rol.types";
import type {
  UpdateUsuarioDto,
  UsuarioType,
} from "../../../types/usuario.types";
import { UsuarioForm, type UsuarioFormValues } from "./UsuarioForm";

interface EditarUsuarioModalProps {
  usuario: UsuarioType | null;
  empresas: EmpresaType[];
  roles: RolType[];
  /** Cuando viene definido (caso Gerente), el selector de empresa se bloquea en este id. */
  empresaIdBloqueada?: number;
  isSubmitting: boolean;
  onClose: () => void;
  onUpdate: (
    id: number,
    payload: UpdateUsuarioDto,
    nuevoEstado: boolean,
  ) => Promise<void>;
}

export function EditarUsuarioModal({
  usuario,
  empresas,
  roles,
  empresaIdBloqueada,
  isSubmitting,
  onClose,
  onUpdate,
}: EditarUsuarioModalProps) {
  if (!usuario) return null;

  const handleSubmit = async (values: UsuarioFormValues) => {
    await onUpdate(
      usuario.id,
      {
        name: values.name,
        email: values.email,
        rolId: values.rolId,
        empresaId: Number(values.empresaId),
      },
      values.isActive,
    );
    onClose();
  };

  return (
    <Modal
      isOpen={!!usuario}
      title="Editar usuario"
      description="Editá la información del usuario y su estado."
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
          <button
            type="submit"
            form="usuario-form-edit" // Debe coincidir con el id del formulario abajo
            disabled={isSubmitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      }
    >
      <UsuarioForm
        id="usuario-form-edit" // ID único para este form
        usuario={usuario}
        roles={roles}
        empresas={empresas}
        empresaIdBloqueada={empresaIdBloqueada}
        onSubmit={handleSubmit}
      />
    </Modal>
  );
}