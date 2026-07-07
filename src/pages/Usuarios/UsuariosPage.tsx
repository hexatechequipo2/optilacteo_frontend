import { useMemo, useState } from "react";
import { Layout } from "../../components/layout/Layout";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { useUsuarios, TODAS_LAS_EMPRESAS } from "../../hooks/useUsuarios";
import { useEmpresas } from "../../hooks/useEmpresas";
import { useRoles } from "../../hooks/useRoles";
import { useAuth } from "../../hooks/useAuth";
import type { UsuarioType } from "../../types/usuario.types";
import { UsuariosTable } from "./components/UsuariosTable";
import { NuevoUsuarioModal } from "./components/NuevoUsuarioModal";
import { EditarUsuarioModal } from "./components/EditarUsuarioModal";
import { MatrizPermisos } from "./components/MatrizPermisos"; // 👈 agregar

export default function UsuariosPage() {
  const {
    usuarios,
    filteredUsuarios,
    isLoading,
    error,
    search,
    setSearch,
    empresaFiltro,
    setEmpresaFiltro,
    createUsuario,
    isCreating,
    updateUsuario,
    isUpdating,
    unlockUsuario,
  } = useUsuarios();

  const { empresas } = useEmpresas();
  const { roles, updatePermiso } = useRoles(); // 👈 agregar updatePermiso
  const { user } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [usuarioEnEdicion, setUsuarioEnEdicion] = useState<UsuarioType | null>(null);

  // Un Gerente no puede asignar el rol Administrador a otro usuario
  // (el backend también lo valida en create/update de UserService).
  const esGerente = (user?.rolNombre ?? "").trim().toLowerCase() === "gerente";
  const rolesAsignables = useMemo(
    () =>
      esGerente
        ? roles.filter((rol) => rol.nombre.trim().toLowerCase() !== "administrador")
        : roles,
    [roles, esGerente],
  );

  const empresaOptions = [
    { value: TODAS_LAS_EMPRESAS, label: "Todas las empresas" },
    ...empresas.map((empresa) => ({
      value: String(empresa.id),
      label: empresa.name,
    })),
  ];

  const empresasUnicas = new Set(usuarios.map((usuario) => usuario.empresa?.id).filter(Boolean)).size;

  return (
    <Layout breadcrumb="Consola > Usuarios">
      
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-sans dark:text-white">Usuarios y Roles</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {usuarios.length} usuarios en {empresasUnicas} empresas
          </p>
        </div>
        
        <Button
          type="button"
          className="!w-auto px-6" 
          onClick={() => setIsCreateModalOpen(true)}
        >
          + Nuevo usuario
        </Button>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="w-full max-w-sm">
          <Input
            id="usuarios-search"
            placeholder="Buscar por nombre, email o empresa..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="!w-full !rounded-full !py-2 !px-5 !border-slate-300 dark:!border-slate-700"
          />
        </div>
        
        <div className="w-52 flex-shrink-0">
          <Select
            id="usuarios-empresa-filtro"
            options={empresaOptions}
            value={empresaFiltro}
            onChange={(event) => setEmpresaFiltro(event.target.value)}
            className="!w-full !rounded-full !py-2 !px-4 !border-slate-300 !text-sm dark:!border-slate-700"
          />
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando usuarios...</p>
        </div>
      ) : (
        <UsuariosTable
          usuarios={filteredUsuarios}
          onEdit={(usuario: UsuarioType) => setUsuarioEnEdicion(usuario)}
          onUnlock={unlockUsuario}
        />
      )}

      {/* 👇 Matriz de permisos, debajo de la tabla de usuarios */}
      <MatrizPermisos roles={roles} onTogglePermiso={updatePermiso} />

      <NuevoUsuarioModal
        isOpen={isCreateModalOpen}
        empresas={empresas}
        roles={rolesAsignables}
        isSubmitting={isCreating}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={createUsuario}
      />

      <EditarUsuarioModal
        usuario={usuarioEnEdicion}
        empresas={empresas}
        roles={rolesAsignables}
        isSubmitting={isUpdating}
        onClose={() => setUsuarioEnEdicion(null)}
        onUpdate={updateUsuario}
      />
    </Layout>
  );
}