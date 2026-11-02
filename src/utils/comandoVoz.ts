// HU-56: interpreta lo que dijo el operario en la confirmación verbal.
// Función pura (sin Web Speech API) para poder testearla sola, ver
// tests/comandoVoz.spec.ts. Lista cerrada a propósito, sin "sí", "no",
// "ok" ni "dale": en planta son demasiado fáciles de reconocer por error
// (ruido, una charla al lado) y un falso "confirmar" guarda el registro.
// Decisión sujeta a validación del PO, ver useConfirmacionVerbal.ts.

export type ComandoVoz = "confirmar" | "cancelar";

const PALABRAS_COMANDO: Record<ComandoVoz, readonly string[]> = {
  confirmar: ["confirmar", "confirmo", "correcto"],
  cancelar: ["cancelar", "cancelo"],
};

// Una negación vuelve ambigua la frase ("no confirmo", "no es correcto"):
// no se interpreta como ningún comando.
const NEGACIONES: readonly string[] = ["no"];

// Minúsculas, sin acentos ni puntuación, espacios colapsados. Los acentos
// se sacan descomponiendo (NFD) y borrando las marcas combinantes, así
// "Confirmó" y "confirmo" quedan iguales.
export function normalizarTextoComando(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Devuelve el comando reconocido, o null si no hay ninguno o es ambiguo
// (palabras de los dos comandos, o una negación). Se compara por palabra
// completa: "reconfirmar" o "confirmarlo" no cuentan. Se toleran palabras
// de relleno alrededor ("eh, confirmar").
export function interpretarComandoVoz(texto: string): ComandoVoz | null {
  const palabras = normalizarTextoComando(texto).split(" ");
  if (palabras.some((p) => NEGACIONES.includes(p))) return null;

  const encontrados = (Object.keys(PALABRAS_COMANDO) as ComandoVoz[]).filter(
    (comando) => palabras.some((p) => PALABRAS_COMANDO[comando].includes(p)),
  );
  return encontrados.length === 1 ? encontrados[0] : null;
}
