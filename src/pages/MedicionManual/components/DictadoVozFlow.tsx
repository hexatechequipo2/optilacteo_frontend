import { useEffect, useState } from "react";
import { useDictadoVozParseo } from "../../../hooks/useDictadoVozParseo";
import { useSpeechRecognition } from "../../../hooks/useSpeechRecognition";
import type { ParsearDictadoResponse } from "../../../types/dictadoVoz.types";
import type { Lote } from "../../../types/lote.types";
import { DictadoVozModal } from "./DictadoVozModal";
import { RevisionDictadoVozModal } from "./RevisionDictadoVozModal";

type PasoDictado = "captura" | "revision";

interface DictadoVozFlowProps {
  isOpen: boolean;
  // Lista completa de lotes elegibles: la pantalla de revisión permite
  // cambiar el lote destino sin cerrar el flujo (ver selector ahí), por eso
  // necesita más que el lote inicial.
  lotes: Lote[];
  loteInicial: Lote | null;
  onClose: () => void;
}

// HU-55: orquesta el flujo completo de dictado — captura de voz (Web Speech
// API) -> parseo en el backend (POST /dictado/parsear, solo previsualiza)
// -> revisión editable -> registro real (POST /mediciones-manuales) -- y le
// delega cada paso a su propio modal. Vive separado de MedicionManualPage
// para no ensuciar la página con el estado del reconocedor y las dos
// llamadas a la API que intervienen.
export function DictadoVozFlow({
  isOpen,
  lotes,
  loteInicial,
  onClose,
}: DictadoVozFlowProps) {
  const [paso, setPaso] = useState<PasoDictado>("captura");
  const [resultadoParseo, setResultadoParseo] =
    useState<ParsearDictadoResponse | null>(null);
  // Lote al que apunta el flujo. Empieza en el que ya estaba elegido en la
  // página; el selector de la pantalla de revisión puede cambiarlo, y solo
  // se actualiza junto con un `resultadoParseo` nuevo (ver
  // handleCambiarLote) para que nunca queden desincronizados entre sí.
  const [loteActivoId, setLoteActivoId] = useState<number | null>(null);

  const {
    estado: estadoVoz,
    soportado,
    transcripcionInterina,
    transcripcionAcumulada,
    iniciar,
    pausar,
    detener,
    reiniciarTranscripcion,
  } = useSpeechRecognition();

  const {
    parsear,
    isParsing,
    error: errorParseo,
    resetError: resetErrorParseo,
  } = useDictadoVozParseo();

  // Arranca a escuchar apenas se abre el modal en el paso de captura.
  useEffect(() => {
    if (isOpen && paso === "captura" && soportado) {
      iniciar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, paso, soportado]);

  // Al abrir, el flujo arranca apuntando al lote que ya estaba seleccionado
  // en la página. Al cerrar, todo vuelve a cero para la próxima sesión.
  useEffect(() => {
    if (isOpen) {
      setLoteActivoId(loteInicial?.id ?? null);
    } else {
      setPaso("captura");
      setResultadoParseo(null);
      reiniciarTranscripcion();
      resetErrorParseo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loteActivo = lotes.find((l) => l.id === loteActivoId) ?? null;

  if (!isOpen || !loteActivo) return null;

  const handleConfirmarCaptura = async () => {
    detener();
    try {
      const resultado = await parsear(
        loteActivo.id,
        transcripcionAcumulada.trim(),
      );
      setResultadoParseo(resultado);
      setPaso("revision");
    } catch {
      // El mensaje ya queda en errorParseo; el modal de captura sigue
      // abierto (el texto dictado no se pierde) para reintentar.
    }
  };

  // Los obligatorios y los umbrales dependen de la configuración del lote
  // (tipo de materia prima + empresa), así que cambiar de lote en la
  // revisión obliga a volver a interpretar el mismo texto dictado contra el
  // lote nuevo. Si falla, el lote y el resultado anteriores no se tocan: el
  // operario puede reintentar o elegir otro.
  const handleCambiarLote = async (nuevoLoteId: number) => {
    if (nuevoLoteId === loteActivoId || !resultadoParseo || isParsing) return;
    try {
      const resultado = await parsear(
        nuevoLoteId,
        resultadoParseo.textoOriginal,
      );
      setLoteActivoId(nuevoLoteId);
      setResultadoParseo(resultado);
    } catch {
      // El mensaje queda en errorParseo y se muestra en la revisión.
    }
  };

  const handleCerrarFlujo = () => {
    detener();
    onClose();
  };

  const handleVolverADictar = () => {
    setResultadoParseo(null);
    resetErrorParseo();
    reiniciarTranscripcion();
    setPaso("captura");
  };

  return (
    <>
      <DictadoVozModal
        isOpen={paso === "captura"}
        estado={estadoVoz}
        transcripcionInterina={transcripcionInterina}
        transcripcionAcumulada={transcripcionAcumulada}
        isEnviando={isParsing}
        errorEnvio={errorParseo}
        onClose={handleCerrarFlujo}
        onPausarOEscuchar={estadoVoz === "escuchando" ? pausar : iniciar}
        onConfirmar={handleConfirmarCaptura}
      />
      <RevisionDictadoVozModal
        isOpen={paso === "revision"}
        lote={loteActivo}
        lotesDisponibles={lotes}
        resultado={resultadoParseo}
        isCambiandoLote={isParsing}
        errorCambioLote={errorParseo}
        onCambiarLote={handleCambiarLote}
        onVolverADictar={handleVolverADictar}
        onCancelar={handleCerrarFlujo}
      />
    </>
  );
}
