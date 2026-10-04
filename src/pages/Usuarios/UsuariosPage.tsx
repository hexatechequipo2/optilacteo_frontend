import { useState, useEffect } from "react";
import { Layout } from "../../components/layout/Layout";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { useUsuarios, TODAS_LAS_EMPRESAS } from "../../hooks/useUsuarios";
import { useEmpresaActual } from "../../hooks/useEmpresaActual";
import { useEmpresasOpciones } from "../../hooks/useEmpresasOpciones";
import { useRoles } from "../../hooks/useRoles";
import { useAuth } from "../../hooks/useAuth";
import { usePermisos } from "../../hooks/usePermisos";
import type { UsuarioType } from "../../types/usuario.types";
import { UsuariosTable } from "./components/UsuariosTable";
import { NuevoUsuarioModal } from "./components/NuevoUsuarioModal";
import { EditarUsuarioModal } from "./components/EditarUsuarioModal";
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
    refetch: refetchUsuarios,
  } = useUsuarios();

  const { user } = useAuth();
  const { puede, esSistema } = usePermisos();

  // Administrador elige entre todas las empresas; un usuario de empresa
  // opera solo sobre la suya.
  const { empresa: miEmpresa } = useEmpresaActual();
  const { empresas: empresasOpciones } = useEmpresasOpciones({ habilitado: esSistema });
  const empresas = esSistema ? empresasOpciones : miEmpresa ? [miEmpresa] : [];
  // Empresa elegida en el form abierto: para Administrador define qué roles
  // se listan y sobre qué empresa se asigna (?empresaId=).
  const [empresaFormId, setEmpresaFormId] = useState<number | undefined>(undefined);
  const puedeVerRoles = puede("gestion_roles", "ver"); // GET /roles
  const { roles, asignarRol } = useRoles({
    habilitado: puedeVerRoles,
    empresaId: empresaFormId,
  });
  const puedeCrearUsuario = puede("gestion_usuarios", "crear"); // POST /user
  // PATCH /user/:id, /activar, /desactivar, /desbloquear
  const puedeEditarUsuario = puede("gestion_usuarios", "editar");
  const puedeCambiarRol = puede("gestion_roles", "editar"); // PUT /roles/usuarios/:id
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [usuarioEnEdicion, setUsuarioEnEdicion] = useState<UsuarioType | null>(null);

  // Solo Administrador filtra por empresa; un usuario de empresa ve la suya.
  useEffect(() => {
    if (!esSistema && empresaFiltro !== TODAS_LAS_EMPRESAS) {
      setEmpresaFiltro(TODAS_LAS_EMPRESAS);
    }
  }, [esSistema, empresaFiltro, setEmpresaFiltro]);

  const empresaIdBloqueada = esSistema ? undefined : miEmpresa?.id;

  // El back rechaza que un rol que no es de sistema asigne uno de sistema.
  const rolesAsignables = esSistema ? roles : roles.filter((rol) => !rol.esSistema);

  // POST /user exige rolId y la lista sale de GET /roles (de la empresa
  // elegida, en el caso de Administrador).
  const mensajeSinRoles = !puedeVerRoles
    ? "Para crear usuarios necesitás permiso para ver roles."
    : esSistema && empresaFormId === undefined
      ? "Elegí una empresa para ver sus roles."
      : undefined;

  // Un usuario de empresa no puede editar/desactivar/desbloquear una cuenta
  // con rol de sistema (Administrador).
  // TODO(backend): esto es solo un cierre de UI. El gap real está en
  // user.service.ts — update()/deactivate()/activate()/unlock() no validan
  // el rol del usuario objetivo, así que por API directa se puede igual.
  const esUsuarioBloqueado = (usuario: UsuarioType) =>
    !esSistema && !!roles.find((rol) => rol.id === usuario.rolId)?.esSistema;

  // PUT /roles/usuarios/:id y después refresca la tabla (rolNombre).
  const asignarRolYRefrescar = async (usuarioId: number, rolId: number) => {
    await asignarRol(usuarioId, rolId);
    await refetchUsuarios();
  };

  const empresaOptions = [
    { value: TODAS_LAS_EMPRESAS, label: "Todas las empresas" },
    ...empresas.map((empresa) => ({
      value: String(empresa.id),
      label: empresa.name,
    })),
  ];

  return (
    <Layout breadcrumb="Consola > Usuarios">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-sans dark:text-white">Usuarios y Roles</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {meta.total} usuarios registrados
          </p>
        </div>
        
        {puedeCrearUsuario && (
          <Button
            type="button"
            className="!w-auto px-6"
            onClick={() => setIsCreateModalOpen(true)}
          >
            + Nuevo usuario
          </Button>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-4">
        <div className="w-full max-w-sm">
          <Input
            id="usuarios-search"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="!w-full !rounded-full !py-2 !px-5 !border-slate-300 dark:!border-slate-700"
          />
        </div>
        
        {/* Solo Administrador (plataforma) filtra por empresa */}
        {esSistema && (
          <div className="w-52 flex-shrink-0">
            <Select
              id="usuarios-empresa-filtro"
              options={empresaOptions}
              value={empresaFiltro}
              onChange={(e) => setEmpresaFiltro(e.target.value)}
              className="!w-full !rounded-full !py-2 !px-4 !border-slate-300 !text-sm dark:!border-slate-700"
            />
          </div>
        )}
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
            // Filtramos al usuario logueado para que no aparezca en la lista
            usuarios={usuarios.filter((u) => u.id !== user?.id)}
            onEdit={(usuario: UsuarioType) => setUsuarioEnEdicion(usuario)}
            onUnlock={unlockUsuario}
            esUsuarioBloqueado={esUsuarioBloqueado}
            puedeEditar={puedeEditarUsuario}
          />
          
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

      <NuevoUsuarioModal
        isOpen={isCreateModalOpen}
        empresas={empresas}
        roles={rolesAsignables}
        empresaIdBloqueada={empresaIdBloqueada}
        mensajeSinRoles={mensajeSinRoles}
        onEmpresaChange={setEmpresaFormId}
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
        puedeCambiarRol={puedeCambiarRol}
        onAsignarRol={asignarRolYRefrescar}
        onEmpresaChange={setEmpresaFormId}
      />
    </Layout>
  );
}