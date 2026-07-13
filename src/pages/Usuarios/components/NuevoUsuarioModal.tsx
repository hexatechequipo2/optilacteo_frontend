import { Modal } from "../../../components/ui/Modal";
import type { EmpresaType } from "../../../types/empresa.types";
import type { RolType } from "../../../types/rol.types";
import type { CreateUsuarioDto } from "../../../types/usuario.types";
import { UsuarioForm, type UsuarioFormValues } from "./UsuarioForm";

interface NuevoUsuarioModalProps {
  isOpen: boolean;
  empresas: EmpresaType[];
  roles: RolType[];
  /** Cuando viene definido (caso Gerente), el selector de empresa se bloquea en este id. */
  empresaIdBloqueada?: number;
  isSubmitting: boolean;
  onClose: () => void;
  onCreate: (payload: CreateUsuarioDto) => Promise<void>;
}

export function NuevoUsuarioModal({ isOpen, empresas, roles, empresaIdBloqueada, isSubmitting, onClose, onCreate }: NuevoUsuarioModalProps) {
  
  const handleSubmit = async (values: UsuarioFormValues) => {
    await onCreate({
      name: values.name,
      email: values.email,
      password: values.password,
      rolId: values.rolId,
      empresaId: Number(values.empresaId),
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Nuevo usuario"
      description="Asigna una empresa, un rol y sus permisos"
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
            form="usuario-form" // Esto es lo que conecta el botón con el form
            disabled={isSubmitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Crear usuario
          </button>
        </div>
      }
    >
      <UsuarioForm
        id="usuario-form" // Este ID debe coincidir con el atributo 'form' del botón
        empresas={empresas}
        roles={roles}
        empresaIdBloqueada={empresaIdBloqueada}
        onCancel={onClose}
        onSubmit={handleSubmit}
      />
    </Modal>
  );
}