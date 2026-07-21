import { useEffect, useState } from "react";
import { extraerMensajeError } from "../../../services/configParametro.service";
import type { ConfigParametro, Parametro, TipoMateriaPrima } from "../../../types/configParametro.types";
import type { ParametroVisible } from "../constants/parametrosCalidad";
import { PARAMETROS_META } from "../constants/parametrosCalidad";

interface ParametroCardProps {
  parametro: ParametroVisible;
  tipoMateriaPrima: TipoMateriaPrima;
  config: ConfigParametro | undefined;
  onSave: (params: {
    id?: number;
    parametro: Parametro;
    tipoMateriaPrima: TipoMateriaPrima;
    umbralMin: number;
    umbralMax: number;
  }) => Promise<ConfigParametro>;
}

function validar(minStr: string, maxStr: string, rangoFisico: { min: number; max: number }): string | null {
  if (minStr.trim() === "" || maxStr.trim() === "") return null; // incompleto: no valida ni guarda

  const min = Number(minStr);
  const max = Number(maxStr);

  if (Number.isNaN(min) || Number.isNaN(max)) return "Mínimo y máximo deben ser numéricos";
  if (min < rangoFisico.min || min > rangoFisico.max || max < rangoFisico.min || max > rangoFisico.max) {
    return `Los valores deben estar entre ${rangoFisico.min} y ${rangoFisico.max}`;
  }
  if (min >= max) return "El mínimo debe ser menor al máximo";

  return null;
}

export function ParametroCard({ parametro, tipoMateriaPrima, config, onSave }: ParametroCardProps) {
  const meta = PARAMETROS_META[parametro];
  const Icon = meta.icon;

  const [minInput, setMinInput] = useState(config?.umbralMin?.toString() ?? "");
  const [maxInput, setMaxInput] = useState(config?.umbralMax?.toString() ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al cambiar de tipo de materia prima (o llegar el fetch inicial) resincroniza
  // los inputs con lo que hay guardado para esa combinación puntual.
  useEffect(() => {
    setMinInput(config?.umbralMin?.toString() ?? "");
    setMaxInput(config?.umbralMax?.toString() ?? "");
    setError(null);
  }, [config, tipoMateriaPrima]);

  const handleBlur = async () => {
    const clienteError = validar(minInput, maxInput, meta.rangoFisico);
    if (clienteError) {
      setError(clienteError);
      return;
    }
    if (minInput.trim() === "" || maxInput.trim() === "") return;

    const umbralMin = Number(minInput);
    const umbralMax = Number(maxInput);
    const sinCambios = config && config.umbralMin === umbralMin && config.umbralMax === umbralMax;
    if (sinCambios) return;

    setError(null);
    setIsSaving(true);
    try {
      await onSave({ id: config?.id, parametro, tipoMateriaPrima, umbralMin, umbralMax });
    } catch (err) {
      setError(extraerMensajeError(err, "No se pudo guardar. Intentá nuevamente."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
          <Icon className="h-5 w-5" />
        </span>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
          {meta.unidad}
        </span>
      </div>

      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
        {meta.label}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Mínimo</label>
          <input
            type="number"
            inputMode="decimal"
            value={minInput}
            disabled={isSaving}
            onChange={(e) => setMinInput(e.target.value)}
            onBlur={handleBlur}
            className={`w-full rounded-md border px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white ${
              error ? "border-red-500" : "border-slate-300 dark:border-slate-700"
            }`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Máximo</label>
          <input
            type="number"
            inputMode="decimal"
            value={maxInput}
            disabled={isSaving}
            onChange={(e) => setMaxInput(e.target.value)}
            onBlur={handleBlur}
            className={`w-full rounded-md border px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white ${
              error ? "border-red-500" : "border-slate-300 dark:border-slate-700"
            }`}
          />
        </div>
      </div>

      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : isSaving ? (
        <p className="text-xs text-slate-400 dark:text-slate-500">Guardando...</p>
      ) : (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          rango físico {meta.rangoFisico.min} — {meta.rangoFisico.max}
        </p>
      )}
    </div>
  );
}
