import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileWarning,
  RotateCcw,
  WifiOff,
} from "lucide-react";
import { Layout } from "../../components/layout/Layout";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import {
  LOTES_DESTINO_SUGERIDO_MOCK,
  construirSugerencia,
  siguienteEstadoDemo,
  type EstadoSugerenciaDestino,
} from "./constants/destinoSugerido";

// HU-78: mock frontend-only, sin conexión al back ni al ml-service. El
// botón "Recalcular" recorre los 5 resultados posibles que describe la HU
// (éxito con coincidencia exacta, éxito con estrategia alternativa, falta
// de datos, sin histórico suficiente y error del servicio) para poder
// probar cada rama manualmente. Debajo del resultado va la grilla de
// referencia de los 4 estados en los que no se genera sugerencia, tal como
// la muestra el prototipo (Figura 3).
const DURACION_RECALCULO_MS = 1400;

function formatearFechaHora(fecha: Date): string {
  const formateada = fecha.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return `${formateada} (UTC-3)`;
}

export default function DestinoSugeridoPage() {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const loteActual =
    LOTES_DESTINO_SUGERIDO_MOCK.find((l) => l.codigo === codigo) ??
    LOTES_DESTINO_SUGERIDO_MOCK[0];

  const [estado, setEstado] = useState<EstadoSugerenciaDestino>(loteActual.estadoInicial);
  const [calculadoEn, setCalculadoEn] = useState(() => new Date());
  const [calculando, setCalculando] = useState(false);
  const [destinoAceptado, setDestinoAceptado] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  // Al cambiar de lote (selector de arriba) había que ver el resultado de
  // ESE lote, no arrastrar el estado — "Destino aceptado" y la hora de
  // cálculo del lote anterior quedaban pisando al nuevo.
  useEffect(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setEstado(loteActual.estadoInicial);
    setCalculadoEn(new Date());
    setCalculando(false);
    setDestinoAceptado(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loteActual.codigo]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleRecalcular = () => {
    setDestinoAceptado(false);
    setCalculando(true);
    timeoutRef.current = window.setTimeout(() => {
      setEstado((prev) => siguienteEstadoDemo(prev));
      setCalculadoEn(new Date());
      setCalculando(false);
    }, DURACION_RECALCULO_MS);
  };

  const sugerencia = construirSugerencia(estado, calculadoEn);
  const esExito = estado === "exito_exacta" || estado === "exito_alternativa";

  return (
    <Layout breadcrumb={`Consola > Lotes > ${loteActual.codigo} > Destino sugerido`}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Sugerencia de destino productivo
          </h1>
        </div>
        <div className="w-full sm:w-64">
          <Select
            id="lote-destino-sugerido"
            label="Lote"
            value={loteActual.codigo}
            onChange={(e) => navigate(`/lotes/${e.target.value}/destino-sugerido`)}
            options={LOTES_DESTINO_SUGERIDO_MOCK.map((l) => ({
              value: l.codigo,
              label: `${l.codigo} — ${l.proveedorNombre}`,
            }))}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {calculando ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 animate-pulse text-blue-600 dark:text-blue-400" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Evaluando con datos actuales...
              </h2>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-500" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tiempo máximo de espera definido; al vencer, se informa el motivo.
            </p>
          </div>
        ) : estado === "falta_datos" ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <FileWarning className="h-5 w-5" />
              <h2 className="text-sm font-semibold uppercase tracking-wide">Falta de datos</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              El lote no tiene los parámetros mínimos requeridos por el modelo. Completalos y
              volvé a calcular.
            </p>
            <button
              type="button"
              onClick={handleRecalcular}
              className="mt-1 flex w-fit items-center gap-1.5 self-start rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Recalcular
            </button>
          </div>
        ) : estado === "sin_historico" ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              <h2 className="text-sm font-semibold uppercase tracking-wide">
                Sin histórico suficiente
              </h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Ni el mismo proveedor ni proveedores similares superan el mínimo de comparación.
            </p>
            <button
              type="button"
              onClick={handleRecalcular}
              className="mt-1 flex w-fit items-center gap-1.5 self-start rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Recalcular
            </button>
          </div>
        ) : estado === "error_servicio" ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <WifiOff className="h-5 w-5" />
              <h2 className="text-sm font-semibold uppercase tracking-wide">
                Error del servicio
              </h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              El servicio de IA no respondió. No se muestra el resultado anterior como si fuera
              nuevo.
            </p>
            <button
              type="button"
              onClick={handleRecalcular}
              className="mt-1 self-start rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Sugerencia de destino productivo
                  </h2>
                  <Badge variant="success">Calculada ahora</Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-baseline gap-3">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {sugerencia.destinoNombre}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Confianza {sugerencia.confianza}%
                  </span>
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-48">
                <Button type="button" onClick={handleRecalcular} className="gap-2">
                  <RotateCcw className="h-4 w-4" /> Recalcular
                </Button>
                <button
                  type="button"
                  onClick={() => setDestinoAceptado(true)}
                  disabled={destinoAceptado}
                  className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {destinoAceptado ? "Destino aceptado" : "Aceptar destino"}
                </button>
              </div>
            </div>

            {destinoAceptado && (
              <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" /> Destino asignado: {sugerencia.destinoNombre}
              </p>
            )}

            <div className="mt-4 rounded-md bg-blue-50 p-4 dark:bg-blue-500/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">
                Base de comparación
              </p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                {sugerencia.baseComparacion}
              </p>
            </div>

            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              Calculado {sugerencia.calculadoEn && formatearFechaHora(sugerencia.calculadoEn)} ·
              modelo {sugerencia.versionModelo}
            </p>
          </>
        )}
      </div>

      <div className="mt-8">
        <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Estados en los que no se genera sugerencia
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              Falta de datos
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
              El lote no tiene los datos mínimos
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Faltan parámetros requeridos por el modelo. Completalos y volvé a calcular.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              Sin histórico suficiente
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
              No hay lotes comparables válidos
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Ni el mismo proveedor ni proveedores similares superan el mínimo de comparación.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
              Error del servicio
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
              No pudimos calcular la sugerencia
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              El servicio de IA no respondió. No se muestra el resultado anterior como si fuera
              nuevo.
            </p>
            <button
              type="button"
              onClick={handleRecalcular}
              className="mt-2 rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Reintentar
            </button>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              Recalculando
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
              Evaluando con datos actuales...
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full w-2/3 rounded-full bg-blue-500" />
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Tiempo máximo de espera definido; al vencer, se informa el motivo.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
