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

type TabSensores = "estado" | "registro" | "historial";

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
  const { sensores, isLoading, error, refetch, createSensor, isCreating, updateSensor, isUpdating } =
    useSensores(filtros);
  const { user } = useAuth();
  const { empresa } = useEmpresaActual();
  const [tabActiva, setTabActiva] = useState<TabSensores>("registro");

  // POST/PATCH /sensores (backend): Responsable de producción y Responsable
  // de calidad. PATCH /sensores/lote/:loteId/asociar: Operario de línea y
  // Responsable de calidad. Son capacidades distintas, ver sensor.controller.ts.
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

  const tabs = puedeVerHistorial ? [...TABS_BASE, TAB_HISTORIAL] : TABS_BASE;

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

      {tabActiva === "estado" ? (
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
          puedeGestionar={puedeGestionar}
          puedeAsociar={puedeAsociar}
          filtros={filtros}
          onFiltrosChange={setFiltros}
        />
      )}
    </Layout>
  );
}
