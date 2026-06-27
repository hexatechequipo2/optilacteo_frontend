import { useState } from "react";
import { Layout } from "../../components/layout/Layout";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { useUsuarios, TODAS_LAS_EMPRESAS } from "../../hooks/useUsuarios";
import { useEmpresas } from "../../hooks/useEmpresas";
import type { UsuarioType } from "../../types/usuario.types";
import { UsuariosTable } from "./components/UsuariosTable";
import { NuevoUsuarioModal } from "./components/NuevoUsuarioModal";
import { EditarUsuarioModal } from "./components/EditarUsuarioModal";

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
  } = useUsuarios();

  const { empresas } = useEmpresas();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // CORRECCIÓN: Definición explícita del tipo genérico
  const [usuarioEnEdicion, setUsuarioEnEdicion] = useState<UsuarioType | null>(null);

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
      
      {/* SECCIÓN SUPERIOR: Título a la izquierda, Botón a la derecha */}
      <div className="mb-6 flex items-center justify-between">
        
        {/* Contenedor del Título y Contador (a la izquierda) */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-sans">Usuarios</h1>
          <p className="text-sm text-slate-500">
            {usuarios.length} usuarios en {empresasUnicas} empresas
          </p>
        </div>
        
        {/* Botón: Se alinea automáticamente a la derecha */}
        <Button
          type="button"
          className="!w-auto px-6" 
          onClick={() => setIsCreateModalOpen(true)}
        >
          + Nuevo usuario
        </Button>
      </div>

      {/* FILTROS: Buscador compacto y Select a la derecha */}
      <div className="mb-6 flex gap-4">
        
        {/* Buscador: limitamos su crecimiento máximo */}
        <div className="w-full max-w-sm">
          <Input
            id="usuarios-search"
            placeholder="Buscar por nombre, email o empresa..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="!w-full !rounded-full !py-2 !px-5 !border-slate-300"
          />
        </div>
        
        {/* Select: con un ancho fijo más pequeño */}
        <div className="w-52 flex-shrink-0">
          <Select
            id="usuarios-empresa-filtro"
            options={empresaOptions}
            value={empresaFiltro}
            onChange={(event) => setEmpresaFiltro(event.target.value)}
            className="!w-full !rounded-full !py-2 !px-4 !border-slate-300 !text-sm"
          />
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Tabla con la corrección del tipo en onEdit */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16">
          <p className="text-sm text-slate-500">Cargando usuarios...</p>
        </div>
      ) : (
        <UsuariosTable
          usuarios={filteredUsuarios}
          onEdit={(usuario: UsuarioType) => setUsuarioEnEdicion(usuario)}
        />
      )}

      <NuevoUsuarioModal
        isOpen={isCreateModalOpen}
        empresas={empresas}
        isSubmitting={isCreating}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={createUsuario}
      />

      <EditarUsuarioModal
        usuario={usuarioEnEdicion}
        empresas={empresas}
        isSubmitting={isUpdating}
        onClose={() => setUsuarioEnEdicion(null)}
        onUpdate={updateUsuario}
      />
    </Layout>
  );
}