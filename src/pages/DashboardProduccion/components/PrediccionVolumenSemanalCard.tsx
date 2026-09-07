import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Clock,
  Database,
  Download,
  Loader2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { generarPrediccionVolumen, generarDatosInsuficientes } from "../../../utils/mockPrediccionVolumen";
import { exportarPrediccionVolumenCsv } from "../../../utils/exportarPrediccionVolumenCsv";
import type { EstadoSeccionPrediccion } from "../../../types/prediccionVolumen.types";
import { PrediccionVolumenChart } from "./PrediccionVolumenChart";

const ESTADOS: { value: EstadoSeccionPrediccion; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "cargando", label: "Cargando" },
  { value: "datos_insuficientes", label: "Datos insuficientes" },
  { value: "baja_precision", label: "Baja precisión" },
  { value: "error", label: "Error del modelo" },
];

const COLOR_CONFIANZA: Record<string, string> = {
  alta: "#16a34a",
  media: "#d97706",
  baja: "#dc2626",
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

function GaugeConfianza({ porcentaje, color }: { porcentaje: number; color: string }) {
  const radio = 16;
  const circunferencia = 2 * Math.PI * radio;
  const progreso = (porcentaje / 100) * circunferencia;

  return (
    <svg viewBox="0 0 40 40" className="h-11 w-11 -rotate-90">
      <circle cx="20" cy="20" r={radio} fill="none" stroke="#e2e8f0" strokeWidth="4" />
      <circle
        cx="20"
        cy="20"
        r={radio}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${progreso} ${circunferencia}`}
      />
    </svg>
  );
}

// HU-51 (EP-9, IA y recomendaciones): mock visual de la predicción de
// volumen de producción semanal — la consigna de la HU pide explícitamente
// no conectar contra backend para esta fecha. El switcher "ESTADO DE LA
// SECCIÓN" replica el control que trae el propio prototipo (Figura 10) para
// poder demostrar los 5 estados que piden los criterios de aceptación sin
// depender de datos reales.
export function PrediccionVolumenSemanalCard() {
  const [estado, setEstado] = useState<EstadoSeccionPrediccion>("normal");
  const [soloPrediccion, setSoloPrediccion] = useState(false);

  const data = useMemo(
    () => generarPrediccionVolumen(estado === "baja_precision"),
    [estado],
  );
  const datosInsuficientes = useMemo(() => generarDatosInsuficientes(), []);

  const totalEsperado = data.prediccion.reduce((acc, p) => acc + p.esperado, 0);
  const totalHistoricoUltimos7 = data.historico.slice(-7).reduce((acc, p) => acc + p.litros, 0);
  const variacionPorcentaje =
    totalHistoricoUltimos7 > 0
      ? ((totalEsperado - totalHistoricoUltimos7) / totalHistoricoUltimos7) * 100
      : 0;
  const diaMayorVolumen = data.prediccion.reduce((mayor, p) =>
    p.esperado > mayor.esperado ? p : mayor,
  );

  const colorConfianza = COLOR_CONFIANZA[data.nivelConfianza];

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

      {/* Switcher de demo (ver comentario arriba): en un escenario con
          backend real, el estado se derivaría de la respuesta del endpoint,
          no de un control manual. */}
      <div className="border-b border-slate-100 px-5 py-3 dark:border-slate-800">
        <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">
          ESTADO DE LA SECCIÓN
        </p>
        <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
          {ESTADOS.map((op) => (
            <button
              key={op.value}
              type="button"
              onClick={() => setEstado(op.value)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ${
                estado === op.value
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>
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
              El modelo de predicción no respondió. Probá de nuevo en unos minutos.
            </p>
            <button
              type="button"
              onClick={() => setEstado("normal")}
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
              El modelo necesita al menos {datosInsuficientes.diasHistoricosRequeridos} días de
              recepción registrada. Por ahora hay {datosInsuficientes.diasHistoricosDisponibles} días
              — seguí cargando lotes para habilitar la predicción.
            </p>
          </div>
        ) : (
          <>
            {estado === "baja_precision" && (
              <div className="mb-4 flex items-start gap-2 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  El intervalo de confianza de esta predicción es muy amplio — tratá los valores
                  esperados como una referencia orientativa, no como un número exacto.
                </span>
              </div>
            )}

            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                  <Sparkles className="h-3 w-3" />
                  Generado por IA
                </span>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Próximos 7 días · volumen esperado en litros
                </h3>
                <p className="mt-1 max-w-lg text-sm text-slate-500 dark:text-slate-400">
                  El modelo estima el volumen diario a partir del histórico de recepción, la
                  estacionalidad semanal y los lotes ya programados.
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  Última actualización del modelo:{" "}
                  {new Date(data.actualizadoEn).toLocaleDateString("es-AR")} ·{" "}
                  {new Date(data.actualizadoEn).toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <GaugeConfianza porcentaje={data.confianzaPorcentaje} color={colorConfianza} />
                  <div className="text-sm">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {data.confianzaPorcentaje}%
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Confianza {data.nivelConfianza}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => exportarPrediccionVolumenCsv(data)}
                  className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Download className="h-4 w-4" />
                  Exportar
                </button>
              </div>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-4 border-y border-slate-100 py-4 sm:grid-cols-3 dark:border-slate-800">
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">
                  VOLUMEN TOTAL ESPERADO
                </p>
                <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                  {totalEsperado.toLocaleString("es-AR")} L
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
                  Semana anterior: {totalHistoricoUltimos7.toLocaleString("es-AR")} L
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
                  {diaMayorVolumen.esperado.toLocaleString("es-AR")} L esperados · rango{" "}
                  {diaMayorVolumen.minimo.toLocaleString("es-AR")}–
                  {diaMayorVolumen.maximo.toLocaleString("es-AR")} L
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

            <PrediccionVolumenChart data={data} soloPrediccion={soloPrediccion} />
          </>
        )}
      </div>
    </div>
  );
}
