import { describe, expect, it } from 'vitest';
import { compararEstrategias, presupuestoHabitual, simularPlan } from './deudas';
import type { Deuda } from './tipos';
const deudas: Deuda[] = [
  { id: 'a', nombre: 'Azul', tipo: 'tarjeta', saldo: 10000, tceaBp: 10000, pagoMinimo: 1000, pagoHabitual: 7000, diaPago: 23 },
  { id: 'b', nombre: 'Verde', tipo: 'tarjeta', saldo: 5000, tceaBp: 0, pagoMinimo: 1000, pagoHabitual: 1000, diaPago: 23 },
];
describe('planes de deuda', () => {
  it('suma presupuesto y sigue dos meses a mano, repartiendo sobrantes', () => {
    // Presupuesto: 7000 + 1000 = 8000.
    expect(presupuestoHabitual(deudas)).toBe(8000);
    // Mes 1: interés 595; A=10595-7000=3595, B=5000-1000=4000.
    // Mes 2: interés A=214; se pagan 3809+4000=7809. Total=15809, interés=809.
    expect(simularPlan(deudas, 8000, 'avalancha')).toEqual({ estrategia: 'avalancha', orden: ['a', 'b'], meses: 2, interesTotal: 809, totalPagado: 15809, noTermina: false });
    // Nieve mes 1: B recibe 5000, A recibe 3000 y queda 7595; interés mes 2=452.
    expect(simularPlan(deudas, 8000, 'bola_de_nieve')).toMatchObject({ orden: ['b', 'a'], meses: 3, interesTotal: 1050, totalPagado: 16050 }); // Mes 3: quedan 47, interés 3.
  });
  it('compara estrategias sin mutar y prioriza la mayor tasa', () => {
    const copia = structuredClone(deudas), c = compararEstrategias(deudas)!;
    expect(c.avalancha.interesTotal).toBeLessThanOrEqual(c.bolaDeNieve.interesTotal);
    expect(c.primera?.id).toBe('a');
    expect(c.ahorroVsMinimos).toBe(Math.max(0, c.minimos.interesTotal - 809)); // Ahorro = intereses de mínimos - 809.
    expect(deudas).toEqual(copia);
  });
  it('se corta en el primer mes si el mínimo no cubre intereses', () => {
    // 10000 al 100 % anual genera 594 el primer mes: pagar 1 no cubre ese interés.
    const p = simularPlan([{ ...deudas[0], pagoMinimo: 1 }], 1, 'minimos');
    expect(p.noTermina).toBe(true);
    expect(p.meses).toBe(1);
    expect(p.totalPagado).toBe(1); // un pago de 1 céntimo; la deuda sube de 10000 a 10594.
    expect(p.interesTotal).toBe(595);
    // La comparación no presume un «ahorro» frente a un plan que nunca termina.
    const c = compararEstrategias([{ ...deudas[0], pagoMinimo: 1 }])!;
    expect(c.minimos.noTermina).toBe(true);
    expect(c.avalancha.noTermina).toBe(false);
    expect(c.ahorroVsMinimos).toBe(0);
  });
  it('si el presupuesto tampoco baja la deuda, lo dice en vez de simular 30 años', () => {
    // Interés del mes 595; pagar 500 deja la deuda en 10095 (> 10000).
    const p = simularPlan([{ ...deudas[0], pagoMinimo: 100 }], 500, 'avalancha');
    expect(p).toMatchObject({ noTermina: true, meses: 1, totalPagado: 500, interesTotal: 595 });
  });
  it('desempata tasas por saldo y saldos por tasa, y libera mínimos terminados', () => {
    const iguales = deudas.map(d => ({ ...d, tceaBp: 0 }));
    expect(simularPlan(iguales, 8000, 'avalancha').orden).toEqual(['b', 'a']);
    expect(simularPlan(deudas.map(d => ({ ...d, saldo: 5000 })), 8000, 'bola_de_nieve').orden).toEqual(['a', 'b']);
    // Mes 1: B se liquida por 5000, A recibe 3000 y queda 7000.
    // Mes 2: los 8000 disponibles cubren los 7000; total 15000, cero interés.
    expect(simularPlan(iguales, 8000, 'avalancha')).toMatchObject({ meses: 2, totalPagado: 15000, interesTotal: 0 });
  });
  it('presupuesto insuficiente y deudas vacías', () => {
    expect(() => simularPlan(deudas, 1999, 'avalancha')).toThrow(/mínimos/); // Mínimos: 1000+1000=2000.
    expect(() => simularPlan(deudas, 1999, 'bola_de_nieve')).toThrow();
    expect(compararEstrategias([])).toBeNull();
    expect(compararEstrategias([{ ...deudas[0], saldo: 0 }])).toBeNull();
    expect(simularPlan([], 0, 'minimos').meses).toBe(0);
  });
});
