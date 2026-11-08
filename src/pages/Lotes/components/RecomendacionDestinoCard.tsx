import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Ban, CheckCircle2, Clock, RotateCcw, Sparkles } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import type { BadgeVariant } from "../../../components/ui/Badge";
import { Select } from "../../../components/ui/Select";
import { usePermisos } from "../../../hooks/usePermisos";
import { useRecomendacionDestino } from "../../../hooks/useRecomendacionDestino";
import type {
  DestinoVigente,
  DivergenciaVigente,
} from "../../../hooks/useDestinoProductivoLote";
import { ClasificacionLote } from "../../../types/lote.types";
import {
  derivarNivelConfianza,
  type NivelConfianzaRecomendacion,
} from "../../../types/recomendacionDestino.types";
import { puedeEntrarA } from "../../../utils/accesoRutas";

// HU-49: tarjeta de recomendación de destino productivo por ML dentro de
// "Editar lote" (Figura 7), conectada a GET/PATCH /recomendaciones reales
// (antes mock visual, PR #104). Autocontenida a propósito: el "destino
// productivo" del catálogo /destinos-productivos NO es lo mismo que el
// Select "Destino inicial" (DestinoLote, enum fijo) que vive en
// LoteFormModal — son dos conceptos distintos del backend (ver el
// comentario en destino-productivo.entity.ts), así que esta tarjeta no
// toca ni valida contra ese campo.
//
// HU-78: decisiones vigentes (2026-11-08, sujetas a confirmación del PO):
// 1. Visibilidad: la sugerencia solo se ve dentro de "Editar lote", es
//    decir, la ven quienes pueden responderla (Gerente, Responsable de
//    producción, Responsable de calidad: trazabilidad:editar). El Operario
//    de línea no la ve por ahora, aunque GET /recomendaciones/lote/:loteId
//    le permitiría leerla (trazabilidad:ver).
// 2. CA9: el selector manual de destino productivo (PATCH
//    /lotes/:id/destino-productivo, en LoteFormModal) sigue siempre
//    disponible, haya o no sugerencia. Esta tarjeta no lo condiciona.
// 3. D-08: la sugerencia se muestra solo si clasificacion === APTO.
//    - No Apto → "No aplica", con enlace a la revisión de calidad (HU-22).
//    - Pendiente (null; HU-76) → "Se habilita cuando el lote esté
//      clasificado", sin Aceptar ni Recalcular: un lote pendiente puede
//      terminar No Apto.
//    En ninguno de los dos casos se pide la recomendación al back.
//    TODO(backend): el back genera recomendación también para lotes no_apto
//    (lote.service.ts create: evaluarYClasificar → generarRecomendacion sin
//    mirar la clasificación) y GET /recomendaciones/lote/:loteId tampoco lo
//    filtra; la regla tiene que estar allá también.

// El backend exige un mínimo de 20 caracteres (ver
// responder-recomendacion.dto.ts, HU-37 AC2) — acá se pide más para que la
// justificación sea útil en auditoría, pero nunca menos: así ningún envío
// que pase la validación del frontend puede rebotar contra el backend por
// longitud.
const JUSTIFICACION_MIN_LENGTH = 30;

const NIVEL_BADGE_VARIANT: Record<NivelConfianzaRecomendacion, BadgeVariant> = {
  alta: "success",
  media: "warning",
  baja: "danger",
};

const NIVEL_LABEL: Record<NivelConfianzaRecomendacion, string> = {
  alta: "Confianza alta",
  media: "Confianza media",
  baja: "Confianza baja",
};

interface RecomendacionDestinoCardProps {
  loteId: number;
  // D-08: decide si se pide la sugerencia (ver el comentario de arriba).
  clasificacion: ClasificacionLote | null;
  // HU-34/HU-37: el destino vigente (y, si corresponde, la divergencia que
  // lo originó) ahora vive en el backend (GET
  // /lotes/:id/destino-productivo/historial) y se calcula una sola vez en
  // el modal contenedor (useDestinoProductivoLote), no acá — evita pedirlo
  // dos veces y mantiene una sola fuente de verdad dentro de "Editar lote".
  destinoVigente: DestinoVigente | null;
  divergenciaVigente: DivergenciaVigente | null;
  // Se llama tras aceptar/rechazar para que el modal contenedor vuelva a
  // pedir el historial (el backend ya escribió el cambio en
  // lote_destino_historial al responder, ver ml.service.ts).
  onDestinoRespondido: () => void;
}

function EtiquetaSugerencia() {
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
      <Sparkles className="h-3.5 w-3.5" /> SUGERENCIA DEL SISTEMA
    </span>
  );
}

function SugerenciaNoAplica() {
  const navigate = useNavigate();
  const permisos = usePermisos();
  const puedeVerRevision = puedeEntrarA("/lotes/revision", permisos);
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <EtiquetaSugerencia />
      <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
        <Ban className="h-4 w-4" /> No aplica
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Este lote está clasificado como No Apto. Su destino se define en la revisión de
        calidad, no mediante sugerencias de IA.
      </p>
      {puedeVerRevision && (
        <button
          type="button"
          onClick={() => navigate("/lotes/revision")}
          className="self-start text-xs font-semibold text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Ir a la revisión de calidad
        </button>
      )}
    </div>
  );
}

function SugerenciaPendienteClasificacion() {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <EtiquetaSugerencia />
      <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
        <Clock className="h-4 w-4" /> Pendiente de clasificar
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Se habilita cuando el lote esté clasificado.
      </p>
    </div>
  );
}

// D-08: el gate va en un componente aparte para que el hook (y el GET) solo
// corra con lotes Apto, sin romper las reglas de los hooks.
export function RecomendacionDestinoCard({
  clasificacion,
  ...props
}: RecomendacionDestinoCardProps) {
  if (clasificacion === ClasificacionLote.NO_APTO) return <SugerenciaNoAplica />;
  if (clasificacion !== ClasificacionLote.APTO) return <SugerenciaPendienteClasificacion />;
  return <RecomendacionDestinoApto {...props} />;
}

function RecomendacionDestinoApto({
  loteId,
  destinoVigente,
  divergenciaVigente,
  onDestinoRespondido,
}: Omit<RecomendacionDestinoCardProps, "clasificacion">) {
  const {
    recomendacion,
    isLoading,
    error,
    refetch,
    destinosProductivos,
    isLoadingDestinos,
    errorDestinos,
    responder,
    isResponding,
    errorResponder,
    respuestaConfirmada,
  } = useRecomendacionDestino(loteId);

  const [mostrarSelectorDestino, setMostrarSelectorDestino] = useState(false);
  const [destinoRealId, setDestinoRealId] = useState("");
  const [justificacion, setJustificacion] = useState("");
  const [justificacionTocada, setJustificacionTocada] = useState(false);

  const resetSelectorDestino = () => {
    setMostrarSelectorDestino(false);
    setDestinoRealId("");
    setJustificacion("");
    setJustificacionTocada(false);
  };

  const header = (
    <div className="flex items-center justify-between gap-3">
      <EtiquetaSugerencia />
      <button
        type="button"
        onClick={() => {
          resetSelectorDestino();
          refetch();
        }}
        disabled={isLoading}
        className="flex items-center gap-1 text-xs font-medium text-slate-400 transition hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-500 dark:hover:text-slate-300"
      >
        <RotateCcw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} /> Recalcular
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        {header}
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Buscando una recomendación para este lote...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-500/10">
        {header}
        <p className="flex items-center gap-1.5 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
        <button
          type="button"
          onClick={refetch}
          className="self-start text-xs font-semibold text-red-700 underline hover:no-underline dark:text-red-400"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (respuestaConfirmada) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-500/10">
        {header}
        <p className="flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          Recomendación {respuestaConfirmada.estado === "aceptada" ? "aceptada" : "rechazada"}
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Destino asignado: <strong>{respuestaConfirmada.destino.nombre}</strong>
        </p>
      </div>
    );
  }

  if (!recomendacion) {
    // El destino vigente (si existe, sea cual sea su origen) siempre va
    // primero: es el dato que importa para quien está mirando el lote hoy.
    // "Sin recomendación disponible" queda reservado para cuando de verdad
    // no hay ningún destino cargado — antes se mostraba ese texto incluso
    // con un destino ya asignado, y parecía que no había nada cargado.
    if (divergenciaVigente && destinoVigente) {
      return (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-500/10">
          {header}
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            Destino asignado: <strong>{destinoVigente.destinoActualNombre}</strong>
          </p>
          <p className="flex items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" /> Divergencia justificada respecto a la
            recomendación
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            El sistema había recomendado{" "}
            <strong>{divergenciaVigente.destinoRecomendadoNombre}</strong>.
          </p>
          {divergenciaVigente.justificacion && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Justificación: {divergenciaVigente.justificacion}
            </p>
          )}
        </div>
      );
    }
    if (destinoVigente) {
      return (
        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          {header}
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            Destino asignado: <strong>{destinoVigente.destinoActualNombre}</strong>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No hay una recomendación pendiente para este lote.
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        {header}
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Sin recomendación disponible
        </p>
        {/* El modelo no usa proveedor ni tambo, y el back devuelve vacío
            por varias causas que hoy no distingue (sin modelo entrenado,
            servicio de IA caído al registrar el lote, destino fuera del
            catálogo): no se afirma un motivo puntual. */}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          El sistema no tiene una recomendación para este lote. Podés asignar el
          destino productivo manualmente.
        </p>
      </div>
    );
  }

  const nivelConfianza = derivarNivelConfianza(recomendacion.confianza);
  // HU-37 AC1: el destino recomendado no es una alternativa válida acá —
  // este selector es específicamente para elegir OTRO destino (si el
  // operador está de acuerdo, el flujo es "Aceptar recomendación", no
  // este). Bug real encontrado en dev (recomendaciones_destino id=20,
  // LOTE-1-00087): se podía elegir el mismo destino recomendado y quedaba
  // una "divergencia" que no era tal. El backend también lo rechaza ahora
  // con 400 (ver ml.service.ts).
  const destinosAlternativos = destinosProductivos.filter(
    (d) => d.id !== recomendacion.destinoRecomendado.id,
  );
  const hayAlternativas = destinosAlternativos.length > 0;
  const destinoRealSeleccionado = destinoRealId
    ? destinosAlternativos.find((d) => d.id === Number(destinoRealId))
    : undefined;
  const justificacionValida = justificacion.trim().length >= JUSTIFICACION_MIN_LENGTH;
  const puedeConfirmarRechazo = destinoRealId !== "" && justificacionValida && !isResponding;

  const handleAceptar = async () => {
    const ok = await responder({ aceptada: true });
    // El backend ya escribe el cambio en lote_destino_historial al
    // responder (ver ml.service.ts) — solo hace falta avisarle al
    // contenedor que vuelva a pedir el historial para reflejarlo.
    if (ok) onDestinoRespondido();
  };

  const handleConfirmarRechazo = async () => {
    setJustificacionTocada(true);
    if (!puedeConfirmarRechazo || !destinoRealSeleccionado) return;
    const ok = await responder({
      aceptada: false,
      destinoRealId: Number(destinoRealId),
      justificacion: justificacion.trim(),
    });
    if (ok) onDestinoRespondido();
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      {header}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          Destino recomendado por el sistema:{" "}
          {recomendacion.destinoRecomendado.nombre}
        </p>
        <div className="flex flex-col items-end gap-1">
          <span className="text-lg font-bold text-slate-900 dark:text-white">
            {recomendacion.confianza}%
          </span>
          <Badge variant={NIVEL_BADGE_VARIANT[nivelConfianza]}>
            {NIVEL_LABEL[nivelConfianza]}
          </Badge>
        </div>
      </div>

      {!mostrarSelectorDestino ? (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleAceptar}
            disabled={isResponding}
            className="flex flex-1 items-center justify-center rounded-lg bg-[#3d6fcf] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3460b5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isResponding ? "Aplicando..." : "Aceptar recomendación"}
          </button>
          <button
            type="button"
            onClick={() => setMostrarSelectorDestino(true)}
            disabled={isResponding}
            className="flex flex-1 items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-center text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Elegí otro destino
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-md bg-amber-50 p-3 dark:bg-amber-500/10">
          <Select
            id="recomendacion-destino-real"
            label="Destino real *"
            options={[
              {
                value: "",
                label: isLoadingDestinos ? "Cargando destinos..." : "Seleccioná un destino",
              },
              ...destinosAlternativos.map((d) => ({ value: String(d.id), label: d.nombre })),
            ]}
            value={destinoRealId}
            disabled={isLoadingDestinos || isResponding || !hayAlternativas}
            onChange={(e) => setDestinoRealId(e.target.value)}
          />
          {errorDestinos && (
            <p className="text-xs text-red-600 dark:text-red-400">{errorDestinos}</p>
          )}
          {/* Explica por qué no se puede rechazar, en vez de dejar el
              selector vacío con el botón deshabilitado sin decir nada. */}
          {!isLoadingDestinos && !hayAlternativas && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              No hay otro destino productivo configurado para elegir — el
              único disponible es el que ya recomendó el sistema. Para
              registrar una divergencia hace falta al menos otro destino
              activo en el catálogo.
            </p>
          )}

          {destinoRealSeleccionado && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Elegiste <strong>{destinoRealSeleccionado.nombre}</strong> en lugar
              del destino recomendado{" "}
              <strong>{recomendacion.destinoRecomendado.nombre}</strong>.
            </p>
          )}

          <label
            htmlFor="justificacion-divergencia"
            className="text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Justificación de la divergencia *
          </label>
          <textarea
            id="justificacion-divergencia"
            rows={3}
            placeholder="Explicá por qué este lote se deriva a un destino distinto al recomendado..."
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
            className={`w-full rounded-md border px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white ${
              justificacionTocada && !justificacionValida
                ? "border-red-500"
                : "border-slate-300 dark:border-slate-700"
            }`}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {justificacion.length}/{JUSTIFICACION_MIN_LENGTH} mínimo {JUSTIFICACION_MIN_LENGTH}{" "}
              caracteres
            </span>
            {justificacionTocada && !justificacionValida && (
              <span className="text-xs text-red-600 dark:text-red-400">
                Contá al menos {JUSTIFICACION_MIN_LENGTH} caracteres
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Esta decisión queda registrada para auditoría con tu usuario y la
            fecha/hora del cambio.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetSelectorDestino}
              disabled={isResponding}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmarRechazo}
              disabled={!puedeConfirmarRechazo}
              className="flex-1 rounded-lg bg-[#3d6fcf] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3460b5] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isResponding ? "Confirmando..." : "Confirmar destino real"}
            </button>
          </div>
        </div>
      )}

      {errorResponder && (
        <p className="text-xs text-red-600 dark:text-red-400">{errorResponder}</p>
      )}
    </div>
  );
}
