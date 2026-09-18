import { useState } from "react";
import { Download, Loader2, TrendingUp } from "lucide-react";
import { Input } from "../../../components/ui/Input";
import {
  useEvolucionIndicadores,
  type RangoPersonalizado,
} from "../../../hooks/useEvolucionIndicadores";
import { INDICADORES_EVOLUCION } from "../constants/indicadoresEvolucion";
import { exportarGraficoEvolucionPng } from "../../../utils/exportarGraficoEvolucionPng";
import { Parametro } from "../../../types/configParametro.types";
import type {
  IndicadorEvolucionId,
  PeriodoEvolucion,
  TipoGraficoEvolucion,
} from "../../../types/indicadorEvolucion.types";
import { EvolucionIndicadoresChart } from "./EvolucionIndicadoresChart";

function formatFecha(iso: string): string {
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

const PERIODOS: { value: PeriodoEvolucion; label: string }[] = [
  { value: "dia", label: "Día" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
  { value: "rango", label: "Rango personalizado" },
];

const TIPOS_GRAFICO: { value: TipoGraficoEvolucion; label: string }[] = [
  { value: "linea", label: "Línea" },
  { value: "barras", label: "Barras" },
];

const RANGO_VACIO: RangoPersonalizado = { desde: "", hasta: "" };

function SegmentedControl<T extends string>({
  opciones,
  valor,
  onChange,
}: {
  opciones: { value: T; label: string }[];
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
      {opciones.map((op) => (
        <button
          key={op.value}
          type="button"
          onClick={() => onChange(op.value)}
          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ${
            valor === op.value
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
          }`}
        >
          {op.label}
        </button>
      ))}
    </div>
  );
}

// HU-39 (EP-7): "Evolución de indicadores" en el dashboard de producción.
// Conectado a GET /dashboard/indicadores/evolucion (ver
// useEvolucionIndicadores.ts / evolucionIndicadores.service.ts) — antes
// vivía como tab mockeado dentro de LotesPage; se mudó acá porque el
// endpoint real solo lo puede leer Responsable de producción/Gerente/
// Administrador (mismo trío de roles que ya gatea esta página en
// App.tsx — no hace falta un chequeo de rol adicional acá adentro).
// "tipoGrafico" (línea/barras) es puramente de presentación: no se le pasa
// al hook, no cambia qué se pide al backend.
export function EvolucionIndicadoresPanel() {
  const [periodo, setPeriodo] = useState<PeriodoEvolucion>("mes");
  const [rango, setRango] = useState<RangoPersonalizado>(RANGO_VACIO);
  const [tipoGrafico, setTipoGrafico] = useState<TipoGraficoEvolucion>("linea");
  const [seleccionados, setSeleccionados] = useState<IndicadorEvolucionId[]>([
    Parametro.GRASA,
    Parametro.PROTEINA,
  ]);

  const {
    puntos,
    agregado,
    granularidad,
    isLoading,
    error,
    estaVacio,
    sinIndicadores,
    refetch,
  } = useEvolucionIndicadores({
    periodo,
    rangoPersonalizado: rango,
    indicadoresSeleccionados: seleccionados,
  });

  const indicadoresSeleccionadosConfig = INDICADORES_EVOLUCION.filter((i) =>
    seleccionados.includes(i.id),
  );

  const toggleIndicador = (id: IndicadorEvolucionId) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const periodoLabel =
    periodo === "rango" && rango.desde && rango.hasta
      ? `Rango personalizado (${formatFecha(rango.desde)} – ${formatFecha(rango.hasta)})`
      : (PERIODOS.find((p) => p.value === periodo)?.label ?? "");

  const exportarPng = () => {
    const fecha = new Date().toISOString().slice(0, 10);
    exportarGraficoEvolucionPng({
      puntos,
      indicadores: indicadoresSeleccionadosConfig,
      tipo: tipoGrafico,
      periodoLabel,
      nombreArchivo: `evolucion-indicadores-${fecha}.png`,
    });
  };

  const puedeExportar =
    !isLoading && !error && !estaVacio && !sinIndicadores && puntos.length > 0;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white">
            <TrendingUp className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Evolución de indicadores
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {indicadoresSeleccionadosConfig.length} indicador
              {indicadoresSeleccionadosConfig.length === 1 ? "" : "es"}{" "}
              comparado
              {indicadoresSeleccionadosConfig.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={exportarPng}
          disabled={!puedeExportar}
          className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Download className="h-4 w-4" />
          Exportar PNG
        </button>
      </div>

      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">
              PERÍODO
            </p>
            <SegmentedControl
              opciones={PERIODOS}
              valor={periodo}
              onChange={setPeriodo}
            />
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">
              TIPO DE GRÁFICO
            </p>
            <SegmentedControl
              opciones={TIPOS_GRAFICO}
              valor={tipoGrafico}
              onChange={setTipoGrafico}
            />
          </div>

          {periodo === "rango" && (
            <div className="flex items-end gap-3">
              <Input
                label="Desde"
                type="date"
                value={rango.desde}
                onChange={(e) =>
                  setRango((r) => ({ ...r, desde: e.target.value }))
                }
              />
              <Input
                label="Hasta"
                type="date"
                value={rango.hasta}
                onChange={(e) =>
                  setRango((r) => ({ ...r, hasta: e.target.value }))
                }
              />
            </div>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">
            INDICADORES
          </p>
          <div className="flex flex-wrap gap-2">
            {INDICADORES_EVOLUCION.map((indicador) => {
              const activo = seleccionados.includes(indicador.id);
              return (
                <button
                  key={indicador.id}
                  type="button"
                  onClick={() => toggleIndicador(indicador.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    activo
                      ? "border-transparent text-white"
                      : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
                  }`}
                  style={
                    activo ? { backgroundColor: indicador.color } : undefined
                  }
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: activo ? "#ffffff" : indicador.color,
                    }}
                  />
                  {indicador.label} {indicador.unidad}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-5 py-5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-16 text-center dark:border-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Cargando evolución de indicadores...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-red-200 bg-red-50 py-12 text-center dark:border-red-500/30 dark:bg-red-500/10">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30"
            >
              Reintentar
            </button>
          </div>
        ) : sinIndicadores ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-16 text-center dark:border-slate-700">
            <p className="text-base font-medium text-slate-700 dark:text-slate-300">
              Seleccioná al menos un indicador
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Elegí uno o más indicadores arriba para visualizar el gráfico.
            </p>
          </div>
        ) : estaVacio ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-16 text-center dark:border-slate-700">
            <p className="text-base font-medium text-slate-700 dark:text-slate-300">
              No hay mediciones disponibles para el período seleccionado
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Probá con otro período o ajustá el rango de fechas.
            </p>
          </div>
        ) : (
          <>
            {agregado && (
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                Los puntos se agregan por{" "}
                {granularidad === "mes" ? "mes" : "semana"} para que el
                gráfico se pueda leer bien.
              </p>
            )}
            <EvolucionIndicadoresChart
              puntos={puntos}
              indicadores={indicadoresSeleccionadosConfig}
              tipo={tipoGrafico}
            />
          </>
        )}
      </div>
    </div>
  );
}
