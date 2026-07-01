import { Modal } from "../../../components/ui/Modal";
import type { EmpresaType } from "../../../types/empresa.types";
import type { CreateUsuarioDto } from "../../../types/usuario.types";
import { UsuarioForm, type UsuarioFormValues } from "./UsuarioForm";

interface NuevoUsuarioModalProps {
  isOpen: boolean;
  empresas: EmpresaType[];
  isSubmitting: boolean;
  onClose: () => void;
  onCreate: (payload: CreateUsuarioDto) => Promise<void>;
}

export function NuevoUsuarioModal({ isOpen, empresas, isSubmitting, onClose, onCreate }: NuevoUsuarioModalProps) {
  
  const handleSubmit = async (values: UsuarioFormValues) => {
    await onCreate({
      name: values.name,
      email: values.email,
      password: values.password,
      role: values.role,
      empresaId: Number(values.empresaId),
    });
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      title="Nuevo usuario" 
      onClose={onClose}
      footer={
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200 transition dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="usuario-form" // Esto es lo que conecta el botón con el form
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
          >
            Crear usuario
          </button>
        </div>
      }
    >
      <p className="text-sm text-slate-500 mb-6 dark:text-slate-400">
        Asigna una empresa, un rol y sus permisos
      </p>

      <UsuarioForm
        id="usuario-form" // Este ID debe coincidir con el atributo 'form' del botón
        empresas={empresas}
        onCancel={onClose}
        onSubmit={handleSubmit}
      />
    </Modal>
  );
}