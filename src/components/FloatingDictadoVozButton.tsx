import { useMemo, useState } from "react";
import { Mic, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useLoteContexto } from "../hooks/useLoteContexto";
import { useLotes } from "../hooks/useLotes";
import { useSensores } from "../hooks/useSensores";
import { EstadoLote } from "../types/lote.types";
import type { Lote } from "../types/lote.types";
import { LoteActivoSelector } from "./LoteActivoSelector";
import { DictadoVozFlow } from "../pages/MedicionManual/components/DictadoVozFlow";

// HU-55: acceso rápido al dictado por voz, pensado para minimizar la
// fricción del operario en planta — no depende de estar parado en
// MedicionManualPage (ver el botón "Dictar valores" ahí, que sigue
// existiendo como acceso alternativo al mismo flujo). Se monta una sola vez
// en Layout, así que aparece en cualquier pantalla con Layout a la que el
// rol Operario de línea tenga acceso, sin hardcodear rutas: mismo criterio
// de gating por rol que ya usa Sidebar.tsx para decidir qué se muestra.
export function FloatingDictadoVozButton() {
  const { user } = useAuth();
  const { loteEnContexto } = useLoteContexto();
  const { lotes, isLoading: isLoadingLotes } = useLotes();
  const { sensores } = useSensores();

  const [mostrarSelector, setMostrarSelector] = useState(false);
  const [flujoAbierto, setFlujoAbierto] = useState(false);
  const [loteParaFlujo, setLoteParaFlujo] = useState<Lote | null>(null);

  // Mismo criterio que MedicionManualPage.tsx / LotesPage.tsx: HU-20 (carga
  // manual) es respaldo total, solo aplica a lotes activos sin ningún
  // sensor asociado.
  const lotesConSensorAsociado = useMemo(
    () =>
      new Set(
        sensores
          .filter((s) => s.loteActualId != null)
          .map((s) => s.loteActualId),
      ),
    [sensores],
  );

  const lotesElegibles = useMemo(
    () =>
      lotes.filter(
        (lote) =>
          (lote.estado === EstadoLote.REGISTRADO ||
            lote.estado === EstadoLote.EN_PROCESO) &&
          !lotesConSensorAsociado.has(lote.id),
      ),
    [lotes, lotesConSensorAsociado],
  );

  // El lote en contexto lo resuelve la pantalla actual con su propia lista
  // (ver useLoteContexto/MedicionManualPage), que puede ir un paso adelante
  // o atrás de este fetch propio. Si todavía no aparece en lotesElegibles
  // (fetch en curso, timing), lo agregamos igual para que DictadoVozFlow
  // pueda resolverlo por id sin depender de que ambos fetches coincidan.
  const lotesParaFlujo =
    loteEnContexto && !lotesElegibles.some((l) => l.id === loteEnContexto.id)
      ? [loteEnContexto, ...lotesElegibles]
      : lotesElegibles;

  if (user?.rolNombre !== "Operario de línea") return null;

  const handleAbrir = () => {
    if (loteEnContexto) {
      setLoteParaFlujo(loteEnContexto);
      setFlujoAbierto(true);
      return;
    }
    setMostrarSelector(true);
  };

  // Elegir el lote en el panel arranca el dictado en el mismo toque: no hay
  // un paso intermedio de "confirmar lote" separado de "iniciar dictado".
  const handleElegirLoteEnPanel = (loteId: number) => {
    const lote = lotesElegibles.find((l) => l.id === loteId) ?? null;
    setMostrarSelector(false);
    if (lote) {
      setLoteParaFlujo(lote);
      setFlujoAbierto(true);
    }
  };

  const handleCerrarFlujo = () => {
    setFlujoAbierto(false);
    setLoteParaFlujo(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleAbrir}
        aria-label="Dictar valores por voz"
        title="Dictar valores por voz"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#3d6fcf] text-white shadow-lg transition hover:bg-[#3460b5] print:hidden"
      >
        <Mic className="h-6 w-6" />
      </button>

      {mostrarSelector && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          onClick={() => setMostrarSelector(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Elegir lote para dictar"
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Elegí un lote para dictar
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  El dictado arranca apenas lo elijas
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMostrarSelector(false)}
                aria-label="Cerrar"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isLoadingLotes ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Cargando lotes...
              </p>
            ) : lotesElegibles.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No hay lotes activos sin sensor disponibles para medición
                manual.
              </p>
            ) : (
              <LoteActivoSelector
                lotes={lotesElegibles}
                value={null}
                placeholder="Elegí un lote..."
                onChange={handleElegirLoteEnPanel}
              />
            )}
          </div>
        </div>
      )}

      <DictadoVozFlow
        isOpen={flujoAbierto}
        lotes={lotesParaFlujo}
        loteInicial={loteParaFlujo}
        onClose={handleCerrarFlujo}
      />
    </>
  );
}
