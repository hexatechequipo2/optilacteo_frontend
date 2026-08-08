import { Badge } from "../../../components/ui/Badge";
import { SectionHeader } from "../../../components/ui/SectionHeader";
import { useComparacionHistoricaLote } from "../../../hooks/useComparacionHistoricaLote";
import type { Lote } from "../../../types/lote.types";
import { PARAMETRO_LABEL, UNIDAD_POR_PARAMETRO } from "../../Sensores/constants/parametroSensor";

interface ComparacionHistoricaTabProps {
  lote: Lote;
}

export function ComparacionHistoricaTab({ lote }: ComparacionHistoricaTabProps) {
  const { comparacion, isLoading, error } = useComparacionHistoricaLote(lote.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <SectionHeader>COMPARACIÓN CONTRA HISTÓRICO DE LA EMPRESA</SectionHeader>
        <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
          Compara cada parámetro del lote contra el promedio histórico registrado por la empresa.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cargando comparación histórica...
        </p>
      ) : !comparacion ? null : comparacion.cantidadLotesHistoricosUtilizados === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          La empresa todavía no tiene suficientes registros históricos para calcular esta
          comparación.
        </p>
      ) : comparacion.parametros.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Este lote no tiene parámetros para comparar.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {comparacion.cantidadLotesHistoricosUtilizados <
            comparacion.cantidadLotesHistoricosConfigurada && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Calculado con {comparacion.cantidadLotesHistoricosUtilizados} de{" "}
              {comparacion.cantidadLotesHistoricosConfigurada} lotes históricos configurados.
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {comparacion.parametros.map((p) => {
              const nombre = PARAMETRO_LABEL[p.parametro] ?? p.parametro;
              const unidad = UNIDAD_POR_PARAMETRO[p.parametro]
                ? ` ${UNIDAD_POR_PARAMETRO[p.parametro]}`
                : "";
              const signo = p.desviacionPorcentual > 0 ? "+" : "";

              return (
                <li
                  key={p.parametro}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm dark:border-slate-800"
                >
                  <span className="text-slate-700 dark:text-slate-300">
                    {nombre}: {p.valorLote}
                    {unidad} — promedio histórico: {p.promedioHistorico}
                    {unidad} ({signo}
                    {p.desviacionPorcentual}%)
                  </span>
                  <Badge variant={p.superaDesvioSignificativo ? "danger" : "success"}>
                    {p.superaDesvioSignificativo ? "Desvío significativo" : "Dentro del histórico"}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
