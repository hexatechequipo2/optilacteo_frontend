import { useMemo } from "react";
import { useConfigParametros } from "./useConfigParametros";
import { EstadoLectura } from "../types/historialMediciones.types";
import { ResultadoClasificacion } from "../types/clasificacionLote.types";
import type { ClasificacionAutomaticaLote } from "../types/clasificacionLote.types";
import type { ConfigParametro } from "../types/configParametro.types";
import type { Lote } from "../types/lote.types";

interface UseClasificacionLoteResult {
  clasificacion: ClasificacionAutomaticaLote;
  isLoading: boolean;
  // true si no se pudieron cargar los umbrales configurados (ver comentario
  // de calcularClasificacionLote): el resultado degrada a "En Revisión" para
  // los parámetros afectados, pero no es necesariamente definitivo.
  umbralesNoDisponibles: boolean;
}

// TODO(backend, HU-21): reemplazar este cálculo por el endpoint dedicado de
// clasificación (ej. GET /lotes/:id/clasificacion) cuando el equipo de
// backend lo tenga listo. Ese endpoint es el que va a poder cumplir los
// criterios que el cliente no puede resolver solo: persistir el resultado
// con fecha/hora reales, disparar la notificación a Responsable de Calidad
// y aplicar el aislamiento entre tenants. Hasta entonces, esta es la mejor
// aproximación posible desde la pantalla, reutilizando GET /config-parametros
// (mismo criterio de EstadoLectura que ya usan HU-19/HU-20).
//
// GET /config-parametros hoy está restringido a @Roles(GERENTE) en el
// backend (ver useParametrosObligatorios.ts) y Responsable de Calidad -el
// rol dueño de HU-21- puede no tener acceso todavía. Si la carga falla o no
// trae umbrales para un parámetro, ese parámetro queda SIN_UMBRAL_CONFIGURADO
// en vez de romper la pantalla.
export function calcularClasificacionLote(
  lote: Lote,
  configs: ConfigParametro[],
): ClasificacionAutomaticaLote {
  const configPorParametro = new Map(
    configs
      .filter((c) => c.tipoMateriaPrima === lote.materiaPrima)
      .map((c) => [c.parametro, c]),
  );

  const parametrosUtilizados = lote.parametros.map(({ parametro, valor }) => {
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

  let resultado: ResultadoClasificacion;
  if (parametrosUtilizados.length === 0) {
    // Criterio de aceptación: sin todos los parámetros registrados, el
    // sistema no debería clasificar como Apto/No Apto — queda en revisión.
    resultado = ResultadoClasificacion.EN_REVISION;
  } else if (parametrosUtilizados.some((p) => p.estado === EstadoLectura.FUERA_DE_RANGO)) {
    resultado = ResultadoClasificacion.NO_APTO;
  } else if (
    parametrosUtilizados.some((p) => p.estado === EstadoLectura.SIN_UMBRAL_CONFIGURADO)
  ) {
    resultado = ResultadoClasificacion.EN_REVISION;
  } else {
    resultado = ResultadoClasificacion.APTO;
  }

  return {
    resultado,
    parametrosUtilizados,
    fecha: lote.createdAt,
  };
}

export function useClasificacionLote(lote: Lote): UseClasificacionLoteResult {
  const { configs, isLoading, error } = useConfigParametros();

  const clasificacion = useMemo(() => calcularClasificacionLote(lote, configs), [lote, configs]);

  return { clasificacion, isLoading, umbralesNoDisponibles: error !== null };
}
