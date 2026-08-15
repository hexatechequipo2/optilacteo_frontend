import { useState } from "react";
import { Cable, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { useEmpresaActual } from "../../../hooks/useEmpresaActual";

type EstadoTest = "idle" | "probando" | "exito" | "error";

function validarUrl(valor: string): string | null {
  const trimmed = valor.trim();
  if (!trimmed) return "La URL del endpoint es obligatoria";
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return "El formato de la URL no es válido (ej: https://plc.miempresa.local:8080)";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "La URL debe usar protocolo http:// o https://";
  }
  return null;
}

function formatearFecha(fecha: Date): string {
  return fecha.toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

// HU-61: pantalla 100% mock — todavía no existe backend para esto (ver TODOs
// puntuales más abajo). Gating de rol: esta tab solo se muestra a Gerente y
// Responsable de producción (ver ConfiguracionPage.tsx / App.tsx / Sidebar.tsx);
// Operario de línea y Responsable de calidad ni siquiera llegan a renderizarla.
export function PlcGatewayConfigTab() {
  const { empresa } = useEmpresaActual();

  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const [estadoTest, setEstadoTest] = useState<EstadoTest>("idle");
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [ultimoCambio, setUltimoCambio] = useState<Date | null>(null);

  const handleUrlChange = (valor: string) => {
    setUrlInput(valor);
    setUrlError("");
    setSuccessMessage("");
    // Cualquier edición invalida el resultado del test anterior: no queremos
    // dejar "guardar cambios" habilitado para una URL distinta a la probada.
    if (estadoTest !== "idle") setEstadoTest("idle");
  };

  const handleProbarConexion = () => {
    const err = validarUrl(urlInput);
    setUrlError(err ?? "");
    if (err) {
      setEstadoTest("idle");
      return;
    }

    setEstadoTest("probando");

    // TODO(backend): reemplazar este mock por un ping real, por ejemplo
    // POST /plc-config/test { url }, y usar la respuesta del backend para
    // decidir entre "exito" / "error" en vez del resultado aleatorio de acá.
    window.setTimeout(() => {
      const exito = Math.random() > 0.3;
      setEstadoTest(exito ? "exito" : "error");
    }, 1500);
  };

  const handleGuardar = () => {
    const err = validarUrl(urlInput);
    if (err || estadoTest !== "exito") return;

    setIsSaving(true);
    setSuccessMessage("");

    // TODO(backend): reemplazar este mock por el guardado real, por ejemplo
    // PUT /empresas/:id/plc-config { url }, e idealmente precargar el campo
    // con un GET al entrar a esta tab (hoy siempre arranca vacío).
    window.setTimeout(() => {
      setUltimoCambio(new Date());
      setIsSaving(false);
      setSuccessMessage("La configuración de conexión PLC se guardó correctamente.");
    }, 800);
  };

  const guardarDeshabilitado = !!validarUrl(urlInput) || estadoTest !== "exito" || isSaving;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-6 dark:border-blue-500/20 dark:bg-blue-500/5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-white">
            <Cable className="h-5 w-5" />
          </span>
          <span className="font-semibold text-slate-900 dark:text-white">
            Configuración de conexión industrial
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Definí la URL del endpoint de tu PLC/gateway industrial para que la plataforma pueda leer
          los sensores conectados, sin depender del equipo de desarrollo para dar de alta o modificar
          esa conexión.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <Input
          id="plc-gateway-url"
          label="URL del endpoint *"
          placeholder="https://plc.miempresa.local:8080"
          value={urlInput}
          disabled={isSaving}
          onChange={(e) => handleUrlChange(e.target.value)}
          error={urlError}
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleProbarConexion}
            disabled={estadoTest === "probando" || isSaving}
            className="flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {estadoTest === "probando" && <Loader2 className="h-4 w-4 animate-spin" />}
            Probar conexión
          </button>

          {estadoTest === "probando" && (
            <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Probando...
            </span>
          )}
          {estadoTest === "exito" && (
            <span className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Conexión exitosa
            </span>
          )}
          {estadoTest === "error" && (
            <span className="flex items-center gap-1.5 text-sm text-red-700 dark:text-red-400">
              <XCircle className="h-4 w-4" />
              Sin respuesta del PLC
            </span>
          )}
        </div>

        {successMessage && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-500/15 dark:text-green-400">
            {successMessage}
          </p>
        )}

        <Button type="button" className="w-fit" isLoading={isSaving} disabled={guardarDeshabilitado} onClick={handleGuardar}>
          Guardar cambios
        </Button>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Esta configuración aplica solo a {empresa?.name ?? "tu empresa"} — no afecta a otras
          empresas de la plataforma.
        </p>

        <p className="text-xs text-slate-400 dark:text-slate-500">
          {ultimoCambio
            ? `Último cambio aplicado: ${formatearFecha(ultimoCambio)} — sin necesidad de reiniciar el sistema.`
            : "Todavía no se guardó ninguna configuración de conexión."}
        </p>
      </div>
    </div>
  );
}
