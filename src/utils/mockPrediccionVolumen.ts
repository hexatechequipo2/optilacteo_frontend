import type {
  PrediccionVolumenData,
  PuntoHistoricoVolumen,
  PuntoPrediccionVolumen,
} from "../types/prediccionVolumen.types";

// HU-51 (mock visual): la consigna de la HU pide explícitamente NO conectar
// contra backend ("no va a estar desarrollado para esta fecha, solo hacer
// el mock up visual"). El módulo de permisos ya tiene un
// ModuloSistema.REPORTES_FORECAST y existe un PrediccionVolumenController
// (GET /prediccion-volumen) del lado del backend, pero como la consigna es
// explícita se ignora esa integración por ahora — los datos acá son
// determinísticos (hash por fecha), igual que en mockEvolucionIndicadores.ts
// de HU-39, para que sean estables entre renders sin persistir nada.
const DIAS_HISTORICO = 8;
const DIAS_PREDICCION = 7;
const VOLUMEN_BASE = 34_000;
const AMPLITUD_ESTACIONAL = 6_000;

function hashSemilla(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) {
    h = (h << 5) - h + texto.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function volumenBaseDia(fecha: Date): number {
  const diaSemana = fecha.getDay();
  // Domingo/lunes con menor volumen, mitad de semana con pico — solo para
  // que la curva tenga una forma reconocible, no representa un patrón real.
  const factorSemanal = [0.85, 0.95, 1.02, 1.05, 1.0, 0.92, 0.8][diaSemana];
  const semilla = hashSemilla(fecha.toISOString().slice(0, 10));
  const ruido = ((semilla % 1000) / 1000 - 0.5) * AMPLITUD_ESTACIONAL * 0.4;
  return VOLUMEN_BASE * factorSemanal + ruido;
}

function generarHistorico(hoy: Date, dias: number): PuntoHistoricoVolumen[] {
  const puntos: PuntoHistoricoVolumen[] = [];
  for (let i = dias; i >= 1; i--) {
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() - i);
    puntos.push({ fecha: fecha.toISOString().slice(0, 10), litros: Math.round(volumenBaseDia(fecha)) });
  }
  return puntos;
}

// El intervalo de confianza se ensancha a medida que la predicción se aleja
// del día de hoy (más incertidumbre a más horizonte) — comportamiento típico
// de un forecast real, aunque acá el valor en sí sea mock.
function generarPrediccion(
  hoy: Date,
  dias: number,
  anchoBanda: number,
): PuntoPrediccionVolumen[] {
  const puntos: PuntoPrediccionVolumen[] = [];
  for (let i = 1; i <= dias; i++) {
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() + i);
    const esperado = Math.round(volumenBaseDia(fecha));
    const margen = Math.round(esperado * anchoBanda * (0.5 + i / dias));
    puntos.push({
      fecha: fecha.toISOString().slice(0, 10),
      esperado,
      minimo: esperado - margen,
      maximo: esperado + margen,
    });
  }
  return puntos;
}

function nivelConfianzaDesde(confianzaPorcentaje: number): PrediccionVolumenData["nivelConfianza"] {
  if (confianzaPorcentaje >= 75) return "alta";
  if (confianzaPorcentaje >= 50) return "media";
  return "baja";
}

// `bajaPrecision` ensancha artificialmente la banda de confianza para poder
// demostrar ese estado (AC de la HU) sin depender de datos reales.
export function generarPrediccionVolumen(bajaPrecision = false): PrediccionVolumenData {
  const hoy = new Date();
  const anchoBanda = bajaPrecision ? 0.35 : 0.09;
  const confianzaPorcentaje = bajaPrecision ? 48 : 82;

  const actualizadoEn = new Date(hoy);
  actualizadoEn.setHours(6, 15, 0, 0);

  return {
    actualizadoEn: actualizadoEn.toISOString(),
    historico: generarHistorico(hoy, DIAS_HISTORICO),
    prediccion: generarPrediccion(hoy, DIAS_PREDICCION, anchoBanda),
    confianzaPorcentaje,
    nivelConfianza: nivelConfianzaDesde(confianzaPorcentaje),
    diasHistoricosDisponibles: bajaPrecision ? 22 : 96,
    diasHistoricosRequeridos: 30,
  };
}

// Estado "datos insuficientes" (AC/prueba de usuario de la HU): empresa
// recién creada, con menos historial del mínimo que el modelo necesita.
export function generarDatosInsuficientes(): Pick<
  PrediccionVolumenData,
  "diasHistoricosDisponibles" | "diasHistoricosRequeridos"
> {
  return { diasHistoricosDisponibles: 6, diasHistoricosRequeridos: 30 };
}
