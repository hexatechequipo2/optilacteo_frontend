import { ClasificacionLote } from "../../../types/lote.types";

// Mock de lotes de INGRESO (con clasificación Apto/No Apto) que nació con
// HU-77 y hoy solo usa HU-78 (constants/destinoSugerido.ts): la consulta y
// el detalle de HU-77 ya leen lotes de producción del back. Se borra cuando
// DestinoSugeridoPage se conecte a GET /recomendaciones/lote/:loteId.

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
