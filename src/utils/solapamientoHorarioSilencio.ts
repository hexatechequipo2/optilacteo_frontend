import type { DiaSemana, HorarioSilencio } from "../types/horarioSilencio.types";

// HU-30: aviso no bloqueante en la lista cuando dos horarios activos se
// solapan (ej. "22:00-06:00" y "23:00-05:00") — el backend los va a evaluar
// igual y el resultado es correcto (ambos silencian), esto es solo para que
// el usuario note que tiene configuración redundante. No implementa la
// evaluación real de ventana (ver horarioSilencio.types.ts).
//
// Los días son categóricos, no un timeline continuo: para resolver el cruce
// de medianoche alcanza con partir el horario en tramos "de un solo día" y
// avanzar el índice de día con módulo 7 (así sáb->dom y dom->lun se resuelven
// solos, sin necesitar aritmética circular sobre minutos de la semana).
const ORDEN_DIAS: DiaSemana[] = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];

interface TramoDia {
  dia: DiaSemana;
  inicio: number; // minutos desde las 00:00, 0-1440
  fin: number; // minutos desde las 00:00, 0-1440, siempre > inicio
}

function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function siguienteDia(dia: DiaSemana): DiaSemana {
  const idx = ORDEN_DIAS.indexOf(dia);
  return ORDEN_DIAS[(idx + 1) % ORDEN_DIAS.length];
}

function expandirEnTramos(
  horario: Pick<HorarioSilencio, "horaInicio" | "horaFin" | "dias">,
): TramoDia[] {
  const inicio = aMinutos(horario.horaInicio);
  const fin = aMinutos(horario.horaFin);
  const cruzaMedianoche = fin <= inicio;

  return horario.dias.flatMap((dia): TramoDia[] => {
    if (!cruzaMedianoche) {
      return [{ dia, inicio, fin }];
    }
    // Ej. 22:00-06:00 en "mar" -> [22:00-24:00 en mar, 00:00-06:00 en mie]
    return [
      { dia, inicio, fin: 1440 },
      { dia: siguienteDia(dia), inicio: 0, fin },
    ];
  });
}

function tramosSeSuperponen(a: TramoDia, b: TramoDia): boolean {
  return a.dia === b.dia && a.inicio < b.fin && b.inicio < a.fin;
}

export function horariosSeSolapan(
  a: Pick<HorarioSilencio, "horaInicio" | "horaFin" | "dias">,
  b: Pick<HorarioSilencio, "horaInicio" | "horaFin" | "dias">,
): boolean {
  const tramosA = expandirEnTramos(a);
  const tramosB = expandirEnTramos(b);
  return tramosA.some((ta) => tramosB.some((tb) => tramosSeSuperponen(ta, tb)));
}

// Para cada horario activo, la lista de nombres de otros horarios activos
// con los que se solapa (vacía si no se solapa con ninguno).
export function calcularSolapamientos(
  horarios: HorarioSilencio[],
): Map<string, string[]> {
  const activos = horarios.filter((h) => h.activo);
  const resultado = new Map<string, string[]>();

  for (const actual of activos) {
    const nombres = activos
      .filter((otro) => otro.id !== actual.id && horariosSeSolapan(actual, otro))
      .map((otro) => otro.nombre);
    if (nombres.length > 0) resultado.set(actual.id, nombres);
  }

  return resultado;
}
