import { useState } from "react";
import { Layout } from "../../components/layout/Layout";
import { Tabs } from "../../components/ui/Tabs";
import { useSensores } from "../../hooks/useSensores";
import { usePermisos } from "../../hooks/usePermisos";
import { useEmpresaActual } from "../../hooks/useEmpresaActual";
import type { SensorFilterQuery } from "../../types/sensor.types";
import { RegistroSensoresTab } from "./components/RegistroSensoresTab";
import { EstadoDiagnosticoTab } from "./components/EstadoDiagnosticoTab";
import { HistorialMedicionesTab } from "./components/HistorialMedicionesTab";
import { MonitoreoSemaforoTab } from "./components/MonitoreoSemaforoTab";

type TabSensores = "semaforo" | "estado" | "registro" | "historial";

// HU-40: pensada para Operario de línea (ver MonitoreoSemaforoTab).
const TAB_SEMAFORO: { value: TabSensores; label: string } = {
  value: "semaforo",
  label: "Monitoreo en línea",
};

const TABS_BASE: { value: TabSensores; label: string }[] = [
  { value: "estado", label: "Estado y diagnóstico" },
  { value: "registro", label: "Registro (alta / edición)" },
];

const TAB_HISTORIAL: { value: TabSensores; label: string } = {
  value: "historial",
  label: "Historial de mediciones",
};

export default function SensoresPage() {
  const [filtros, setFiltros] = useState<SensorFilterQuery>({});
  const {
    sensores,
    isLoading,
    error,
    refetch,
    createSensor,
    isCreating,
    updateSensor,
    isUpdating,
    desactivarSensor,
    activarSensor,
    isTogglingEstado,
  } = useSensores(filtros);
  const { puede } = usePermisos();
  const { empresa } = useEmpresaActual();

  // GET /dashboard/lote/:id/semaforo
  const puedeVerSemaforo = puede(["dashboard", "monitoreo_alertas"], "ver");

  // sensor.controller.ts: POST crear, PATCH /:id y /:id/activar editar,
  // DELETE (dar de baja) eliminar. PATCH /sensores/lote/:loteId/asociar
  // también es editar.
  const puedeCrearSensor = puede("sensores_iot", "crear");
  const puedeEditarSensor = puede("sensores_iot", "editar");
  const puedeDarDeBajaSensor = puede("sensores_iot", "eliminar");
  const puedeAsociar = puedeEditarSensor;

  // HU-40: quien opera en planta (ve el semáforo pero no da de alta
  // sensores) entra directo al semáforo; quien administra el inventario,
  // a Registro. El default se deriva en cada render para que se corrija
  // cuando llegan los permisos; una vez que el usuario elige una pestaña a
  // mano, esa elección manda.
  const [tabElegida, setTabElegida] = useState<TabSensores | null>(null);
  const tabActiva: TabSensores =
    tabElegida ?? (puedeVerSemaforo && !puedeCrearSensor ? "semaforo" : "registro");

  // GET /sensores/lecturas/historial-mediciones (HU-19)
  const puedeVerHistorial = puede(["monitoreo_alertas", "trazabilidad"], "ver");

  const tabs = [
    ...(puedeVerSemaforo ? [TAB_SEMAFORO] : []),
    ...TABS_BASE,
    ...(puedeVerHistorial ? [TAB_HISTORIAL] : []),
  ];

  return (
    <Layout breadcrumb="Consola > Sensores">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Sensores IoT
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {empresa?.name ?? "Tu empresa"} · {sensores.length} dispositivos registrados
        </p>
      </div>

      <div className="mb-6">
        <Tabs tabs={tabs} value={tabActiva} onChange={setTabElegida} />
      </div>

      {tabActiva === "semaforo" ? (
        puedeVerSemaforo ? <MonitoreoSemaforoTab /> : null
      ) : tabActiva === "estado" ? (
        <EstadoDiagnosticoTab />
      ) : tabActiva === "historial" ? (
        puedeVerHistorial ? <HistorialMedicionesTab /> : null
      ) : (
        <RegistroSensoresTab
          sensores={sensores}
          isLoading={isLoading}
          error={error}
          refetch={refetch}
          createSensor={createSensor}
          isCreating={isCreating}
          updateSensor={updateSensor}
          isUpdating={isUpdating}
          desactivarSensor={desactivarSensor}
          activarSensor={activarSensor}
          isTogglingEstado={isTogglingEstado}
          puedeCrear={puedeCrearSensor}
          puedeEditar={puedeEditarSensor}
          puedeDarDeBaja={puedeDarDeBajaSensor}
          puedeAsociar={puedeAsociar}
          filtros={filtros}
          onFiltrosChange={setFiltros}
        />
      )}
    </Layout>
  );
}
