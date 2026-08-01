import { useCallback, useState } from "react";
import { sensorService } from "../services/sensor.service";
import type { IngresarLecturaManualDto, LecturaNuevaEvent } from "../types/sensor.types";

interface UseLecturaManualResult {
  registrar: (dto: IngresarLecturaManualDto) => Promise<LecturaNuevaEvent>;
  isSubmitting: boolean;
}

// HU-15: envía el fallback manual (POST /sensores/lecturas/manual). La
// actualización del valor en pantalla llega sola por WS (mismo evento
// lectura:nueva que emite una lectura real, ver useSensoresRealtime), así
// que acá no hace falta guardar el resultado en ningún estado.
export function useLecturaManual(): UseLecturaManualResult {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registrar = useCallback(async (dto: IngresarLecturaManualDto) => {
    setIsSubmitting(true);
    try {
      return await sensorService.ingresarLecturaManual(dto);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { registrar, isSubmitting };
}
