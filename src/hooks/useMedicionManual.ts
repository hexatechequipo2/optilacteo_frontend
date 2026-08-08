import { useCallback, useState } from "react";
import { medicionManualService } from "../services/medicionManual.service";
import type { CreateMedicionManualDto, MedicionManualLoteResponse } from "../types/medicionManual.types";

interface UseMedicionManualResult {
  registrar: (loteId: number, dto: CreateMedicionManualDto) => Promise<MedicionManualLoteResponse>;
  isSubmitting: boolean;
}

export function useMedicionManual(): UseMedicionManualResult {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registrar = useCallback(async (loteId: number, dto: CreateMedicionManualDto) => {
    setIsSubmitting(true);
    try {
      return await medicionManualService.registrar(loteId, dto);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { registrar, isSubmitting };
}
