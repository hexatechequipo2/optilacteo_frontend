import { useEffect, useState } from "react";
import type { DivergenciaDestino } from "../types/divergenciaDestino.types";

const STORAGE_KEY = "optilacteo:divergencias-destino";
const EVENTO_ACTUALIZADO = "optilacteo:divergencias-destino:actualizado";

function leerTodas(): DivergenciaDestino[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DivergenciaDestino[]) : [];
  } catch {
    return [];
  }
}

// HU-37 (mock visual): se engancha al flujo real de "Elegir otro destino"
// de RecomendacionDestinoCard (que sí manda el PATCH real a
// /recomendaciones/:id/responder) para guardar acá lo que el backend
// todavía no persiste — justificación, usuario y timestamp de la
// divergencia. Un solo registro por lote (la última divergencia
// justificada pisa la anterior).
export function registrarDivergencia(divergencia: DivergenciaDestino) {
  const todas = leerTodas().filter((d) => d.loteId !== divergencia.loteId);
  todas.push(divergencia);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todas));
  window.dispatchEvent(new Event(EVENTO_ACTUALIZADO));
}

export function useDivergenciasDestino(): DivergenciaDestino[] {
  const [divergencias, setDivergencias] = useState<DivergenciaDestino[]>(() =>
    leerTodas(),
  );

  useEffect(() => {
    const actualizar = () => setDivergencias(leerTodas());
    window.addEventListener(EVENTO_ACTUALIZADO, actualizar);
    window.addEventListener("storage", actualizar);
    return () => {
      window.removeEventListener(EVENTO_ACTUALIZADO, actualizar);
      window.removeEventListener("storage", actualizar);
    };
  }, []);

  return divergencias;
}

export function useDivergenciaPorLote(
  loteId: number | null,
): DivergenciaDestino | null {
  const divergencias = useDivergenciasDestino();
  if (loteId == null) return null;
  return divergencias.find((d) => d.loteId === loteId) ?? null;
}
