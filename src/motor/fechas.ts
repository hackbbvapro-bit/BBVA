import type { FechaISO } from "./tipos";

/**
 * Fechas de calendario puras ('AAAA-MM-DD'), sin hora ni zona horaria.
 * Todo el cálculo va por UTC para que no dependa del reloj de quien lo ejecute.
 */

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
] as const;
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const;
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;

export interface Partes {
  anio: number;
  /** 1-12 */
  mes: number;
  dia: number;
}

export function esBisiesto(anio: number): boolean {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
}

export function ultimoDiaDelMes(anio: number, mes: number): number {
  if (mes < 1 || mes > 12) throw new Error(`Mes fuera de rango: ${mes}`);
  if (mes === 2) return esBisiesto(anio) ? 29 : 28;
  return [4, 6, 9, 11].includes(mes) ? 30 : 31;
}

export function partes(fecha: FechaISO): Partes {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!m) throw new Error(`Fecha no válida: "${fecha}"`);
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > ultimoDiaDelMes(anio, mes)) {
    throw new Error(`Fecha no existe: "${fecha}"`);
  }
  return { anio, mes, dia };
}

export function aISO(anio: number, mes: number, dia: number): FechaISO {
  const f = `${String(anio).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  partes(f);
  return f;
}

/** Días desde 1970-01-01 (entero). */
function ordinal(fecha: FechaISO): number {
  const { anio, mes, dia } = partes(fecha);
  return Math.round(Date.UTC(anio, mes - 1, dia) / 86_400_000);
}

function desdeOrdinal(n: number): FechaISO {
  const d = new Date(n * 86_400_000);
  return aISO(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function sumarDias(fecha: FechaISO, dias: number): FechaISO {
  if (!Number.isInteger(dias)) throw new Error("Los días deben ser enteros");
  return desdeOrdinal(ordinal(fecha) + dias);
}

/** Días de `desde` a `hasta` (positivo si `hasta` es posterior). */
export function diasEntre(desde: FechaISO, hasta: FechaISO): number {
  return ordinal(hasta) - ordinal(desde);
}

/** 0 = domingo … 6 = sábado. */
export function diaSemana(fecha: FechaISO): number {
  return (((ordinal(fecha) + 4) % 7) + 7) % 7;
}

/** Fecha del mes indicado en el día pedido; si el mes es corto, su último día. */
export function fechaEnMes(anio: number, mes: number, diaDeseado: number): FechaISO {
  if (diaDeseado < 1 || diaDeseado > 31) throw new Error(`Día fuera de rango: ${diaDeseado}`);
  return aISO(anio, mes, Math.min(diaDeseado, ultimoDiaDelMes(anio, mes)));
}

/**
 * Suma meses SIEMPRE desde la fecha ancla original (sin encadenar), para que no haya deriva:
 * 31-ene +1 = 28/29-feb, y 31-ene +2 = 31-mar (no 28-mar).
 */
export function sumarMeses(ancla: FechaISO, meses: number): FechaISO {
  if (!Number.isInteger(meses)) throw new Error("Los meses deben ser enteros");
  const { anio, mes, dia } = partes(ancla);
  const indice = anio * 12 + (mes - 1) + meses;
  const anioNuevo = Math.floor(indice / 12);
  const mesNuevo = (indice % 12 + 12) % 12 + 1;
  return fechaEnMes(anioNuevo, mesNuevo, dia);
}

/** Todas las fechas de un evento mensual (día 1-31) dentro de [desde, hasta], ambos inclusive. */
export function ocurrenciasMensuales(diaDelMes: number, desde: FechaISO, hasta: FechaISO): FechaISO[] {
  if (desde > hasta) return [];
  const inicio = partes(desde);
  const fin = partes(hasta);
  const salida: FechaISO[] = [];
  let indice = inicio.anio * 12 + (inicio.mes - 1);
  const ultimo = fin.anio * 12 + (fin.mes - 1);
  for (; indice <= ultimo; indice++) {
    const f = fechaEnMes(Math.floor(indice / 12), (indice % 12) + 1, diaDelMes);
    if (f >= desde && f <= hasta) salida.push(f);
  }
  return salida;
}

/** Fechas cada `pasoDias` a partir de un ancla (exclusiva), dentro de [desde, hasta]. */
export function ocurrenciasCada(pasoDias: number, ancla: FechaISO, desde: FechaISO, hasta: FechaISO): FechaISO[] {
  if (!Number.isInteger(pasoDias) || pasoDias < 1) throw new Error("El paso debe ser un entero positivo");
  const salida: FechaISO[] = [];
  let f = sumarDias(ancla, pasoDias);
  while (f <= hasta) {
    if (f >= desde) salida.push(f);
    f = sumarDias(f, pasoDias);
  }
  return salida;
}

/** `n` días consecutivos empezando en `desde` (inclusive). */
export function rangoDias(desde: FechaISO, n: number): FechaISO[] {
  return Array.from({ length: n }, (_, i) => sumarDias(desde, i));
}

/** "23 nov" */
export function formatoCorto(fecha: FechaISO): string {
  const { mes, dia } = partes(fecha);
  return `${dia} ${MESES_CORTOS[mes - 1]}`;
}

/** "lunes 23 de noviembre" */
export function formatoLargo(fecha: FechaISO): string {
  const { mes, dia } = partes(fecha);
  return `${DIAS[diaSemana(fecha)]} ${dia} de ${MESES[mes - 1]}`;
}

export function nombreDia(fecha: FechaISO): string {
  return DIAS[diaSemana(fecha)];
}
