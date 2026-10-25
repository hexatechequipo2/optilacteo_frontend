import { Info } from "lucide-react";

// D-07: aviso de que la pantalla muestra datos mock. Cada página lo condiciona
// a su flag (ver constants/lotes.ts), así el texto vive en un solo lugar.
export function AvisoDatosIlustrativos({ className = "" }: { className?: string }) {
  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 ${className}`}
    >
      <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <p>
        <span className="font-semibold">Datos ilustrativos — vista en desarrollo.</span> La información
        de esta pantalla no corresponde a lotes reales.
      </p>
    </div>
  );
}
