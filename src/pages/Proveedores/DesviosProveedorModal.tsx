import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useDesviosProveedor } from "../../hooks/useDesviosProveedor";
import { PARAMETRO_LABEL, UNIDAD_POR_PARAMETRO } from "../Sensores/constants/parametroSensor";
import type { Proveedor } from "../../types/proveedor.types";

interface DesviosProveedorModalProps {
  isOpen: boolean;
  proveedor: Proveedor | null;
  onClose: () => void;
}

// HU-66: signo + color + ícono de tendencia para un desvío en %. El backend
// no manda un flag de "significativo" para este endpoint (a diferencia de
// HU-24/comparación histórica) — acá solo se indica el signo: positivo
// (recibiste más/mejor de lo prometido) en verde, negativo en rojo.
function IndicadorDesvio({ valor }: { valor: number }) {
  const Icono = valor > 0 ? TrendingUp : valor < 0 ? TrendingDown : Minus;
  const color =
    valor > 0
      ? "text-green-600 dark:text-green-400"
      : valor < 0
        ? "text-red-600 dark:text-red-400"
        : "text-slate-400 dark:text-slate-500";
  const signo = valor > 0 ? "+" : "";

  return (
    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${color}`}>
      <Icono className="h-3.5 w-3.5" />
      {signo}
      {valor}%
    </span>
  );
}

export function DesviosProveedorModal({ isOpen, proveedor, onClose }: DesviosProveedorModalProps) {
  const { desvios, isLoading, error, refetch } = useDesviosProveedor(
    isOpen ? (proveedor?.id ?? null) : null,
  );

  if (!isOpen || !proveedor) return null;

  return (
    <Modal
      isOpen={isOpen}
      title="Historial de desvíos"
      description={`${proveedor.razonSocial} — comprometido según remito vs. recibido`}
      onClose={onClose}
    >
      <div className="flex flex-col gap-6">
        {error && (
          <div className="flex items-center justify-between rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void refetch()}
              className="ml-4 rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30"
            >
              Reintentar
            </button>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Cargando historial de desvíos...
          </p>
        ) : !desvios ? null : desvios.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Este proveedor todavía no tiene lotes con remito cargado.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {desvios.map((lote) => (
              <div
                key={lote.loteId}
                className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {lote.codigo}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(lote.fechaIngreso).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Cantidad: {lote.cantidadComprometidaKg} comprometido — {lote.cantidadReal}{" "}
                      recibido
                    </p>
                    <IndicadorDesvio valor={lote.desvioCantidadPorcentaje} />
                  </div>
                </div>

                {lote.parametros.length > 0 && (
                  <>
                    <SectionHeader>PARÁMETROS</SectionHeader>
                    <ul className="flex flex-col gap-2">
                      {lote.parametros.map((p) => {
                        const nombre = PARAMETRO_LABEL[p.parametro] ?? p.parametro;
                        const unidad = UNIDAD_POR_PARAMETRO[p.parametro]
                          ? ` ${UNIDAD_POR_PARAMETRO[p.parametro]}`
                          : "";
                        return (
                          <li
                            key={p.parametro}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50"
                          >
                            <span className="text-slate-700 dark:text-slate-300">
                              {nombre}: {p.valorComprometido}
                              {unidad} comprometido — {p.valorReal}
                              {unidad} recibido
                            </span>
                            <IndicadorDesvio valor={p.desvioPorcentaje} />
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
