import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Layout } from "../../components/layout/Layout";
import { Button } from "../../components/ui/Button";
import { Tabs } from "../../components/ui/Tabs";
import { useDashboardProduccion } from "../../hooks/useDashboardProduccion";
import { useEmpresaActual } from "../../hooks/useEmpresaActual";
import type { FiltroPeriodoDashboard } from "../../types/dashboardProduccion.types";
import { MetricaCard } from "./components/MetricaCard";
import { LotesProcesadosChart } from "./components/LotesProcesadosChart";
import { LineaCalidadPanel } from "./components/LineaCalidadPanel";
import { ReporteProduccionPDF } from "./components/ReporteProduccionPDF";

const HOY = new Date().toLocaleDateString("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

// Segmented control de granularidad temporal del historico de lotes
// procesados (ver useDashboardProduccion / dashboardProduccion.service).
const FILTRO_TABS: { value: FiltroPeriodoDashboard; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Mes" },
];

const FILTRO_LABEL: Record<FiltroPeriodoDashboard, string> = {
  hoy: "Lotes procesados · hoy",
  semana: "Lotes procesados · últimos 7 días",
  mes: "Lotes procesados · este mes",
};

// Mismo texto que las labels de FILTRO_TABS, usado en el título "Producción · X".
const TITULO_LABEL: Record<FiltroPeriodoDashboard, string> = {
  hoy: "Hoy",
  semana: "Esta semana",
  mes: "Mes",
};

// Label de la card "Lotes procesados", según el filtro de período activo.
const LOTES_PROCESADOS_LABEL: Record<FiltroPeriodoDashboard, string> = {
  hoy: "Lotes procesados hoy",
  semana: "Lotes procesados esta semana",
  mes: "Lotes procesados este mes",
};

function segundosDesde(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
}

// HU-38: pantalla de inicio del rol "Responsable de producción" ("jefe de
// producción" en el backlog). AC1+AC3: métricas del día con tendencia. AC2:
// auto-refresh sin recarga manual (useDashboardProduccion hace polling).
// AC4: es la home de este rol (ver redirect en LoginPage.tsx y ruta en
// App.tsx). AC de "sin datos": las métricas en 0 se muestran igual, sin
// pantalla de error — solo se muestra error si la request en sí falla.
export default function DashboardProduccionPage() {
  const { resumen, historico, isLoading, error, filtro, setFiltro, refetch } =
    useDashboardProduccion();
  const { empresa } = useEmpresaActual();
  const [, forceTick] = useState(0);

  // Recalcula el texto "actualizado hace Xs" cada segundo sin re-pedir datos.
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Layout breadcrumb="Inicio > Producción">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Producción · {TITULO_LABEL[filtro]}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {empresa?.name ?? "OptiLácteo"} · {HOY}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {resumen && (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              actualizado hace {segundosDesde(resumen.actualizadoEn)} s
            </span>
          )}
          <Button
            type="button"
            className="!w-auto px-4 print:hidden"
            onClick={() => window.print()}
          >
            <Printer className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <div className="mb-6 print:hidden">
        <Tabs tabs={FILTRO_TABS} value={filtro} onChange={setFiltro} />
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
            Cargando panel de producción...
          </p>
        </div>
      ) : resumen ? (
        <>
          <div className="print:hidden">
            <LineaCalidadPanel resumen={resumen.lineaCalidad} filtro={filtro} />

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MetricaCard
                label={LOTES_PROCESADOS_LABEL[filtro]}
                metrica={resumen.lotesProcesados}
                filtro={filtro}
              />
              <MetricaCard label="Alertas activas" metrica={resumen.alertasActivas} filtro={filtro} />
              <MetricaCard
                label="Parámetros críticos"
                metrica={resumen.parametrosCriticos}
                filtro={filtro}
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                {FILTRO_LABEL[filtro]}
              </p>
              <LotesProcesadosChart datos={historico?.puntos ?? []} />
            </div>
          </div>

          <ReporteProduccionPDF
            empresaNombre={empresa?.name ?? "OptiLácteo"}
            fecha={HOY}
            resumen={resumen}
            historico={historico}
          />
        </>
      ) : null}
    </Layout>
  );
}
