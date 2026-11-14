import { describe, expect, it } from 'vitest';
import { proyectar } from './proyeccion';
import { detectarRecurrentes } from './recurrentes';
import { rangoDias } from './fechas';
import type { Perfil, Movimiento } from './tipos';
function perfil(): Perfil {
  return { id: 'prueba', tipo: 'dependiente', nombre: 'Carlos', descripcion: '', hoy: '2026-11-13', saldoActual: 500, deudas: [],
    movimientos: ['08', '09', '10'].flatMap(mes => [
      { id: `a-${mes}`, fecha: `2026-${mes}-23`, monto: -1000, descripcion: 'Alquiler', categoria: 'alquiler', canal: 'cuenta' },
      { id: `s-${mes}`, fecha: `2026-${mes}-30`, monto: 2000, descripcion: 'Sueldo', categoria: 'sueldo', canal: 'cuenta' },
    ] as Movimiento[]) };
}
describe('proyección', () => {
  it('proyecta exactamente 30 días, encadena y explica déficit y próximo ingreso', () => {
    const p = proyectar(perfil());
    expect(p.dias).toHaveLength(30);
    expect([p.desde, p.hasta]).toEqual(['2026-11-14', '2026-12-13']);
    // 500 - 1000 = -500 el 23; -500 + 2000 = 1500 el 30.
    expect([p.saldoMinimo, p.saldoFinal]).toEqual([-500, 1500]);
    expect(p.deficit).toMatchObject({ fecha: '2026-11-23', faltante: 500, faltanteMaximo: 500, diasRestantes: 10 });
    expect(p.deficit!.causas.map(e => e.descripcion)).toEqual(['Alquiler']);
    expect(p.deficit!.proximoIngreso!.fecha).toBe('2026-11-30');
    let previo = p.saldoInicial;
    for (const d of p.dias) { expect(d.saldo).toBe(previo + d.eventos.reduce((s, e) => s + e.monto, 0)); previo = d.saldo; }
  });
  it('mueve, quita fuera del periodo y cambia el monto sin mutar', () => {
    const f = perfil(), copia = structuredClone(f), id = detectarRecurrentes(f.movimientos, [])[0].id;
    for (const hacia of ['2026-11-30', '2026-12-20']) {
      expect(proyectar(f, { ajustes: [{ tipo: 'mover', recurrenteId: id, desde: '2026-11-23', hacia }] }).deficit).toBeNull();
    }
    // 500 - 400 = 100 de mínimo.
    expect(proyectar(f, { ajustes: [{ tipo: 'cambiar_monto', recurrenteId: id, fecha: '2026-11-23', monto: -400 }] }).saldoMinimo).toBe(100);
    expect(f).toEqual(copia);
  });
  it('recorta hasta inclusive y limita el gasto a cero', () => {
    const f = { ...perfil(), saldoActual: 10000, movimientos: rangoDias('2026-08-22', 84).map(fecha => ({ id: fecha, fecha, monto: -100, descripcion: 'Comida', categoria: 'comida' as const, canal: 'cuenta' as const })) };
    const ajuste = { tipo: 'recortar' as const, categoria: 'comida' as const, bp: 5000, hasta: '2026-11-15' };
    // Dos días a -50 y 28 a -100: 10000 - 2900 = 7100.
    expect(proyectar(f, { ajustes: [ajuste] }).saldoFinal).toBe(7100);
    // Tres recortes de 50 % se limitan a 100 diarios: 10000 - 2800.
    expect(proyectar(f, { ajustes: [ajuste, ajuste, ajuste] }).saldoFinal).toBe(7200);
  });
  it('día 31 en noviembre y cruce de año', () => {
    const f = perfil();
    f.movimientos = ['2026-08-31', '2026-09-30', '2026-10-31'].map(fecha => ({ id: fecha, fecha, monto: 1000, descripcion: 'Sueldo', categoria: 'sueldo', canal: 'cuenta' }));
    expect(proyectar(f).dias.flatMap(d => d.eventos).map(e => e.fecha)).toEqual(['2026-11-30']);
    const p = proyectar({ ...f, hoy: '2026-12-20' });
    expect(p.hasta).toBe('2027-01-19');
    expect(p.dias.flatMap(d => d.eventos).map(e => e.fecha)).toEqual(['2026-12-31']);
    expect(p.deficit).toBeNull();
  });
  it('proyecta semanalmente y distribuye ingreso prudente diario sin redondear hacia arriba', () => {
    const f = perfil();
    f.movimientos = rangoDias('2026-08-22', 84).map(fecha => ({ id: fecha, fecha, monto: 101, descripcion: 'Ventas', categoria: 'ingreso_variable', canal: 'yape' }));
    f.movimientos.push(...['2026-10-09', '2026-10-16', '2026-10-23', '2026-10-30', '2026-11-06', '2026-11-13'].map(fecha => ({ id: `semanal-${fecha}`, fecha, monto: -700, descripcion: 'Servicio', categoria: 'servicios' as const, canal: 'cuenta' as const })));
    const p = proyectar(f);
    // Cada semana suma 7*101=707; ingreso diario=101; cuatro pagos de 700.
    expect(p.saldoFinal).toBe(500 + 30 * 101 - 4 * 700);
    expect(p.dias.flatMap(d => d.eventos).filter(e => e.origen === 'recurrente').map(e => e.fecha))
      .toEqual(['2026-11-20', '2026-11-27', '2026-12-04', '2026-12-11']);
  });
  it('causa de respaldo y déficit sin salidas recurrentes', () => {
    const f = perfil(); f.saldoActual = 1500;
    f.movimientos = f.movimientos.filter(m => m.categoria !== 'sueldo');
    f.movimientos.push(...rangoDias('2026-08-22', 84).map(fecha => ({ id: fecha, fecha, monto: -40, descripcion: 'Comida', categoria: 'comida' as const, canal: 'cuenta' as const })));
    const p = proyectar(f);
    // 1500 - 1000 - 13*40 = -20 el 26; el alquiler del 23 entra en fecha-3.
    expect(p.deficit).toMatchObject({ fecha: '2026-11-26', faltante: 20 });
    expect(p.deficit!.causas[0].fecha).toBe('2026-11-23');
    const tardio = proyectar({ ...f, saldoActual: 1700 });
    // 1700 - 1000 - 18*40 = -20 el 1 dic; usa alquiler como causa de respaldo.
    expect(tardio.deficit!.causas[0].fecha).toBe('2026-11-23');
    expect(tardio.deficit!.proximoIngreso).toBeUndefined();
    const sinRecurrentes = proyectar({ ...f, saldoActual: 0, movimientos: f.movimientos.filter(m => m.categoria === 'comida') });
    expect(sinRecurrentes.deficit!.causas).toEqual([]);
    expect(sinRecurrentes.deficit!.faltante).toBe(40); // 0 - 40 en el primer día.
  });
  it('proyecta los dos cobros de la quincena en sus fechas, también a fin de año', () => {
    const f = perfil();
    f.movimientos = ['2026-08-15', '2026-08-31', '2026-09-15', '2026-09-30', '2026-10-15', '2026-10-31', '2026-11-15', '2026-11-30', '2026-12-15']
      .map(fecha => ({ id: fecha, fecha, monto: 1000, descripcion: 'Sueldo', categoria: 'sueldo' as const, canal: 'cuenta' as const }));
    const cobros = (p: ReturnType<typeof proyectar>) => p.dias.flatMap(d => d.eventos).filter(e => e.origen === 'recurrente').map(e => e.fecha);
    const p = proyectar(f);
    // Hoy 13-nov: solo cuenta la historia hasta hoy; en 30 días entran el 15 y el 30 de noviembre (noviembre no tiene 31).
    expect(cobros(p)).toEqual(['2026-11-15', '2026-11-30']);
    expect(p.saldoFinal).toBe(500 + 2 * 1000);
    // Hoy 20-dic: 31 de diciembre y 15 de enero.
    expect(cobros(proyectar({ ...f, hoy: '2026-12-20' }))).toEqual(['2026-12-31', '2027-01-15']);
    // Cada mitad tiene su propio id: mover el cobro del 15 no toca el de fin de mes.
    const movido = proyectar(f, { ajustes: [{ tipo: 'mover', recurrenteId: 'rec-sueldo-entrada-dia-15', desde: '2026-11-15', hacia: '2026-11-20' }] });
    expect(cobros(movido)).toEqual(['2026-11-20', '2026-11-30']);
  });
  it('rechaza duración inválida', () => { expect(() => proyectar(perfil(), { dias: 0 })).toThrow(); });
});
