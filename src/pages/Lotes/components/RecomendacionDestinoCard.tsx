import { useState } from "react";
import { AlertCircle, CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import type { BadgeVariant } from "../../../components/ui/Badge";
import { Select } from "../../../components/ui/Select";
import { useAuth } from "../../../hooks/useAuth";
import { useRecomendacionDestino } from "../../../hooks/useRecomendacionDestino";
import { registrarCambioDestino } from "../../../hooks/useDestinoProductivoLote";
import {
  derivarNivelConfianza,
  type NivelConfianzaRecomendacion,
} from "../../../types/recomendacionDestino.types";

// HU-49: tarjeta de recomendación de destino productivo por ML dentro de
// "Editar lote" (Figura 7), conectada a GET/PATCH /recomendaciones reales
// (antes mock visual, PR #104). Autocontenida a propósito: el "destino
// productivo" del catálogo /destinos-productivos NO es lo mismo que el
// Select "Destino inicial" (DestinoLote, enum fijo) que vive en
// LoteFormModal — son dos conceptos distintos del backend (ver el
// comentario en destino-productivo.entity.ts), así que esta tarjeta no
// toca ni valida contra ese campo.

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
}

export function RecomendacionDestinoCard({ loteId }: RecomendacionDestinoCardProps) {
  const { user } = useAuth();
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
      <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
        <Sparkles className="h-3.5 w-3.5" /> SUGERENCIA DEL SISTEMA
      </span>
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
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        {header}
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Sin recomendación disponible
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No hay historial suficiente de este proveedor para generar una
          predicción confiable.
        </p>
      </div>
    );
  }

  const nivelConfianza = derivarNivelConfianza(recomendacion.confianza);
  const destinoRealSeleccionado = destinoRealId
    ? destinosProductivos.find((d) => d.id === Number(destinoRealId))
    : undefined;
  const justificacionValida = justificacion.trim().length >= JUSTIFICACION_MIN_LENGTH;
  const puedeConfirmarRechazo = destinoRealId !== "" && justificacionValida && !isResponding;

  const handleAceptar = async () => {
    const ok = await responder({ aceptada: true });
    // HU-34/HU-37 (mock visual): el backend todavía no tiene un endpoint
    // para leer/escribir Lote.destinoProductivoId — se completa acá lo que
    // falta (ver useDestinoProductivoLote.ts). Aceptar no es una
    // divergencia: el destino elegido es el mismo que el recomendado.
    if (ok) {
      registrarCambioDestino({
        loteId,
        destinoNuevoId: recomendacion.destinoRecomendado.id,
        destinoNuevoNombre: recomendacion.destinoRecomendado.nombre,
        usuario: user?.email ?? "Usuario desconocido",
        origen: "recomendacion_ml",
        esDivergencia: false,
      });
    }
  };

  const handleConfirmarRechazo = async () => {
    setJustificacionTocada(true);
    if (!puedeConfirmarRechazo || !destinoRealSeleccionado) return;
    const ok = await responder({ aceptada: false, destinoRealId: Number(destinoRealId) });
    if (ok) {
      registrarCambioDestino({
        loteId,
        destinoNuevoId: destinoRealSeleccionado.id,
        destinoNuevoNombre: destinoRealSeleccionado.nombre,
        usuario: user?.email ?? "Usuario desconocido",
        origen: "recomendacion_ml",
        esDivergencia: true,
        justificacion: justificacion.trim(),
      });
    }
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
              ...destinosProductivos.map((d) => ({ value: String(d.id), label: d.nombre })),
            ]}
            value={destinoRealId}
            disabled={isLoadingDestinos || isResponding}
            onChange={(e) => setDestinoRealId(e.target.value)}
          />
          {errorDestinos && (
            <p className="text-xs text-red-600 dark:text-red-400">{errorDestinos}</p>
          )}

          {destinoRealSeleccionado &&
            destinoRealSeleccionado.id !== recomendacion.destinoRecomendado.id && (
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
