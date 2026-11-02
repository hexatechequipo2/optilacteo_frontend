import { useCallback, useEffect, useRef } from "react";

// HU-56: envuelve speechSynthesis para leerle al operario los valores
// dictados antes de confirmar. Resuelve particularidades del navegador:
// - getVoices() suele llegar vacío al principio y se completa con
//   "voiceschanged": se espera un rato acotado antes de elegir voz.
// - Puede no haber voz es-AR: se cae a cualquier es-*, y si no hay ninguna
//   se habla con la voz por defecto (lang es-AR igual).
// - Chrome corta los textos largos (~15 s) y a veces no dispara onend: se
//   habla un enunciado por vez y cada uno tiene un timeout de seguridad.
// No abre el micrófono: quien lo usa tiene que esperar a que `hablar`
// resuelva antes de escuchar, si no el reconocedor transcribe al propio
// sintetizador (eco).

export type ResultadoSintesis = "completado" | "cancelado" | "error";

interface UseSintesisVozResult {
  soportado: boolean;
  // Lee los enunciados en orden. Resuelve "cancelado" si se llamó a
  // cancelar() (o a hablar() otra vez) en el medio, y "error" si el
  // navegador no pudo sintetizar (sin voces, synthesis-failed, etc.).
  hablar: (enunciados: string[]) => Promise<ResultadoSintesis>;
  cancelar: () => void;
}

const LANG_PREFERIDO = "es-AR";
const ESPERA_VOCES_MS = 1000;
// Timeout por enunciado si onend nunca llega: generoso para no cortar una
// lectura lenta, proporcional al largo del texto.
const TIMEOUT_MIN_MS = 4000;
const TIMEOUT_POR_CARACTER_MS = 150;

function obtenerSintesis(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  if (!window.speechSynthesis) return null;
  if (typeof window.SpeechSynthesisUtterance !== "function") return null;
  return window.speechSynthesis;
}

function normalizarLang(lang: string): string {
  return lang.toLowerCase().replace("_", "-");
}

function elegirVoz(
  voces: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  return (
    voces.find((v) => normalizarLang(v.lang) === "es-ar") ??
    voces.find((v) => normalizarLang(v.lang).startsWith("es")) ??
    null
  );
}

function esperarVoces(
  sintesis: SpeechSynthesis,
): Promise<SpeechSynthesisVoice[]> {
  const iniciales = sintesis.getVoices();
  if (iniciales.length > 0) return Promise.resolve(iniciales);
  return new Promise((resolve) => {
    const terminar = () => {
      window.clearTimeout(timeout);
      sintesis.removeEventListener("voiceschanged", terminar);
      resolve(sintesis.getVoices());
    };
    const timeout = window.setTimeout(terminar, ESPERA_VOCES_MS);
    sintesis.addEventListener("voiceschanged", terminar);
  });
}

function hablarEnunciado(
  sintesis: SpeechSynthesis,
  texto: string,
  voz: SpeechSynthesisVoice | null,
): Promise<ResultadoSintesis> {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = voz?.lang ?? LANG_PREFERIDO;
    if (voz) utterance.voice = voz;

    let resuelto = false;
    const terminar = (resultado: ResultadoSintesis) => {
      if (resuelto) return;
      resuelto = true;
      window.clearTimeout(timeout);
      resolve(resultado);
    };

    utterance.onend = () => terminar("completado");
    utterance.onerror = (event) => {
      // cancel() dispara "interrupted"/"canceled": no es una falla.
      terminar(
        event.error === "interrupted" || event.error === "canceled"
          ? "cancelado"
          : "error",
      );
    };
    // onend perdido (bug de Chrome): se asume que terminó de hablar.
    const timeout = window.setTimeout(
      () => terminar("completado"),
      Math.max(TIMEOUT_MIN_MS, texto.length * TIMEOUT_POR_CARACTER_MS),
    );

    sintesis.speak(utterance);
  });
}

export function useSintesisVoz(): UseSintesisVozResult {
  const soportadoRef = useRef(obtenerSintesis() !== null);
  // Cada llamada a hablar()/cancelar() invalida a la anterior: si el
  // número cambió mientras se esperaba, la lectura en curso se abandona.
  const generacionRef = useRef(0);

  const cancelar = useCallback(() => {
    generacionRef.current += 1;
    obtenerSintesis()?.cancel();
  }, []);

  const hablar = useCallback(
    async (enunciados: string[]): Promise<ResultadoSintesis> => {
      const sintesis = obtenerSintesis();
      if (!sintesis) return "error";

      generacionRef.current += 1;
      const generacion = generacionRef.current;
      if (sintesis.speaking || sintesis.pending) sintesis.cancel();

      const voz = elegirVoz(await esperarVoces(sintesis));
      for (const texto of enunciados) {
        if (generacion !== generacionRef.current) return "cancelado";
        const resultado = await hablarEnunciado(sintesis, texto, voz);
        if (generacion !== generacionRef.current) return "cancelado";
        if (resultado !== "completado") return resultado;
      }
      return "completado";
    },
    [],
  );

  // Al desmontar (cerrar la revisión, navegar afuera) se corta la lectura:
  // nunca sigue hablando en background.
  useEffect(() => cancelar, [cancelar]);

  return { soportado: soportadoRef.current, hablar, cancelar };
}
