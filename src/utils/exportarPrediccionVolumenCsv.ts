import type { PrediccionVolumenData } from "../types/prediccionVolumen.types";

// HU-51 (AC4 / pruebas de usuario): "exportar la predicción junto con el
// histórico comparado". Se elige CSV (no PNG) porque acá lo que importa es
// la tabla de valores día a día (histórico real + esperado/mínimo/máximo),
// mismo criterio que ya usan otras pantallas de historial en el proyecto
// (ver historialMediciones.service.ts, botón "Exportar CSV").
export function exportarPrediccionVolumenCsv(data: PrediccionVolumenData): void {
  const filas = [["fecha", "tipo", "litros", "minimo", "maximo"]];

  for (const punto of data.historico) {
    filas.push([punto.fecha, "historico", String(punto.litros), "", ""]);
  }
  for (const punto of data.prediccion) {
    filas.push([
      punto.fecha,
      "prediccion",
      String(punto.esperado),
      String(punto.minimo),
      String(punto.maximo),
    ]);
  }

  const csv = filas.map((fila) => fila.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `prediccion-volumen-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
