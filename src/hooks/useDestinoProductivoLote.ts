import { useEffect, useState } from "react";
import type {
  CambioDestinoProductivo,
  DestinoProductivoLoteState,
  OrigenCambioDestino,
} from "../types/destinoProductivoLote.types";

const STORAGE_KEY = "optilacteo:destino-productivo-lote";
const EVENTO_ACTUALIZADO = "optilacteo:destino-productivo-lote:actualizado";

type Almacen = Record<number, DestinoProductivoLoteState>;

function leerTodo(): Almacen {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Almacen) : {};
  } catch {
    return {};
  }
}

interface RegistrarCambioParams {
  loteId: number;
  destinoNuevoId: number;
  destinoNuevoNombre: string;
  usuario: string;
  origen: OrigenCambioDestino;
  esDivergencia?: boolean;
  justificacion?: string;
}

// HU-34/HU-37 (mock visual): ver destinoProductivoLote.types.ts — un solo
// registro por lote de "destino vigente + historial", alimentado tanto por
// la asignación manual (LoteFormModal) como por el rechazo de una
// recomendación ML con destino distinto (RecomendacionDestinoCard), para
// que un lote nunca tenga dos respuestas distintas sobre su destino según
// desde dónde se lo consulte.
export function registrarCambioDestino({
  loteId,
  destinoNuevoId,
  destinoNuevoNombre,
  usuario,
  origen,
  esDivergencia = false,
  justificacion,
}: RegistrarCambioParams) {
  const todo = leerTodo();
  const actual = todo[loteId];

  const cambio: CambioDestinoProductivo = {
    destinoAnteriorId: actual?.destinoActualId ?? null,
    destinoAnteriorNombre: actual?.destinoActualNombre ?? null,
    destinoNuevoId,
    destinoNuevoNombre,
    usuario,
    timestamp: new Date().toISOString(),
    origen,
    esDivergencia,
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

export function useDestinoProductivoLote(
  loteId: number | null,
): DestinoProductivoLoteState | null {
  const almacen = useAlmacen();
  if (loteId == null) return null;
  return almacen[loteId] ?? null;
}

export function useTodosDestinoProductivoLote(): Almacen {
  return useAlmacen();
}

// HU-37: "divergencia" es específicamente cuando el último cambio de un
// lote vino de rechazar una recomendación ML (no cualquier asignación
// manual de HU-34).
export function esDivergenciaVigente(
  estado: DestinoProductivoLoteState | null,
): boolean {
  if (!estado || estado.historial.length === 0) return false;
  return estado.historial[estado.historial.length - 1].esDivergencia;
}
