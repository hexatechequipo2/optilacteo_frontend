import { createContext, useState, type ReactNode } from "react";
import type { Lote } from "../types/lote.types";

interface LoteContextoContextType {
  // Lote que la pantalla actual ya tiene elegido (ej. MedicionManualPage con
  // un lote seleccionado). Lo usa el botón flotante de dictado por voz
  // (FloatingDictadoVozButton) para arrancar el dictado directo sobre ese
  // lote, sin pasarle antes por su propio selector.
  loteEnContexto: Lote | null;
  setLoteEnContexto: (lote: Lote | null) => void;
}

export const LoteContextoContext = createContext<
  LoteContextoContextType | undefined
>(undefined);

// Vive por encima de <Routes> (ver App.tsx) para que cualquier pantalla
// pueda registrar su lote activo y el botón flotante -montado dentro de
// Layout, o sea también por encima de cualquier pantalla- lo pueda leer sin
// acoplarse a esa pantalla en particular. Cada pantalla es responsable de
// limpiar su propio lote al desmontarse (return () => setLoteEnContexto(null)
// en un useEffect), así no se arrastra a la siguiente pantalla visitada.
export function LoteContextoProvider({ children }: { children: ReactNode }) {
  const [loteEnContexto, setLoteEnContexto] = useState<Lote | null>(null);

  return (
    <LoteContextoContext.Provider value={{ loteEnContexto, setLoteEnContexto }}>
      {children}
    </LoteContextoContext.Provider>
  );
}
