import { useEffect, useState } from "react";
import type { RemitoLote } from "../types/remitoLote.types";

const STORAGE_KEY = "optilacteo:remito-lote";
const EVENTO_ACTUALIZADO = "optilacteo:remito-lote:actualizado";

type Almacen = Record<number, RemitoLote>;

function leerTodo(): Almacen {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Almacen) : {};
  } catch {
    return {};
  }
}

// HU-69 (mock visual): ver remitoLote.types.ts. Se registra una sola vez, al
// crear el lote — no hay "actualizar remito" en ningún AC de esta HU.
export function registrarRemitoLote(loteId: number, numeroRemito: string) {
  const todo = leerTodo();
  todo[loteId] = { numeroRemito, registradoEn: new Date().toISOString() };
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

export function useRemitoLote(loteId: number | null): string | null {
  const almacen = useAlmacen();
  if (loteId == null) return null;
  return almacen[loteId]?.numeroRemito ?? null;
}

export function useTodosRemitoLote(): Almacen {
  return useAlmacen();
}
