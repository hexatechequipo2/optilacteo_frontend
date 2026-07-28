import { useEffect, useMemo, useState } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Tabs } from "../../../components/ui/Tabs";
import type { Lote } from "../../../types/lote.types";
import { RegistrarMedicionManualTab } from "./RegistrarMedicionManualTab";
import { HistorialMedicionesManualesTab } from "./HistorialMedicionesManualesTab";

type TabMediciones = "registro" | "historial";

const TAB_REGISTRO: { value: TabMediciones; label: string } = {
  value: "registro",
  label: "Registrar medición manual",
};

const TAB_HISTORIAL: { value: TabMediciones; label: string } = {
  value: "historial",
  label: "Historial de mediciones manuales",
};

interface LoteMedicionesModalProps {
  isOpen: boolean;
  lote: Lote | null;
  // Ya considera si el lote tiene un sensor asociado (en ese caso HU-20 no
  // aplica, corresponde HU-15): la pestaña de registro directamente no se
  // ofrece, no se muestra deshabilitada.
  puedeCargarMedicionManual: boolean;
  puedeVerHistorialManual: boolean;
  onClose: () => void;
}

export function LoteMedicionesModal({
  isOpen,
  lote,
  puedeCargarMedicionManual,
  puedeVerHistorialManual,
  onClose,
}: LoteMedicionesModalProps) {
  const tabs = useMemo(() => {
    const disponibles: { value: TabMediciones; label: string }[] = [];
    if (puedeCargarMedicionManual) disponibles.push(TAB_REGISTRO);
    if (puedeVerHistorialManual) disponibles.push(TAB_HISTORIAL);
    return disponibles;
  }, [puedeCargarMedicionManual, puedeVerHistorialManual]);

  const [tabActiva, setTabActiva] = useState<TabMediciones>(tabs[0]?.value ?? "historial");

  useEffect(() => {
    if (isOpen) setTabActiva(tabs[0]?.value ?? "historial");
  }, [isOpen, tabs]);

  if (!isOpen || !lote) return null;

  return (
    <Modal
      isOpen={isOpen}
      title={`Mediciones manuales — ${lote.codigo}`}
      description="Respaldo total cuando el lote no tiene sensores asociados (HU-20)"
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
      </div>
    </Modal>
  );
}
