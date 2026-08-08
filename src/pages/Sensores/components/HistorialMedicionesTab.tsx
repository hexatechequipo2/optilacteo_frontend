import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { ValorConUnidad } from "../../../components/ValorConUnidad";
import { useHistorialMediciones } from "../../../hooks/useHistorialMediciones";
import { EstadoLectura } from "../../../types/historialMediciones.types";

const ESTADO_LABEL: Record<EstadoLectura, string> = {
  [EstadoLectura.NORMAL]: "Normal",
  [EstadoLectura.FUERA_DE_RANGO]: "Fuera de rango",
  [EstadoLectura.SIN_UMBRAL_CONFIGURADO]: "Sin umbral configurado",
};

const ESTADO_VARIANT: Record<EstadoLectura, "success" | "danger" | "warning"> = {
  [EstadoLectura.NORMAL]: "success",
  [EstadoLectura.FUERA_DE_RANGO]: "danger",
  [EstadoLectura.SIN_UMBRAL_CONFIGURADO]: "warning",
};

const HEADERS = ["FECHA Y HORA", "LOTE", "SENSOR", "PARÁMETRO", "VALOR", "ESTADO"];

interface FiltrosDraft {
  fechaInicio: string;
  fechaFin: string;
  loteCodigo: string;
}

const FILTROS_VACIOS: FiltrosDraft = { fechaInicio: "", fechaFin: "", loteCodigo: "" };

export function HistorialMedicionesTab() {
  const [draft, setDraft] = useState<FiltrosDraft>(FILTROS_VACIOS);
  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltrosDraft>(FILTROS_VACIOS);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { items, meta, page, setPage, isLoading, error, refetch, isExporting, exportError, exportCsv } =
    useHistorialMediciones({
      fechaInicio: filtrosAplicados.fechaInicio || undefined,
      fechaFin: filtrosAplicados.fechaFin || undefined,
      loteCodigo: filtrosAplicados.loteCodigo.trim() || undefined,
    });

  // El backend devuelve 400 si fechaFin < fechaInicio: se valida acá antes
  // para evitar el roundtrip.
  const aplicarFiltros = () => {
    if (draft.fechaInicio && draft.fechaFin && draft.fechaFin < draft.fechaInicio) {
      setValidationError("La fecha hasta no puede ser anterior a la fecha desde.");
      return;
    }
    setValidationError(null);
    setFiltrosAplicados({ ...draft });
  };

  const limpiarFiltros = () => {
    setDraft(FILTROS_VACIOS);
    setFiltrosAplicados(FILTROS_VACIOS);
    setValidationError(null);
  };

  const hayFiltrosAplicados = Object.values(filtrosAplicados).some(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <Input
          label="Desde"
          type="date"
          value={draft.fechaInicio}
          onChange={(e) => setDraft((d) => ({ ...d, fechaInicio: e.target.value }))}
        />
        <Input
          label="Hasta"
          type="date"
          value={draft.fechaFin}
          onChange={(e) => setDraft((d) => ({ ...d, fechaFin: e.target.value }))}
        />
        <Input
          label="Código de lote"
          type="text"
          placeholder="LOTE-1-00001"
          value={draft.loteCodigo}
          onChange={(e) => setDraft((d) => ({ ...d, loteCodigo: e.target.value }))}
        />

        <Button type="button" className="!w-auto px-6" onClick={aplicarFiltros}>
          <Search className="mr-2 h-4 w-4" /> Buscar
        </Button>

        {hayFiltrosAplicados && (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="text-sm font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Limpiar filtros
          </button>
        )}

        <button
          type="button"
          disabled={isExporting}
          onClick={() => void exportCsv()}
          className="ml-auto flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Download className="h-4 w-4" /> {isExporting ? "Exportando..." : "Exportar CSV"}
        </button>
      </div>

      {validationError && (
        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
          {validationError}
        </div>
      )}

      {exportError && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
          {exportError}
        </div>
      )}

      {meta.rangoAmplio && (
        <div className="rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
          El rango de fechas seleccionado supera los 30 días: la consulta puede tardar más de lo
          habitual.
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="ml-4 rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30"
          >
            Reintentar
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando historial...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-base font-medium text-slate-700 dark:text-slate-300">
            No hay mediciones para los filtros seleccionados
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Probá ajustar el rango de fechas o el código de lote.
          </p>
        </div>
      ) : (
        <>
          {/* Tabla (md+) */}
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  {HEADERS.map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => (
                  <tr key={item.id} className="text-sm">
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {new Date(item.timestampLectura).toLocaleString("es-AR")}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs font-medium text-slate-900 dark:text-white">
                      {item.loteCodigo}
                    </td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{item.sensorNombre}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{item.parametro}</td>
                    <td className="px-5 py-3">
                      <ValorConUnidad valor={item.valor} unidad={item.unidad} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={ESTADO_VARIANT[item.estado]}>{ESTADO_LABEL[item.estado]}</Badge>
                        {item.origen === "manual" && <Badge variant="neutral">Manual</Badge>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards (mobile) */}
          <div className="flex flex-col gap-3 md:hidden">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-medium text-slate-900 dark:text-white">
                      {item.loteCodigo}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(item.timestampLectura).toLocaleString("es-AR")}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <Badge variant={ESTADO_VARIANT[item.estado]}>{ESTADO_LABEL[item.estado]}</Badge>
                    {item.origen === "manual" && <Badge variant="neutral">Manual</Badge>}
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div className="min-w-0">
                    <dt className="text-slate-400 dark:text-slate-500">Sensor</dt>
                    <dd className="truncate text-slate-600 dark:text-slate-400">{item.sensorNombre}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500">Parámetro</dt>
                    <dd className="text-slate-600 dark:text-slate-400">{item.parametro}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-slate-400 dark:text-slate-500">Valor</dt>
                    <dd className="text-slate-600 dark:text-slate-400">
                      <ValorConUnidad valor={item.valor} unidad={item.unidad} />
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="text-sm text-slate-600 dark:text-slate-300">
                {page} de {meta.lastPage} · {meta.total} mediciones
              </span>

              <button
                type="button"
                onClick={() => setPage(page + 1)}
                disabled={page >= meta.lastPage}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
