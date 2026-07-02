import {
  LayoutDashboard,
  Package,
  Sparkles,
  Activity,
  Gauge,
  GitMerge,
  BarChart2,
  Mic,
  type LucideIcon,
} from "lucide-react";
import type { ModuloEnum } from "../../../types/empresa.types";
import type { ModuloUsage } from "../../../hooks/useDashboard";

const MODULO_INFO: Record<ModuloEnum, { nombre: string; icono: LucideIcon }> = {
  dashboard: { nombre: "Dashboard", icono: LayoutDashboard },
  recepcion: { nombre: "Recepción", icono: Package },
  destino_productivo_ia: { nombre: "Destino productivo (IA)", icono: Sparkles },
  monitoreo_alertas: { nombre: "Monitoreo y alertas", icono: Activity },
  sensores_iot: { nombre: "Sensores IoT", icono: Gauge },
  trazabilidad: { nombre: "Trazabilidad", icono: GitMerge },
  reportes_forecast: { nombre: "Reportes y forecast", icono: BarChart2 },
  asistente_voz: { nombre: "Asistente de voz", icono: Mic },
};

interface ModulosHabilitadosPanelProps {
  modulos: ModuloUsage[];
  totalEmpresas: number;
}

export function ModulosHabilitadosPanel({
  modulos,
  totalEmpresas,
}: ModulosHabilitadosPanelProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
        Módulos más habilitados
      </h2>

      {modulos.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sin datos de módulos todavía.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {modulos.map(({ modulo, empresasConModulo }) => {
            const info = MODULO_INFO[modulo];
            const Icon = info.icono;
            return (
              <li key={modulo} className="flex items-center gap-3">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-300">
                  {info.nombre}
                </span>
                <span className="flex-shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400">
                  {empresasConModulo}/{totalEmpresas}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
