import { useMemo, useState } from "react";
import { Layout } from "../../components/layout/Layout";
import { Tabs } from "../../components/ui/Tabs";
import { useSensores } from "../../hooks/useSensores";
import { useAuth } from "../../hooks/useAuth";
import { useEmpresaActual } from "../../hooks/useEmpresaActual";
import type { SensorFilterQuery } from "../../types/sensor.types";
import { RegistroSensoresTab } from "./components/RegistroSensoresTab";
import { EstadoDiagnosticoTab } from "./components/EstadoDiagnosticoTab";
import { HistorialMedicionesTab } from "./components/HistorialMedicionesTab";
import { MonitoreoSemaforoTab } from "./components/MonitoreoSemaforoTab";

type TabSensores = "semaforo" | "estado" | "registro" | "historial";

// HU-40 (Sprint 5, mock visual): pensada para Operario de línea — ver
// MonitoreoSemaforoTab para el detalle de por qué esta pestaña todavía no
// tiene datos reales.
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
  const { user } = useAuth();
  const { empresa } = useEmpresaActual();
  const esOperarioDeLinea = (user?.rolNombre ?? "").trim().toLowerCase() === "operario de línea";
  // HU-40: el Operario de línea entra directo al semáforo (es la vista que
  // le pide el backlog); el resto de los roles mantiene el default previo
  // para no cambiarles el flujo con el que ya venían trabajando.
  const [tabActiva, setTabActiva] = useState<TabSensores>(
    esOperarioDeLinea ? "semaforo" : "registro",
  );

  // POST/PATCH/DELETE /sensores (backend): exclusivo Responsable de
  // producción y Responsable de calidad (ver @Roles en sensor.controller.ts).
  // Gerente NO gestiona sensores pese a que HU-65 amplió su GET a todo el
  // inventario (@Roles del GET incluye Gerente, líneas 47-48 del controller)
  // — esa lectura no se traduce en permiso de alta/edición/baja, así que
  // queda afuera acá para no ofrecer acciones que el backend va a rechazar
  // con 403. PATCH /sensores/lote/:loteId/asociar: Operario de línea y
  // Responsable de calidad, capacidad distinta (puedeAsociar más abajo).
  const puedeGestionar = useMemo(
    () =>
      user?.rolNombre === "Responsable de producción" ||
      user?.rolNombre === "Responsable de calidad",
    [user?.rolNombre],
  );
  const puedeAsociar = useMemo(
    () => user?.rolNombre === "Operario de línea" || user?.rolNombre === "Responsable de calidad",
    [user?.rolNombre],
  );

  // GET /sensores/lecturas/historial-mediciones (HU-19, backend): @Roles
  // solo permite Responsable de producción, Gerente y Administrador. Ni
  // Responsable de calidad ni Operario de línea están habilitados ahí,
  // aunque sí ven el resto de Sensores (ver lectura-sensor.controller.ts).
  // Comparación normalizada (trim + lowercase) por posibles inconsistencias
  // de casing/espacios en rolNombre, mismo criterio que ProveedoresPage.
  const puedeVerHistorial = useMemo(() => {
    const rol = (user?.rolNombre ?? "").trim().toLowerCase();
    return (
      rol === "responsable de producción" || rol === "gerente" || rol === "administrador"
    );
  }, [user?.rolNombre]);

  const tabs = puedeVerHistorial
    ? [TAB_SEMAFORO, ...TABS_BASE, TAB_HISTORIAL]
    : [TAB_SEMAFORO, ...TABS_BASE];

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
        <Tabs tabs={tabs} value={tabActiva} onChange={setTabActiva} />
      </div>

      {tabActiva === "semaforo" ? (
        <MonitoreoSemaforoTab />
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
          puedeGestionar={puedeGestionar}
          puedeAsociar={puedeAsociar}
          filtros={filtros}
          onFiltrosChange={setFiltros}
        />
      )}
    </Layout>
  );
}
