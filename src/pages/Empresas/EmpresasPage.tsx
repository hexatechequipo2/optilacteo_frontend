import { useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Layout } from "../../components/layout/Layout";
import { Button } from "../../components/ui/Button";
import { useEmpresas } from "../../hooks/useEmpresas";
import { EmpresasTable } from "../../components/empresas/EmpresasTable";
import { NuevaEmpresaModal } from "./components/NuevaEmpresaModal";
import { EditarEmpresaModal } from "./components/EditarEmpresaModal";
import type { EmpresaType } from "../../types/empresa.types";

type TabEstado = "Todas" | "Activas" | "Suspendidas";
const TABS: TabEstado[] = ["Todas", "Activas", "Suspendidas"];

export default function EmpresasPage() {
  // Nota: Aunque el hook tenga cuit y plan, no los usaremos en la UI 
  // porque el buscador principal enviará el mismo valor a todos.
  const { 
    empresas, meta, page, setPage, 
    busqueda, setBusqueda, 
    setCuit, setPlan, 
    tabActivo, setTabActivo,
    isLoading, error, refetch, createEmpresa, isCreating, updateEmpresa, isUpdating 
  } = useEmpresas();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [empresaEnEdicion, setEmpresaEnEdicion] = useState<EmpresaType | null>(null);

  // Función para manejar el cambio en el buscador único
  const handleSearchChange = (val: string) => {
    setBusqueda(val);
    setCuit(val); // Sincronizamos el mismo valor para los 3 filtros
    setPlan(val);
  };

  return (
    <Layout breadcrumb="Consola > Empresas">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Empresas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {meta.total} organizaciones en la plataforma
          </p>
        </div>
        <Button type="button" className="!w-auto px-6" onClick={() => setIsModalOpen(true)}>
          + Nueva empresa
        </Button>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        {/* Buscador Único */}
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, CUIT o plan..."
            value={busqueda}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        {/* Tabs de estado */}
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setTabActivo(tab)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                tabActivo === tab
                  ? "border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Estado de error */}
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/15">
          <span>{error}</span>
          <button type="button" onClick={() => void refetch()} className="ml-4 font-medium underline">
            Reintentar
          </button>
        </div>
      )}

      {/* Contenido */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando empresas...</p>
        </div>
      ) : (
        <>
          <EmpresasTable
            empresas={empresas}
            onEdit={(empresa) => setEmpresaEnEdicion(empresa)}
          />

          {/* Paginación */}
          <div className="mt-6 flex items-center justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
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
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}

      <NuevaEmpresaModal
        isOpen={isModalOpen}
        isSubmitting={isCreating}
        onClose={() => setIsModalOpen(false)}
        onCreate={createEmpresa}
      />

      <EditarEmpresaModal
        empresa={empresaEnEdicion}
        isSubmitting={isUpdating}
        onClose={() => setEmpresaEnEdicion(null)}
        onUpdate={updateEmpresa}
      />
    </Layout>
  );
}