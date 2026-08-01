import { useEffect, useState, type FormEvent } from "react";
import { PenLine } from "lucide-react";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { useLecturaManual } from "../../../hooks/useLecturaManual";
import { extraerMensajeError } from "../../../services/sensor.service";
import { EstadoSensor, type Sensor } from "../../../types/sensor.types";
import { PARAMETROS_META } from "../../Configuracion/constants/parametrosCalidad";

interface IngresoManualFallbackProps {
  sensor: Sensor;
}

// HU-15: fallback manual mientras el sensor asociado a este parámetro no
// está ACTIVO (inactivo o con falla). El campo se habilita/deshabilita solo
// en función de sensor.estado, que ya llega actualizado en vivo por WS
// (useSensoresRealtime) - no hay estado propio de "habilitado" acá.
export function IngresoManualFallback({ sensor }: IngresoManualFallbackProps) {
  const [valor, setValor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);

  const { registrar, isSubmitting } = useLecturaManual();
  const rangoFisico = PARAMETROS_META[sensor.parametro].rangoFisico;
  const deshabilitado = sensor.estado === EstadoSensor.ACTIVO;

  // Criterio 6: si el sensor vuelve a ACTIVO antes de guardar, se descarta
  // cualquier valor cargado y sin confirmar - ya no corresponde enviarlo.
  useEffect(() => {
    if (deshabilitado) {
      setValor("");
      setError(null);
    }
  }, [deshabilitado]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setConfirmado(false);

    const texto = valor.trim();
    if (texto === "") {
      setError("Ingresá un valor.");
      return;
    }

    const numero = Number(texto);
    if (Number.isNaN(numero)) {
      setError("Debe ser numérico.");
      return;
    }
    if (numero < rangoFisico.min || numero > rangoFisico.max) {
      setError(`Debe estar entre ${rangoFisico.min} y ${rangoFisico.max}.`);
      return;
    }

    try {
      await registrar({ sensorId: sensor.id, valor: numero });
      setValor("");
      setConfirmado(true);
    } catch (err) {
      setError(extraerMensajeError(err, "No se pudo registrar el valor manual."));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <PenLine className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Ingreso manual (fallback)
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Input
          id={`lectura-manual-${sensor.id}`}
          type="text"
          inputMode="decimal"
          placeholder={deshabilitado ? "Sensor activo" : `${rangoFisico.min} a ${rangoFisico.max}`}
          value={valor}
          disabled={deshabilitado}
          onChange={(e) => {
            setValor(e.target.value);
            setConfirmado(false);
          }}
          className="!py-1.5 text-sm"
        />
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={deshabilitado}
          className="!w-auto px-3 py-1.5 text-sm"
        >
          Cargar
        </Button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {confirmado && !error && (
        <p className="text-xs text-green-600 dark:text-green-400">Valor manual registrado.</p>
      )}
    </form>
  );
}
