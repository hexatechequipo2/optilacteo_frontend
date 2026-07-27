import { Select } from "./ui/Select";
import type { Lote } from "../types/lote.types";

interface LoteActivoSelectorProps {
  lotes: Lote[];
  value: number | null;
  onChange: (loteId: number) => void;
}

export function LoteActivoSelector({ lotes, value, onChange }: LoteActivoSelectorProps) {
  const options = lotes.map((lote) => ({ value: String(lote.id), label: lote.codigo }));

  return (
    <Select
      label="Lote activo"
      options={options}
      value={value != null ? String(value) : ""}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}
