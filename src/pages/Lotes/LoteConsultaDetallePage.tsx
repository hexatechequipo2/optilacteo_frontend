import { useMemo, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Layout } from "../../components/layout/Layout";
import { useTrazabilidadProduccion } from "../../hooks/useTrazabilidadProduccion";
import type { ReferenciaNombre } from "../../types/consultaLotesProduccion.types";
import { EstadoProduccionBadge } from "./components/EstadoProduccionBadge";
import { FORMATO_FECHA_HORA_AR } from "./constants/estadoProduccion";
import { metaTipoEvento } from "./constants/tipoEventoTrazabilidad";

// HU-77 (criterio 7): detalle y trazabilidad de un lote de PRODUCCIÓN,
// contra GET /lotes/producciones/:id/trazabilidad. La cabecera es el mismo
// resumen de la consulta (con las listas completas) y la línea de tiempo
// junta los eventos de HU-32 de todos sus lotes de origen. Nada de
// Apto/No Apto acá: eso es de cada lote de ingreso (HU-76).

// Solo enteros positivos: cualquier otra cosa en la URL es "no encontrado"
// sin llamar al back (ParseIntPipe respondería 400).
function aIdLote(param: string | undefined): number | null {
  if (!param || !/^\d+$/.test(param)) return null;
  const id = Number(param);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// TODO(backend): las fechas pueden llegar +3h corridas (columnas `timestamp`
// sin zona + TZ AR en el proceso). Se muestran tal cual, en hora AR.
const formatFecha = (iso: string) => FORMATO_FECHA_HORA_AR.format(new Date(iso));

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{titulo}</p>
      {children}
    </div>
  );
}

// Listas completas (acá no va "+N" como en la grilla).
function ListaCompleta({ items, etiqueta }: { items: { id: number; texto: string }[]; etiqueta: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-400 dark:text-slate-500">—</p>;
  }
  return (
    <ul aria-label={etiqueta} className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <li
          key={i.id}
          className="rounded-md bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-200"
        >
          {i.texto}
        </li>
      ))}
    </ul>
  );
}

const aItems = (refs: ReferenciaNombre[]) => refs.map((r) => ({ id: r.id, texto: r.nombre }));

function Aviso({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
      <p className="text-base font-medium text-slate-700 dark:text-slate-300">{titulo}</p>
      {children}
    </div>
  );
}

export default function LoteConsultaDetallePage() {
  const { id: idParam } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const id = aIdLote(idParam);
  const { trazabilidad, isLoading, error, noEncontrado, refetch } = useTrazabilidadProduccion(id);
  const lote = trazabilidad?.loteProduccion ?? null;

  // El back ya los manda ASC; se reordena igual (copia, orden estable) para
  // no depender de eso al juntar eventos de varios lotes de origen.
  const eventos = useMemo(
    () =>
      [...(trazabilidad?.eventos ?? [])].sort(
        (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
      ),
    [trazabilidad],
  );

  return (
    <Layout breadcrumb={`Consola > Consulta de lotes > ${lote?.codigo ?? "Detalle"}`}>
      <button
        type="button"
        onClick={() => navigate("/lotes/consulta")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al listado
      </button>

      {noEncontrado ? (
        <Aviso titulo="No se encontró el lote">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Puede que no exista o que no pertenezca a tu empresa.
          </p>
        </Aviso>
      ) : error ? (
        <div
          role="alert"
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 py-12 text-center dark:border-red-500/30 dark:bg-red-500/10"
        >
          <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/20"
          >
            Reintentar
          </button>
        </div>
      ) : isLoading || !lote ? (
        <div
          aria-busy="true"
          className="rounded-xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
        >
          Cargando lote…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Cabecera del lote de producción (izquierda) */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <h1 className="font-mono text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {lote.codigo}
              </h1>
              <EstadoProduccionBadge lote={lote} />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{lote.estadoDescripcion}</p>

            <div className="grid grid-cols-1 gap-3">
              <Seccion titulo="Fecha">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatFecha(lote.fecha)}</p>
              </Seccion>
              <Seccion titulo="Proveedores">
                <ListaCompleta etiqueta="Proveedores" items={aItems(lote.proveedores)} />
              </Seccion>
              <Seccion titulo="Tambos">
                <ListaCompleta etiqueta="Tambos" items={aItems(lote.tambos)} />
              </Seccion>
              <Seccion titulo={`Lotes de origen (${lote.lotesOrigen.length})`}>
                <ListaCompleta
                  etiqueta="Lotes de origen"
                  items={lote.lotesOrigen.map((l) => ({ id: l.id, texto: l.codigo }))}
                />
              </Seccion>
            </div>
          </div>

          {/* Trazabilidad (derecha) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-3">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Trazabilidad del lote
              </h2>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Orden cronológico · hora de Argentina
              </span>
            </div>

            {eventos.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Este lote todavía no tiene eventos de trazabilidad.
              </p>
            ) : (
              <ol aria-label="Eventos de trazabilidad" className="flex flex-col gap-4">
                {eventos.map((evento, i) => {
                  const { label, icon: Icon } = metaTipoEvento(evento.tipo);
                  return (
                    <li key={`${evento.loteOrigenId}-${evento.tipo}-${evento.fecha}-${i}`} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          aria-hidden="true"
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        {i < eventos.length - 1 && (
                          <span className="mt-1 w-px flex-1 bg-slate-200 dark:bg-slate-800" />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-0.5 pb-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">{label}</span>
                          <time dateTime={evento.fecha} className="text-xs text-slate-400 dark:text-slate-500">
                            {formatFecha(evento.fecha)}
                          </time>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{evento.descripcion}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          Lote de origen:{" "}
                          <span className="font-mono font-medium text-slate-600 dark:text-slate-300">
                            {evento.loteOrigenCodigo}
                          </span>
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
