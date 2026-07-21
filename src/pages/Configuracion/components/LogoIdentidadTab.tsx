import { useEffect, useState } from "react";
import axios from "axios";
import { LayoutGrid, Check } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { SectionHeader } from "../../../components/ui/SectionHeader";
import { LogoDropzone } from "../../../components/empresas/LogoDropzone";
import { useEmpresaActual } from "../../../hooks/useEmpresaActual";
import { empresasService } from "../../../services/empresa.service";

function extraerMensajeError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data?.message) {
    return err.response.data.message;
  }
  return fallback;
}

export function LogoIdentidadTab() {
  const { empresa, isLoading, error, refetch } = useEmpresaActual();

  const [nombre, setNombre] = useState("");
  const [nombreError, setNombreError] = useState("");
  const [nombreServerError, setNombreServerError] = useState("");
  const [logoError, setLogoError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (empresa) setNombre(empresa.name);
  }, [empresa]);

  // Libera el object URL del preview staged al reemplazarlo o desmontar
  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

  if (isLoading) return <p className="text-slate-500 dark:text-slate-400">Cargando...</p>;

  if (error || !empresa) {
    return (
      <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
        {error ?? "No se pudo cargar la información de tu empresa."}
      </p>
    );
  }

  const logoUrlGuardado = empresa.logoUrl ?? null;
  const previewUrl = pendingPreviewUrl ?? logoUrlGuardado;

  const handleFileStaged = (file: File) => {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(file);
    setPendingPreviewUrl(URL.createObjectURL(file));
    setLogoError("");
  };

  const handleRemoveLogo = async () => {
    setIsRemoving(true);
    try {
      await empresasService.deleteLogo();
      await refetch();
    } finally {
      setIsRemoving(false);
    }
  };

  const handleGuardarIdentidad = async () => {
    setSuccessMessage("");
    setNombreServerError("");
    setLogoError("");

    const nombreTrim = nombre.trim();
    if (!nombreTrim) {
      setNombreError("El nombre es obligatorio");
      return;
    }
    setNombreError("");

    const nombreCambio = nombreTrim !== empresa.name;
    const hayLogoPendiente = !!pendingFile;
    if (!nombreCambio && !hayLogoPendiente) return;

    setIsSaving(true);

    // Cada llamada se intenta y se reporta por separado: si una falla, la otra
    // igual se aplica, y solo queda "pendiente para reintentar" la que falló.
    let logoOk = true;
    let nombreOk = true;

    if (hayLogoPendiente) {
      try {
        await empresasService.uploadLogo(pendingFile!);
        if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        setPendingFile(null);
        setPendingPreviewUrl(null);
      } catch (err) {
        logoOk = false;
        setLogoError(extraerMensajeError(err, "No se pudo subir el logo. Intentá nuevamente."));
      }
    }

    if (nombreCambio) {
      try {
        await empresasService.updateIdentidad(nombreTrim);
      } catch (err) {
        nombreOk = false;
        setNombreServerError(
          extraerMensajeError(err, "No se pudo guardar el nombre. Intentá nuevamente."),
        );
      }
    }

    await refetch();
    setIsSaving(false);

    if (logoOk && nombreOk) {
      setSuccessMessage("Los cambios se guardaron correctamente.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Banner */}
      <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/50 px-6 py-4 dark:border-blue-500/20 dark:bg-blue-500/5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-white">
            <LayoutGrid className="h-5 w-5" />
          </span>
          <span className="font-semibold text-slate-900 dark:text-white">Identidad de la empresa</span>
        </div>
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
          Visible en el header y accesos de tu organización
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Columna izquierda */}
        <div className="flex flex-col gap-8 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="flex flex-col gap-3">
            <SectionHeader>LOGO DE LA EMPRESA</SectionHeader>
            <LogoDropzone
              previewUrl={previewUrl}
              canRemove={!pendingFile && !!logoUrlGuardado}
              disabled={isSaving}
              isRemoving={isRemoving}
              onFileStaged={handleFileStaged}
              onRemove={handleRemoveLogo}
              error={logoError}
            />
          </div>

          <div className="flex flex-col gap-3">
            <SectionHeader>NOMBRE DE LA EMPRESA</SectionHeader>
            <Input
              id="configuracion-empresa-nombre"
              label="Nombre *"
              placeholder="Ej: Lácteos del Norte S.A."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              error={nombreError}
              disabled={isSaving}
            />
            {nombreServerError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
                {nombreServerError}
              </p>
            )}
          </div>
        </div>

        {/* Columna derecha */}
        <div className="flex h-fit flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-semibold text-slate-900 dark:text-white">Vista previa en el header</h3>

          <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            {previewUrl && (
              <img
                src={previewUrl}
                alt={nombre || "Logo"}
                className="h-8 w-8 flex-shrink-0 rounded-md object-contain"
              />
            )}
            <span className="truncate font-semibold text-slate-900 dark:text-white">
              {nombre.trim() || empresa.name}
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Al guardar, este logo reemplaza el ícono de la marca en el menú lateral de la consola.
          </p>

          {successMessage && (
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-500/15 dark:text-green-400">
              {successMessage}
            </p>
          )}

          <Button type="button" className="w-full" isLoading={isSaving} onClick={handleGuardarIdentidad}>
            <Check className="mr-2 h-4 w-4" />
            Guardar identidad
          </Button>
        </div>
      </div>
    </div>
  );
}
