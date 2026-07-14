import { useNavigate } from "react-router-dom";
import { Layout } from "../../components/layout/Layout";
import { Button } from "../../components/ui/Button";
import { useDashboard } from "../../hooks/useDashboard";
import { StatCard } from "./components/StatCard";
import { EmpresasListPanel } from "./components/EmpresasListPanel";
import { DistribucionPlanPanel } from "./components/DistribucionPlanPanel";
import { ModulosHabilitadosPanel } from "./components/ModulosHabilitadosPanel";

export default function DashboardPage() {
  const navigate = useNavigate();
  const {
    isLoading,
    error,
    empresas,
    totalEmpresas,
    empresasActivas,
    empresasEnTrial,
    totalUsuarios,
    usuariosActivos,
    promedioModulosPorEmpresa,
    totalModulosDisponibles,
    distribucionPorPlan,
    modulosMasHabilitados,
    refetch,
  } = useDashboard();

  return (
    <Layout breadcrumb="Consola > Resumen">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Resumen de plataforma
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Estado general del SaaS · {totalEmpresas} empresas ·{" "}
            {totalUsuarios} usuarios
          </p>
        </div>
        <Button
          type="button"
          className="!w-auto px-6"
          onClick={() => navigate("/empresas")}
        >
          + Nueva empresa
        </Button>
      </div>

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

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Cargando resumen...
          </p>
        </div>
      ) : (
        <>
          {/* Tarjetas superiores: única sección responsiva del prototipo —
              1 columna en mobile, 3 en tablet/desktop, sin overflow ni texto cortado */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard
              label="Empresas activas"
              value={empresasActivas}
              detail={`${empresasEnTrial} en trial · ${totalEmpresas} totales`}
            />
            <StatCard
              label="Usuarios"
              value={totalUsuarios}
              detail={`${usuariosActivos} activos`}
            />
            <StatCard
              label="Módulos / empresa"
              value={promedioModulosPorEmpresa}
              detail={`de ${totalModulosDisponibles} disponibles`}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <EmpresasListPanel empresas={empresas} />
            </div>
            <div className="flex flex-col gap-6">
              <DistribucionPlanPanel distribucion={distribucionPorPlan} />
              <ModulosHabilitadosPanel
                modulos={modulosMasHabilitados}
                totalEmpresas={totalEmpresas}
              />
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}