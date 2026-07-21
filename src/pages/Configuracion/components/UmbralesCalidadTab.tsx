import { useState } from "react";
import { Settings } from "lucide-react";
import { Tabs } from "../../../components/ui/Tabs";
import { useConfigParametros } from "../../../hooks/useConfigParametros";
import { ORDEN_PARAMETROS, TIPO_MATERIA_PRIMA_TABS } from "../constants/parametrosCalidad";
import { TipoMateriaPrima } from "../../../types/configParametro.types";
import { ParametroCard } from "./ParametroCard";

export function UmbralesCalidadTab() {
  const { configs, isLoading, error, saveConfig } = useConfigParametros();
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoMateriaPrima>(TipoMateriaPrima.LECHE_CRUDA);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-6 dark:border-blue-500/20 dark:bg-blue-500/5">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-white">
              <Settings className="h-5 w-5" />
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">Umbrales de calidad</span>
          </div>
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
            6 parámetros por tipo de materia prima
          </span>
        </div>

        <Tabs tabs={TIPO_MATERIA_PRIMA_TABS} value={tipoSeleccionado} onChange={setTipoSeleccionado} />
      </div>

      {isLoading ? (
        <p className="text-slate-500 dark:text-slate-400">Cargando...</p>
      ) : error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
          {error}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ORDEN_PARAMETROS.map((parametro) => (
            <ParametroCard
              key={parametro}
              parametro={parametro}
              tipoMateriaPrima={tipoSeleccionado}
              config={configs.find(
                (c) => c.parametro === parametro && c.tipoMateriaPrima === tipoSeleccionado,
              )}
              onSave={saveConfig}
            />
          ))}
        </div>
      )}
    </div>
  );
}
