import { describe, expect, it } from 'vitest';
import { conCobros, type CobroPendiente } from './cobros';
import { proyectar } from './proyeccion';
import type { Movimiento, Perfil } from './tipos';

// Mismo caso de proyeccion.test: 500 de saldo, alquiler -1000 el 23, sueldo +2000 el 30. Mínimo -500 el 23.
function perfil(): Perfil {
  return { id: 'prueba', tipo: 'dependiente', nombre: 'Carlos', descripcion: '', hoy: '2026-11-13', saldoActual: 500, deudas: [],
    movimientos: ['08', '09', '10'].flatMap(mes => [
      { id: `a-${mes}`, fecha: `2026-${mes}-23`, monto: -1000, descripcion: 'Alquiler', categoria: 'alquiler', canal: 'cuenta' },
      { id: `s-${mes}`, fecha: `2026-${mes}-30`, monto: 2000, descripcion: 'Sueldo', categoria: 'sueldo', canal: 'cuenta' },
    ] as Movimiento[]) };
}
const cobro = (id: string, monto: number, fechaPrometida: string, extra: Partial<CobroPendiente> = {}): CobroPendiente =>
  ({ id, quien: id, monto, fechaPrometida, cobrado: false, ...extra });
const base = proyectar(perfil());

describe('escenario «si te pagan»', () => {
  it('sin cobros es la proyección base, sin cambios', () => {
    const e = conCobros(base, []);
    expect(e.dias.map(d => d.saldo)).toEqual(base.dias.map(d => d.saldo));
    expect([e.saldoMinimo, e.saldoFinal, e.mejoraDelMinimo, e.totalContado]).toEqual([-500, 1500, 0, 0]);
    expect(e.resuelveElDeficit).toBe(false);
    expect(e.primerDiaNegativo).toBe('2026-11-23');
  });

  it('un cobro ANTES del déficit lo cubre y lo resuelve', () => {
    const e = conCobros(base, [cobro('a', 600, '2026-11-20')]);
    expect(e.dias.find(d => d.fecha === '2026-11-19')!.saldo).toBe(500);
    expect(e.dias.find(d => d.fecha === '2026-11-20')!.saldo).toBe(1100);
    expect([e.saldoMinimo, e.faltanteMaximo, e.mejoraDelMinimo]).toEqual([100, 0, 600]);
    expect(e.primerDiaNegativo).toBeNull();
    expect(e.resuelveElDeficit).toBe(true);
    expect(e.llegaronTarde).toEqual([]);
    expect(e.saldoFinal).toBe(2100);
  });

  it('un cobro que cubre solo una parte baja el faltante pero no lo resuelve', () => {
    const e = conCobros(base, [cobro('a', 200, '2026-11-18')]);
    expect([e.saldoMinimo, e.faltanteMaximo, e.mejoraDelMinimo]).toEqual([-300, 300, 200]);
    expect(e.resuelveElDeficit).toBe(false);
    expect(e.primerDiaNegativo).toBe('2026-11-23');
  });

  it('un cobro DESPUÉS del déficit no lo evita y se avisa como tarde', () => {
    const e = conCobros(base, [cobro('tarde', 800, '2026-11-26')]);
    expect(e.saldoMinimo).toBe(-500);
    expect(e.mejoraDelMinimo).toBe(0);
    expect(e.primerDiaNegativo).toBe('2026-11-23');
    expect(e.resuelveElDeficit).toBe(false);
    expect(e.llegaronTarde.map(c => c.id)).toEqual(['tarde']);
    expect(e.saldoFinal).toBe(2300);
  });

  it('el cobro de un día entra ese mismo día (inclusive) y en el último día del periodo', () => {
    const e = conCobros(base, [cobro('hoy', 100, '2026-11-14'), cobro('fin', 50, base.hasta)]);
    expect(e.dias[0].saldo - e.dias[0].saldoBase).toBe(100);
    expect(e.dias[e.dias.length - 1].saldo - base.saldoFinal).toBe(150);
    expect(e.contados).toHaveLength(2);
  });

  it('cobro vencido (hoy o antes) y fuera del periodo no mueven la línea y se listan aparte', () => {
    const e = conCobros(base, [cobro('v', 900, '2026-11-13'), cobro('v2', 900, '2026-10-01'), cobro('f', 900, '2026-12-14')]);
    expect(e.vencidos.map(c => c.id)).toEqual(['v', 'v2']);
    expect(e.fueraDelPeriodo.map(c => c.id)).toEqual(['f']);
    expect(e.contados).toEqual([]);
    expect(e.dias.map(d => d.saldo)).toEqual(base.dias.map(d => d.saldo));
  });

  it('ignora cobros ya cobrados y montos no positivos', () => {
    const e = conCobros(base, [cobro('c', 600, '2026-11-20', { cobrado: true }), cobro('cero', 0, '2026-11-20')]);
    expect(e.totalContado).toBe(0);
    expect(e.resuelveElDeficit).toBe(false);
  });

  it('varios cobros el mismo día se suman, en céntimos exactos', () => {
    const e = conCobros(base, [cobro('a', 12345, '2026-11-15'), cobro('b', 67, '2026-11-15')]);
    expect(e.totalContado).toBe(12412);
    expect(e.dias.find(d => d.fecha === '2026-11-15')!.saldo - base.dias.find(d => d.fecha === '2026-11-15')!.saldo).toBe(12412);
  });

  it('rechaza montos con decimales de máquina y no muta la proyección', () => {
    expect(() => conCobros(base, [cobro('x', 10.5, '2026-11-20')])).toThrow(/entero de céntimos/);
    const copia = structuredClone(base);
    conCobros(base, [cobro('a', 600, '2026-11-20')]);
    expect(base).toEqual(copia);
  });
});
