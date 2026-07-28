import { Tabs } from "./ui/Tabs";
import { TipoMateriaPrima } from "../types/configParametro.types";

const OPCIONES: { value: TipoMateriaPrima; label: string }[] = [
  { value: TipoMateriaPrima.LECHE_CRUDA, label: "Leche cruda" },
  { value: TipoMateriaPrima.CREMA_DE_LECHE, label: "Crema de leche" },
  { value: TipoMateriaPrima.MASA_HILADA, label: "Masa hilada" },
];

interface TipoMateriaPrimaSelectorProps {
  value: TipoMateriaPrima;
  onChange: (value: TipoMateriaPrima) => void;
}

export function TipoMateriaPrimaSelector({ value, onChange }: TipoMateriaPrimaSelectorProps) {
  return <Tabs tabs={OPCIONES} value={value} onChange={onChange} />;
}
