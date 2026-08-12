import { Badge } from "../../../components/ui/Badge";
import { NIVEL_ALERTA_LABEL } from "../constants/reglasAlertaMock";
import type { NivelAlerta } from "../../../types/destinatarioAlerta.types";

const NIVEL_VARIANT: Record<NivelAlerta, "danger" | "warning" | "info"> = {
  critica: "danger",
  preventiva: "warning",
  informativa: "info",
};

interface NivelAlertaBadgeProps {
  nivel: NivelAlerta;
}

export function NivelAlertaBadge({ nivel }: NivelAlertaBadgeProps) {
  return <Badge variant={NIVEL_VARIANT[nivel]}>{NIVEL_ALERTA_LABEL[nivel]}</Badge>;
}
