// HU-24: espeja GET /lotes/:id/comparacion-historica en optilacteo-backend
// (ComparacionHistoricaResponseDto / ComparacionHistoricaMapper, módulo
// src/module/lote). El backend NO manda un flag de "histórico insuficiente":
// se infiere comparando cantidadLotesHistoricosUtilizados contra
// cantidadLotesHistoricosConfigurada (HU-23, configurable por empresa,
// default 20 lotes según ConfiguracionComparacionHistoricaService). Si
// cantidadLotesHistoricosUtilizados es 0, no hay historial en absoluto.
import { Parametro } from "./configParametro.types";

export interface ComparacionHistoricaParametro {
  parametro: Parametro;
  valorLote: number;
  promedioHistorico: number;
  desviacionPorcentual: number;
  superaDesvioSignificativo: boolean;
}

export interface ComparacionHistoricaLote {
  loteId: number;
  cantidadLotesHistoricosUtilizados: number;
  cantidadLotesHistoricosConfigurada: number;
  desvioSignificativoPorcentaje: number;
  parametros: ComparacionHistoricaParametro[];
}
