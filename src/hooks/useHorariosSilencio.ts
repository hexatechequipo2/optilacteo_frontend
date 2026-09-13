import { useCallback, useEffect, useState } from "react";
import type {
  HorarioSilencio,
  HorarioSilencioInput,
} from "../types/horarioSilencio.types";

const STORAGE_KEY = "optilacteo:horarios-silencio";
const EVENTO_ACTUALIZADO = "optilacteo:horarios-silencio:actualizado";

function leerTodo(): HorarioSilencio[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HorarioSilencio[]) : [];
  } catch {
    return [];
  }
}

function guardarTodo(horarios: HorarioSilencio[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(horarios));
  window.dispatchEvent(new Event(EVENTO_ACTUALIZADO));
}

// HU-30 (mock visual): ver horarioSilencio.types.ts. CRUD completo pero
// 100% local — a diferencia de useCatalogoDestinosProductivos.ts, acá no hay
// ningún catálogo real del backend para mergear, todos los horarios son
// locales hasta que exista el endpoint.
export function useHorariosSilencio() {
  const [horarios, setHorarios] = useState<HorarioSilencio[]>(() => leerTodo());

  useEffect(() => {
    const actualizar = () => setHorarios(leerTodo());
    window.addEventListener(EVENTO_ACTUALIZADO, actualizar);
    window.addEventListener("storage", actualizar);
    return () => {
      window.removeEventListener(EVENTO_ACTUALIZADO, actualizar);
      window.removeEventListener("storage", actualizar);
    };
  }, []);

  const crear = useCallback((datos: HorarioSilencioInput) => {
    const actuales = leerTodo();
    const nuevo: HorarioSilencio = {
      ...datos,
      id: String(Date.now()),
      activo: true,
      creadoEn: new Date().toISOString(),
    };
    guardarTodo([...actuales, nuevo]);
  }, []);

  const editar = useCallback((id: string, datos: HorarioSilencioInput) => {
    const actuales = leerTodo();
    guardarTodo(
      actuales.map((h) => (h.id === id ? { ...h, ...datos } : h)),
    );
  }, []);

  const eliminar = useCallback((id: string) => {
    const actuales = leerTodo();
    guardarTodo(actuales.filter((h) => h.id !== id));
  }, []);

  const toggleActivo = useCallback((id: string) => {
    const actuales = leerTodo();
    guardarTodo(
      actuales.map((h) => (h.id === id ? { ...h, activo: !h.activo } : h)),
    );
  }, []);

  return { horarios, crear, editar, eliminar, toggleActivo };
}
