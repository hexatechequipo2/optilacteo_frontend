import type {
  Granularidad,
  IndicadorEvolucionConfig,
  IndicadorEvolucionId,
  PuntoSerieEvolucion,
} from "../types/indicadorEvolucion.types";

// HU-39 (Sprint 4, mock visual): "evolución temporal de los indicadores de
// calidad" cruzando TODOS los lotes de la empresa. Investigado contra el
// backend: no existe un endpoint pensado para el frontend de usuario que
// devuelva esto. Lo más parecido es DatasetMlController
// (`GET /internal/series-historicas`), pero está protegido por API key
// interna para el microservicio de ML, acepta un solo `parametro` por
// llamada y no agrega por período — no se puede exponer tal cual sin sumar
// guards de rol/tenant y soporte multi-parámetro del lado del backend, que
// no es parte de esta HU. Mientras tanto, los valores se derivan
// determinísticamente de fecha+indicador (hash simple + variación
// sinusoidal), así son estables entre renders y recargas sin necesidad de
// persistir nada en localStorage.
export const INDICADORES_EVOLUCION: IndicadorEvolucionConfig[] = [
  { id: "grasa", label: "Materia grasa", unidad: "%", color: "#2563eb", rango: [3.15, 4.1] },
  { id: "proteina", label: "Proteína", unidad: "%", color: "#16a34a", rango: [3.0, 3.6] },
  { id: "acidez", label: "Acidez titulable", unidad: "°D", color: "#f97316", rango: [14, 18] },
  { id: "temperatura", label: "Temperatura", unidad: "°C", color: "#d97706", rango: [2, 8] },
  {
    id: "celulasSomaticas",
    label: "Células somáticas",
    unidad: "k/mL",
    color: "#a855f7",
    rango: [100, 400],
  },
  { id: "densidad", label: "Densidad", unidad: "g/mL", color: "#06b6d4", rango: [1.028, 1.034] },
];

export const INDICADOR_POR_ID = new Map(INDICADORES_EVOLUCION.map((i) => [i.id, i]));

// Ventana de datos que el mock "tiene disponibles" — más allá de esto se
// muestra el estado vacío (criterio de aceptación de HU-39: período sin
// datos disponibles).
export const MOCK_HISTORIAL_DIAS = 365;

function hashSemilla(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) {
    h = (h << 5) - h + texto.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// Fase propia por indicador (derivada del hash de su id) para que las curvas
// de distintos indicadores no queden todas en fase entre sí.
function faseIndicador(indicador: IndicadorEvolucionConfig): number {
  return (hashSemilla(indicador.id) % 628) / 100;
}

function valorMock(indicador: IndicadorEvolucionConfig, fecha: Date): number {
  const [min, max] = indicador.rango;
  const centro = (min + max) / 2;
  const amplitud = (max - min) / 2;
  const inicioAnio = new Date(fecha.getFullYear(), 0, 0).getTime();
  const diaDelAnio = Math.floor((fecha.getTime() - inicioAnio) / 86_400_000);
  const fase = faseIndicador(indicador);
  // Dos ondas de período distinto (mensual + semanal) en vez de ruido puro:
  // da una curva con textura pero sin saltos bruscos día a día, más parecida
  // a una tendencia real que a ruido aleatorio (ver captura del mockup).
  const ondaMensual = Math.sin((diaDelAnio / 30) * Math.PI + fase) * amplitud * 0.35;
  const ondaSemanal = Math.sin((diaDelAnio / 3.5) * Math.PI + fase) * amplitud * 0.12;
  const semilla = hashSemilla(`${indicador.id}:${fecha.toISOString().slice(0, 13)}`);
  const ruido = ((semilla % 1000) / 1000 - 0.5) * amplitud * 0.12;
  const valor = centro + ondaMensual + ondaSemanal + ruido;
  return Math.min(max, Math.max(min, valor));
}

function avanzar(fecha: Date, granularidad: Granularidad): Date {
  const siguiente = new Date(fecha);
  if (granularidad === "hora") siguiente.setHours(siguiente.getHours() + 1);
  else if (granularidad === "dia") siguiente.setDate(siguiente.getDate() + 1);
  else if (granularidad === "semana") siguiente.setDate(siguiente.getDate() + 7);
  else siguiente.setMonth(siguiente.getMonth() + 1);
  return siguiente;
}

function formatearEtiqueta(fecha: Date, granularidad: Granularidad): string {
  if (granularidad === "hora") {
    return fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  }
  if (granularidad === "mes") {
    return fecha.toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
  }
  return fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

export function generarSerieEvolucion(
  indicadoresIds: IndicadorEvolucionId[],
  desde: Date,
  hasta: Date,
  granularidad: Granularidad,
): PuntoSerieEvolucion[] {
  const indicadores = INDICADORES_EVOLUCION.filter((i) => indicadoresIds.includes(i.id));
  const puntos: PuntoSerieEvolucion[] = [];
  let cursor = new Date(desde);

  while (cursor <= hasta) {
    const fechaPunto = new Date(cursor);
    const valores: PuntoSerieEvolucion["valores"] = {};
    for (const indicador of indicadores) {
      valores[indicador.id] = Number(valorMock(indicador, fechaPunto).toFixed(2));
    }
    puntos.push({
      timestamp: fechaPunto.toISOString(),
      etiqueta: formatearEtiqueta(fechaPunto, granularidad),
      valores,
    });
    cursor = avanzar(cursor, granularidad);
  }

  return puntos;
}
