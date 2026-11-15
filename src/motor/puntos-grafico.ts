import type { Horizonte } from './horizonte';
import type { Centimos, FechaISO } from './tipos';

interface Dia { fecha: FechaISO; saldo: Centimos }

/** Hasta 1 mes se ve cada día; desde 2 meses, un punto por semana para que el gráfico respire. */
const SEMANAL: Record<Horizonte, boolean> = { semana: false, mes: false, '2m': true, '3m': true, '6m': true };

export const esSemanal = (h: Horizonte): boolean => SEMANAL[h];

/** Una semana del gráfico: el saldo acumulado con que cierra y lo más bajo que tocó por dentro. */
export interface SemanaGrafico {
  /** Índice del último día de la semana dentro de la serie (donde se dibuja el punto). */
  indice: number;
  desde: FechaISO;
  hasta: FechaISO;
  /** Saldo acumulado al cierre de la semana. */
  saldo: Centimos;
  saldoMinimo: Centimos;
  fechaMinimo: FechaISO;
  diasEnRojo: number;
  /** La semana tiene el primer día de una caída a rojo (puede haber varias en la proyección). */
  alerta: boolean;
}

/**
 * Primer día de cada caída a rojo: cada vez que el saldo pasa de cero o más a negativo. Si se recupera y vuelve
 * a caer, es otra alerta. Si la serie arranca en rojo, el día 0 ya es una.
 */
export function episodiosEnRojo(dias: readonly Dia[]): number[] {
  return dias.flatMap((d, i) => (d.saldo < 0 && (i === 0 || dias[i - 1].saldo >= 0) ? [i] : []));
}

/**
 * Agrupa la serie en semanas de 7 días contadas desde hoy, con los mismos cortes que la tabla por semanas
 * (`tramos(…, 'semana')`): días 0-6, 7-13, … y la última semana se cierra en el último día aunque sea más corta.
 */
export function semanasDelGrafico(dias: readonly Dia[]): SemanaGrafico[] {
  const inicios = new Set(episodiosEnRojo(dias));
  const semanas: SemanaGrafico[] = [];
  for (let desde = 0; desde < dias.length; desde += 7) {
    const hasta = Math.min(desde + 6, dias.length - 1);
    const tramo = dias.slice(desde, hasta + 1);
    const minimo = tramo.reduce((a, b) => (a.saldo <= b.saldo ? a : b));
    let alerta = false;
    for (let i = desde; i <= hasta; i++) if (inicios.has(i)) alerta = true;
    semanas.push({
      indice: hasta,
      desde: dias[desde].fecha,
      hasta: dias[hasta].fecha,
      saldo: dias[hasta].saldo,
      saldoMinimo: minimo.saldo,
      fechaMinimo: minimo.fecha,
      diasEnRojo: tramo.filter(d => d.saldo < 0).length,
      alerta,
    });
  }
  return semanas;
}

/**
 * Qué días del gráfico llevan punto (índices en orden y sin repetir). Diario: todos. Semanal: hoy y el cierre
 * de cada semana; la caída de mitad de semana no se esconde: la marca la alerta de esa semana y su mínimo.
 */
export function puntosDelGrafico(dias: readonly Dia[], h: Horizonte): number[] {
  if (!dias.length) return [];
  if (!SEMANAL[h]) return dias.map((_, i) => i);
  return [...new Set([0, ...semanasDelGrafico(dias).map(s => s.indice)])];
}
