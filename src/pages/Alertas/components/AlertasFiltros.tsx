import { Select } from "../../../components/ui/Select";
import { Input } from "../../../components/ui/Input";
import { Toggle } from "../../../components/ui/Toggle";
import { ESTADO_ALERTA_META } from "../constants/alertas.constants";
import { EstadoAlerta } from "../../../types/alertaCierre.types";

interface LoteOption {
  value: string;
  label: string;
}

// HU-27: "todas" | EstadoAlerta, mismo criterio que el filtro de lote
// ("todos" + opciones reales).
export type EstadoAlertaFiltro = "todas" | EstadoAlerta;

interface AlertasFiltrosProps {
  loteId: string;
  onLoteIdChange: (value: string) => void;
  loteOptions: LoteOption[];
  fechaDesde: string;
  onFechaDesdeChange: (value: string) => void;
  fechaHasta: string;
  onFechaHastaChange: (value: string) => void;
  soloNoLeidas: boolean;
  onSoloNoLeidasChange: (value: boolean) => void;
  estado: EstadoAlertaFiltro;
  onEstadoChange: (value: EstadoAlertaFiltro) => void;
}

const ESTADO_OPTIONS: { value: EstadoAlertaFiltro; label: string }[] = [
  { value: "todas", label: "Todos los estados" },
  { value: EstadoAlerta.ABIERTA, label: ESTADO_ALERTA_META[EstadoAlerta.ABIERTA].label },
  { value: EstadoAlerta.CERRADA, label: ESTADO_ALERTA_META[EstadoAlerta.CERRADA].label },
];

// AC de filtros del prototipo: por lote, por rango de fechas, y un toggle
// para alternar entre alertas leídas/no leídas.
// El backend no tiene filtro server-side por lote/fecha en GET
// /notificaciones (solo page/limit), así que el filtrado es 100% client-side
// en AlertasPage. loteOptions viene de GET /lotes (useLotes) — todos los
// lotes de la empresa, no solo los que ya tuvieron una alerta.
export function AlertasFiltros({
  loteId,
  onLoteIdChange,
  loteOptions,
  fechaDesde,
  onFechaDesdeChange,
  fechaHasta,
  onFechaHastaChange,
  soloNoLeidas,
  onSoloNoLeidasChange,
  estado,
  onEstadoChange,
}: AlertasFiltrosProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="w-full sm:w-48">
        <Select
          label="Lote"
          id="alertas-filtro-lote"
          value={loteId}
          onChange={(e) => onLoteIdChange(e.target.value)}
          options={[{ value: "todos", label: "Todos los lotes" }, ...loteOptions]}
        />
      </div>

      <div className="w-full sm:w-40">
        <Input
          type="date"
          label="Desde"
          id="alertas-filtro-desde"
          value={fechaDesde}
          onChange={(e) => onFechaDesdeChange(e.target.value)}
        />
      </div>

      <div className="w-full sm:w-40">
        <Input
          type="date"
          label="Hasta"
          id="alertas-filtro-hasta"
          value={fechaHasta}
          onChange={(e) => onFechaHastaChange(e.target.value)}
        />
      </div>

      <div className="w-full sm:w-44">
        <Select
          label="Estado"
          id="alertas-filtro-estado"
          value={estado}
          onChange={(e) => onEstadoChange(e.target.value as EstadoAlertaFiltro)}
          options={ESTADO_OPTIONS}
        />
      </div>

      <div className="ml-auto">
        <Toggle
          id="alertas-filtro-no-leidas"
          checked={soloNoLeidas}
          onChange={onSoloNoLeidasChange}
          label={soloNoLeidas ? "Viendo: No leídas" : "Viendo: Todas"}
        />
      </div>
    </div>
  );
}
