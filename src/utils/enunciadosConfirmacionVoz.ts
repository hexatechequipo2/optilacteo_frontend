import { Parametro } from "../types/configParametro.types";
import type { ParsearDictadoResponse } from "../types/dictadoVoz.types";
import { PARAMETRO_LABEL } from "../pages/Sensores/constants/parametroSensor";

// HU-56 (decisión 3, ver useConfirmacionVerbal.ts): qué se lee en voz alta
// antes de pedir "confirmar". Un enunciado por ítem: Chrome corta los
// textos largos y así cada parámetro queda separado.

// Las unidades de UNIDAD_POR_PARAMETRO son símbolos ("°C", "g/mL") que el
// sintetizador lee mal; acá van como se dicen.
const UNIDAD_HABLADA: Record<Parametro, string | undefined> = {
  [Parametro.PH]: undefined,
  [Parametro.TEMPERATURA]: "grados",
  [Parametro.DENSIDAD]: "gramos por mililitro",
  [Parametro.GRASA]: "por ciento",
  [Parametro.PROTEINA]: "por ciento",
  [Parametro.ACIDEZ]: "grados Dornic",
  [Parametro.CONDUCTIVIDAD]: "milisiemens por centímetro",
};

export function armarEnunciadosConfirmacion(
  codigoLote: string,
  resultado: ParsearDictadoResponse,
  valores: Partial<Record<Parametro, string>>,
): string[] {
  const enunciados = [`Lote ${codigoLote}.`];

  for (const item of resultado.parametros) {
    const valor = (valores[item.parametro] ?? "").trim();
    // Vaciado en la revisión: no se registra, no se lee.
    if (valor === "") continue;
    const unidad = UNIDAD_HABLADA[item.parametro];
    // Coma decimal: "6,8" se lee "seis coma ocho" en español.
    let texto = `${PARAMETRO_LABEL[item.parametro]} ${valor.replace(".", ",")}${
      unidad ? ` ${unidad}` : ""
    }`;
    // Las marcas de rango son del valor interpretado por el backend: si se
    // editó, ya no aplican y no se avisa.
    const sinEditar = valor === String(item.valor);
    if (
      sinEditar &&
      (item.fueraDeRangoFisico || item.fueraDeUmbralEmpresa === true)
    ) {
      texto += ", fuera de rango";
    }
    enunciados.push(`${texto}.`);
  }

  if (resultado.obligatoriosFaltantes.length > 0) {
    const faltantes = resultado.obligatoriosFaltantes
      .map((p) => PARAMETRO_LABEL[p as Parametro] ?? p)
      .join(", ");
    enunciados.push(`Faltan obligatorios: ${faltantes}.`);
  }

  return enunciados;
}
