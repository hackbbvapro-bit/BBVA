/**
 * El motor y tres alternativas simples, puestos frente a lo que pasó de verdad.
 * Todos reciben exactamente lo mismo: la historia visible y el saldo del corte.
 */
import { proyectar } from '@/motor';
import { diasEntre } from '@/motor/fechas';
import type { Centimos } from '@/motor/tipos';
import { DIAS_FUTURO, DIAS_HISTORIA, aPerfil, saldosReales, type Cliente } from './poblacion';

export const HORIZONTES = [7, 14, 30] as const;
export const METODOS = ['motor', 'saldo_plano', 'promedio_90', 'repetir_30'] as const;
export type Metodo = typeof METODOS[number];

export const NOMBRE_METODO: Record<Metodo, string> = {
  motor: 'Motor del copiloto',
  saldo_plano: 'Saldo plano (el saldo no cambia)',
  promedio_90: 'Promedio diario de los últimos 90 días',
  repetir_30: 'Repetir los últimos 30 días',
};

/** Flujo neto visible por día de historia (posición 0 = primer día; la tarjeta no toca el saldo). */
export function flujoVisible(c: Cliente): Centimos[] {
  const flujo = Array.from({ length: DIAS_HISTORIA }, () => 0);
  for (const m of c.historia) if (m.canal !== 'tarjeta') flujo[DIAS_HISTORIA - 1 - diasEntre(m.fecha, c.corte)] += m.monto;
  return flujo;
}

/** Saldo previsto al cierre de cada uno de los 30 días siguientes al corte. */
export function pronosticar(c: Cliente, metodo: Metodo): Centimos[] {
  if (metodo === 'motor') return proyectar(aPerfil(c)).dias.map(d => d.saldo);
  const dias = Array.from({ length: DIAS_FUTURO }, (_, i) => i + 1);
  if (metodo === 'saldo_plano') return dias.map(() => c.saldoCorte);
  const flujo = flujoVisible(c);
  if (metodo === 'promedio_90') {
    const neto = flujo.reduce((s, v) => s + v, 0);
    return dias.map(d => c.saldoCorte + Math.round(neto * d / DIAS_HISTORIA));
  }
  let saldo = c.saldoCorte;
  return dias.map(d => (saldo += flujo[DIAS_HISTORIA - DIAS_FUTURO + d - 1]));
}

export interface Aviso { hay: boolean; /** Día 1..30 del primer saldo negativo. */ dia: number | null }
export function avisoDe(saldos: Centimos[]): Aviso {
  const indice = saldos.findIndex(s => s < 0);
  return { hay: indice >= 0, dia: indice >= 0 ? indice + 1 : null };
}

/**
 * Tamaño de la economía del cliente, calculado solo con lo que se ve: lo que sale de su cuenta
 * en un mes típico. Sirve para comparar errores entre quien mueve S/ 1,500 y quien mueve S/ 7,000.
 */
export function escalaDe(c: Cliente): Centimos {
  const salidas = c.historia.filter(m => m.monto < 0 && m.canal !== 'tarjeta').reduce((s, m) => s - m.monto, 0);
  return Math.max(10_000, Math.round(salidas * 30 / DIAS_HISTORIA));
}

export interface Caso {
  cliente: Cliente;
  escala: Centimos;
  real: Centimos[];
  avisoReal: Aviso;
  /** Faltante máximo real: cuánto llega a faltar en el peor día (0 si nunca falta). */
  faltanteReal: Centimos;
  previsto: Record<Metodo, Centimos[]>;
  aviso: Record<Metodo, Aviso>;
}

export function evaluarCliente(c: Cliente): Caso {
  const real = saldosReales(c);
  const previsto = Object.fromEntries(METODOS.map(m => [m, pronosticar(c, m)])) as Record<Metodo, Centimos[]>;
  const aviso = Object.fromEntries(METODOS.map(m => [m, avisoDe(previsto[m])])) as Record<Metodo, Aviso>;
  return { cliente: c, escala: escalaDe(c), real, avisoReal: avisoDe(real), faltanteReal: Math.max(0, -Math.min(...real)), previsto, aviso };
}
