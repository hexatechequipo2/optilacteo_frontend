import type { DashboardHistoricoResponse, DashboardResumenResponse } from "../../../types/dashboardProduccion.types";

interface ReporteProduccionPDFProps {
  empresaNombre: string;
  fecha: string;
  resumen: DashboardResumenResponse;
  historico: DashboardHistoricoResponse | null;
}

function signo(variacion: number): string {
  return variacion > 0 ? "+" : "";
}

const formatFechaHistorico = (fecha: string) =>
  new Date(fecha).toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "2-digit" });

// Vista exclusiva para impresión/PDF (HU-38): no es un espejo 1:1 de la
// pantalla — cambia tarjetas/gráfico por tablas planas en blanco y negro,
// que imprimen de forma más prolija y confiable que el SVG del gráfico o
// los colores de las MetricaCard. Oculta en pantalla (`hidden print:block`);
// la pantalla normal se oculta a su vez con `print:hidden` en DashboardProduccionPage.
export function ReporteProduccionPDF({ empresaNombre, fecha, resumen, historico }: ReporteProduccionPDFProps) {
  return (
    <div className="hidden text-black print:block">
      <div className="mb-6 border-b-2 border-black pb-3">
        <h1 className="text-xl font-bold">Reporte de Producción</h1>
        <p className="text-sm">
          {empresaNombre} · {fecha}
        </p>
        <p className="text-xs text-gray-600">Generado el {new Date().toLocaleString("es-AR")}</p>
      </div>

      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">Métricas del día</h2>
      <table className="mb-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="py-1 pr-4 font-semibold">Métrica</th>
            <th className="py-1 pr-4 font-semibold">Hoy</th>
            <th className="py-1 pr-4 font-semibold">Ayer</th>
            <th className="py-1 font-semibold">Variación</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-300">
            <td className="py-1 pr-4">Lotes procesados</td>
            <td className="py-1 pr-4">{resumen.lotesProcesados.valor}</td>
            <td className="py-1 pr-4">{resumen.lotesProcesados.valorAnterior}</td>
            <td className="py-1">
              {signo(resumen.lotesProcesados.variacion)}
              {resumen.lotesProcesados.variacion}
            </td>
          </tr>
          <tr className="border-b border-gray-300">
            <td className="py-1 pr-4">Alertas activas</td>
            <td className="py-1 pr-4">{resumen.alertasActivas.valor}</td>
            <td className="py-1 pr-4">{resumen.alertasActivas.valorAnterior}</td>
            <td className="py-1">
              {signo(resumen.alertasActivas.variacion)}
              {resumen.alertasActivas.variacion}
            </td>
          </tr>
          <tr className="border-b border-gray-300">
            <td className="py-1 pr-4">Parámetros críticos</td>
            <td className="py-1 pr-4">{resumen.parametrosCriticos.valor}</td>
            <td className="py-1 pr-4">{resumen.parametrosCriticos.valorAnterior}</td>
            <td className="py-1">
              {signo(resumen.parametrosCriticos.variacion)}
              {resumen.parametrosCriticos.variacion}
            </td>
          </tr>
        </tbody>
      </table>

      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">Línea de calidad (hoy)</h2>
      <table className="mb-6 w-full max-w-xs border-collapse text-sm">
        <tbody>
          <tr className="border-b border-gray-300">
            <td className="py-1">Recepción</td>
            <td className="py-1 text-right">{resumen.lineaCalidad.recepcion}</td>
          </tr>
          <tr className="border-b border-gray-300">
            <td className="py-1">Clasificación</td>
            <td className="py-1 text-right">{resumen.lineaCalidad.clasificacion}</td>
          </tr>
          <tr className="border-b border-gray-300">
            <td className="py-1">Aptos</td>
            <td className="py-1 text-right">{resumen.lineaCalidad.aptos}</td>
          </tr>
          <tr className="border-b border-gray-300">
            <td className="py-1">No aptos</td>
            <td className="py-1 text-right">{resumen.lineaCalidad.noAptos}</td>
          </tr>
          <tr>
            <td className="py-1 font-semibold">Total lotes en el sistema</td>
            <td className="py-1 text-right font-semibold">{resumen.lineaCalidad.totalLotesSistema}</td>
          </tr>
        </tbody>
      </table>

      {historico && historico.puntos.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">
            Lotes procesados · últimos {historico.dias} días
          </h2>
          <table className="w-full max-w-sm border-collapse text-sm">
            <thead>
              <tr className="border-b border-black text-left">
                <th className="py-1 pr-4 font-semibold">Fecha</th>
                <th className="py-1 font-semibold">Lotes procesados</th>
              </tr>
            </thead>
            <tbody>
              {historico.puntos.map((p) => (
                <tr key={p.fecha} className="border-b border-gray-300">
                  <td className="py-1 pr-4 capitalize">{formatFechaHistorico(p.fecha)}</td>
                  <td className="py-1">{p.lotesProcesados}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
