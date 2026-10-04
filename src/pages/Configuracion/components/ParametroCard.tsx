import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { History } from "lucide-react";
import { RangoFisicoBadge } from "../../../components/RangoFisicoBadge";
import { AuditoriaModal } from "../../../components/AuditoriaModal";
import { ConfirmModal } from "../../../components/ui/ConfirmModal";
import { usePermisos } from "../../../hooks/usePermisos";
import type { SaveConfigParams } from "../../../hooks/useConfigParametros";
import { extraerMensajeError } from "../../../services/configParametro.service";
import type {
  ConfigParametro,
  TipoMateriaPrima,
} from "../../../types/configParametro.types";
import {
  CAMPOS_UMBRAL,
  LABEL_CAMPO_UMBRAL,
  inputAUmbrales,
  umbralesAInput,
  umbralesIguales,
  validarUmbrales,
} from "../../../utils/umbralesConfig";
import type { CampoUmbral, UmbralesInput } from "../../../utils/umbralesConfig";
import type { ParametroVisible } from "../constants/parametrosCalidad";
import {
  PARAMETROS_META,
  TIPO_MATERIA_PRIMA_TABS,
} from "../constants/parametrosCalidad";
import { ZonasSemaforoBar } from "./ZonasSemaforoBar";

interface ParametroCardProps {
  parametro: ParametroVisible;
  tipoMateriaPrima: TipoMateriaPrima;
  config: ConfigParametro | undefined;
  onSave: (params: SaveConfigParams) => Promise<ConfigParametro>;
}

const ES_ALERTA: Record<CampoUmbral, boolean> = {
  umbralAlertaMin: true,
  umbralMin: false,
  umbralMax: false,
  umbralAlertaMax: true,
};

export function ParametroCard({
  parametro,
  tipoMateriaPrima,
  config,
  onSave,
}: ParametroCardProps) {
  const meta = PARAMETROS_META[parametro];
  const Icon = meta.icon;
  const { puede } = usePermisos();
  const materiaPrimaLabel =
    TIPO_MATERIA_PRIMA_TABS.find(
      (t) => t.value === tipoMateriaPrima,
    )?.label.toLowerCase() ?? tipoMateriaPrima;

  const [input, setInput] = useState<UmbralesInput>(() =>
    umbralesAInput(config),
  );
  const [tocados, setTocados] = useState<Set<CampoUmbral>>(new Set());
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [mostrarAuditoria, setMostrarAuditoria] = useState(false);

  // HU-63: el back manda `auditoria` en cualquier GET de config-parametros;
  // se muestra a quien tiene el módulo de auditoría.
  const puedeVerAuditoriaConfig = puede("auditoria", "ver");
  // PUT /config-parametros/:id si ya existe la config, POST si no.
  const puedeGuardar = puede(
    "configuracion_empresa",
    config ? "editar" : "crear",
  );

  const resetearAGuardado = (guardado: ConfigParametro | undefined) => {
    setInput(umbralesAInput(guardado));
    setTocados(new Set());
    setIntentoGuardar(false);
    setErrorServidor(null);
  };

  // Al cambiar de tipo de materia prima (o llegar el fetch inicial, o guardar)
  // resincroniza los inputs con lo que hay guardado para esa combinación puntual.
  useEffect(() => {
    setInput(umbralesAInput(config));
    setTocados(new Set());
    setIntentoGuardar(false);
    setErrorServidor(null);
  }, [config, tipoMateriaPrima]);

  const errores = validarUmbrales(input, meta.rangoFisico);
  const esValido = Object.keys(errores).length === 0;
  const umbrales = esValido ? inputAUmbrales(input) : undefined;
  const sinCambios = config
    ? umbrales !== undefined && umbralesIguales(umbrales, config)
    : CAMPOS_UMBRAL.every((campo) => input[campo].trim() === "");

  const handleChange = (campo: CampoUmbral, valor: string) => {
    setInput((prev) => ({ ...prev, [campo]: valor }));
    setErrorServidor(null);
  };

  const handleBlur = (campo: CampoUmbral) => {
    setTocados((prev) => new Set(prev).add(campo));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIntentoGuardar(true);
    if (!esValido || sinCambios) return;
    setConfirmando(true);
  };

  const handleConfirmar = async () => {
    if (!umbrales) return;
    setIsSaving(true);
    setErrorServidor(null);
    try {
      await onSave({
        id: config?.id,
        parametro,
        tipoMateriaPrima,
        ...umbrales,
      });
    } catch (err) {
      setErrorServidor(
        extraerMensajeError(err, "No se pudo guardar. Intentá nuevamente."),
      );
    } finally {
      setIsSaving(false);
      setConfirmando(false);
    }
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex items-center gap-2">
          {puedeVerAuditoriaConfig && config?.auditoria && (
            <button
              type="button"
              onClick={() => setMostrarAuditoria(true)}
              className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              title="Auditoría"
            >
              <History className="h-4 w-4" />
            </button>
          )}
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            {meta.unidad}
          </span>
        </div>
      </div>

      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
        {meta.label}
      </h3>

      <RangoFisicoBadge
        label={meta.label}
        min={meta.rangoFisico.min}
        max={meta.rangoFisico.max}
      />

      <div className="grid grid-cols-2 gap-3">
        {CAMPOS_UMBRAL.map((campo) => {
          const id = `umbral-${tipoMateriaPrima}-${parametro}-${campo}`;
          const error =
            tocados.has(campo) || intentoGuardar ? errores[campo] : undefined;
          return (
            <div key={campo} className="flex flex-col gap-1">
              <label
                htmlFor={id}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 flex-shrink-0 rounded-full ${ES_ALERTA[campo] ? "bg-amber-400" : "bg-green-500"}`}
                />
                {LABEL_CAMPO_UMBRAL[campo]}
              </label>
              <input
                id={id}
                type="number"
                inputMode="decimal"
                step="any"
                value={input[campo]}
                disabled={isSaving || !puedeGuardar}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
                onChange={(e) => handleChange(campo, e.target.value)}
                onBlur={() => handleBlur(campo)}
                className={`w-full min-w-0 rounded-md border px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:bg-slate-800 dark:text-white ${
                  error
                    ? "border-red-500"
                    : "border-slate-300 dark:border-slate-700"
                }`}
              />
              {error && (
                <p
                  id={`${id}-error`}
                  className="text-xs text-red-600 dark:text-red-400"
                >
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <ZonasSemaforoBar umbrales={umbrales} rangoFisico={meta.rangoFisico} />

      {errorServidor && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/15 dark:text-red-400"
        >
          {errorServidor}
        </p>
      )}

      {!puedeGuardar && (
        <p className="mt-auto text-xs text-slate-500 dark:text-slate-400">
          Solo lectura: tu rol no puede modificar estos umbrales.
        </p>
      )}

      {puedeGuardar && (
        <div className="mt-auto flex flex-wrap items-center justify-end gap-2">
          {config && !sinCambios && !isSaving && (
            <button
              type="button"
              onClick={() => resetearAGuardado(config)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Descartar
            </button>
          )}
          <button
            type="submit"
            disabled={isSaving || sinCambios}
            className="rounded-lg bg-[#3d6fcf] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#3460b5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmando}
        title={`¿Guardar umbrales de ${meta.label}?`}
        description={`Este cambio afecta el semáforo de todos los lotes de ${materiaPrimaLabel}.`}
        confirmLabel="Guardar"
        isLoading={isSaving}
        onConfirm={handleConfirmar}
        onCancel={() => setConfirmando(false)}
      />

      <AuditoriaModal
        isOpen={mostrarAuditoria}
        titulo={`Auditoría — ${meta.label}`}
        auditoria={config?.auditoria}
        onClose={() => setMostrarAuditoria(false)}
      />
    </form>
  );
}
