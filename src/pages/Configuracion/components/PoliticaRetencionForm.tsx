import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { RadioCard } from "../../../components/ui/RadioCard";
import { extraerMensajeError } from "../../../services/retencion.service";
import {
  AccionVencimiento,
  type PoliticaRetencion,
  type PoliticaRetencionInput,
} from "../../../types/retencion.types";
import { RETENCION_MINIMA_MESES, validarPeriodoRetencion } from "../../../utils/retencion";
import { ACCION_VENCIMIENTO_META } from "../constants/retencion";

interface PoliticaRetencionFormProps {
  // El padre lo monta con key={politica.actualizadoEn}: al guardar se
  // re-inicializa con los valores persistidos.
  politica: PoliticaRetencion;
  isGuardando: boolean;
  mensajeExito: string;
  onGuardar: (input: PoliticaRetencionInput) => Promise<void>;
  onEditar: () => void;
}

// HU-48 AC1 + AC2: período (mín. 24 meses, con el motivo normativo inline) y
// acción al cumplirse el período, más el aviso anticipado (AC4).
export function PoliticaRetencionForm({
  politica,
  isGuardando,
  mensajeExito,
  onGuardar,
  onEditar,
}: PoliticaRetencionFormProps) {
  const [periodo, setPeriodo] = useState(String(politica.periodoMeses));
  const [accion, setAccion] = useState<AccionVencimiento>(politica.accionAlVencer);
  const [avisoActivo, setAvisoActivo] = useState(politica.avisoAnticipado.activo);
  const [serverError, setServerError] = useState("");

  const errorPeriodo = validarPeriodoRetencion(periodo);
  const hayCambios =
    periodo.trim() !== String(politica.periodoMeses) ||
    accion !== politica.accionAlVencer ||
    avisoActivo !== politica.avisoAnticipado.activo;

  const editar = () => {
    setServerError("");
    onEditar();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (errorPeriodo || !hayCambios) return;
    setServerError("");
    try {
      await onGuardar({
        periodoMeses: Number(periodo),
        accionAlVencer: accion,
        avisoAnticipado: { ...politica.avisoAnticipado, activo: avisoActivo },
      });
    } catch (err) {
      setServerError(
        extraerMensajeError(err, "No se pudo guardar la política. Intentá nuevamente."),
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900"
    >
      <div>
        <h2 className="font-semibold text-slate-900 dark:text-white">Política vigente</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Última actualización: {new Date(politica.actualizadoEn).toLocaleString("es-AR")}
        </p>
      </div>

      <div className="max-w-xs">
        <Input
          id="retencion-periodo"
          label="Período de conservación (meses)"
          type="number"
          inputMode="numeric"
          min={RETENCION_MINIMA_MESES}
          step={1}
          value={periodo}
          disabled={isGuardando}
          onChange={(e) => {
            setPeriodo(e.target.value);
            editar();
          }}
          error={errorPeriodo ?? undefined}
        />
        {!errorPeriodo && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Mínimo {RETENCION_MINIMA_MESES} meses (SENASA / CAA).
          </p>
        )}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          Acción al cumplirse el período
        </legend>
        {Object.values(AccionVencimiento).map((valor) => (
          <RadioCard
            key={valor}
            name="retencion-accion"
            value={valor}
            label={ACCION_VENCIMIENTO_META[valor].label}
            checked={accion === valor}
            onChange={(v) => {
              setAccion(v as AccionVencimiento);
              editar();
            }}
          />
        ))}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {ACCION_VENCIMIENTO_META[accion].descripcion} Ninguna opción elimina registros.
        </p>
      </fieldset>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={avisoActivo}
          disabled={isGuardando}
          onChange={(e) => {
            setAvisoActivo(e.target.checked);
            editar();
          }}
          className="mt-0.5 h-4 w-4 accent-blue-600"
        />
        <span className="text-sm">
          <span className="font-medium text-slate-800 dark:text-slate-200">
            Avisar {politica.avisoAnticipado.diasAntes} días antes del vencimiento
          </span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">
            El aviso llega al Gerente como notificación (campanita del encabezado).
          </span>
        </span>
      </label>

      {serverError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
          {serverError}
        </p>
      )}
      {mensajeExito && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-500/15 dark:text-green-400">
          {mensajeExito}
        </p>
      )}

      <div>
        <Button type="submit" isLoading={isGuardando} disabled={!!errorPeriodo || !hayCambios}>
          <Check className="mr-2 h-4 w-4" />
          Guardar política
        </Button>
      </div>
    </form>
  );
}
