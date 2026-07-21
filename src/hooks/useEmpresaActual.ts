import { useContext } from "react";
import { EmpresaContext } from "../context/EmpresaContext";

export function useEmpresaActual() {
  const context = useContext(EmpresaContext);
  if (!context) {
    throw new Error("useEmpresaActual debe usarse dentro de un EmpresaProvider");
  }
  return context;
}
