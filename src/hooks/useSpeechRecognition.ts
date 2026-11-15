import { useCallback, useEffect, useRef, useState } from "react";
import type { EstadoReconocimientoVoz } from "../types/dictadoVoz.types";

// Errores fatales: no tiene sentido reintentar solos, hay que frenar y
// mandar al operario al ingreso manual (permiso denegado o sin hardware de
// micrófono). Todo lo demás (no-speech, network, aborted, ...) es
// transitorio y se resuelve reiniciando el reconocimiento sin molestar.
const ERRORES_FATALES = new Set<string>([
  "not-allowed",
  "audio-capture",
  "service-not-allowed",
]);

// Opciones del reconocedor. Los valores por defecto son los que usa el
// dictado de HU-55 (es-AR, continuo, con resultados interinos), así ese
// flujo no cambia. HU-56 (confirmación verbal) lo usa con
// continuous/interimResults en false para escuchar un comando corto.
export interface OpcionesSpeechRecognition {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  // Se llama con cada fragmento final apenas llega, además de sumarlo a
  // transcripcionAcumulada. Sirve para reaccionar a un comando sin
  // depender de un efecto sobre el texto acumulado.
  onResultadoFinal?: (texto: string) => void;
}

interface UseSpeechRecognitionResult {
  estado: EstadoReconocimientoVoz;
  soportado: boolean;
  transcripcionInterina: string;
  transcripcionAcumulada: string;
  iniciar: () => void;
  pausar: () => void;
  detener: () => void;
  reiniciarTranscripcion: () => void;
}

function obtenerConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

// HU-55: envuelve la Web Speech API para el modal de dictado. Resuelve tres
// particularidades del navegador que el mock no tenía que enfrentar:
// - Chrome corta la sesión sola tras un silencio aunque continuous=true:
//   reiniciamos automáticamente salvo que el corte haya sido por una acción
//   del usuario (pausar/cerrar) o un error fatal.
// - Firefox no implementa SpeechRecognition (Safari sí, como
//   webkitSpeechRecognition, aunque menos estable): se detecta al montar
//   (`soportado`) para que el modal muestre un estado explicativo en vez de
//   un modal roto, en lugar de fallar recién al tocar "Dictar valores".
// - Los resultados "interim" se pisan en cada evento; solo los "final" se
//   van acumulando al texto que después se manda a /dictado/parsear.
export function useSpeechRecognition(
  opciones: OpcionesSpeechRecognition = {},
): UseSpeechRecognitionResult {
  const {
    lang = "es-AR",
    continuous = true,
    interimResults = true,
    onResultadoFinal,
  } = opciones;
  // En ref para que crearInstancia no cambie cada vez que el componente
  // pasa una función nueva; siempre se llama a la última.
  const onResultadoFinalRef = useRef(onResultadoFinal);
  useEffect(() => {
    onResultadoFinalRef.current = onResultadoFinal;
  }, [onResultadoFinal]);

  const ConstructorRef = useRef(obtenerConstructor());
  const soportado = ConstructorRef.current !== null;

  const [estado, setEstado] = useState<EstadoReconocimientoVoz>(
    soportado ? "inactivo" : "no_soportado",
  );
  const [transcripcionInterina, setTranscripcionInterina] = useState("");
  const [transcripcionAcumulada, setTranscripcionAcumulada] = useState("");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Intención actual del operario: true mientras quiere seguir escuchando.
  // onend la consulta para decidir si el corte fue nuestro (pausar/detener/
  // error fatal: no reinicia) o espontáneo del navegador (reinicia solo).
  const activoRef = useRef(false);
  const restartTimeoutRef = useRef<number | null>(null);

  const crearInstancia = useCallback((): SpeechRecognition | null => {
    if (!ConstructorRef.current) return null;
    const recognition = new ConstructorRef.current();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const resultado = event.results[i];
        const texto = resultado[0]?.transcript ?? "";
        if (resultado.isFinal) {
          final += `${texto} `;
        } else {
          interim += texto;
        }
      }
      if (final) {
        setTranscripcionAcumulada((prev) => `${prev} ${final}`.trim());
        onResultadoFinalRef.current?.(final.trim());
      }
      setTranscripcionInterina(interim);
    };

    recognition.onerror = (event) => {
      if (ERRORES_FATALES.has(event.error)) {
        activoRef.current = false;
        setEstado("permiso_denegado");
      }
      // Transitorios: no tocamos el estado acá, onend decide si reintenta.
    };

    recognition.onend = () => {
      if (!activoRef.current) return;
      // Corte espontáneo (silencio prolongado, límite propio de Chrome,
      // etc.) con el operario todavía queriendo dictar: reintentamos. El
      // delay evita un loop apretado si el navegador sigue cortando en
      // seco (p.ej. sin micrófono físico disponible pero sin error fatal).
      restartTimeoutRef.current = window.setTimeout(() => {
        if (!activoRef.current) return;
        iniciarInstancia();
      }, 300);
    };

    return recognition;
  }, [lang, continuous, interimResults]);

  const iniciarInstancia = useCallback(() => {
    const recognition = crearInstancia();
    if (!recognition) return;
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      // start() sobre una instancia que ya está arrancando tira
      // DOMException: es una carrera inofensiva entre el auto-restart y una
      // acción del usuario, se ignora.
    }
  }, [crearInstancia]);

  const iniciar = useCallback(() => {
    if (!soportado) return;
    if (restartTimeoutRef.current !== null) {
      window.clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    activoRef.current = true;
    setEstado("escuchando");
    iniciarInstancia();
  }, [soportado, iniciarInstancia]);

  const detenerInstancia = useCallback(() => {
    activoRef.current = false;
    if (restartTimeoutRef.current !== null) {
      window.clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  const pausar = useCallback(() => {
    detenerInstancia();
    setEstado("pausado");
    setTranscripcionInterina("");
  }, [detenerInstancia]);

  const detener = useCallback(() => {
    detenerInstancia();
    setEstado("inactivo");
    setTranscripcionInterina("");
  }, [detenerInstancia]);

  const reiniciarTranscripcion = useCallback(() => {
    setTranscripcionAcumulada("");
    setTranscripcionInterina("");
  }, []);

  // Al desmontar (cerrar el flujo, navegar afuera) el micrófono se corta
  // siempre, nunca queda escuchando en background.
  useEffect(() => {
    return () => {
      activoRef.current = false;
      if (restartTimeoutRef.current !== null) {
        window.clearTimeout(restartTimeoutRef.current);
      }
      recognitionRef.current?.stop();
    };
  }, []);

  return {
    estado,
    soportado,
    transcripcionInterina,
    transcripcionAcumulada,
    iniciar,
    pausar,
    detener,
    reiniciarTranscripcion,
  };
}
