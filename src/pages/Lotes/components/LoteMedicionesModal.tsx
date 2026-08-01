import { useEffect, useMemo, useState } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Tabs } from "../../../components/ui/Tabs";
import type { Lote } from "../../../types/lote.types";
import { RegistrarMedicionManualTab } from "./RegistrarMedicionManualTab";
import { IngresoManualFallbackLoteTab } from "./IngresoManualFallbackLoteTab";
import { HistorialMedicionesManualesTab } from "./HistorialMedicionesManualesTab";
import { HistorialLecturasLoteTab } from "./HistorialLecturasLoteTab";
import { ClasificacionAutomaticaTab } from "./ClasificacionAutomaticaTab";
import { ComparacionHistoricaTab } from "./ComparacionHistoricaTab";

type TabMediciones = "registro" | "historial" | "clasificacion" | "historico";

// Un solo tab "Historial de mediciones": el contenido real depende de si el
// lote tiene sensor asociado (ver puedeVerHistorial más abajo) - sin sensor
// es HU-20 (mediciones_manuales_lote), con sensor es HU-19/HU-15
// (sensor_lecturas, incluye lecturas reales + ingresos manuales de fallback).
const TAB_HISTORIAL: { value: TabMediciones; label: string } = {
  value: "historial",
  label: "Historial de mediciones",
};

const TAB_CLASIFICACION: { value: TabMediciones; label: string } = {
  value: "clasificacion",
  label: "Clasificación automática",
};

const TAB_HISTORICO: { value: TabMediciones; label: string } = {
  value: "historico",
  label: "Comparación histórica",
};

interface LoteMedicionesModalProps {
  isOpen: boolean;
  lote: Lote | null;
  // Capacidad base (solo rol) de escribir algo para este lote: el contenido
  // real del tab "registro" depende de loteTieneSensor (HU-20 sin sensor,
  // HU-15 por sensor con sensor) - mismo patrón que puedeVerHistorial.
  puedeCargarMedicionManual: boolean;
  // HU-20: GET /lotes/:id/mediciones-manuales - Operario de línea, Responsable
  // de producción, Gerente, Administrador. Solo se usa cuando el lote NO
  // tiene sensor asociado.
  puedeVerHistorialManual: boolean;
  // HU-19: GET /sensores/lecturas/historial-mediciones - Responsable de
  // producción, Gerente, Administrador (NO Operario de línea). Se usa cuando
  // el lote SÍ tiene sensor asociado, para ver lecturas reales + ingresos
  // manuales de fallback (HU-15) de ese lote.
  puedeVerHistorialLecturas: boolean;
  loteTieneSensor: boolean;
  // HU-21: solo Responsable de Calidad accede a la clasificación automática.
  puedeVerClasificacion: boolean;
  // HU-24: solo Responsable de Calidad accede a la comparación histórica.
  puedeVerComparacionHistorica: boolean;
  onClose: () => void;
}

export function LoteMedicionesModal({
  isOpen,
  lote,
  puedeCargarMedicionManual,
  puedeVerHistorialManual,
  puedeVerHistorialLecturas,
  loteTieneSensor,
  puedeVerClasificacion,
  puedeVerComparacionHistorica,
  onClose,
}: LoteMedicionesModalProps) {
  const puedeVerHistorial = loteTieneSensor ? puedeVerHistorialLecturas : puedeVerHistorialManual;

  // Label dinámico, mismo criterio que TAB_HISTORIAL/HistorialLecturasLoteTab:
  // un solo tab conceptual ("cargar algo para este lote"), el contenido y el
  // nombre cambian según si el lote tiene sensor asociado.
  const tabRegistro = useMemo(
    () => ({
      value: "registro" as const,
      label: loteTieneSensor ? "Ingreso manual (fallback)" : "Registrar medición manual",
    }),
    [loteTieneSensor],
  );

  const tabs = useMemo(() => {
    const disponibles: { value: TabMediciones; label: string }[] = [];
    if (puedeCargarMedicionManual) disponibles.push(tabRegistro);
    if (puedeVerHistorial) disponibles.push(TAB_HISTORIAL);
    if (puedeVerClasificacion) disponibles.push(TAB_CLASIFICACION);
    if (puedeVerComparacionHistorica) disponibles.push(TAB_HISTORICO);
    return disponibles;
  }, [
    puedeCargarMedicionManual,
    puedeVerHistorial,
    puedeVerClasificacion,
    puedeVerComparacionHistorica,
    tabRegistro,
  ]);

  const [tabActiva, setTabActiva] = useState<TabMediciones>(tabs[0]?.value ?? "historial");

  useEffect(() => {
    if (isOpen) setTabActiva(tabs[0]?.value ?? "historial");
  }, [isOpen, tabs]);

  if (!isOpen || !lote) return null;

  // tabs vacío puede pasar por más de un motivo (Responsable de Calidad sin
  // clasificación/histórico habilitados, u Operario de línea en un lote con
  // sensor sin acceso al historial de HU-19) - no asumimos cuál es: el
  // título queda genérico y el contenido muestra un empty state real en vez
  // de quedar en blanco con un título que asume el motivo equivocado.
  const sinTabsDeMediciones = tabs.length === 0;

  return (
    <Modal
      isOpen={isOpen}
      title={`Mediciones — ${lote.codigo}`}
      description={
        sinTabsDeMediciones
          ? "No tenés acciones disponibles para este lote con tu rol actual."
          : loteTieneSensor
            ? "Lecturas de sensor e ingresos manuales de fallback (HU-15) de este lote."
            : "Respaldo total cuando el lote no tiene sensores asociados."
      }
      onClose={onClose}
    >
      <div className="flex flex-col gap-6">
        <Tabs tabs={tabs} value={tabActiva} onChange={setTabActiva} />
        {sinTabsDeMediciones && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No tenés acciones disponibles para este lote con tu rol actual.
          </p>
        )}
        {tabActiva === "registro" && puedeCargarMedicionManual && (
          loteTieneSensor ? (
            <IngresoManualFallbackLoteTab lote={lote} />
          ) : (
            <RegistrarMedicionManualTab lote={lote} />
          )
        )}
        {tabActiva === "historial" && puedeVerHistorial && (
          loteTieneSensor ? (
            <HistorialLecturasLoteTab lote={lote} />
          ) : (
            <HistorialMedicionesManualesTab lote={lote} />
          )
        )}
        {tabActiva === "clasificacion" && puedeVerClasificacion && (
          <ClasificacionAutomaticaTab lote={lote} />
        )}
        {tabActiva === "historico" && puedeVerComparacionHistorica && (
          <ComparacionHistoricaTab lote={lote} />
        )}
      </div>
    </Modal>
  );
}
