import { useContext } from "react";
import { LoteContextoContext } from "../context/LoteContextoContext";

export function useLoteContexto() {
  const context = useContext(LoteContextoContext);
  if (!context) {
    throw new Error(
      "useLoteContexto debe usarse dentro de un LoteContextoProvider",
    );
  }
  return context;
}
