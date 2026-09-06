import { Select } from "../../../components/ui/Select";
import { Input } from "../../../components/ui/Input";
import { Toggle } from "../../../components/ui/Toggle";
import { ESTADO_ALERTA_META, PARAMETRO_LABEL, TIPO_DESVIO_LABEL } from "../constants/alertas.constants";
import { EstadoAlerta } from "../../../types/alertaCierre.types";
import { TipoDesvioAnomalia } from "../../../types/notificacion.types";
import { Parametro } from "../../../types/configParametro.types";

interface LoteOption {
  value: string;
  label: string;
}

// HU-27: "todas" | EstadoAlerta, mismo criterio que el filtro de lote
// ("todos" + opciones reales).
export type EstadoAlertaFiltro = "todas" | EstadoAlerta;

// HU-50 criterio 8: mismo criterio "todos" + opciones reales que el resto
// de los filtros de esta pantalla.
export type TipoDesvioFiltro = "todos" | TipoDesvioAnomalia;
export type ParametroFiltro = "todos" | Parametro;

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
  tipoDesvio: TipoDesvioFiltro;
  onTipoDesvioChange: (value: TipoDesvioFiltro) => void;
  parametro: ParametroFiltro;
  onParametroChange: (value: ParametroFiltro) => void;
}

// HU-50: se suma "Falso positivo" — antes solo alcanzable por alerta_umbral
// (Abierta/Cerrada), ahora también por alerta_anomalia.
const ESTADO_OPTIONS: { value: EstadoAlertaFiltro; label: string }[] = [
  { value: "todas", label: "Todos los estados" },
  { value: EstadoAlerta.ABIERTA, label: ESTADO_ALERTA_META[EstadoAlerta.ABIERTA].label },
  { value: EstadoAlerta.CERRADA, label: ESTADO_ALERTA_META[EstadoAlerta.CERRADA].label },
  { value: EstadoAlerta.FALSO_POSITIVO, label: ESTADO_ALERTA_META[EstadoAlerta.FALSO_POSITIVO].label },
];

// HU-50 criterio 8: solo hay tipoDesvio para alerta_anomalia — el resto de
// los tipos (umbral, sensor desconectado) quedan afuera al elegir un valor
// puntual acá, igual que ya pasa con el filtro de parámetro de abajo.
const TIPO_DESVIO_OPTIONS: { value: TipoDesvioFiltro; label: string }[] = [
  { value: "todos", label: "Todos los tipos de desvío" },
  ...Object.values(TipoDesvioAnomalia).map((tipo) => ({ value: tipo, label: TIPO_DESVIO_LABEL[tipo] })),
];

// HU-50 criterio 8: parámetro afectado — aplica a alerta_umbral y
// alerta_anomalia (alerta_sensor_desconectado no tiene parametro, queda
// afuera al elegir un valor puntual, igual que ya pasa con el filtro de lote).
const PARAMETRO_OPTIONS: { value: ParametroFiltro; label: string }[] = [
  { value: "todos", label: "Todos los parámetros" },
  ...Object.values(Parametro).map((parametro) => ({ value: parametro, label: PARAMETRO_LABEL[parametro] })),
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
  tipoDesvio,
  onTipoDesvioChange,
  parametro,
  onParametroChange,
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

      <div className="w-full sm:w-48">
        <Select
          label="Parámetro"
          id="alertas-filtro-parametro"
          value={parametro}
          onChange={(e) => onParametroChange(e.target.value as ParametroFiltro)}
          options={PARAMETRO_OPTIONS}
        />
      </div>

      <div className="w-full sm:w-48">
        <Select
          label="Tipo de desvío"
          id="alertas-filtro-tipo-desvio"
          value={tipoDesvio}
          onChange={(e) => onTipoDesvioChange(e.target.value as TipoDesvioFiltro)}
          options={TIPO_DESVIO_OPTIONS}
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
