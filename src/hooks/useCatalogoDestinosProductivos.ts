import { useCallback, useEffect, useState } from "react";
import {
  destinoProductivoService,
  extraerMensajeError,
} from "../services/destinoProductivo.service";
import type { DestinoProductivo } from "../types/destinoProductivo.types";
import type { OverridesCatalogoDestinos } from "../types/catalogoDestinoProductivo.types";

const STORAGE_KEY = "optilacteo:destinos-productivos-overrides";
const EVENTO_ACTUALIZADO =
  "optilacteo:destinos-productivos-overrides:actualizado";

function overridesVacios(): OverridesCatalogoDestinos {
  return { creados: [], nombresEditados: {}, desactivados: [] };
}

function leerOverrides(): OverridesCatalogoDestinos {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw
      ? (JSON.parse(raw) as OverridesCatalogoDestinos)
      : overridesVacios();
  } catch {
    return overridesVacios();
  }
}

function guardarOverrides(overrides: OverridesCatalogoDestinos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  window.dispatchEvent(new Event(EVENTO_ACTUALIZADO));
}

export interface DestinoProductivoConfigurable extends DestinoProductivo {
  activo: boolean;
  // Un destino creado localmente (id negativo) no existe todavía del lado
  // del backend — se distingue en la UI para dejarlo claro.
  esLocal: boolean;
}

// HU-34 (mock visual): catálogo combinado (real, GET /destinos-productivos
// + altas/ediciones/bajas locales) para la pantalla de Configuración y
// para el selector de "Destino productivo" en el form de lote.
export function useCatalogoDestinosProductivos() {
  const [reales, setReales] = useState<DestinoProductivo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<OverridesCatalogoDestinos>(() =>
    leerOverrides(),
  );

  const fetchReales = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await destinoProductivoService.getActivos();
      setReales(result);
    } catch (err) {
      setError(
        extraerMensajeError(
          err,
          "No se pudo cargar el catálogo de destinos productivos.",
        ),
      );
      setReales([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReales();
  }, [fetchReales]);

  useEffect(() => {
    const actualizar = () => setOverrides(leerOverrides());
    window.addEventListener(EVENTO_ACTUALIZADO, actualizar);
    window.addEventListener("storage", actualizar);
    return () => {
      window.removeEventListener(EVENTO_ACTUALIZADO, actualizar);
      window.removeEventListener("storage", actualizar);
    };
  }, []);

  const todos: DestinoProductivoConfigurable[] = [
    ...reales.map((d) => ({ ...d, esLocal: false })),
    ...overrides.creados.map((d) => ({ ...d, esLocal: true })),
  ].map((d) => ({
    id: d.id,
    nombre: overrides.nombresEditados[d.id] ?? d.nombre,
    activo: !overrides.desactivados.includes(d.id),
    esLocal: d.esLocal,
  }));

  const destinosActivos = todos.filter((d) => d.activo);

  const crear = (nombre: string) => {
    const overridesActuales = leerOverrides();
    const nuevoId = -Date.now();
    guardarOverrides({
      ...overridesActuales,
      creados: [...overridesActuales.creados, { id: nuevoId, nombre }],
    });
  };

  const editar = (id: number, nombre: string) => {
    const overridesActuales = leerOverrides();
    guardarOverrides({
      ...overridesActuales,
      nombresEditados: { ...overridesActuales.nombresEditados, [id]: nombre },
    });
  };

  const desactivar = (id: number) => {
    const overridesActuales = leerOverrides();
    if (overridesActuales.desactivados.includes(id)) return;
    guardarOverrides({
      ...overridesActuales,
      desactivados: [...overridesActuales.desactivados, id],
    });
  };

  const reactivar = (id: number) => {
    const overridesActuales = leerOverrides();
    guardarOverrides({
      ...overridesActuales,
      desactivados: overridesActuales.desactivados.filter((d) => d !== id),
    });
  };

  return {
    destinos: todos,
    destinosActivos,
    isLoading,
    error,
    refetch: fetchReales,
    crear,
    editar,
    desactivar,
    reactivar,
  };
}
