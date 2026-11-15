/**
 * Fase 1 · Tarea A: mover un pago no es lo mismo que resolver el día en rojo.
 * Persona sintética: S/ 5.00 en la cuenta, alquiler de S/ 10.00 el 23 y sueldo de S/ 20.00 el 30 (hoy 13-nov).
 */
import { describe, expect, it } from 'vitest';
import { efectoSobreDeficit, proyectar } from './proyeccion';
import { detectarRecurrentes } from './recurrentes';
import { analizar } from './index';
import { compararJugadas } from './jugadas';
import type { Ajuste, Jugada, Movimiento, Perfil, Proyeccion } from './tipos';

function perfil(): Perfil {
  return { id: 'prueba', tipo: 'dependiente', nombre: 'Prueba', descripcion: '', hoy: '2026-11-13', saldoActual: 500, deudas: [],
    movimientos: ['08', '09', '10'].flatMap(mes => [
      { id: `a-${mes}`, fecha: `2026-${mes}-23`, monto: -1000, descripcion: 'Alquiler', categoria: 'alquiler', canal: 'cuenta' },
      { id: `s-${mes}`, fecha: `2026-${mes}-30`, monto: 2000, descripcion: 'Sueldo', categoria: 'sueldo', canal: 'cuenta' },
    ] as Movimiento[]) };
}
const alquiler = (f: Perfil) => detectarRecurrentes(f.movimientos, []).find(r => r.descripcion === 'Alquiler')!.id;
const mover = (f: Perfil, hacia: string): Ajuste => ({ tipo: 'mover', recurrenteId: alquiler(f), desde: '2026-11-23', hacia });
/** Todo lo que sale o entra, dentro y fuera de la ventana: mover no puede crear ni borrar dinero. */
const total = (p: Proyeccion) => [...p.dias.flatMap(d => d.eventos), ...p.fueraDeVentana].reduce((s, e) => s + e.monto, 0);

describe('mover un pago (Tarea A)', () => {
  it('dentro de la ventana: el pago se conserva una sola vez y el rojo desaparece de verdad', () => {
    const f = perfil(), antes = proyectar(f), despues = proyectar(f, { ajustes: [mover(f, '2026-11-30')] });
    expect(antes.deficit).toMatchObject({ fecha: '2026-11-23', faltanteMaximo: 500 });
    expect(despues.deficit).toBeNull();
    expect(despues.fueraDeVentana).toEqual([]);
    expect(despues.dias.flatMap(d => d.eventos).filter(e => e.descripcion === 'Alquiler')).toHaveLength(1);
    expect(total(despues)).toBe(total(antes));
    expect(despues.saldoFinal).toBe(antes.saldoFinal);
    expect(efectoSobreDeficit(antes, despues)).toBe('elimina');
  });

  it('fuera de la ventana: el rojo deja de verse, pero la obligación se conserva y no cuenta como resuelto', () => {
    const f = perfil(), antes = proyectar(f), despues = proyectar(f, { ajustes: [mover(f, '2026-12-20')] });
    expect(despues.deficit).toBeNull();
    // El alquiler no se pierde ni se duplica: está una vez, fuera de la ventana, con su monto completo.
    expect(despues.fueraDeVentana.map(e => [e.descripcion, e.fecha, e.monto])).toEqual([['Alquiler', '2026-12-20', -1000]]);
    expect(despues.dias.flatMap(d => d.eventos).some(e => e.descripcion === 'Alquiler')).toBe(false);
    expect(total(despues)).toBe(total(antes));
    expect(efectoSobreDeficit(antes, despues)).toBe('posterga');
  });

  it('pagar menos sin llegar a cero: reduce el hueco, no lo elimina', () => {
    const f = perfil(), antes = proyectar(f);
    // 500 - 700 = -200: falta menos (S/ 2.00 en vez de S/ 5.00), pero sigue habiendo rojo.
    const despues = proyectar(f, { ajustes: [{ tipo: 'cambiar_monto', recurrenteId: alquiler(f), fecha: '2026-11-23', monto: -700 }] });
    expect(despues.deficit).toMatchObject({ fecha: '2026-11-23', faltanteMaximo: 200 });
    expect(efectoSobreDeficit(antes, despues)).toBe('reduce');
  });

  it('mover el pago a otro día que también queda en rojo solo aplaza el problema', () => {
    const f = perfil(), antes = proyectar(f), despues = proyectar(f, { ajustes: [mover(f, '2026-11-29')] });
    // El 29 aún no llega el sueldo: 500 - 1000 = -500, el mismo hueco seis días después.
    expect(despues.deficit).toMatchObject({ fecha: '2026-11-29', faltanteMaximo: 500 });
    expect(efectoSobreDeficit(antes, despues)).toBe('posterga');
  });

  it('si no había rojo y la jugada no cambia nada, no presume de mejora', () => {
    const f = { ...perfil(), saldoActual: 5000 };
    const base = proyectar(f);
    expect(base.deficit).toBeNull();
    expect(efectoSobreDeficit(base, base)).toBe('no_mejora');
    expect(efectoSobreDeficit(base, proyectar(f, { ajustes: [mover(f, '2026-12-20')] }))).toBe('no_mejora');
  });

  it('no deja mover un pago a antes de mañana', () => {
    const f = perfil();
    expect(() => proyectar(f, { ajustes: [mover(f, '2026-11-10')] })).toThrow(/antes del 2026-11-14/);
  });
});

describe('jugadas: resolver, costo y orden (Tareas A y B)', () => {
  it('en cada persona de ejemplo «resuelve» es exactamente «elimina el rojo»', async () => {
    const { PERFILES } = await import('../datos/perfiles');
    for (const p of PERFILES) for (const j of analizar(p).jugadas) expect(j.resuelve).toBe(j.efecto === 'elimina');
  });

  it('un costo desconocido nunca queda por delante de uno conocido o estimado, aunque su número sea menor', () => {
    const base: Omit<Jugada, 'costo' | 'certezaCosto'> = { id: 'x', tipo: 'pagar_minimo', titulo: '', detalle: '', libera: 0, costoDetalle: '', resuelve: true, efecto: 'elimina',
      saldoMinimoDespues: 0, ajustes: [] };
    const desconocida: Jugada = { ...base, id: 'd', costo: 0, certezaCosto: 'desconocido' };
    const estimada: Jugada = { ...base, id: 'e', costo: 900, certezaCosto: 'estimado' };
    const conocida: Jugada = { ...base, id: 'c', costo: 1500, certezaCosto: 'conocido' };
    const noResuelve: Jugada = { ...base, id: 'n', costo: 0, certezaCosto: 'conocido', resuelve: false, efecto: 'reduce' };
    expect([desconocida, noResuelve, conocida, estimada].sort(compararJugadas).map(j => j.id)).toEqual(['e', 'c', 'd', 'n']);
  });
});
