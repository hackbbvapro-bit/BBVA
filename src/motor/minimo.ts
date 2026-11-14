/**
 * «¿Y si solo pago el mínimo?» — las cifras para educar sobre el pago mínimo de una tarjeta.
 * Código puro: el interés, el abono y los meses salen del mismo simulador que el plan de deudas.
 * Supone que el mínimo es fijo y que no hay compras nuevas; en la realidad el mínimo suele bajar
 * con el saldo, así que la deuda dura todavía más.
 */
import { interesMensual } from './dinero';
import { simularPlan } from './deudas';
import type { Centimos, Deuda, PlanDeudas, PuntosBasicos } from './tipos';

export interface LeccionMinimo {
  id: string;
  nombre: string;
  saldo: Centimos;
  tceaBp: PuntosBasicos;
  pagoMinimo: Centimos;
  pagoHabitual: Centimos;
  /** Interés que genera el saldo de hoy en un mes. */
  interesPrimerMes: Centimos;
  /** Del pago mínimo, lo que de verdad baja la deuda el primer mes (lo demás se va en intereses). */
  abonoPrimerMes: Centimos;
  /** Pagando solo el mínimo, sin compras nuevas. */
  soloMinimo: PlanDeudas;
  /** Pagando lo que suele pagar, si es más que el mínimo. */
  conLoQuePaga: PlanDeudas | null;
}

/** Solo para tarjetas con saldo, tasa conocida y pago mínimo. Sin tasa no hay lección honesta. */
export function leccionMinimo(d: Deuda): LeccionMinimo | null {
  if (d.tipo !== 'tarjeta' || d.saldo <= 0 || d.tceaBp <= 0 || d.pagoMinimo <= 0) return null;
  const interesPrimerMes = interesMensual(d.saldo, d.tceaBp);
  const pagoPrimerMes = Math.min(d.pagoMinimo, d.saldo + interesPrimerMes);
  const abonoPrimerMes = Math.max(0, pagoPrimerMes - interesPrimerMes);
  const soloMinimo = simularPlan([d], d.pagoMinimo, 'minimos');
  const conLoQuePaga = d.pagoHabitual > d.pagoMinimo ? simularPlan([d], d.pagoHabitual, 'avalancha') : null;
  return {
    id: d.id, nombre: d.nombre, saldo: d.saldo, tceaBp: d.tceaBp, pagoMinimo: d.pagoMinimo, pagoHabitual: d.pagoHabitual,
    interesPrimerMes, abonoPrimerMes, soloMinimo, conLoQuePaga,
  };
}

/** Una lección por tarjeta, de la tasa más alta a la más baja. */
export function leccionesMinimo(deudas: readonly Deuda[]): LeccionMinimo[] {
  return deudas
    .map(leccionMinimo)
    .filter((l): l is LeccionMinimo => l !== null)
    .sort((a, b) => b.tceaBp - a.tceaBp || a.id.localeCompare(b.id));
}
