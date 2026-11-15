/**
 * Pruebas de regresión de la Fase 3: fijan cómo el motor ACTUAL trata el pago de tarjeta y los bordes de mes,
 * y cómo se comportan los escenarios esperado/conservador. Todo con datos inventados y montos en céntimos.
 */
import { describe, expect, it } from 'vitest';
import { escenarios } from './escenarios';
import { rangoDias } from './fechas';
import { proyectar } from './proyeccion';
import type { Deuda, Movimiento, Perfil } from './tipos';

const azul: Deuda = { id: 'azul', nombre: 'Azul', tipo: 'tarjeta', saldo: 300000, tceaBp: 9000, pagoMinimo: 20000, pagoHabitual: 60000, diaPago: 31 };

/** Paga la tarjeta Azul (S/ 600) desde la cuenta en las fechas dadas y compra S/ 50 diarios CON la tarjeta. */
function conTarjeta(hoy: string, pagos: string[]): Perfil {
  const movimientos: Movimiento[] = pagos.map(fecha =>
    ({ id: `pago-${fecha}`, fecha, descripcion: 'Pago Azul', monto: -60000, categoria: 'deuda', canal: 'cuenta' }));
  for (const fecha of rangoDias(pagos[0], 60)) {
    if (fecha <= hoy) movimientos.push({ id: `t-${fecha}`, fecha, descripcion: 'Compra', monto: -5000, categoria: 'compras', canal: 'tarjeta' });
  }
  return { id: 'r', nombre: 'Prueba', tipo: 'dependiente', descripcion: '', hoy, saldoActual: 100000, movimientos, deudas: [azul] };
}
const pagosAzul = (p: Perfil) => proyectar(p).dias.flatMap(d => d.eventos).filter(e => e.descripcion === 'Pago Azul');

describe('regresión: pago de tarjeta en la proyección', () => {
  it('el pago del día 31 cae el 28 de febrero, una sola vez, y las compras con tarjeta no se cuentan otra vez', () => {
    const p = conTarjeta('2027-02-10', ['2026-11-30', '2026-12-31', '2027-01-31']);
    expect(pagosAzul(p).map(e => [e.fecha, e.monto])).toEqual([['2027-02-28', -60000]]);
    // Las compras con tarjeta no tocan la cuenta: el saldo solo baja por el pago (S/ 1,000 − S/ 600 = S/ 400).
    expect(proyectar(p).saldoFinal).toBe(40000);
  });

  it('en año bisiesto el pago del día 31 cae el 29 de febrero', () => {
    const p = conTarjeta('2028-02-10', ['2027-11-30', '2027-12-31', '2028-01-31']);
    expect(pagosAzul(p).map(e => e.fecha)).toEqual(['2028-02-29']);
  });

  it('cruza el fin de año sin perder ni repetir el pago', () => {
    const p = conTarjeta('2026-12-20', ['2026-09-30', '2026-10-31', '2026-11-30']);
    expect(pagosAzul(p).map(e => e.fecha)).toEqual(['2026-12-31']);
  });
});

/** Ingresos variables irregulares: semanas buenas y malas, para que la mediana supere al percentil 25. */
function independiente(saldoActual: number): Perfil {
  const montos = [5000, 30000, 8000, 40000, 6000, 35000, 7000, 32000, 9000, 38000, 5500, 31000];
  const movimientos: Movimiento[] = rangoDias('2026-08-22', 84).flatMap((fecha, i) => [
    ...(i % 7 === 3 ? [{ id: `v-${fecha}`, fecha, descripcion: `Venta ${i}`, monto: montos[Math.floor(i / 7)], categoria: 'ingreso_variable', canal: 'yape' }] : []),
    { id: `c-${fecha}`, fecha, descripcion: 'Comida', monto: -2500, categoria: 'comida', canal: 'efectivo' },
  ] as Movimiento[]);
  return { id: 'i', nombre: 'Prueba', tipo: 'independiente', descripcion: '', hoy: '2026-11-13', saldoActual, movimientos, deudas: [] };
}

describe('escenarios esperado y conservador', () => {
  it('el conservador es exactamente la proyección de la app y el aviso sale de él', () => {
    const p = independiente(20000);
    const e = escenarios(p);
    expect(e.conservador).toEqual(proyectar(p));
    expect(proyectar(p, { ingreso: 'prudente' })).toEqual(proyectar(p));
    expect(e.aviso).toEqual(proyectar(p).deficit);
  });

  it('el esperado nunca queda por debajo del conservador y todo sigue en céntimos enteros', () => {
    const e = escenarios(independiente(20000));
    e.esperado.dias.forEach((d, i) => {
      expect(Number.isInteger(d.saldo)).toBe(true);
      expect(d.saldo).toBeGreaterThanOrEqual(e.conservador.dias[i].saldo);
    });
    expect(e.esperado.saldoFinal).toBeGreaterThan(e.conservador.saldoFinal);
  });

  it('si solo el conservador ve rojo, el aviso se mantiene (el esperado no lo apaga)', () => {
    const saldo = [0, 5000, 10000, 20000, 40000, 80000].find(s => {
      const e = escenarios(independiente(s));
      return e.conservador.deficit !== null && e.esperado.deficit === null;
    });
    expect(saldo).toBeDefined();
    const e = escenarios(independiente(saldo!));
    expect(e.aviso).not.toBeNull();
    expect(e.aviso).toEqual(e.conservador.deficit);
  });
});
