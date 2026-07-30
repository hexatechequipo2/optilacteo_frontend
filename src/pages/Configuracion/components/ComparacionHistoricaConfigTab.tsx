import { useEffect, useState } from "react";
import { TrendingUp, Check } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { useAuth } from "../../../hooks/useAuth";
import { useConfigComparacionHistorica } from "../../../hooks/useConfigComparacionHistorica";
import { extraerMensajeError } from "../../../services/configParametro.service";
import type { UpdateConfigComparacionHistoricaDto } from "../../../types/configComparacionHistorica.types";

function validarDesvio(valor: string): string | null {
  if (valor.trim() === "") return "El desvío significativo es obligatorio";
  const num = Number(valor);
  if (Number.isNaN(num)) return "Debe ser un número";
  if (num < 0 || num > 100) return "Debe estar entre 0 y 100";
  return null;
}

function validarCantidad(valor: string): string | null {
  if (valor.trim() === "") return "La cantidad de registros es obligatoria";
  const num = Number(valor);
  if (Number.isNaN(num) || !Number.isInteger(num)) return "Debe ser un número entero";
  if (num < 1) return "Debe ser al menos 1";
  return null;
}

export function ComparacionHistoricaConfigTab() {
  const { user } = useAuth();
  const esGerente = user?.rolNombre === "Gerente";
  const { config, isLoading, error, updateConfig } = useConfigComparacionHistorica();

  const [desvioInput, setDesvioInput] = useState("");
  const [cantidadInput, setCantidadInput] = useState("");
  const [desvioError, setDesvioError] = useState("");
  const [cantidadError, setCantidadError] = useState("");
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!config) return;
    setDesvioInput(config.desvioSignificativoPorcentaje.toString());
    setCantidadInput(config.cantidadRegistrosHistoricos.toString());
  }, [config]);

  if (isLoading) return <p className="text-slate-500 dark:text-slate-400">Cargando...</p>;

  if (error || !config) {
    return (
      <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
        {error ?? "No se pudo cargar la configuración."}
      </p>
    );
  }

  const handleGuardar = async () => {
    setSuccessMessage("");
    setServerError("");

    const dErr = validarDesvio(desvioInput);
    const cErr = validarCantidad(cantidadInput);
    setDesvioError(dErr ?? "");
    setCantidadError(cErr ?? "");
    if (dErr || cErr) return;

    const desvio = Number(desvioInput);
    const cantidad = Number(cantidadInput);

    const dto: UpdateConfigComparacionHistoricaDto = {};
    if (desvio !== config.desvioSignificativoPorcentaje) dto.desvioSignificativoPorcentaje = desvio;
    if (cantidad !== config.cantidadRegistrosHistoricos) dto.cantidadRegistrosHistoricos = cantidad;
    if (Object.keys(dto).length === 0) return;

    setIsSaving(true);
    try {
      await updateConfig(dto);
      setSuccessMessage("La configuración se actualizó correctamente.");
    } catch (err) {
      setServerError(extraerMensajeError(err, "No se pudo guardar la configuración. Intentá nuevamente."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-6 dark:border-blue-500/20 dark:bg-blue-500/5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-white">
            <TrendingUp className="h-5 w-5" />
          </span>
          <span className="font-semibold text-slate-900 dark:text-white">Comparación histórica de lotes</span>
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Estos parámetros definen cuándo la comparación de lotes (HU-24) marca un desvío significativo contra el
          histórico de la empresa.
          {!esGerente && " Solo el Gerente puede modificarlos."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2">
        <Input
          id="comparacion-historica-desvio"
          label="Desvío significativo (%)"
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          value={desvioInput}
          disabled={!esGerente || isSaving}
          onChange={(e) => setDesvioInput(e.target.value)}
          error={desvioError}
        />
        <Input
          id="comparacion-historica-cantidad"
          label="Cantidad de registros históricos (N)"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={cantidadInput}
          disabled={!esGerente || isSaving}
          onChange={(e) => setCantidadInput(e.target.value)}
          error={cantidadError}
        />
      </div>

      {serverError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
          {serverError}
        </p>
      )}
      {successMessage && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-500/15 dark:text-green-400">
          {successMessage}
        </p>
      )}

      {esGerente && (
        <Button type="button" className="w-fit" isLoading={isSaving} onClick={handleGuardar}>
          <Check className="mr-2 h-4 w-4" />
          Guardar
        </Button>
      )}
    </div>
  );
}
