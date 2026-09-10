import { useEffect, useState } from "react";
import type {
  CambioDestinoManual,
  DestinoManualState,
} from "../types/destinoProductivoManual.types";

const STORAGE_KEY = "optilacteo:destino-productivo-manual";
const EVENTO_ACTUALIZADO = "optilacteo:destino-productivo-manual:actualizado";

type Almacen = Record<number, DestinoManualState>;

function leerTodo(): Almacen {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Almacen) : {};
  } catch {
    return {};
  }
}

interface RegistrarDestinoManualParams {
  loteId: number;
  destinoNuevoId: number;
  destinoNuevoNombre: string;
  usuario: string;
}

// HU-34 (mock visual): ver destinoProductivoManual.types.ts. Un registro por
// lote de "destino vigente + historial" alimentado únicamente por la
// asignación manual desde LoteFormModal — para el destino vigente
// combinado con las recomendaciones de HU-37, ver
// utils/destinoProductivoVigente.ts, que lo calcula en el componente
// consumidor a partir de este hook y de useDestinoProductivoRecomendacion.
export function registrarDestinoManual({
  loteId,
  destinoNuevoId,
  destinoNuevoNombre,
  usuario,
}: RegistrarDestinoManualParams) {
  const todo = leerTodo();
  const actual = todo[loteId];

  const cambio: CambioDestinoManual = {
    destinoAnteriorId: actual?.destinoActualId ?? null,
    destinoAnteriorNombre: actual?.destinoActualNombre ?? null,
    destinoNuevoId,
    destinoNuevoNombre,
    usuario,
    timestamp: new Date().toISOString(),
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

export function useDestinoManualLote(
  loteId: number | null,
): DestinoManualState | null {
  const almacen = useAlmacen();
  if (loteId == null) return null;
  return almacen[loteId] ?? null;
}

export function useTodosDestinoManualLote(): Almacen {
  return useAlmacen();
}
