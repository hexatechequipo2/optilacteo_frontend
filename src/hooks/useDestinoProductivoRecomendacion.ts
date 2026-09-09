import { useEffect, useState } from "react";
import type {
  CambioDestinoRecomendacion,
  DestinoRecomendacionState,
} from "../types/destinoProductivoRecomendacion.types";

const STORAGE_KEY = "optilacteo:destino-productivo-recomendacion";
const EVENTO_ACTUALIZADO = "optilacteo:destino-productivo-recomendacion:actualizado";

type Almacen = Record<number, DestinoRecomendacionState>;

function leerTodo(): Almacen {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Almacen) : {};
  } catch {
    return {};
  }
}

interface RegistrarDestinoRecomendacionParams {
  loteId: number;
  destinoNuevoId: number;
  destinoNuevoNombre: string;
  usuario: string;
  esDivergencia: boolean;
  justificacion?: string;
  destinoRecomendadoId: number | null;
  destinoRecomendadoNombre: string | null;
}

// HU-37 (mock visual, solo para el destino vigente — la recomendación en sí
// ya viene del backend, ver useRecomendacionDestino.ts): ver
// destinoProductivoRecomendacion.types.ts. Un registro por lote de "destino
// vigente + historial" alimentado únicamente por aceptar/rechazar una
// recomendación desde RecomendacionDestinoCard.
export function registrarDestinoRecomendacion({
  loteId,
  destinoNuevoId,
  destinoNuevoNombre,
  usuario,
  esDivergencia,
  justificacion,
  destinoRecomendadoId,
  destinoRecomendadoNombre,
}: RegistrarDestinoRecomendacionParams) {
  const todo = leerTodo();
  const actual = todo[loteId];

  const cambio: CambioDestinoRecomendacion = {
    destinoAnteriorId: actual?.destinoActualId ?? null,
    destinoAnteriorNombre: actual?.destinoActualNombre ?? null,
    destinoNuevoId,
    destinoNuevoNombre,
    usuario,
    timestamp: new Date().toISOString(),
    esDivergencia,
    destinoRecomendadoId,
    destinoRecomendadoNombre,
    ...(justificacion ? { justificacion } : {}),
  };

  todo[loteId] = {
    destinoActualId: destinoNuevoId,
    destinoActualNombre: destinoNuevoNombre,
    historial: [...(actual?.historial ?? []), cambio],
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(todo));
  window.dispatchEvent(new Event(EVENTO_ACTUALIZADO));
}

function useAlmacen(): Almacen {
  const [almacen, setAlmacen] = useState<Almacen>(() => leerTodo());

  useEffect(() => {
    const actualizar = () => setAlmacen(leerTodo());
    window.addEventListener(EVENTO_ACTUALIZADO, actualizar);
    window.addEventListener("storage", actualizar);
    return () => {
      window.removeEventListener(EVENTO_ACTUALIZADO, actualizar);
      window.removeEventListener("storage", actualizar);
    };
  }, []);

  return almacen;
}

export function useDestinoRecomendacionLote(
  loteId: number | null,
): DestinoRecomendacionState | null {
  const almacen = useAlmacen();
  if (loteId == null) return null;
  return almacen[loteId] ?? null;
}

export function useTodosDestinoRecomendacionLote(): Almacen {
  return useAlmacen();
}
