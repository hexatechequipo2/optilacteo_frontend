import { FileSpreadsheet, FileText, Search } from "lucide-react";
import { Select } from "../../../components/ui/Select";
import { Input } from "../../../components/ui/Input";
import { NivelAlerta } from "../../../types/notificacion.types";
import { NIVEL_ALERTA_META } from "../constants/alertas.constants";

interface LoteOption {
  value: string;
  label: string;
}

// AC1: "todos" + nivel real, mismo criterio que el filtro de lote/estado de
// AlertasFiltros.tsx (HU-25).
export type NivelFiltro = "todos" | NivelAlerta;

const NIVEL_OPTIONS: { value: NivelFiltro; label: string }[] = [
  { value: "todos", label: "Todos los niveles" },
  { value: NivelAlerta.INFORMATIVA, label: NIVEL_ALERTA_META[NivelAlerta.INFORMATIVA].label },
  { value: NivelAlerta.ADVERTENCIA, label: NIVEL_ALERTA_META[NivelAlerta.ADVERTENCIA].label },
  { value: NivelAlerta.CRITICA, label: NIVEL_ALERTA_META[NivelAlerta.CRITICA].label },
];

interface HistorialAlertasFiltrosProps {
  loteId: string;
  onLoteIdChange: (value: string) => void;
  loteOptions: LoteOption[];
  nivel: NivelFiltro;
  onNivelChange: (value: NivelFiltro) => void;
  fechaDesde: string;
  onFechaDesdeChange: (value: string) => void;
  fechaHasta: string;
  onFechaHastaChange: (value: string) => void;
  onBuscar: () => void;
  onLimpiar: () => void;
  hayFiltrosAplicados: boolean;
  isExporting: boolean;
  onExportExcel: () => void;
  onExportPdf: () => void;
}

// AC1 (filtro por lote/nivel/período) + AC3 (export Excel/PDF). El filtrado
// server-side real llega con historialAlertasService (ver TODO(backend)
// ahí) — acá solo se junta el "draft" y se dispara la búsqueda/exportación
// cuando el usuario lo pide, para no re-consultar en cada tecla.
export function HistorialAlertasFiltros({
  loteId,
  onLoteIdChange,
  loteOptions,
  nivel,
  onNivelChange,
  fechaDesde,
  onFechaDesdeChange,
  fechaHasta,
  onFechaHastaChange,
  onBuscar,
  onLimpiar,
  hayFiltrosAplicados,
  isExporting,
  onExportExcel,
  onExportPdf,
}: HistorialAlertasFiltrosProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="w-full sm:w-48">
        <Select
          label="Lote"
          id="historial-alertas-filtro-lote"
          value={loteId}
          onChange={(e) => onLoteIdChange(e.target.value)}
          options={[{ value: "todos", label: "Todos los lotes" }, ...loteOptions]}
        />
      </div>

      <div className="w-full sm:w-44">
        <Select
          label="Nivel"
          id="historial-alertas-filtro-nivel"
          value={nivel}
          onChange={(e) => onNivelChange(e.target.value as NivelFiltro)}
          options={NIVEL_OPTIONS}
        />
      </div>

      <div className="w-full sm:w-40">
        <Input
          type="date"
          label="Desde"
          id="historial-alertas-filtro-desde"
          value={fechaDesde}
          onChange={(e) => onFechaDesdeChange(e.target.value)}
        />
      </div>

      <div className="w-full sm:w-40">
        <Input
          type="date"
          label="Hasta"
          id="historial-alertas-filtro-hasta"
          value={fechaHasta}
          onChange={(e) => onFechaHastaChange(e.target.value)}
        />
      </div>

      <button
        type="button"
        onClick={onBuscar}
        className="flex items-center gap-2 rounded-md bg-[#3d6fcf] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3460b5]"
      >
        <Search className="h-4 w-4" /> Buscar
      </button>

      {hayFiltrosAplicados && (
        <button
          type="button"
          onClick={onLimpiar}
          className="text-sm font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Limpiar filtros
        </button>
      )}

      {/* AC3: exportable en Excel y PDF, sobre el resultado filtrado (no
          solo la página visible — ver exportExcel/exportPdf en
          historialAlertas.service.ts). */}
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          disabled={isExporting}
          onClick={onExportExcel}
          className="flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <FileSpreadsheet className="h-4 w-4" /> {isExporting ? "Exportando..." : "Excel"}
        </button>
        <button
          type="button"
          disabled={isExporting}
          onClick={onExportPdf}
          className="flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <FileText className="h-4 w-4" /> {isExporting ? "Exportando..." : "PDF"}
        </button>
      </div>
    </div>
  );
}
