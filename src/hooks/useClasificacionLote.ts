import { useMemo } from "react";
import { useConfigParametros } from "./useConfigParametros";
import { EstadoLectura } from "../types/historialMediciones.types";
import type { ClasificacionAutomaticaLote } from "../types/clasificacionLote.types";
import type { ConfigParametro } from "../types/configParametro.types";
import type { Lote } from "../types/lote.types";

interface UseClasificacionLoteResult {
  // null: el lote todavía no tiene clasificación (sin parámetros registrados
  // o ningún trigger de cálculo corrió aún del lado del backend).
  clasificacion: ClasificacionAutomaticaLote | null;
  isLoading: boolean;
  // true si no se pudieron cargar los umbrales configurados: el detalle de
  // parámetros puede quedar incompleto, pero el resultado (Apto/No Apto) es
  // el real del backend igual.
  umbralesNoDisponibles: boolean;
}

// GET /config-parametros hoy está restringido a @Roles(GERENTE) en el
// backend (ver useParametrosObligatorios.ts) y Responsable de Calidad -el
// rol dueño de HU-21- puede no tener acceso todavía. TODO(backend): sumar
// RESPONSABLE_CALIDAD a ese endpoint para que el detalle de umbrales se vea
// completo. Mientras tanto, si la carga falla o no trae umbral para un
// parámetro, ese parámetro queda SIN_UMBRAL_CONFIGURADO en vez de romper la
// pantalla (mismo criterio de EstadoLectura que ya usan HU-19/HU-20).
function construirParametrosUtilizados(lote: Lote, configs: ConfigParametro[]) {
  const configPorParametro = new Map(
    configs
      .filter((c) => c.tipoMateriaPrima === lote.materiaPrima)
      .map((c) => [c.parametro, c]),
  );

  return lote.parametros.map(({ parametro, valor }) => {
    const config = configPorParametro.get(parametro);

    let estado: EstadoLectura;
    if (!config) {
      estado = EstadoLectura.SIN_UMBRAL_CONFIGURADO;
    } else if (valor < config.umbralMin || valor > config.umbralMax) {
      estado = EstadoLectura.FUERA_DE_RANGO;
    } else {
      estado = EstadoLectura.NORMAL;
    }

    return {
      parametro,
      valor,
      umbralMin: config?.umbralMin ?? null,
      umbralMax: config?.umbralMax ?? null,
      estado,
    };
  });
}

export function useClasificacionLote(lote: Lote): UseClasificacionLoteResult {
  const { configs, isLoading, error } = useConfigParametros();

  const clasificacion = useMemo<ClasificacionAutomaticaLote | null>(() => {
    if (!lote.clasificacion) return null;
    return {
      resultado: lote.clasificacion,
      parametrosUtilizados: construirParametrosUtilizados(lote, configs),
    };
  }, [lote, configs]);

  return { clasificacion, isLoading, umbralesNoDisponibles: error !== null };
}
