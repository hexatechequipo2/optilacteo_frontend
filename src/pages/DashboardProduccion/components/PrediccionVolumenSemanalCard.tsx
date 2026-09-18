import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Clock,
  Database,
  Download,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { usePrediccionVolumen } from "../../../hooks/usePrediccionVolumen";
import { TipoMateriaPrimaSelector } from "../../../components/TipoMateriaPrimaSelector";
import { PrediccionVolumenChart } from "./PrediccionVolumenChart";

const UNIDAD_LABEL: Record<string, string> = {
  litros: "L",
  kilogramos: "kg",
};

function formatearFechaCorta(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatearFechaConDia(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function formatearFechaHora(iso: string): string {
  const fecha = new Date(iso);
  return `${fecha.toLocaleDateString("es-AR")} · ${fecha.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

// HU-51 (EP-9, IA y recomendaciones): conectado al backend real —
// GET /prediccion-volumen (usePrediccionVolumen) y exportación a
// GET /prediccion-volumen/exportar/csv. El componente ya no tiene un
// switcher manual de estados de demo: "cargando" y "error" salen del ciclo
// real de fetch, y "datos_insuficientes" del campo `status` que trae la
// respuesta (ver prediccionVolumen.types.ts). No hay estado "baja
// precisión" ni score de confianza en % — el contrato real del backend no
// trae ningún campo de ese tipo, solo el intervalo mínimo/esperado/máximo.
export function PrediccionVolumenSemanalCard() {
  const {
    data,
    estado,
    tipoMateriaPrima,
    setTipoMateriaPrima,
    refetch,
    isExporting,
    exportError,
    exportarCsv,
  } = usePrediccionVolumen();
  const [soloPrediccion, setSoloPrediccion] = useState(false);

  const unidadLabel = data?.unidad ? UNIDAD_LABEL[data.unidad] : "";

  const totalEsperado = useMemo(
    () => (data?.prediccion ?? []).reduce((acc, p) => acc + p.esperado, 0),
    [data],
  );
  const totalHistoricoUltimos7 = useMemo(
    () => (data?.historicoReciente ?? []).slice(-7).reduce((acc, p) => acc + p.valor, 0),
    [data],
  );
  const variacionPorcentaje =
    totalHistoricoUltimos7 > 0
      ? ((totalEsperado - totalHistoricoUltimos7) / totalHistoricoUltimos7) * 100
      : 0;
  const diaMayorVolumen = useMemo(() => {
    const prediccion = data?.prediccion ?? [];
    if (prediccion.length === 0) return null;
    return prediccion.reduce((mayor, p) => (p.esperado > mayor.esperado ? p : mayor));
  }, [data]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white">
            <TrendingUp className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Predicción de volumen de producción
          </h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          7 días proyectados
        </span>
      </div>

      {/* La predicción es siempre por materia prima (query param obligatorio
          del backend) — no existe una predicción "global". */}
      <div className="border-b border-slate-100 px-5 py-3 dark:border-slate-800">
        <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">
          MATERIA PRIMA
        </p>
        <TipoMateriaPrimaSelector value={tipoMateriaPrima} onChange={setTipoMateriaPrima} />
      </div>

      <div className="p-5">
        {estado === "cargando" ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Cargando predicción...</p>
          </div>
        ) : estado === "error" ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <p className="text-base font-medium text-slate-700 dark:text-slate-300">
              No se pudo generar la predicción
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No se pudo consultar el modelo de predicción. Probá de nuevo en unos minutos.
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-1 rounded-md bg-red-100 px-4 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30"
            >
              Reintentar
            </button>
          </div>
        ) : estado === "datos_insuficientes" ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Database className="h-6 w-6 text-slate-400" />
            <p className="text-base font-medium text-slate-700 dark:text-slate-300">
              Todavía no hay suficiente historial para predecir
            </p>
            <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
              {data?.mensaje ??
                "El modelo todavía no tiene suficiente histórico de recepción para esta materia prima."}
            </p>
          </div>
        ) : data && diaMayorVolumen ? (
          <>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                  <Sparkles className="h-3 w-3" />
                  Generado por IA
                </span>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Próximos 7 días · volumen esperado en {unidadLabel}
                </h3>
                <p className="mt-1 max-w-lg text-sm text-slate-500 dark:text-slate-400">
                  El modelo estima el volumen diario a partir del histórico de recepción y la
                  estacionalidad semanal.
                </p>
                {/* Se actualiza automáticamente todos los días (cron diario del
                    backend, ver PrediccionVolumenTask) — la fecha mostrada acá es
                    cuándo corrió esa última generación, no la fecha de este GET. */}
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 dark:text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Se actualiza automáticamente todos los días
                  </span>
                  {data.fechaActualizacionModelo && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Última actualización del modelo: {formatearFechaHora(data.fechaActualizacionModelo)}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => void exportarCsv()}
                  disabled={isExporting}
                  className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Exportar CSV
                </button>
              </div>
            </div>

            {exportError && (
              <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{exportError}</span>
              </div>
            )}

            <div className="mb-5 grid grid-cols-1 gap-4 border-y border-slate-100 py-4 sm:grid-cols-3 dark:border-slate-800">
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">
                  VOLUMEN TOTAL ESPERADO
                </p>
                <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                  {totalEsperado.toLocaleString("es-AR")} {unidadLabel}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Semana del {formatearFechaCorta(data.prediccion[0].fecha)} al{" "}
                  {formatearFechaCorta(data.prediccion[data.prediccion.length - 1].fecha)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">
                  VARIACIÓN VS. SEMANA ANTERIOR
                </p>
                <p
                  className={`mt-1 text-xl font-bold ${
                    variacionPorcentaje >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {variacionPorcentaje >= 0 ? "↑" : "↓"} {Math.abs(variacionPorcentaje).toFixed(1)}%
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Semana anterior: {totalHistoricoUltimos7.toLocaleString("es-AR")} {unidadLabel}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">
                  DÍA DE MAYOR VOLUMEN PREVISTO
                </p>
                <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                  {formatearFechaConDia(diaMayorVolumen.fecha)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {diaMayorVolumen.esperado.toLocaleString("es-AR")} {unidadLabel} esperados · rango{" "}
                  {diaMayorVolumen.minimo.toLocaleString("es-AR")}–
                  {diaMayorVolumen.maximo.toLocaleString("es-AR")} {unidadLabel}
                </p>
              </div>
            </div>

            <div className="mb-4 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setSoloPrediccion(false)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  !soloPrediccion
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                Con histórico comparado
              </button>
              <button
                type="button"
                onClick={() => setSoloPrediccion(true)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  soloPrediccion
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                Solo predicción
              </button>
            </div>

            <PrediccionVolumenChart
              historico={data.historicoReciente}
              prediccion={data.prediccion}
              unidadLabel={unidadLabel}
              soloPrediccion={soloPrediccion}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
