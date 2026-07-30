import { CheckCircle2, Home, Target, XCircle } from "lucide-react";
import type { LineaCalidadResumen } from "../../../types/dashboardProduccion.types";

interface LineaCalidadPanelProps {
  resumen: LineaCalidadResumen;
}

interface EtapaCardProps {
  icono: typeof Home;
  label: string;
  lotes: number;
  detalle: string;
  variante?: "normal" | "alerta";
}

function EtapaCard({ icono: Icono, label, lotes, detalle, variante = "normal" }: EtapaCardProps) {
  const esAlerta = variante === "alerta";

  return (
    <div
      className={`min-w-0 rounded-lg border p-3 sm:p-4 ${
        esAlerta
          ? "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      <div className="flex items-center justify-between">
        <Icono
          className={`h-4 w-4 ${esAlerta ? "text-red-600 dark:text-red-400" : "text-slate-400 dark:text-slate-500"}`}
        />
        <span
          className={`h-1.5 w-1.5 rounded-full ${esAlerta ? "bg-red-500" : "bg-emerald-500"}`}
        />
      </div>
      <p
        className={`mt-2 truncate text-xs font-semibold uppercase tracking-wide ${
          esAlerta ? "text-red-700 dark:text-red-400" : "text-slate-400 dark:text-slate-500"
        }`}
      >
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{lotes}</p>
      <p
        className={`mt-1 truncate text-xs ${
          esAlerta ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"
        }`}
      >
        {detalle}
      </p>
    </div>
  );
}

// Panel "Línea de calidad" del prototipo: pipeline de los lotes de hoy por
// etapa (Recepción -> Clasificación -> No aptos / Aptos). No forma parte de
// los AC de HU-38, pero Jime lo pidió replicar del proto. El backend
// (dashboard.service.ts) solo manda los números planos por etapa — el texto
// descriptivo de cada tarjeta es copy fijo del front, no dato del servidor.
export function LineaCalidadPanel({ resumen }: LineaCalidadPanelProps) {
  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Línea de calidad
          </p>
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            En vivo
          </span>
        </div>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {resumen.totalLotesSistema} lotes en el sistema
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <EtapaCard
          icono={Home}
          label="Recepción"
          lotes={resumen.recepcion}
          detalle={`${resumen.recepcion} recibidos hoy`}
        />
        <EtapaCard
          icono={Target}
          label="Clasificación"
          lotes={resumen.clasificacion}
          detalle="automática por umbral"
        />
        <EtapaCard
          icono={XCircle}
          label="No aptos"
          lotes={resumen.noAptos}
          detalle="destino descarte"
          variante="alerta"
        />
        <EtapaCard
          icono={CheckCircle2}
          label="Aptos"
          lotes={resumen.aptos}
          detalle="destino producción"
        />
      </div>
    </div>
  );
}
