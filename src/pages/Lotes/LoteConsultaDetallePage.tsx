import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  FileWarning,
  GitBranch,
  HelpCircle,
  PackagePlus,
  type LucideIcon,
} from "lucide-react";
import { Layout } from "../../components/layout/Layout";
import { ClasificacionLoteBadge } from "../../components/ClasificacionLoteBadge";
import { ClasificacionLote } from "../../types/lote.types";
import { construirEventosLote, construirLotesConsultaMock } from "./constants/consultaLotes";

// HU-77 (mock visual): detalle de un lote + su trazabilidad en línea de
// tiempo, accedido desde ConsultaLotesPage. Ver el comentario de
// constants/consultaLotes.ts sobre el estado del mock.

const ICONO_POR_TITULO: Record<string, LucideIcon> = {
  "Recepción de leche cruda": PackagePlus,
  "Muestreo inicial": ClipboardCheck,
  "Clasificación automática": ClipboardCheck,
  "Alerta generada": AlertTriangle,
  "Revisión del responsable": CheckCircle2,
  "Destino asignado": GitBranch,
};

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{valor}</p>
    </div>
  );
}

export default function LoteConsultaDetallePage() {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const lotes = useMemo(() => construirLotesConsultaMock(), []);
  const lote = lotes.find((l) => l.codigo === codigo) ?? null;
  const eventos = useMemo(() => (lote ? construirEventosLote(lote) : []), [lote]);

  return (
    <Layout breadcrumb={`Consola > Lotes > ${codigo ?? ""}`}>
      <button
        type="button"
        onClick={() => navigate("/lotes/consulta")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al listado
      </button>

      {!lote ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-base font-medium text-slate-700 dark:text-slate-300">
            No se encontró el lote "{codigo}"
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Puede que el código no exista en este entorno de prueba.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Datos identificatorios + parámetro crítico (izquierda) */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <h1 className="font-mono text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {lote.codigo}
              </h1>
              <ClasificacionLoteBadge resultado={lote.estado} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo label="Fecha de ingreso" valor={formatFecha(lote.fechaIngreso)} />
              <Campo label="Nº de remito" valor={lote.numeroRemito} />
              <Campo label="Proveedor" valor={lote.proveedor} />
              <Campo label="Tambo" valor={lote.tambo} />
              <Campo label="Destino asignado" valor={lote.destinoAsignado} />
            </div>

            {lote.estado === ClasificacionLote.NO_APTO && lote.parametroCritico && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
                <FileWarning className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                    {lote.parametroCritico.parametro} fuera del límite crítico
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Valor medido: {lote.parametroCritico.valorMedido} · Límite: {lote.parametroCritico.limite}{" "}
                    (regla de calidad vigente)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Trazabilidad (derecha) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Trazabilidad del lote
              </h2>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Orden cronológico · hora de Argentina (UTC−3)
              </span>
            </div>

            <ol className="flex flex-col gap-4">
              {eventos.map((evento, i) => {
                const Icon = ICONO_POR_TITULO[evento.titulo] ?? HelpCircle;
                return (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        <Icon className="h-4 w-4" />
                      </span>
                      {i < eventos.length - 1 && (
                        <span className="mt-1 w-px flex-1 bg-slate-200 dark:bg-slate-800" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-0.5 pb-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {evento.titulo}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {formatFecha(evento.fecha)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{evento.descripcion}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}
    </Layout>
  );
}
