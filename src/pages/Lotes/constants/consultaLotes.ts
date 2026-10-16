import { ClasificacionLote } from "../../../types/lote.types";

// HU-77 (Sprint 5, mock visual): "Consulta de lotes con filtros y
// trazabilidad" para Responsable de calidad. A pedido explícito de la tarea,
// sin conexión a backend todavía — estos 6 lotes son datos ilustrativos,
// fijos en memoria. Cuando el backend exponga el endpoint de consulta
// filtrada, esto se reemplaza por un hook conectado — mismo patrón ya
// aplicado en el resto de los mocks de Sprint 5 (HU-40, HU-43, HU-45,
// HU-64, HU-71).

export interface ParametroCritico {
  parametro: string;
  valorMedido: string;
  limite: string;
}

export interface LoteConsulta {
  codigo: string;
  fechaIngreso: string; // ISO
  proveedor: string;
  tambo: string;
  estado: ClasificacionLote;
  numeroRemito: string;
  parametroCritico: ParametroCritico | null; // solo si estado === NO_APTO
  destinoAsignado: string;
}

export interface EventoLoteConsulta {
  fecha: string; // ISO
  titulo: string;
  descripcion: string;
}

const DESTINO_POR_ESTADO: Record<ClasificacionLote, string> = {
  [ClasificacionLote.APTO]: "Producción",
  [ClasificacionLote.NO_APTO]: "Descarte",
};

// [dias atrás, hora, minuto, codigo, proveedor, tambo, estado, numeroRemito, parametroCritico]
const SEMILLA: [
  number,
  number,
  number,
  string,
  string,
  string,
  ClasificacionLote,
  string,
  ParametroCritico | null,
][] = [
  [0, 6, 40, "L-2026-0412", "Agropecuaria San Martín", "Tambo 1", ClasificacionLote.APTO, "R-004512", null],
  [
    1,
    18,
    15,
    "L-2026-0411",
    "Lácteos del Valle",
    "Tambo 3",
    ClasificacionLote.NO_APTO,
    "R-004509",
    { parametro: "Acidez titulable", valorMedido: "21 °D", limite: "máx. 18 °D" },
  ],
  [1, 7, 5, "L-2026-0410", "Agropecuaria San Martín", "Tambo 2", ClasificacionLote.APTO, "R-004506", null],
  [3, 17, 50, "L-2026-0409", "Tambos Unidos SRL", "Tambo 4", ClasificacionLote.APTO, "R-004498", null],
  [5, 6, 30, "L-2026-0408", "Lácteos del Valle", "Tambo 3", ClasificacionLote.APTO, "R-004481", null],
  [
    7,
    6,
    55,
    "L-2026-0407",
    "Tambos Unidos SRL",
    "Tambo 5",
    ClasificacionLote.NO_APTO,
    "R-004470",
    { parametro: "Temperatura", valorMedido: "9.4 °C", limite: "máx. 6 °C" },
  ],
];

function fechaHace(hoy: Date, diasAtras: number, hora: number, minuto: number): string {
  const fecha = new Date(hoy);
  fecha.setDate(fecha.getDate() - diasAtras);
  fecha.setHours(hora, minuto, 0, 0);
  return fecha.toISOString();
}

function sumarMinutos(iso: string, minutos: number): string {
  return new Date(new Date(iso).getTime() + minutos * 60_000).toISOString();
}

export function construirLotesConsultaMock(hoy: Date = new Date()): LoteConsulta[] {
  return SEMILLA.map(
    ([diasAtras, hora, minuto, codigo, proveedor, tambo, estado, numeroRemito, parametroCritico]) => ({
      codigo,
      fechaIngreso: fechaHace(hoy, diasAtras, hora, minuto),
      proveedor,
      tambo,
      estado,
      numeroRemito,
      parametroCritico,
      destinoAsignado: DESTINO_POR_ESTADO[estado],
    }),
  );
}

// Línea de tiempo de trazabilidad por lote (AC7/AC8): recepción, muestreo,
// clasificación automática, alerta (solo si No Apto), revisión del
// responsable y destino asignado — mismos pasos que documenta el prototipo
// de HU-77. Las horas respetan el orden cronológico y parten de la fecha de
// ingreso real del lote.
export function construirEventosLote(lote: LoteConsulta): EventoLoteConsulta[] {
  const eventos: EventoLoteConsulta[] = [
    {
      fecha: lote.fechaIngreso,
      titulo: "Recepción de leche cruda",
      descripcion: `Ingreso del remito ${lote.numeroRemito} y registro del lote`,
    },
    {
      fecha: sumarMinutos(lote.fechaIngreso, 17),
      titulo: "Muestreo inicial",
      descripcion: "Registro de parámetros de calidad",
    },
    {
      fecha: sumarMinutos(lote.fechaIngreso, 25),
      titulo: "Clasificación automática",
      descripcion: `Estado calculado: ${lote.estado === ClasificacionLote.APTO ? "Apto" : "No Apto"}`,
    },
  ];

  if (lote.estado === ClasificacionLote.NO_APTO) {
    eventos.push({
      fecha: sumarMinutos(lote.fechaIngreso, 26),
      titulo: "Alerta generada",
      descripcion: "Notificada a Responsable de calidad",
    });
  }

  eventos.push(
    {
      fecha: sumarMinutos(lote.fechaIngreso, 50),
      titulo: "Revisión del responsable",
      descripcion: "Observación registrada en el lote",
    },
    {
      fecha: sumarMinutos(lote.fechaIngreso, 65),
      titulo: "Destino asignado",
      descripcion: `Destino definido según regla de negocio: ${lote.destinoAsignado}`,
    },
  );

  return eventos;
}
