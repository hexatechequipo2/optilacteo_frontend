import { type FormEvent, useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { FieldError } from "../../../components/ui/FieldError";
import type { ConfiguracionAlertaDesconexion } from "../../../types/configuracionAlertaDesconexion.types";

interface UmbralDesconexionCardProps {
  configuracion: ConfiguracionAlertaDesconexion | null;
  isLoading: boolean;
  isSaving: boolean;
  onActualizar: (umbralMinutos: number) => Promise<void>;
}

// HU-31: umbral de desconexión (X minutos) a nivel empresa — mismo criterio
// visual que NivelDestinatariosCard (card blanca, borde suave), pero acá el
// valor se persiste con un botón "Guardar" explícito en vez de al toque:
// a diferencia de agregar/quitar un destinatario, tipear un número es un
// estado intermedio que no debería pegarle al backend en cada tecla.
export function UmbralDesconexionCard({
  configuracion,
  isLoading,
  isSaving,
  onActualizar,
}: UmbralDesconexionCardProps) {
  const [valor, setValor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  // Sincroniza el input con el valor cargado/actualizado del backend —
  // pero no mientras el usuario está escribiendo (isSaving true = ya se
  // mandó el submit, ahí sí conviene reflejar la respuesta del PATCH).
  useEffect(() => {
    if (configuracion) setValor(String(configuracion.umbralMinutos));
  }, [configuracion]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setGuardado(false);

    const umbralMinutos = Number(valor);
    if (valor.trim() === "" || Number.isNaN(umbralMinutos) || !Number.isInteger(umbralMinutos)) {
      setError("Ingresá un número entero de minutos.");
      return;
    }
    if (umbralMinutos < 1) {
      setError("El umbral debe ser mayor o igual a 1 minuto.");
      return;
    }

    try {
      await onActualizar(umbralMinutos);
      setGuardado(true);
    } catch {
      setError("No se pudo guardar el umbral. Reintentá en unos segundos.");
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4 text-slate-400 dark:text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Umbral de desconexión de sensores
        </h2>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Si un sensor no envía datos por más de este tiempo, se genera una alerta crítica
        automáticamente. Un sensor puntual puede tener su propio umbral (se configura en Sensores
        → editar sensor), que pisa este valor por defecto de la empresa.
      </p>

      {isLoading ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">Cargando...</p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-wrap items-end gap-3">
          <div className="w-32">
            <Input
              id="umbral-desconexion-minutos"
              type="number"
              inputMode="numeric"
              min={1}
              label="Minutos"
              value={valor}
              onChange={(e) => {
                setValor(e.target.value);
                setGuardado(false);
              }}
            />
          </div>
          <Button type="submit" isLoading={isSaving} className="!w-auto px-6">
            Guardar
          </Button>
          {guardado && !isSaving && (
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              Umbral actualizado
            </span>
          )}
        </form>
      )}
      {error && <FieldError message={error} />}
    </div>
  );
}
