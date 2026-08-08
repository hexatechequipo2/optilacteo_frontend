import { useEffect, useMemo, useState } from "react";
import { Layout } from "../../components/layout/Layout";
import { Tabs } from "../../components/ui/Tabs";
import { LoteActivoSelector } from "../../components/LoteActivoSelector";
import { useLotes } from "../../hooks/useLotes";
import { useSensores } from "../../hooks/useSensores";
import { EstadoLote } from "../../types/lote.types";
import { RegistrarMedicionManualTab } from "../Lotes/components/RegistrarMedicionManualTab";
import { HistorialMedicionesManualesTab } from "../Lotes/components/HistorialMedicionesManualesTab";

type TabMedicionManual = "registro" | "historial";

const TABS: { value: TabMedicionManual; label: string }[] = [
  { value: "registro", label: "Registrar medición" },
  { value: "historial", label: "Historial" },
];

export default function MedicionManualPage() {
  const { lotes, isLoading, error, refetch } = useLotes();
  const { sensores } = useSensores();
  const [loteSeleccionadoId, setLoteSeleccionadoId] = useState<number | null>(null);
  const [tabActiva, setTabActiva] = useState<TabMedicionManual>("registro");

  // HU-20 es respaldo TOTAL: solo aplica a lotes sin ningún sensor asociado
  // (si tiene uno, corresponde HU-15, ingreso manual por sensor puntual).
  // Mismo criterio que LotesPage.tsx / LoteMedicionesModal.tsx.
  const lotesConSensorAsociado = useMemo(
    () => new Set(sensores.filter((s) => s.loteActualId != null).map((s) => s.loteActualId)),
    [sensores],
  );

  // Solo lotes activos (registrado/en_proceso): uno finalizado o rechazado
  // ya no tiene sentido medirlo. Mismo par de estados que usa
  // LotesPage.tsx para habilitar "Finalizar lote".
  const lotesElegibles = useMemo(
    () =>
      lotes.filter(
        (lote) =>
          (lote.estado === EstadoLote.REGISTRADO || lote.estado === EstadoLote.EN_PROCESO) &&
          !lotesConSensorAsociado.has(lote.id),
      ),
    [lotes, lotesConSensorAsociado],
  );

  // Si el lote elegido deja de estar disponible (se finalizó, le asociaron
  // un sensor, etc.), volvemos a auto-seleccionar en vez de dejar la
  // pantalla apuntando a un lote fantasma.
  useEffect(() => {
    if (loteSeleccionadoId != null && lotesElegibles.some((l) => l.id === loteSeleccionadoId)) {
      return;
    }
    setLoteSeleccionadoId(lotesElegibles[0]?.id ?? null);
  }, [lotesElegibles, loteSeleccionadoId]);

  const loteSeleccionado = lotesElegibles.find((l) => l.id === loteSeleccionadoId) ?? null;

  return (
    <Layout breadcrumb="Consola > Medición manual">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Medición manual
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Respaldo total para cargar parámetros de calidad cuando el lote no tiene sensores
          asociados.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="ml-4 rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30"
          >
            Reintentar
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando lotes...</p>
        </div>
      ) : lotesElegibles.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-base font-medium text-slate-700 dark:text-slate-300">
            No hay lotes pendientes de medición manual
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Solo aparecen acá los lotes activos (registrado o en proceso) que todavía no tienen
            un sensor asociado.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="max-w-sm">
            <LoteActivoSelector
              lotes={lotesElegibles}
              value={loteSeleccionadoId}
              onChange={setLoteSeleccionadoId}
            />
          </div>

          {loteSeleccionado && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <Tabs tabs={TABS} value={tabActiva} onChange={setTabActiva} />
              <div className="mt-6">
                {tabActiva === "registro" ? (
                  <RegistrarMedicionManualTab lote={loteSeleccionado} />
                ) : (
                  <HistorialMedicionesManualesTab lote={loteSeleccionado} />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
