import { useMemo, useState } from "react";
import { Layout } from "../../components/layout/Layout";
import { Tabs } from "../../components/ui/Tabs";
import { useSensores } from "../../hooks/useSensores";
import { useAuth } from "../../hooks/useAuth";
import { useEmpresaActual } from "../../hooks/useEmpresaActual";
import type { SensorFilterQuery } from "../../types/sensor.types";
import { RegistroSensoresTab } from "./components/RegistroSensoresTab";
import { EstadoDiagnosticoTab } from "./components/EstadoDiagnosticoTab";

type TabSensores = "estado" | "registro";

const TABS: { value: TabSensores; label: string }[] = [
  { value: "estado", label: "Estado y diagnóstico" },
  { value: "registro", label: "Registro (alta / edición)" },
];

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
        <Tabs tabs={TABS} value={tabActiva} onChange={setTabActiva} />
      </div>

      {tabActiva === "estado" ? (
        <EstadoDiagnosticoTab />
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
