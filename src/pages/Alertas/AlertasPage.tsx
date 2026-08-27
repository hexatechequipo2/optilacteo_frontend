import { useMemo, useState } from "react";
import { Siren } from "lucide-react";
import { Layout } from "../../components/layout/Layout";
import { Tabs } from "../../components/ui/Tabs";
import { useAlertas } from "../../hooks/useAlertas";
import { useLotes } from "../../hooks/useLotes";
import { useEmpresaActual } from "../../hooks/useEmpresaActual";
import { useAuth } from "../../hooks/useAuth";
import { NivelAlerta, TipoNotificacion, esAlertaUmbral } from "../../types/notificacion.types";
import { EstadoAlerta } from "../../types/alertaCierre.types";
import { TABS_ALERTAS, TAB_A_NIVEL, type TabAlertas } from "./constants/alertas.constants";
import { ContadoresAlertas } from "./components/ContadoresAlertas";
import { AlertasFiltros, type EstadoAlertaFiltro } from "./components/AlertasFiltros";
import { AlertaCard } from "./components/AlertaCard";
import { AlertaDetallePanel } from "./components/AlertaDetallePanel";
import { AlertaSensorDesconectadoCard } from "./components/AlertaSensorDesconectadoCard";
import { AlertaSensorDesconectadoDetallePanel } from "./components/AlertaSensorDesconectadoDetallePanel";
import { ReglasActivasPanel } from "./components/ReglasActivasPanel";

// HU-27: mismo rol que ya filtra toda la ruta /alertas (App.tsx) — se repite
// acá como defensa en profundidad para el botón de cerrar, no porque haga
// falta hoy (nadie más entra a esta pantalla), sino por si el día de mañana
// se suma un rol de solo lectura (ej. Gerente) a la ruta.
const ROL_QUE_PUEDE_CERRAR = "Responsable de producción";

// HU-25 (Pantalla 1 "Monitoreo y Alertas", Figura 1 del doc de Sprint 3).
// La generación/clasificación de alertas es 100% server-side (backend,
// notificaciones.service.ts) — esta página solo consume GET /notificaciones
// + WS /notificaciones vía useAlertas.ts y arma la UI/filtros. AC4 (tiempo
// real sin recargar): useAlertas ya deja el array actualizado en vivo, así
// que cualquier filtro/contador acá es puramente derivado con useMemo.
export default function AlertasPage() {
  const { alertas, isLoading, error, isRealtimeConnected, marcarLeida, cerrarAlerta } = useAlertas();
  const { lotes } = useLotes();
  const { empresa } = useEmpresaActual();
  const { user } = useAuth();

  const [tab, setTab] = useState<TabAlertas>("todas");
  const [loteId, setLoteId] = useState("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [soloNoLeidas, setSoloNoLeidas] = useState(true);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoAlertaFiltro>("todas");
  // HU-27: id de la alerta seleccionada para el panel lateral (null =
  // cerrado). Se guarda el id, no el objeto, para que el panel siempre
  // refleje el estado más reciente de `alertas` (ej. si se marca leída desde
  // otro lado mientras el panel está abierto).
  const [alertaSeleccionadaId, setAlertaSeleccionadaId] = useState<number | null>(null);

  // GET /lotes (useLotes, mismo hook que la pantalla de Lotes) trae TODOS
  // los lotes de la empresa — Responsable de producción tiene canRead en
  // recepcion/trazabilidad, así que el filtro deja elegir cualquier lote,
  // no solo los que ya tuvieron una alerta.
  const loteOptions = useMemo(
    () =>
      lotes
        .map((lote) => ({ value: String(lote.id), label: lote.codigo }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [lotes],
  );

  // Filtros por lote/fecha/leída, compartidos entre los contadores y el
  // listado (a propósito no incluyen el filtro de nivel de la tab: así los
  // 3 contadores siguen siendo comparables entre sí sin importar qué tab
  // esté activa).
  const alertasFiltradas = useMemo(() => {
    return alertas.filter((alerta) => {
      // HU-31: alerta_sensor_desconectado no tiene loteId (no está atada a
      // ningún lote) — filtrar por un lote puntual la deja afuera, pero
      // sigue visible con "Todos los lotes" (default del selector).
      if (loteId !== "todos") {
        if (!esAlertaUmbral(alerta) || String(alerta.data.loteId) !== loteId) return false;
      }
      // cerrarAlerta() también marca la alerta como leída (HU-27), así que
      // "Solo no leídas" + estado "Cerradas" siempre daría vacío si se
      // aplicaran los dos filtros a la vez. El toggle de leída solo tiene
      // sentido para alertas abiertas.
      if (soloNoLeidas && alerta.leida && estadoFiltro !== EstadoAlerta.CERRADA) return false;
      if (estadoFiltro !== "todas" && alerta.estado !== estadoFiltro) return false;

      const fecha = new Date(alerta.createdAt);
      if (fechaDesde && fecha < new Date(fechaDesde)) return false;
      if (fechaHasta) {
        const limite = new Date(fechaHasta);
        limite.setHours(23, 59, 59, 999);
        if (fecha > limite) return false;
      }
      return true;
    });
  }, [alertas, loteId, soloNoLeidas, estadoFiltro, fechaDesde, fechaHasta]);

  // HU-27: se deriva de `alertas` (no un objeto guardado en el click) para
  // que el panel siempre muestre el estado más reciente de la alerta.
  const alertaSeleccionada = useMemo(
    () => alertas.find((a) => a.id === alertaSeleccionadaId) ?? null,
    [alertas, alertaSeleccionadaId],
  );
  // HU-31: angostado por tipo para cada panel — ver comentario donde se
  // renderizan más abajo.
  const alertaSeleccionadaUmbral =
    alertaSeleccionada && esAlertaUmbral(alertaSeleccionada) ? alertaSeleccionada : null;
  const alertaSeleccionadaSensor =
    alertaSeleccionada && !esAlertaUmbral(alertaSeleccionada) ? alertaSeleccionada : null;

  const contadores = useMemo(
    () => ({
      criticas: alertasFiltradas.filter((a) => a.nivelAlerta === NivelAlerta.CRITICA).length,
      advertencias: alertasFiltradas.filter((a) => a.nivelAlerta === NivelAlerta.ADVERTENCIA).length,
      informativas: alertasFiltradas.filter((a) => a.nivelAlerta === NivelAlerta.INFORMATIVA).length,
    }),
    [alertasFiltradas],
  );

  const nivelDeTab = TAB_A_NIVEL[tab];
  const listado = useMemo(
    () => (nivelDeTab ? alertasFiltradas.filter((a) => a.nivelAlerta === nivelDeTab) : alertasFiltradas),
    [alertasFiltradas, nivelDeTab],
  );

  return (
    <Layout breadcrumb="Consola > Alertas">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Siren className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Monitoreo y Alertas
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {empresa?.name ?? "OptiLácteo"} · alertas automáticas por desvíos de calidad
          </p>
        </div>

        {isRealtimeConnected ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> EN VIVO
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" /> Sin conexión al WS
            de notificaciones
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="mb-6">
        <Tabs tabs={TABS_ALERTAS} value={tab} onChange={setTab} />
      </div>

      {/* AC2 + AC3: contadores destacados por nivel. */}
      <ContadoresAlertas
        criticas={contadores.criticas}
        advertencias={contadores.advertencias}
        informativas={contadores.informativas}
      />

      <AlertasFiltros
        loteId={loteId}
        onLoteIdChange={setLoteId}
        loteOptions={loteOptions}
        fechaDesde={fechaDesde}
        onFechaDesdeChange={setFechaDesde}
        fechaHasta={fechaHasta}
        onFechaHastaChange={setFechaHasta}
        soloNoLeidas={soloNoLeidas}
        onSoloNoLeidasChange={setSoloNoLeidas}
        estado={estadoFiltro}
        onEstadoChange={setEstadoFiltro}
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {isLoading ? (
            <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">Cargando alertas...</p>
            </div>
          ) : listado.length === 0 ? (
            <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No hay alertas {soloNoLeidas ? "no leídas" : ""} para los filtros seleccionados.
              </p>
            </div>
          ) : (
            listado.map((alerta) =>
              alerta.tipo === TipoNotificacion.ALERTA_UMBRAL ? (
                <AlertaCard
                  key={alerta.id}
                  alerta={alerta}
                  onMarcarLeida={marcarLeida}
                  onSeleccionar={(a) => setAlertaSeleccionadaId(a.id)}
                />
              ) : (
                <AlertaSensorDesconectadoCard
                  key={alerta.id}
                  alerta={alerta}
                  onMarcarLeida={marcarLeida}
                  onSeleccionar={(a) => setAlertaSeleccionadaId(a.id)}
                />
              ),
            )
          )}
        </div>

        {/* HU-31: solo el subconjunto alerta_umbral — las reglas acá son
            umbralMin/umbralMax por parámetro+materia prima, que no aplica a
            alerta_sensor_desconectado. */}
        <ReglasActivasPanel alertas={alertas.filter(esAlertaUmbral)} />
      </div>

      {/* HU-31: dos paneles en vez de uno ramificado adentro — cada uno ya
          sabe devolver null si su `alerta` no corresponde (mismo patrón que
          ya tenían con `alerta: AlertaConCierre | null`). Evita narrowing
          frágil de TS sobre una condición compuesta en un ternario. */}
      <AlertaSensorDesconectadoDetallePanel
        alerta={alertaSeleccionadaSensor}
        onClose={() => setAlertaSeleccionadaId(null)}
      />
      <AlertaDetallePanel
        alerta={alertaSeleccionadaUmbral}
        onClose={() => setAlertaSeleccionadaId(null)}
        onCerrar={cerrarAlerta}
        puedeCerrar={user?.rolNombre === ROL_QUE_PUEDE_CERRAR}
      />
    </Layout>
  );
}
