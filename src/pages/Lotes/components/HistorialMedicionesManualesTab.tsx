import { useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { useHistorialMedicionManual } from "../../../hooks/useHistorialMedicionManual";
import { EstadoLectura } from "../../../types/historialMediciones.types";
import type { Lote } from "../../../types/lote.types";
import { PARAMETRO_LABEL, UNIDAD_POR_PARAMETRO } from "../../Sensores/constants/parametroSensor";

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

const HEADERS = ["FECHA Y HORA", "PARÁMETRO", "VALOR", "ESTADO"];

interface FiltrosDraft {
  fechaInicio: string;
  fechaFin: string;
}

const FILTROS_VACIOS: FiltrosDraft = { fechaInicio: "", fechaFin: "" };

interface HistorialMedicionesManualesTabProps {
  lote: Lote;
}

export function HistorialMedicionesManualesTab({ lote }: HistorialMedicionesManualesTabProps) {
  const [draft, setDraft] = useState<FiltrosDraft>(FILTROS_VACIOS);
  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltrosDraft>(FILTROS_VACIOS);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { items, meta, page, setPage, isLoading, error, refetch } = useHistorialMedicionManual(
    lote.id,
    {
      fechaInicio: filtrosAplicados.fechaInicio || undefined,
      fechaFin: filtrosAplicados.fechaFin || undefined,
    },
  );

  // El backend devuelve 400 si fechaFin < fechaInicio: se valida acá antes,
  // mismo criterio que HU-19.
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
      </div>

      {validationError && (
        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
          {validationError}
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
            No hay mediciones manuales para los filtros seleccionados
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Probá ajustar el rango de fechas, o registrá la primera medición de este lote.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
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
                      {new Date(item.createdAt).toLocaleString("es-AR")}
                    </td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                      {PARAMETRO_LABEL[item.parametro] ?? item.parametro}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {item.valor}
                      {UNIDAD_POR_PARAMETRO[item.parametro]
                        ? ` ${UNIDAD_POR_PARAMETRO[item.parametro]}`
                        : ""}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={ESTADO_VARIANT[item.estado]}>{ESTADO_LABEL[item.estado]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
