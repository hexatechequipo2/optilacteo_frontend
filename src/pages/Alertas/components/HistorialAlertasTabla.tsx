import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import type { HistorialAlertaItem } from "../../../types/historialAlertas.types";
import { NIVEL_ALERTA_META, ESTADO_ALERTA_META, PARAMETRO_LABEL } from "../constants/alertas.constants";

const HEADERS = ["FECHA", "LOTE", "PARÁMETRO", "NIVEL", "ESTADO", "ACCIÓN CORRECTIVA"];

interface HistorialAlertasTablaProps {
  items: HistorialAlertaItem[];
  isLoading: boolean;
  page: number;
  lastPage: number;
  total: number;
  onPageChange: (page: number) => void;
}

// AC2: fecha, lote, parámetro, nivel, estado y acción correctiva (si
// aplica) por fila. Paginado client-side sobre la página que ya devolvió el
// service (20 por página, ver PAGE_SIZE en useHistorialAlertas) — no hay
// re-filtrado acá, solo navegación entre páginas ya resueltas.
export function HistorialAlertasTabla({
  items,
  isLoading,
  page,
  lastPage,
  total,
  onPageChange,
}: HistorialAlertasTablaProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando historial...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-base font-medium text-slate-700 dark:text-slate-300">
          No hay alertas para los filtros seleccionados
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Probá ajustar el lote, el nivel o el rango de fechas.
        </p>
      </div>
    );
  }

  return (
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
                  {new Date(item.createdAt).toLocaleString("es-AR")}
                </td>
                <td className="px-5 py-3 font-mono text-xs font-medium text-slate-900 dark:text-white">
                  {item.data.loteCodigo}
                </td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                  {PARAMETRO_LABEL[item.data.parametro]}
                </td>
                <td className="px-5 py-3">
                  <Badge variant={NIVEL_ALERTA_META[item.nivelAlerta].badgeVariant}>
                    {NIVEL_ALERTA_META[item.nivelAlerta].label}
                  </Badge>
                </td>
                <td className="px-5 py-3">
                  <Badge variant={ESTADO_ALERTA_META[item.estado].badgeVariant}>
                    {ESTADO_ALERTA_META[item.estado].label}
                  </Badge>
                </td>
                <td className="max-w-xs px-5 py-3 text-slate-600 dark:text-slate-400">
                  {item.accionCorrectiva ?? <span className="text-slate-300 dark:text-slate-600">—</span>}
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
                  {item.data.loteCodigo}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(item.createdAt).toLocaleString("es-AR")}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <Badge variant={NIVEL_ALERTA_META[item.nivelAlerta].badgeVariant}>
                  {NIVEL_ALERTA_META[item.nivelAlerta].label}
                </Badge>
                <Badge variant={ESTADO_ALERTA_META[item.estado].badgeVariant}>
                  {ESTADO_ALERTA_META[item.estado].label}
                </Badge>
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-x-3 gap-y-2 text-xs">
              <div>
                <dt className="text-slate-400 dark:text-slate-500">Parámetro</dt>
                <dd className="text-slate-600 dark:text-slate-400">
                  {PARAMETRO_LABEL[item.data.parametro]}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400 dark:text-slate-500">Acción correctiva</dt>
                <dd className="text-slate-600 dark:text-slate-400">{item.accionCorrectiva ?? "—"}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="text-sm text-slate-600 dark:text-slate-300">
            {page} de {lastPage} · {total} alertas
          </span>

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= lastPage}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}
