import { useCallback, useEffect, useRef, useState } from "react";
import { interpretarComandoVoz } from "../utils/comandoVoz";
import { useSintesisVoz } from "./useSintesisVoz";
import { useSpeechRecognition } from "./useSpeechRecognition";

// HU-56: confirmación verbal antes de guardar el registro dictado. Lee en
// voz alta lo que se va a registrar (useSintesisVoz), escucha un comando
// corto (useSpeechRecognition sin modo continuo) y lo interpreta con
// interpretarComandoVoz. No sabe nada de mediciones: quien lo usa le pasa
// los enunciados a leer y qué hacer al confirmar (ver
// RevisionDictadoVozModal).
//
// Decisiones de producto (2026-11-02, SUJETAS A VALIDACIÓN DEL PO):
// 1. La confirmación arranca sola al llegar a la revisión (montaje).
// 2. Editar un valor o cambiar de lote corta la confirmación en curso
//    (fase "interrumpida") y ofrece "Leer de nuevo".
// 3. Se lee el lote y después parámetro, valor y unidad, un enunciado por
//    parámetro. Solo se agregan avisos breves para fuera de rango y
//    obligatorios faltantes; la confianza no se lee (ver
//    utils/enunciadosConfirmacionVoz.ts).
// 4. "Cancelar" por voz no guarda y deja la revisión abierta (fase
//    "detenida"), con "Leer de nuevo".
// 5. Cuentan como intento fallido: silencio (SILENCIO_MAX_MS), una frase
//    sin comando y una ambigua. 3 intentos en total (1 + 2 reintentos).
// 6. Revisión manual: los valores quedan en pantalla, "Confirmar registro"
//    por clic habilitado y aviso "No pudimos confirmar por voz".
// 7. El botón de clic queda deshabilitado mientras la confirmación por voz
//    está en curso. Se habilita en revisión manual (intentos agotados,
//    micrófono denegado, sin síntesis) y, además (opción A), en la fase
//    "interrumpida": corregir un valor a mano cuenta como revisión manual.
// 8. Comandos: confirmar = "confirmar" / "confirmo" / "correcto"; cancelar
//    = "cancelar" / "cancelo". Sin "sí", "no", "ok" ni "dale" (ver
//    utils/comandoVoz.ts, también la negación y la palabra completa).
// 9. Sin speechSynthesis: directo a revisión manual con aviso.
// 10. Trazabilidad en el back (confirmado por voz sí/no): fuera de esta
//     rama.
// Criterios propios de la implementación, también a validar:
// - Tras "confirmar", si el registro falla (error del back), el botón de
//   clic queda habilitado para reintentar: la confirmación ya se dio.
// - "Cancelar" por voz no habilita el clic (no es revisión manual): hay que
//   editar, pedir "Leer de nuevo" o volver a dictar.
// - Abrir el "¿Descartar este dictado?" de la revisión detiene la escucha,
//   para que un "confirmar" dicho en ese momento no guarde nada.
// - Sin parámetros reconocidos (`habilitada` en false) no hay nada que
//   confirmar: no se lee nada y el clic queda como antes de HU-56.
// - Si un valor se editó, no se lee su aviso "fuera de rango": la marca es
//   del valor que interpretó el backend (ver enunciadosConfirmacionVoz.ts).
// - Al pasar a revisión manual por intentos agotados o micrófono denegado
//   se avisa también en voz: "No pudimos confirmar por voz. Confirmá en
//   pantalla." (sin síntesis no se puede, solo queda el aviso en pantalla).

export const MAX_INTENTOS_CONFIRMACION = 3;
export const SILENCIO_MAX_MS = 8000;

const PEDIDO_COMANDO = "Decí confirmar para guardar, o cancelar.";
const PEDIDO_REINTENTO = "No entendí. Decí confirmar o cancelar.";
const AVISO_REVISION_MANUAL =
  "No pudimos confirmar por voz. Confirmá en pantalla.";

export type MotivoRevisionManual =
  | "intentos_agotados"
  | "microfono_denegado"
  | "sin_sintesis"
  | "sin_reconocimiento";

export type EstadoConfirmacionVerbal =
  | { fase: "inactiva" }
  | { fase: "leyendo" }
  | { fase: "escuchando"; intento: number }
  | { fase: "confirmada" }
  | { fase: "detenida" }
  | { fase: "interrumpida" }
  | { fase: "revision_manual"; motivo: MotivoRevisionManual };

type Fase = EstadoConfirmacionVerbal["fase"];

const FASES_EN_CURSO: readonly Fase[] = ["leyendo", "escuchando"];
const FASES_CLIC_HABILITADO: readonly Fase[] = [
  "interrumpida",
  "revision_manual",
  "confirmada",
];

interface UseConfirmacionVerbalOpciones {
  // Lo que se lee antes de pedir el comando, un enunciado por vez. Se toma
  // el valor vigente al momento de leer (así "Leer de nuevo" lee lo
  // editado).
  enunciados: string[];
  habilitada: boolean;
  onConfirmar: () => void;
}

interface UseConfirmacionVerbalResult {
  estado: EstadoConfirmacionVerbal;
  puedeConfirmarPorClic: boolean;
  leerDeNuevo: () => void;
  // Edición de un valor o cambio de lote (decisión 2).
  interrumpir: () => void;
  // "¿Descartar?" de la revisión: corta sin habilitar el clic.
  detener: () => void;
}

export function useConfirmacionVerbal({
  enunciados,
  habilitada,
  onConfirmar,
}: UseConfirmacionVerbalOpciones): UseConfirmacionVerbalResult {
  const [estado, setEstado] = useState<EstadoConfirmacionVerbal>({
    fase: "inactiva",
  });
  const faseRef = useRef<Fase>("inactiva");
  const cambiarEstado = useCallback((nuevo: EstadoConfirmacionVerbal) => {
    faseRef.current = nuevo.fase;
    setEstado(nuevo);
  }, []);

  // Cada arranque/corte suma uno: las continuaciones async (fin de una
  // lectura, timeout de silencio) que vienen de un ciclo viejo se ignoran.
  const cicloRef = useRef(0);
  const intentoRef = useRef(1);
  const silencioRef = useRef<number | null>(null);

  const enunciadosRef = useRef(enunciados);
  const onConfirmarRef = useRef(onConfirmar);
  useEffect(() => {
    enunciadosRef.current = enunciados;
    onConfirmarRef.current = onConfirmar;
  }, [enunciados, onConfirmar]);

  const {
    soportado: sintesisSoportada,
    hablar,
    cancelar: cancelarSintesis,
  } = useSintesisVoz();
  const onResultadoFinalRef = useRef<(texto: string) => void>(() => {});
  const microfono = useSpeechRecognition({
    continuous: false,
    interimResults: false,
    onResultadoFinal: (texto) => onResultadoFinalRef.current(texto),
  });
  const {
    iniciar: iniciarMicrofono,
    detener: detenerMicrofono,
    reiniciarTranscripcion,
  } = microfono;

  const limpiarSilencio = useCallback(() => {
    if (silencioRef.current !== null) {
      window.clearTimeout(silencioRef.current);
      silencioRef.current = null;
    }
  }, []);

  // Corta todo lo que esté en curso (lectura, escucha, timeout).
  const cortar = useCallback(() => {
    cicloRef.current += 1;
    limpiarSilencio();
    detenerMicrofono();
    cancelarSintesis();
  }, [limpiarSilencio, detenerMicrofono, cancelarSintesis]);

  const pasarARevisionManual = useCallback(
    (motivo: MotivoRevisionManual, avisarEnVoz: boolean) => {
      cortar();
      cambiarEstado({ fase: "revision_manual", motivo });
      if (avisarEnVoz) void hablar([AVISO_REVISION_MANUAL]);
    },
    [cortar, cambiarEstado, hablar],
  );

  const escuchar = useCallback(
    (ciclo: number, intento: number) => {
      if (ciclo !== cicloRef.current) return;
      intentoRef.current = intento;
      reiniciarTranscripcion();
      cambiarEstado({ fase: "escuchando", intento });
      // Recién acá se abre el micrófono: la lectura ya terminó, así no se
      // transcribe al propio sintetizador.
      iniciarMicrofono();
      limpiarSilencio();
      silencioRef.current = window.setTimeout(
        () => void fallarIntento(ciclo),
        SILENCIO_MAX_MS,
      );
    },
    // fallarIntento se declara abajo y se referencia recién al vencer el
    // timeout; las dos funciones dependen una de la otra.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reiniciarTranscripcion, cambiarEstado, iniciarMicrofono, limpiarSilencio],
  );

  const fallarIntento = useCallback(
    async (ciclo: number) => {
      if (ciclo !== cicloRef.current) return;
      limpiarSilencio();
      detenerMicrofono();
      const siguiente = intentoRef.current + 1;
      if (siguiente > MAX_INTENTOS_CONFIRMACION) {
        pasarARevisionManual("intentos_agotados", true);
        return;
      }
      cambiarEstado({ fase: "leyendo" });
      const resultado = await hablar([PEDIDO_REINTENTO]);
      if (ciclo !== cicloRef.current) return;
      if (resultado === "error") {
        pasarARevisionManual("sin_sintesis", false);
        return;
      }
      escuchar(ciclo, siguiente);
    },
    [
      limpiarSilencio,
      detenerMicrofono,
      pasarARevisionManual,
      cambiarEstado,
      hablar,
      escuchar,
    ],
  );

  const manejarResultadoFinal = useCallback(
    (texto: string) => {
      if (faseRef.current !== "escuchando") return;
      const ciclo = cicloRef.current;
      const comando = interpretarComandoVoz(texto);
      if (comando === null) {
        void fallarIntento(ciclo);
        return;
      }
      cortar();
      if (comando === "confirmar") {
        cambiarEstado({ fase: "confirmada" });
        onConfirmarRef.current();
      } else {
        cambiarEstado({ fase: "detenida" });
      }
    },
    [fallarIntento, cortar, cambiarEstado],
  );

  useEffect(() => {
    onResultadoFinalRef.current = manejarResultadoFinal;
  }, [manejarResultadoFinal]);

  const iniciar = useCallback(async () => {
    cortar();
    const ciclo = cicloRef.current;
    if (!sintesisSoportada) {
      pasarARevisionManual("sin_sintesis", false);
      return;
    }
    if (!microfono.soportado) {
      pasarARevisionManual("sin_reconocimiento", true);
      return;
    }
    cambiarEstado({ fase: "leyendo" });
    const resultado = await hablar([
      ...enunciadosRef.current,
      PEDIDO_COMANDO,
    ]);
    if (ciclo !== cicloRef.current) return;
    if (resultado === "error") {
      pasarARevisionManual("sin_sintesis", false);
      return;
    }
    if (resultado === "completado") escuchar(ciclo, 1);
  }, [
    cortar,
    sintesisSoportada,
    hablar,
    microfono.soportado,
    pasarARevisionManual,
    cambiarEstado,
    escuchar,
  ]);

  // Permiso de micrófono denegado (o sin hardware) en plena escucha.
  useEffect(() => {
    if (
      microfono.estado === "permiso_denegado" &&
      faseRef.current === "escuchando"
    ) {
      pasarARevisionManual("microfono_denegado", true);
    }
  }, [microfono.estado, pasarARevisionManual]);

  // Decisión 1: arranca sola al llegar a la revisión. Al desmontar se
  // invalida el ciclo (los hooks de síntesis y micrófono se cortan solos).
  useEffect(() => {
    if (habilitada) void iniciar();
    return () => {
      cicloRef.current += 1;
      limpiarSilencio();
    };
    // Solo al montar: después, releer es una acción explícita.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leerDeNuevo = useCallback(() => {
    if (habilitada) void iniciar();
  }, [habilitada, iniciar]);

  const cortarHacia = useCallback(
    (fase: "interrumpida" | "detenida") => {
      if (!FASES_EN_CURSO.includes(faseRef.current)) {
        // Interrumpir desde "detenida" (editar después de un "cancelar")
        // también habilita el clic, por la misma razón que la decisión 7.
        if (fase === "interrumpida" && faseRef.current === "detenida") {
          cambiarEstado({ fase });
        }
        return;
      }
      cortar();
      cambiarEstado({ fase });
    },
    [cortar, cambiarEstado],
  );

  const interrumpir = useCallback(
    () => cortarHacia("interrumpida"),
    [cortarHacia],
  );
  const detener = useCallback(() => cortarHacia("detenida"), [cortarHacia]);

  return {
    estado,
    puedeConfirmarPorClic:
      !habilitada || FASES_CLIC_HABILITADO.includes(estado.fase),
    leerDeNuevo,
    interrumpir,
    detener,
  };
}
