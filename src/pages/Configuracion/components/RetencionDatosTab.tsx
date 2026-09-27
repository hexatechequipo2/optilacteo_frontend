import { useMemo, useState } from "react";
import { Archive, Clock, ShieldCheck, TriangleAlert, type LucideIcon } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { ConfirmModal } from "../../../components/ui/ConfirmModal";
import { useRetencion, type RegistroRetencionEvaluado } from "../../../hooks/useRetencion";
import { extraerMensajeError } from "../../../services/retencion.service";
import { NivelAlerta } from "../../../types/notificacion.types";
import { EntidadRetenible, type PoliticaRetencionInput } from "../../../types/retencion.types";
import { ENTIDADES_CRITICAS, RETENCION_MINIMA_MESES } from "../../../utils/retencion";
import { NIVEL_ALERTA_META } from "../../Alertas/constants/alertas.constants";
import { ENTIDAD_RETENIBLE_META } from "../constants/retencion";
import { PoliticaRetencionForm } from "./PoliticaRetencionForm";
import { RegistrosProximosVencerTabla } from "./RegistrosProximosVencerTabla";

interface ContadorProps {
  label: string;
  valor: number;
  icon: LucideIcon;
  className: string;
}

function Contador({ label, valor, icon: Icono, className }: ContadorProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${className}`}>
        <Icono className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{valor}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}

// HU-48 (Pantalla 4, tab "Retención de datos", solo Gerente — ver
// TABS_GERENTE en ConfiguracionPage.tsx). Mock: ver retencion.service.ts.
export function RetencionDatosTab() {
  const {
    politica,
    registros,
    proximosAVencer,
    contadores,
    isLoading,
    error,
    guardarPolitica,
    isGuardando,
    aplicarAccionPolitica,
    darDeBaja,
    procesandoClave,
  } = useRetencion();

  const [mensajeExito, setMensajeExito] = useState("");
  const [errorAccion, setErrorAccion] = useState("");
  const [registroABajar, setRegistroABajar] = useState<RegistroRetencionEvaluado | null>(null);

  const conteoPorEntidad = useMemo(() => {
    const conteo = Object.fromEntries(
      Object.values(EntidadRetenible).map((e) => [e, 0]),
    ) as Record<EntidadRetenible, number>;
    for (const registro of registros) conteo[registro.entidad] += 1;
    return conteo;
  }, [registros]);

  if (isLoading) return <p className="text-slate-500 dark:text-slate-400">Cargando...</p>;

  if (error || !politica) {
    return (
      <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
        {error ?? "No se pudo cargar la política de retención."}
      </p>
    );
  }

  const handleGuardar = async (input: PoliticaRetencionInput) => {
    setMensajeExito("");
    await guardarPolitica(input);
    setMensajeExito("La política de retención se guardó correctamente.");
  };

  const ejecutar = async (accion: () => Promise<void>) => {
    setErrorAccion("");
    try {
      await accion();
    } catch (err) {
      setErrorAccion(extraerMensajeError(err, "No se pudo aplicar la acción. Intentá nuevamente."));
    }
  };

  const advertencia = NIVEL_ALERTA_META[NivelAlerta.ADVERTENCIA];
  const IconoAdvertencia = advertencia.icon;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 sm:p-6 dark:border-blue-500/20 dark:bg-blue-500/5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white">
            <Archive className="h-5 w-5" />
          </span>
          <span className="font-semibold text-slate-900 dark:text-white">Retención de datos</span>
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Definí cuánto tiempo se conservan los registros y qué pasa cuando se cumple el período. Por
          resoluciones del SENASA y la normativa del CAA el mínimo es de {RETENCION_MINIMA_MESES}{" "}
          meses: antes de ese plazo ningún registro puede eliminarse, archivarse ni darse de baja, sin
          importar el rol.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <PoliticaRetencionForm
            key={politica.actualizadoEn}
            politica={politica}
            isGuardando={isGuardando}
            mensajeExito={mensajeExito}
            onGuardar={handleGuardar}
            onEditar={() => setMensajeExito("")}
          />
        </div>

        <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">Alcance de la política</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Entidades críticas: al cumplirse el período admiten baja lógica, nunca eliminación física.
            </p>
          </div>
          <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {Object.values(EntidadRetenible).map((entidad) => {
              const meta = ENTIDAD_RETENIBLE_META[entidad];
              const Icono = meta.icon;
              return (
                <li key={entidad} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <Icono className="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{meta.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {conteoPorEntidad[entidad]} registros · {meta.descripcion}
                    </p>
                  </div>
                  {ENTIDADES_CRITICAS.has(entidad) && <Badge variant="warning">Crítica</Badge>}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-semibold text-slate-900 dark:text-white">Registros próximos a vencer</h2>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Contador
            label="Protegidos"
            valor={contadores.protegidos}
            icon={ShieldCheck}
            className="bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400"
          />
          <Contador
            label="Próximos a vencer"
            valor={contadores.proximosAVencer}
            icon={Clock}
            className="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
          />
          <Contador
            label="Archivados"
            valor={contadores.archivados}
            icon={Archive}
            className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
          />
          <Contador
            label="Vencidos sin acción"
            valor={contadores.vencidosPendientes}
            icon={TriangleAlert}
            className="bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400"
          />
        </div>
        {(contadores.enRevision > 0 || contadores.bajasLogicas > 0) && (
          <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">
            Además: {contadores.enRevision} en revisión manual · {contadores.bajasLogicas} dados de
            baja lógica.
          </p>
        )}

        {contadores.proximosAVencer > 0 && (
          <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${advertencia.className}`}>
            <IconoAdvertencia className={`mt-0.5 h-4 w-4 shrink-0 ${advertencia.iconClassName}`} />
            <p>
              <span className="font-semibold">
                {contadores.proximosAVencer}{" "}
                {contadores.proximosAVencer === 1 ? "registro cumple" : "registros cumplen"} el período de
                conservación en los próximos {politica.avisoAnticipado.diasAntes} días.
              </span>{" "}
              {politica.avisoAnticipado.activo
                ? "El aviso se envió a las notificaciones del Gerente."
                : "El aviso anticipado está desactivado: no se notifica."}
            </p>
          </div>
        )}

        {errorAccion && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
            {errorAccion}
          </p>
        )}

        <RegistrosProximosVencerTabla
          registros={proximosAVencer}
          politica={politica}
          procesandoClave={procesandoClave}
          onAplicarPolitica={(registro) => void ejecutar(() => aplicarAccionPolitica(registro))}
          onDarDeBaja={setRegistroABajar}
        />
      </section>

      <ConfirmModal
        isOpen={registroABajar !== null}
        title="¿Dar de baja lógica este registro?"
        description={
          registroABajar
            ? `${registroABajar.referencia} queda inactivo pero consultable para auditorías. No se elimina físicamente.`
            : undefined
        }
        confirmLabel="Dar de baja"
        variant="danger"
        isLoading={registroABajar !== null && procesandoClave !== null}
        onConfirm={() => {
          if (!registroABajar) return;
          void ejecutar(() => darDeBaja(registroABajar)).then(() => setRegistroABajar(null));
        }}
        onCancel={() => setRegistroABajar(null)}
      />
    </div>
  );
}
