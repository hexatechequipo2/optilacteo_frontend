import { useEffect, useState } from "react";
import { AlertTriangle, Info, X } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import type { BadgeVariant } from "../../../components/ui/Badge";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { SectionHeader } from "../../../components/ui/SectionHeader";
import { LoteActivoSelector } from "../../../components/LoteActivoSelector";
import { useMedicionManual } from "../../../hooks/useMedicionManual";
import { extraerMensajeError } from "../../../services/medicionManual.service";
import { Parametro } from "../../../types/configParametro.types";
import type {
  ConfianzaDictado,
  ParsearDictadoResponse,
} from "../../../types/dictadoVoz.types";
import type { Lote } from "../../../types/lote.types";
import type { MedicionManualItem } from "../../../types/medicionManual.types";
import { EstadoLectura } from "../../../types/historialMediciones.types";
import {
  PARAMETRO_LABEL,
  UNIDAD_POR_PARAMETRO,
} from "../../Sensores/constants/parametroSensor";

// HU-55: pantalla de revisión que sigue al dictado (DictadoVozModal) una vez
// que el backend interpretó el texto (POST /dictado/parsear). Ese endpoint
// solo previsualiza, no persiste nada — confirmar acá dispara el registro
// real (POST /mediciones-manuales, mismo endpoint y hook que usa la carga
// manual de RegistrarMedicionManualTab).

const CONFIANZA_BADGE_VARIANT: Record<ConfianzaDictado, BadgeVariant> = {
  alta: "success",
  media: "warning",
  baja: "danger",
};

const CONFIANZA_LABEL: Record<ConfianzaDictado, string> = {
  alta: "Confianza alta",
  media: "Confianza media",
  baja: "Confianza baja",
};

const MOTIVO_NO_RECONOCIDO_LABEL: Record<string, string> = {
  sin_valor_asociado: "Se nombró el parámetro pero no se detectó un valor",
};

const ESTADO_LABEL: Record<EstadoLectura, string> = {
  [EstadoLectura.NORMAL]: "Normal",
  [EstadoLectura.FUERA_DE_RANGO]: "Fuera de rango",
  [EstadoLectura.SIN_UMBRAL_CONFIGURADO]: "Sin umbral configurado",
};

const ESTADO_VARIANT: Record<EstadoLectura, "success" | "danger" | "warning"> =
  {
    [EstadoLectura.NORMAL]: "success",
    [EstadoLectura.FUERA_DE_RANGO]: "danger",
    [EstadoLectura.SIN_UMBRAL_CONFIGURADO]: "warning",
  };

interface RevisionDictadoVozModalProps {
  isOpen: boolean;
  lote: Lote | null;
  // Lista completa de lotes elegibles, para el selector que permite
  // cambiar el destino sin salir de la revisión.
  lotesDisponibles: Lote[];
  resultado: ParsearDictadoResponse | null;
  // true mientras se vuelve a interpretar el dictado para un lote distinto
  // (ver DictadoVozFlow.handleCambiarLote) — no tiene que ver con el
  // registro final, que usa isSubmitting de useMedicionManual acá abajo.
  isCambiandoLote: boolean;
  errorCambioLote?: string | null;
  onCambiarLote: (loteId: number) => void;
  onVolverADictar: () => void;
  onCancelar: () => void;
}

// Wrapper que resuelve el null-check antes de delegar en el body: el body
// necesita un `resultado` garantizado para inicializar sus valores
// editables, y eso no puede depender de un hook condicional.
export function RevisionDictadoVozModal({
  isOpen,
  lote,
  lotesDisponibles,
  resultado,
  isCambiandoLote,
  errorCambioLote,
  onCambiarLote,
  onVolverADictar,
  onCancelar,
}: RevisionDictadoVozModalProps) {
  if (!isOpen || !lote || !resultado) return null;

  return (
    <RevisionDictadoVozModalBody
      lote={lote}
      lotesDisponibles={lotesDisponibles}
      resultado={resultado}
      isCambiandoLote={isCambiandoLote}
      errorCambioLote={errorCambioLote}
      onCambiarLote={onCambiarLote}
      onVolverADictar={onVolverADictar}
      onCancelar={onCancelar}
    />
  );
}

interface RevisionDictadoVozModalBodyProps {
  lote: Lote;
  lotesDisponibles: Lote[];
  resultado: ParsearDictadoResponse;
  isCambiandoLote: boolean;
  errorCambioLote?: string | null;
  onCambiarLote: (loteId: number) => void;
  onVolverADictar: () => void;
  onCancelar: () => void;
}

function RevisionDictadoVozModalBody({
  lote,
  lotesDisponibles,
  resultado,
  isCambiandoLote,
  errorCambioLote,
  onCambiarLote,
  onVolverADictar,
  onCancelar,
}: RevisionDictadoVozModalBodyProps) {
  const [valores, setValores] = useState<Partial<Record<Parametro, string>>>(
    {},
  );
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<Parametro, string>>
  >({});
  const [serverError, setServerError] = useState("");
  const [registroExitoso, setRegistroExitoso] = useState<
    MedicionManualItem[] | null
  >(null);
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);

  const { registrar, isSubmitting } = useMedicionManual();

  // Cada vez que llega un `resultado` nuevo (primer parseo, o uno nuevo tras
  // "Volver a dictar") se reinicializan los valores editables a lo que
  // interpretó el backend.
  useEffect(() => {
    setValores(
      Object.fromEntries(
        resultado.parametros.map((p) => [p.parametro, String(p.valor)]),
      ),
    );
    setFieldErrors({});
    setServerError("");
    setRegistroExitoso(null);
    setConfirmandoCancelar(false);
  }, [resultado]);

  const handleValorChange = (parametro: Parametro, valor: string) => {
    setValores((prev) => ({ ...prev, [parametro]: valor }));
  };

  const handleConfirmar = async () => {
    setServerError("");

    const parametrosAEnviar = resultado.parametros
      .map((p) => p.parametro)
      .filter((parametro) => (valores[parametro] ?? "").trim() !== "");

    const errores: Partial<Record<Parametro, string>> = {};
    parametrosAEnviar.forEach((parametro) => {
      const valor = (valores[parametro] ?? "").trim();
      if (Number.isNaN(Number(valor))) {
        errores[parametro] = "Debe ser numérico";
      }
    });
    setFieldErrors(errores);

    if (parametrosAEnviar.length === 0) {
      setServerError("No quedó ningún parámetro cargado para registrar.");
      return;
    }
    if (Object.keys(errores).length > 0) return;

    try {
      const respuesta = await registrar(lote.id, {
        tipoMateriaPrima: lote.materiaPrima,
        parametros: parametrosAEnviar.map((parametro) => ({
          parametro,
          valor: Number(valores[parametro]),
        })),
      });
      setRegistroExitoso(respuesta.mediciones);
    } catch (err) {
      setServerError(
        extraerMensajeError(
          err,
          "No se pudo registrar la medición. Los valores dictados siguen acá, podés reintentar.",
        ),
      );
    }
  };

  const pedirCierre = () => {
    if (registroExitoso) {
      onCancelar();
      return;
    }
    setConfirmandoCancelar(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Revisar dictado"
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Revisar dictado
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Corregí lo que haga falta antes de confirmar el registro.
            </p>
          </div>
          <button
            type="button"
            onClick={pedirCierre}
            aria-label="Cerrar"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {confirmandoCancelar ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                <AlertTriangle className="h-7 w-7" />
              </span>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                ¿Descartar este dictado?
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Todavía no se registró nada. Si salís ahora se pierde lo que
                dictaste.
              </p>
            </div>
          ) : registroExitoso ? (
            <div className="flex flex-col gap-3 rounded-md border border-slate-200 p-4 dark:border-slate-800">
              <SectionHeader>MEDICIÓN REGISTRADA</SectionHeader>
              <ul className="flex flex-col gap-2">
                {registroExitoso.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-700 dark:text-slate-300">
                      {PARAMETRO_LABEL[item.parametro] ?? item.parametro}:{" "}
                      {item.valor}
                    </span>
                    <Badge variant={ESTADO_VARIANT[item.estado]}>
                      {ESTADO_LABEL[item.estado]}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <LoteActivoSelector
                  lotes={lotesDisponibles}
                  value={lote.id}
                  onChange={onCambiarLote}
                />
                {isCambiandoLote && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Volviendo a interpretar el dictado para este lote...
                  </p>
                )}
                {errorCambioLote && !isCambiandoLote && (
                  <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/15 dark:text-red-400">
                    {errorCambioLote}
                  </p>
                )}
              </div>

              {resultado.obligatoriosFaltantes.length > 0 && (
                // TODO(backend, optilacteo-backend): medicion-manual.service.ts
                // hoy rechaza el registro si falta algún parámetro obligatorio
                // configurado para el tipo de materia prima. Eso bloquea un
                // caso válido (dictar solo algunos parámetros), hay que
                // relajarlo para que acepte registros parciales — afecta
                // tanto a este flujo como al formulario manual
                // (RegistrarMedicionManualTab). Mientras tanto, este aviso es
                // solo informativo: no bloqueamos "Confirmar registro".
                <div className="flex items-start gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    No se dictaron estos parámetros obligatorios:{" "}
                    {resultado.obligatoriosFaltantes
                      .map((p) => PARAMETRO_LABEL[p as Parametro] ?? p)
                      .join(", ")}
                    .
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <SectionHeader>PARÁMETROS RECONOCIDOS</SectionHeader>
                </div>
                {resultado.parametros.length === 0 ? (
                  <p className="rounded-md border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
                    No se reconoció ningún parámetro en el dictado.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {resultado.parametros.map((item) => {
                      const requiereAdvertencia =
                        item.confianza !== "alta" ||
                        item.fueraDeRangoFisico ||
                        item.fueraDeUmbralEmpresa === true;
                      const unidad = UNIDAD_POR_PARAMETRO[item.parametro];

                      return (
                        <li
                          key={item.parametro}
                          className={`flex flex-col gap-2 rounded-md border px-3 py-2.5 ${
                            requiereAdvertencia
                              ? "border-amber-300 bg-amber-50/60 dark:border-amber-500/40 dark:bg-amber-500/10"
                              : "border-slate-200 dark:border-slate-800"
                          }`}
                        >
                          <Input
                            id={`revision-dictado-${item.parametro}`}
                            type="text"
                            inputMode="decimal"
                            label={`${PARAMETRO_LABEL[item.parametro]}${
                              unidad ? ` (${unidad})` : ""
                            }`}
                            value={valores[item.parametro] ?? ""}
                            onChange={(e) =>
                              handleValorChange(item.parametro, e.target.value)
                            }
                            error={fieldErrors[item.parametro]}
                          />
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            Escuchado: "{item.textoOriginal}"
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant={CONFIANZA_BADGE_VARIANT[item.confianza]}>
                              {CONFIANZA_LABEL[item.confianza]}
                            </Badge>
                            {item.fueraDeRangoFisico && (
                              <Badge variant="danger">
                                Fuera de rango físico
                              </Badge>
                            )}
                            {item.fueraDeUmbralEmpresa === true && (
                              <Badge variant="warning">
                                Fuera del umbral de la empresa
                              </Badge>
                            )}
                            {item.fueraDeUmbralEmpresa === null && (
                              <Badge variant="neutral">
                                Sin umbral configurado
                              </Badge>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {resultado.noReconocido.length > 0 && (
                <div className="flex flex-col gap-3">
                  <SectionHeader>NO SE RECONOCIÓ</SectionHeader>
                  <ul className="flex flex-col gap-2">
                    {resultado.noReconocido.map((item, index) => (
                      <li
                        key={`${item.texto}-${index}`}
                        className="flex items-start gap-2 rounded-md border border-dashed border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
                      >
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                        <div>
                          <p className="text-slate-700 dark:text-slate-300">
                            "{item.texto}"
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            {MOTIVO_NO_RECONOCIDO_LABEL[item.motivo] ??
                              item.motivo}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {serverError && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
                  {serverError}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
          {confirmandoCancelar ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmandoCancelar(false)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Volver a revisar
              </button>
              <button
                type="button"
                onClick={onCancelar}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Sí, descartar
              </button>
            </div>
          ) : registroExitoso ? (
            <Button type="button" onClick={onCancelar} className="!w-auto">
              Listo
            </Button>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onVolverADictar}
                disabled={isCambiandoLote}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Volver a dictar
              </button>
              <Button
                type="button"
                onClick={handleConfirmar}
                isLoading={isSubmitting}
                disabled={isCambiandoLote}
                className="flex-1 !w-auto"
              >
                Confirmar registro
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
