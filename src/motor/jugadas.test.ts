import { describe, expect, it } from 'vitest';
import { proponerJugadas } from './jugadas';
import { proyectar } from './proyeccion';
import { rangoDias } from './fechas';
import type { Perfil, Movimiento } from './tipos';
function perfil(): Perfil {
  const movimientos: Movimiento[] = ['08', '09', '10'].flatMap(mes => [
    { id: `p-${mes}`, fecha: `2026-${mes}-23`, descripcion: 'Pago Azul', monto: -10000, categoria: 'deuda', canal: 'cuenta' },
    { id: `s-${mes}`, fecha: `2026-${mes}-30`, descripcion: 'Sueldo', monto: 20000, categoria: 'sueldo', canal: 'cuenta' },
  ]);
  movimientos.push(...rangoDias('2026-08-22', 84).map(fecha => ({ id: fecha, fecha, descripcion: 'Comida', monto: -100, categoria: 'comida' as const, canal: 'cuenta' as const })));
  return { id: 'p', nombre: 'Rosa', tipo: 'independiente', descripcion: '', hoy: '2026-11-13', saldoActual: 11000, movimientos,
    deudas: [{ id: 'azul', nombre: 'Azul', tipo: 'tarjeta', saldo: 20000, tceaBp: 10000, pagoMinimo: 5000, pagoHabitual: 10000, diaPago: 23 }] };
}
describe('jugadas', () => {
  it('calcula los tres costos, libera y resuelve mediante reproyección', () => {
    const f = perfil(), copia = structuredClone(f), p = proyectar(f), jugadas = proponerJugadas(f, p);
    expect(jugadas).toHaveLength(3);
    // Hasta el 29: 11000-10000-16*100=-600. Mover al 30 retrasa 7 días.
    // 10000*(2^(7/360)-1)=136 céntimos; mínimo libera 5000, interés mensual=297.
    expect(jugadas.find(j => j.tipo === 'mover_pago')).toMatchObject({ costo: 136, libera: 10000, resuelve: true });
    expect(jugadas.find(j => j.tipo === 'pagar_minimo')).toMatchObject({ costo: 297, libera: 5000, resuelve: true });
    // Recorte mínimo que cubre 600: 40% de 100 *16 =640.
    expect(jugadas.find(j => j.tipo === 'recortar_gasto')).toMatchObject({ costo: 0, libera: 640, resuelve: true });
    expect(jugadas.map(j => j.costo)).toEqual([0, 136, 297]);
    for (const j of jugadas) {
      const nueva = proyectar(f, { ajustes: j.ajustes });
      expect(j.resuelve).toBe(nueva.deficit === null);
      expect(j.saldoMinimoDespues).toBe(nueva.saldoMinimo);
    }
    expect(f).toEqual(copia);
  });
  it('suscripción se mueve sin costo, no propone mínimo sin tarjeta', () => {
    const f = perfil(); f.deudas = [];
    f.movimientos = f.movimientos.map(m => m.categoria === 'deuda' ? { ...m, categoria: 'suscripciones', descripcion: 'Streaming' } : m);
    expect(proponerJugadas(f, proyectar(f)).find(j => j.tipo === 'mover_pago')?.costo).toBe(0); // Cambiar fecha cuesta 0.
    expect(proponerJugadas(f, proyectar(f)).some(j => j.tipo === 'pagar_minimo')).toBe(false);
  });
  it('sin déficit no propone nada; sin solución conserva recorte de 30 %', () => {
    const f = { ...perfil(), saldoActual: 100000 };
    expect(proponerJugadas(f, proyectar(f))).toEqual([]);
    const pobre = { ...perfil(), saldoActual: 0 };
    const j = proponerJugadas(pobre, proyectar(pobre));
    expect(j.every(x => !x.resuelve)).toBe(true);
    expect(j.find(x => x.tipo === 'recortar_gasto')?.ajustes[0]).toMatchObject({ bp: 3000 });
  });
});
