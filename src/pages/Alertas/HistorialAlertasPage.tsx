import { useMemo, useState } from "react";
import { History } from "lucide-react";
import { Layout } from "../../components/layout/Layout";
import { useHistorialAlertas } from "../../hooks/useHistorialAlertas";
import { useLotes } from "../../hooks/useLotes";
import { useEmpresaActual } from "../../hooks/useEmpresaActual";
import {
  HistorialAlertasFiltros,
  type NivelFiltro,
  type EstadoFiltro,
} from "./components/HistorialAlertasFiltros";
import { HistorialAlertasTabla } from "./components/HistorialAlertasTabla";

interface FiltrosDraft {
  loteId: string;
  nivelAlerta: NivelFiltro;
  estado: EstadoFiltro;
  fechaDesde: string;
  fechaHasta: string;
}

const FILTROS_VACIOS: FiltrosDraft = {
  loteId: "todos",
  nivelAlerta: "todos",
  estado: "todos",
  fechaDesde: "",
  fechaHasta: "",
};

// HU-28 ("Historial de alertas por lote y período"), exclusiva de
// Responsable de calidad — a diferencia de HU-25 (Monitoreo y Alertas, bandeja
// de trabajo en vivo de Responsable de producción), esta pantalla es de
// consulta/análisis retrospectivo para preparar informes regulatorios (AC3:
// export CSV/PDF). Conectada a GET /notificaciones/historial (+
// /historial/exportar/csv|pdf) — ver historialAlertas.service.ts.
export default function HistorialAlertasPage() {
  const { empresa } = useEmpresaActual();
  const { lotes } = useLotes();

  const [draft, setDraft] = useState<FiltrosDraft>(FILTROS_VACIOS);
  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltrosDraft>(FILTROS_VACIOS);
  const [validationError, setValidationError] = useState<string | null>(null);

  const loteOptions = useMemo(
    () =>
      lotes
        .map((lote) => ({ value: String(lote.id), label: lote.codigo }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [lotes],
  );

  const { items, meta, page, setPage, isLoading, error, isExporting, exportError, exportCsv, exportPdf } =
    useHistorialAlertas({
      loteId: filtrosAplicados.loteId !== "todos" ? Number(filtrosAplicados.loteId) : undefined,
      nivelAlerta: filtrosAplicados.nivelAlerta !== "todos" ? filtrosAplicados.nivelAlerta : undefined,
      estado: filtrosAplicados.estado !== "todos" ? filtrosAplicados.estado : undefined,
      fechaInicio: filtrosAplicados.fechaDesde || undefined,
      fechaFin: filtrosAplicados.fechaHasta || undefined,
    });

  const aplicarFiltros = () => {
    if (draft.fechaDesde && draft.fechaHasta && draft.fechaHasta < draft.fechaDesde) {
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

  const hayFiltrosAplicados =
    filtrosAplicados.loteId !== "todos" ||
    filtrosAplicados.nivelAlerta !== "todos" ||
    filtrosAplicados.estado !== "todos" ||
    !!filtrosAplicados.fechaDesde ||
    !!filtrosAplicados.fechaHasta;

  return (
    <Layout breadcrumb="Consola > Alertas > Historial">
      <div className="mb-6 flex items-center gap-2">
        <History className="h-5 w-5 text-slate-400 dark:text-slate-500" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Historial de alertas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {empresa?.name ?? "OptiLácteo"} · alertas por desvío de calidad, filtrables por lote, nivel y
            período
          </p>
        </div>
      </div>

      <HistorialAlertasFiltros
        loteId={draft.loteId}
        onLoteIdChange={(value) => setDraft((d) => ({ ...d, loteId: value }))}
        loteOptions={loteOptions}
        nivelAlerta={draft.nivelAlerta}
        onNivelAlertaChange={(value) => setDraft((d) => ({ ...d, nivelAlerta: value }))}
        estado={draft.estado}
        onEstadoChange={(value) => setDraft((d) => ({ ...d, estado: value }))}
        fechaDesde={draft.fechaDesde}
        onFechaDesdeChange={(value) => setDraft((d) => ({ ...d, fechaDesde: value }))}
        fechaHasta={draft.fechaHasta}
        onFechaHastaChange={(value) => setDraft((d) => ({ ...d, fechaHasta: value }))}
        onBuscar={aplicarFiltros}
        onLimpiar={limpiarFiltros}
        hayFiltrosAplicados={hayFiltrosAplicados}
        isExporting={isExporting}
        onExportCsv={() => void exportCsv()}
        onExportPdf={() => void exportPdf()}
      />

      {validationError && (
        <div className="mb-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
          {validationError}
        </div>
      )}

      {exportError && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
          {exportError}
        </div>
      )}

      {error ? (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
          {error}
        </div>
      ) : (
        <HistorialAlertasTabla
          items={items}
          isLoading={isLoading}
          page={page}
          lastPage={meta.lastPage}
          total={meta.total}
          onPageChange={setPage}
        />
      )}
    </Layout>
  );
}
