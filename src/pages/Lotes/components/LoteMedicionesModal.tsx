import { useEffect, useMemo, useState } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Tabs } from "../../../components/ui/Tabs";
import type { Lote } from "../../../types/lote.types";
import { RegistrarMedicionManualTab } from "./RegistrarMedicionManualTab";
import { HistorialMedicionesManualesTab } from "./HistorialMedicionesManualesTab";
import { ClasificacionAutomaticaTab } from "./ClasificacionAutomaticaTab";

type TabMediciones = "registro" | "historial" | "clasificacion";

const TAB_REGISTRO: { value: TabMediciones; label: string } = {
  value: "registro",
  label: "Registrar medición manual",
};

const TAB_HISTORIAL: { value: TabMediciones; label: string } = {
  value: "historial",
  label: "Historial de mediciones manuales",
};

const TAB_CLASIFICACION: { value: TabMediciones; label: string } = {
  value: "clasificacion",
  label: "Clasificación automática",
};

interface LoteMedicionesModalProps {
  isOpen: boolean;
  lote: Lote | null;
  // Ya considera si el lote tiene un sensor asociado (en ese caso HU-20 no
  // aplica, corresponde HU-15): la pestaña de registro directamente no se
  // ofrece, no se muestra deshabilitada.
  puedeCargarMedicionManual: boolean;
  puedeVerHistorialManual: boolean;
  // HU-21: solo Responsable de Calidad accede a la clasificación automática.
  puedeVerClasificacion: boolean;
  onClose: () => void;
}

export function LoteMedicionesModal({
  isOpen,
  lote,
  puedeCargarMedicionManual,
  puedeVerHistorialManual,
  puedeVerClasificacion,
  onClose,
}: LoteMedicionesModalProps) {
  const tabs = useMemo(() => {
    const disponibles: { value: TabMediciones; label: string }[] = [];
    if (puedeCargarMedicionManual) disponibles.push(TAB_REGISTRO);
    if (puedeVerHistorialManual) disponibles.push(TAB_HISTORIAL);
    if (puedeVerClasificacion) disponibles.push(TAB_CLASIFICACION);
    return disponibles;
  }, [puedeCargarMedicionManual, puedeVerHistorialManual, puedeVerClasificacion]);

  const [tabActiva, setTabActiva] = useState<TabMediciones>(tabs[0]?.value ?? "historial");

  useEffect(() => {
    if (isOpen) setTabActiva(tabs[0]?.value ?? "historial");
  }, [isOpen, tabs]);

  if (!isOpen || !lote) return null;

  // Si el único acceso disponible es HU-21, el título/descripción de HU-20
  // (mediciones manuales) queda engañoso — se ajusta al contenido real.
  const soloClasificacion = tabs.length === 1 && tabs[0].value === "clasificacion";

  return (
    <Modal
      isOpen={isOpen}
      title={
        soloClasificacion
          ? `Clasificación automática — ${lote.codigo}`
          : `Mediciones manuales — ${lote.codigo}`
      }
      description={
        soloClasificacion
          ? "Resultado calculado a partir de los parámetros registrados (HU-21)"
          : "Respaldo total cuando el lote no tiene sensores asociados (HU-20)"
      }
      onClose={onClose}
    >
      <div className="flex flex-col gap-6">
        <Tabs tabs={tabs} value={tabActiva} onChange={setTabActiva} />
        {tabActiva === "registro" && puedeCargarMedicionManual && (
          <RegistrarMedicionManualTab lote={lote} />
        )}
        {tabActiva === "historial" && puedeVerHistorialManual && (
          <HistorialMedicionesManualesTab lote={lote} />
        )}
        {tabActiva === "clasificacion" && puedeVerClasificacion && (
          <ClasificacionAutomaticaTab lote={lote} />
        )}
      </div>
    </Modal>
  );
}
