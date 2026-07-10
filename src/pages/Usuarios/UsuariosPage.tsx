import { useState } from "react";
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
import { MatrizPermisos } from "./components/MatrizPermisos";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function UsuariosPage() {
  const {
    usuarios,
    meta,
    page,
    setPage,
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

  const { user } = useAuth();
  const esGerente = (user?.rolNombre ?? "").trim().toLowerCase() === "gerente";

  const { empresas } = useEmpresas(esGerente);
  const { roles, updatePermiso } = useRoles();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [usuarioEnEdicion, setUsuarioEnEdicion] = useState<UsuarioType | null>(null);

  const empresaIdBloqueada = esGerente ? empresas[0]?.id : undefined;

  // Filtramos roles en el frontend para el modal (seguridad visual)
  const rolesAsignables = esGerente 
    ? roles.filter((rol) => rol.nombre.trim().toLowerCase() !== "administrador")
    : roles;

  const empresaOptions = [
    { value: TODAS_LAS_EMPRESAS, label: "Todas las empresas" },
    ...empresas.map((empresa) => ({
      value: String(empresa.id),
      label: empresa.name,
    })),
  ];
  console.log("Estado actual del meta:", meta);

  return (
    <Layout breadcrumb="Consola > Usuarios">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-sans dark:text-white">Usuarios y Roles</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {meta.total} usuarios registrados
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
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="!w-full !rounded-full !py-2 !px-5 !border-slate-300 dark:!border-slate-700"
          />
        </div>
        
        <div className="w-52 flex-shrink-0">
          <Select
            id="usuarios-empresa-filtro"
            options={empresaOptions}
            value={empresaFiltro}
            onChange={(e) => setEmpresaFiltro(e.target.value)}
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
        <>
          <UsuariosTable
            usuarios={usuarios}
            onEdit={(usuario: UsuarioType) => setUsuarioEnEdicion(usuario)}
            onUnlock={unlockUsuario}
          />
          
          {/* Paginación */}
          <div className="mt-6 flex items-center justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                aria-label="Página anterior"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-500 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="text-sm text-slate-600 dark:text-slate-300">
                {page} de {meta.lastPage || 1}
              </span>

              <button
                type="button"
                onClick={() => setPage(page + 1)}
                disabled={page >= (meta.lastPage || 1)}
                aria-label="Página siguiente"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-500 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}

      <MatrizPermisos roles={roles} onTogglePermiso={updatePermiso} />

      <NuevoUsuarioModal
        isOpen={isCreateModalOpen}
        empresas={empresas}
        roles={rolesAsignables}
        empresaIdBloqueada={empresaIdBloqueada}
        isSubmitting={isCreating}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={createUsuario}
      />

      <EditarUsuarioModal
        usuario={usuarioEnEdicion}
        empresas={empresas}
        roles={rolesAsignables}
        empresaIdBloqueada={empresaIdBloqueada}
        isSubmitting={isUpdating}
        onClose={() => setUsuarioEnEdicion(null)}
        onUpdate={updateUsuario}
      />
    </Layout>
  );
}