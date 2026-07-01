import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Layout } from "../../components/layout/Layout";
import { Button } from "../../components/ui/Button";
import { useEmpresas } from "../../hooks/useEmpresas";
import { usePlanes } from "../../hooks/usePlanes";
import { EmpresasTable } from "../../components/empresas/EmpresasTable";
import { NuevaEmpresaModal } from "./components/NuevaEmpresaModal";
import { EditarEmpresaModal } from "./components/EditarEmpresaModal";
import type { EmpresaType } from "../../types/empresa.types";

type TabEstado = "Todas" | "Activas" | "Trial" | "Suspendidas";

const TABS: TabEstado[] = ["Todas", "Activas", "Trial", "Suspendidas"];

export default function EmpresasPage() {
  const { empresas, isLoading, error, refetch, createEmpresa, isCreating, updateEmpresa, isUpdating } = useEmpresas();
  const { planes, isLoading: isLoadingPlanes } = usePlanes();
  const [busqueda, setBusqueda] = useState("");
  const [tabActivo, setTabActivo] = useState<TabEstado>("Todas");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [empresaEnEdicion, setEmpresaEnEdicion] = useState<EmpresaType | null>(null);

  const totalActivas = useMemo(
    () => empresas.filter((e) => e.isActive).length,
    [empresas],
  );

  const empresasFiltradas = useMemo(() => {
    return empresas
      .filter((e) => {
        if (tabActivo === "Todas") return true;
        if (tabActivo === "Activas") return e.isActive;
        if (tabActivo === "Suspendidas") return !e.isActive;
        return false; // Trial: pendiente de soporte en el backend
      })
      .filter((e) => {
        const q = busqueda.toLowerCase();
        if (!q) return true;
        return (
          e.name.toLowerCase().includes(q) ||
          (e.cuit ?? "").includes(q) ||
          (e.direccion ?? "").toLowerCase().includes(q)
        );
      });
  }, [empresas, tabActivo, busqueda]);

  return (
    <Layout breadcrumb="Consola > Empresas">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Empresas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {empresas.length} organizaciones en la plataforma •{" "}
            {totalActivas} activas
          </p>
        </div>
        <Button type="button" className="!w-auto px-6" onClick={() => setIsModalOpen(true)}>
          + Nueva empresa
        </Button>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        {/* Buscador */}
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, CUIT o ubicación..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
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
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Estado de error */}
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="ml-4 rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Contenido */}
      {isLoading || isLoadingPlanes ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando empresas...</p>
        </div>
      ) : (
        <EmpresasTable
          empresas={empresasFiltradas}
          planes={planes}
          onEdit={(empresa) => setEmpresaEnEdicion(empresa)}
        />
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
