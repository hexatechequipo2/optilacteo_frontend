import { useState, type FormEvent } from "react";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { SectionHeader } from "../../../components/ui/SectionHeader";
import { TipoMateriaPrimaSelector } from "../../../components/TipoMateriaPrimaSelector";
import { useMedicionManual } from "../../../hooks/useMedicionManual";
import { useParametrosObligatorios } from "../../../hooks/useParametrosObligatorios";
import { extraerMensajeError } from "../../../services/medicionManual.service";
import { Parametro } from "../../../types/configParametro.types";
import { EstadoLectura } from "../../../types/historialMediciones.types";
import type { MedicionManualItem } from "../../../types/medicionManual.types";
import type { Lote } from "../../../types/lote.types";
import { PARAMETRO_LABEL, UNIDAD_POR_PARAMETRO } from "../../Sensores/constants/parametroSensor";

const ESTADO_LABEL: Record<EstadoLectura, string> = {
  [EstadoLectura.NORMAL]: "Normal",
  [EstadoLectura.FUERA_DE_RANGO]: "Fuera de rango",
  [EstadoLectura.SIN_UMBRAL_CONFIGURADO]: "Sin umbral configurado",
};

const ESTADO_VARIANT: Record<EstadoLectura, "success" | "danger" | "warning"> = {
  [EstadoLectura.NORMAL]: "success",
  [EstadoLectura.FUERA_DE_RANGO]: "danger",
  [EstadoLectura.SIN_UMBRAL_CONFIGURADO]: "warning",
};

type ValoresForm = Partial<Record<Parametro, string>>;

interface RegistrarMedicionManualTabProps {
  lote: Lote;
}

export function RegistrarMedicionManualTab({ lote }: RegistrarMedicionManualTabProps) {
  const [tipoMateriaPrima, setTipoMateriaPrima] = useState(lote.materiaPrima);
  const [valores, setValores] = useState<ValoresForm>({});
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Parametro, string>>>({});
  const [formError, setFormError] = useState("");
  const [serverError, setServerError] = useState("");
  const [resultado, setResultado] = useState<MedicionManualItem[] | null>(null);

  const { registrar, isSubmitting } = useMedicionManual();
  const { disponible: obligatoriosDisponibles, infoPorParametro } =
    useParametrosObligatorios(tipoMateriaPrima);

  const handleValorChange = (parametro: Parametro, valor: string) => {
    setValores((prev) => ({ ...prev, [parametro]: valor }));
    // Si había una confirmación de un registro anterior, la limpiamos apenas
    // el usuario empieza a cargar la próxima tanda para no dejarla colgada.
    setResultado(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    setServerError("");
    setResultado(null);

    const errores: Partial<Record<Parametro, string>> = {};
    const parametrosCargados = Object.values(Parametro).filter(
      (p) => (valores[p] ?? "").trim() !== "",
    );

    parametrosCargados.forEach((p) => {
      const valor = (valores[p] ?? "").trim();
      if (Number.isNaN(Number(valor))) {
        errores[p] = "Debe ser numérico";
      }
    });

    setFieldErrors(errores);

    if (parametrosCargados.length === 0) {
      setFormError("Cargá al menos un parámetro.");
      return;
    }
    if (Object.keys(errores).length > 0) return;

    try {
      const respuesta = await registrar(lote.id, {
        tipoMateriaPrima,
        parametros: parametrosCargados.map((p) => ({
          parametro: p,
          valor: Number(valores[p]),
        })),
      });
      setResultado(respuesta.mediciones);
      setValores({});
    } catch (err) {
      setServerError(
        extraerMensajeError(err, "No se pudo registrar la medición manual. Intentá nuevamente."),
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <SectionHeader>TIPO DE MATERIA PRIMA</SectionHeader>
        <TipoMateriaPrimaSelector value={tipoMateriaPrima} onChange={setTipoMateriaPrima} />
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeader>PARÁMETROS MEDIDOS</SectionHeader>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Completá los parámetros que hayas medido manualmente. Los que sean obligatorios para
          este tipo de materia prima se validan al guardar.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {Object.values(Parametro).map((parametro) => {
            const info = infoPorParametro[parametro];
            const unidad = UNIDAD_POR_PARAMETRO[parametro];
            const label = `${PARAMETRO_LABEL[parametro]}${info.obligatorio ? " *" : ""}${
              unidad ? ` (${unidad})` : ""
            }`;
            return (
              <Input
                key={parametro}
                id={`medicion-manual-${parametro}`}
                type="text"
                inputMode="decimal"
                label={label}
                value={valores[parametro] ?? ""}
                onChange={(e) => handleValorChange(parametro, e.target.value)}
                error={fieldErrors[parametro]}
              />
            );
          })}
        </div>
        {obligatoriosDisponibles && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            * Obligatorio para este tipo de materia prima.
          </p>
        )}
      </div>

      {formError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
          {formError}
        </p>
      )}

      {serverError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
          {serverError}
        </p>
      )}

      {resultado && (
        <div className="flex flex-col gap-3 rounded-md border border-slate-200 p-4 dark:border-slate-800">
          <SectionHeader>MEDICIÓN REGISTRADA</SectionHeader>
          <ul className="flex flex-col gap-2">
            {resultado.map((item) => (
              <li key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700 dark:text-slate-300">
                  {PARAMETRO_LABEL[item.parametro] ?? item.parametro}: {item.valor}
                </span>
                <Badge variant={ESTADO_VARIANT[item.estado]}>{ESTADO_LABEL[item.estado]}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting} className="!w-auto px-6">
          Registrar medición
        </Button>
      </div>
    </form>
  );
}
