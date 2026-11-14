import { exigirCentimos, interesMensual, sumar } from './dinero';
import type { Centimos, ComparacionDeudas, Deuda, PlanDeudas } from './tipos';

export function presupuestoHabitual(deudas: Deuda[]): Centimos {
  return sumar(deudas.map(d => d.pagoHabitual));
}
function ordenar(deudas: Deuda[], estrategia: PlanDeudas['estrategia']): Deuda[] {
  return [...deudas].sort((a, b) => estrategia === 'bola_de_nieve'
    ? a.saldo - b.saldo || b.tceaBp - a.tceaBp || a.id.localeCompare(b.id)
    : b.tceaBp - a.tceaBp || a.saldo - b.saldo || a.id.localeCompare(b.id));
}
/**
 * Con pagos fijos, si en un mes la deuda no baja ya no bajará nunca: se corta ahí
 * (noTermina = true) y las cifras del plan cuentan solo hasta ese mes.
 * Solo mínimos: basta que una deuda no baje. Con presupuesto: que no baje el total.
 */
function estancada(pendientes: Deuda[], antes: Map<string, Centimos>, estrategia: PlanDeudas['estrategia']): boolean {
  if (estrategia === 'minimos') return pendientes.some(d => d.saldo > 0 && d.saldo >= (antes.get(d.id) ?? 0));
  return sumar(pendientes.map(d => d.saldo)) >= sumar([...antes.values()]);
}
export function simularPlan(deudas: Deuda[], presupuestoMensual: Centimos, estrategia: PlanDeudas['estrategia']): PlanDeudas {
  exigirCentimos(presupuestoMensual);
  if (presupuestoMensual < 0) throw new Error('El presupuesto no puede ser negativo');
  for (const d of deudas) {
    [d.saldo, d.pagoMinimo, d.pagoHabitual, d.tceaBp].forEach(v => exigirCentimos(v));
    if (d.saldo < 0 || d.pagoMinimo < 0 || d.tceaBp < 0) throw new Error('La deuda y sus pagos no pueden ser negativos');
  }
  const pendientes = ordenar(deudas.filter(d => d.saldo > 0).map(d => ({ ...d })), estrategia);
  const minimos = sumar(pendientes.map(d => d.pagoMinimo));
  if (estrategia !== 'minimos' && presupuestoMensual < minimos) throw new Error('El presupuesto mensual no alcanza para cubrir todos los pagos mínimos');
  const plan: PlanDeudas = { estrategia, orden: pendientes.map(d => d.id), meses: 0, interesTotal: 0, totalPagado: 0, noTermina: false };
  while (pendientes.some(d => d.saldo > 0) && plan.meses < 360) {
    const antes = new Map(pendientes.map(d => [d.id, d.saldo]));
    plan.meses++;
    let pagado = 0;
    for (const d of pendientes.filter(d => d.saldo > 0)) {
      const interes = interesMensual(d.saldo, d.tceaBp);
      plan.interesTotal = exigirCentimos(sumar([plan.interesTotal, interes]));
      d.saldo = exigirCentimos(sumar([d.saldo, interes]));
      const pago = Math.min(d.saldo, d.pagoMinimo);
      d.saldo = sumar([d.saldo, -pago]);
      pagado = sumar([pagado, pago]);
    }
    if (estrategia !== 'minimos') {
      for (const d of pendientes) {
        const pago = Math.min(d.saldo, Math.max(0, presupuestoMensual - pagado));
        d.saldo = sumar([d.saldo, -pago]);
        pagado = sumar([pagado, pago]);
      }
    }
    plan.totalPagado = sumar([plan.totalPagado, pagado]);
    if (estancada(pendientes, antes, estrategia)) break;
  }
  plan.noTermina = pendientes.some(d => d.saldo > 0);
  return plan;
}
export function compararEstrategias(deudas: Deuda[], presupuestoMensual = presupuestoHabitual(deudas)): ComparacionDeudas | null {
  const activas = ordenar(deudas.filter(d => d.saldo > 0), 'avalancha');
  if (!activas.length) return null;
  const avalancha = simularPlan(deudas, presupuestoMensual, 'avalancha');
  const minimos = simularPlan(deudas, presupuestoMensual, 'minimos');
  return { presupuestoMensual, avalancha, minimos,
    bolaDeNieve: simularPlan(deudas, presupuestoMensual, 'bola_de_nieve'),
    ahorroVsMinimos: minimos.noTermina || avalancha.noTermina ? 0 : Math.max(0, sumar([minimos.interesTotal, -avalancha.interesTotal])), primera: { ...activas[0] } };
}
