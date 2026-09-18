import { Select } from "./ui/Select";
import type { Lote } from "../types/lote.types";

interface LoteActivoSelectorProps {
  lotes: Lote[];
  value: number | null;
  onChange: (loteId: number) => void;
  // HU-55 (botón flotante): el panel de selección rápida no tiene un lote
  // pre-elegido como sí lo tienen las pantallas que ya traían este selector
  // (MedicionManualPage, RevisionDictadoVozModal siempre pasan un `value`
  // real). Sin una opción placeholder, un <select> nativo con value="" que
  // no matchea ninguna opción termina mostrando la primera igual, y si el
  // operario justo quiere esa, tocarla no dispara onChange (el DOM ya la
  // consideraba seleccionada) — el dictado nunca arrancaría. Un placeholder
  // real como primera opción evita ese caso.
  placeholder?: string;
}

export function LoteActivoSelector({
  lotes,
  value,
  onChange,
  placeholder,
}: LoteActivoSelectorProps) {
  const options = lotes.map((lote) => ({
    value: String(lote.id),
    label: lote.codigo,
  }));

  if (placeholder && value == null) {
    options.unshift({ value: "", label: placeholder });
  }

  return (
    <Select
      label="Lote activo"
      options={options}
      value={value != null ? String(value) : ""}
      onChange={(e) => {
        if (e.target.value === "") return;
        onChange(Number(e.target.value));
      }}
    />
  );
}
