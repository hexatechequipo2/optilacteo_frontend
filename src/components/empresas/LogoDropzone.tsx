import { useRef, useState, type DragEvent } from "react";
import { ImageOff, Plus, X } from "lucide-react";

const TIPOS_PERMITIDOS = ["image/png", "image/jpeg"];
const TAMANO_MAXIMO_BYTES = 2 * 1024 * 1024; // 2MB, igual que multerLogoOptions en el backend

interface LogoDropzoneProps {
  /** Logo actual guardado, o el preview local del archivo staged (lo decide el padre) */
  previewUrl: string | null;
  /** Solo tiene sentido "Quitar logo" si lo que se ve es el logo YA guardado, no un staged sin guardar */
  canRemove: boolean;
  disabled?: boolean;
  isRemoving: boolean;
  /** El padre valida y decide cuándo se sube de verdad (con "Guardar identidad") */
  onFileStaged: (file: File) => void;
  onRemove: () => Promise<void>;
  /** Error puntual de la última subida fallida (viene del padre tras intentar guardar) */
  error?: string;
}

function validarArchivo(file: File): string | null {
  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    return "El logo debe ser formato PNG o JPG.";
  }
  if (file.size > TAMANO_MAXIMO_BYTES) {
    return "El logo no puede superar los 2MB.";
  }
  return null;
}

export function LogoDropzone({
  previewUrl,
  canRemove,
  disabled = false,
  isRemoving,
  onFileStaged,
  onRemove,
  error,
}: LogoDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const displayError = localError || error;

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const validationError = validarArchivo(file);
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    setLocalError("");
    onFileStaged(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a seleccionar el mismo archivo
    handleFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (disabled) return;
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleDelete = async () => {
    setLocalError("");
    try {
      await onRemove();
    } catch {
      setLocalError("No se pudo eliminar el logo. Intentá nuevamente.");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
        {previewUrl ? (
          <img src={previewUrl} alt="Logo de la empresa" className="h-full w-full object-contain" />
        ) : (
          <ImageOff className="h-8 w-8 text-slate-300 dark:text-slate-600" />
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition ${
          isDraggingOver
            ? "border-blue-400 bg-blue-50 dark:bg-blue-500/10"
            : "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-800/70"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
          <Plus className="h-5 w-5" />
        </span>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Subí o arrastrá el logo
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">PNG o JPG · máx. 2MB</p>
      </div>

      {canRemove && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={disabled || isRemoving}
          className="flex w-fit items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          <X className="h-4 w-4" />
          {isRemoving ? "Eliminando..." : "Quitar logo"}
        </button>
      )}

      {displayError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
          {displayError}
        </p>
      )}
    </div>
  );
}
