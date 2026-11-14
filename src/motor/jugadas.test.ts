import { describe, expect, it } from 'vitest';
import { interesMensual } from './dinero';
import { proponerJugadas } from './jugadas';
import { proyectar } from './proyeccion';
import { rangoDias } from './fechas';
import type { Jugada, Movimiento, Perfil } from './tipos';

/**
 * Persona sintética: paga S/ 100 de tarjeta el 23, cobra S/ 200 el 30, paga S/ 3 de streaming el 20,
 * gasta S/ 1 diario en comida, S/ 1.50 diario en delivery y S/ 3 en cine algunos días sueltos.
 */
function perfil(): Perfil {
  const movimientos: Movimiento[] = ['08', '09', '10'].flatMap(mes => [
    { id: `p-${mes}`, fecha: `2026-${mes}-23`, descripcion: 'Pago Azul', monto: -10000, categoria: 'deuda', canal: 'cuenta' },
    { id: `s-${mes}`, fecha: `2026-${mes}-30`, descripcion: 'Sueldo', monto: 20000, categoria: 'sueldo', canal: 'cuenta' },
    { id: `t-${mes}`, fecha: `2026-${mes}-20`, descripcion: 'Streaming', monto: -300, categoria: 'suscripciones', canal: 'cuenta' },
  ]);
  const diasDeCine = new Set([2, 9, 13, 24, 31, 38, 44, 53, 59, 67, 72, 80]);
  rangoDias('2026-08-22', 84).forEach((fecha, i) => {
    movimientos.push({ id: `c-${fecha}`, fecha, descripcion: 'Comida', monto: -100, categoria: 'comida', canal: 'cuenta' });
    movimientos.push({ id: `d-${fecha}`, fecha, descripcion: 'Delivery', monto: -150, categoria: 'ocio', canal: 'cuenta' });
    if (diasDeCine.has(i)) movimientos.push({ id: `k-${fecha}`, fecha, descripcion: 'Cine', monto: -300, categoria: 'ocio', canal: 'cuenta' });
  });
  movimientos.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id));
  return { id: 'p', nombre: 'Prueba', tipo: 'independiente', descripcion: '', hoy: '2026-11-13', saldoActual: 11000, movimientos,
    deudas: [{ id: 'azul', nombre: 'Azul', tipo: 'tarjeta', saldo: 20000, tceaBp: 10000, pagoMinimo: 5000, pagoHabitual: 10000, diaPago: 23 }] };
}
const de = (jugadas: Jugada[], tipo: Jugada['tipo']) => jugadas.find(j => j.tipo === tipo);

describe('jugadas', () => {
  it('propone solo jugadas que la persona puede hacer hoy, y cada cifra sale de reproyectar', () => {
    const f = perfil(), copia = structuredClone(f), p = proyectar(f), jugadas = proponerJugadas(f, p);
    expect(p.deficit).not.toBeNull();
    expect(jugadas.map(j => j.tipo).sort()).toEqual(['pagar_minimo', 'pausar_suscripciones', 'recortar_gasto']);
    for (const j of jugadas) {
      const nueva = proyectar(f, { ajustes: j.ajustes });
      expect(j.resuelve).toBe(nueva.deficit === null);
      expect(j.saldoMinimoDespues).toBe(nueva.saldoMinimo);
      expect(Number.isSafeInteger(j.libera) && Number.isSafeInteger(j.costo)).toBe(true);
    }
    // Primero las que resuelven y, entre ellas, la más barata.
    const orden = jugadas.map(j => [Number(!j.resuelve), j.costo]);
    expect(orden).toEqual([...orden].sort((a, b) => a[0] - b[0] || a[1] - b[1]));
    expect(f).toEqual(copia);
  });

  it('pausar libera exactamente las suscripciones que se cobran antes del bache y no cuesta nada', () => {
    const f = perfil(), pausar = de(proponerJugadas(f, proyectar(f)), 'pausar_suscripciones')!;
    // Solo el streaming del 20-nov cae antes del 23-nov: S/ 3.00.
    expect(pausar).toMatchObject({ libera: 300, costo: 0, titulo: 'Pausa tus suscripciones este mes' });
    expect(pausar.ajustes).toEqual([expect.objectContaining({ tipo: 'cambiar_monto', fecha: '2026-11-20', monto: 0 })]);
    expect(pausar.detalle).toContain('streaming (S/ 3.00, viernes 20 de noviembre)');
  });

  it('pagar el mínimo libera la diferencia y cuesta un mes de interés a la TCEA', () => {
    const f = perfil(), minimo = de(proponerJugadas(f, proyectar(f)), 'pagar_minimo')!;
    // Libera 10 000 − 5 000; 5 000 × (2^(30/360) − 1) ≈ 297 céntimos.
    expect(minimo).toMatchObject({ libera: 5000, costo: interesMensual(5000, 10000), resuelve: true });
    expect(minimo.costo).toBe(297);
  });

  it('el recorte solo toca ocio o compras, nunca la comida, y se nombra con lo que más se gasta', () => {
    const f = perfil(), recorte = de(proponerJugadas(f, proyectar(f)), 'recortar_gasto')!;
    expect(recorte.titulo).toBe('Recorta delivery y cine');
    expect(recorte.ajustes).toEqual([expect.objectContaining({ tipo: 'recortar', categoria: 'ocio' })]);
    expect(recorte.detalle).toContain('No toca tu comida básica');
    expect(recorte.costo).toBe(0);
    expect(recorte.libera).toBeGreaterThan(0);
    // Sin ocio ni compras no hay nada que recortar: nunca se propone recortar comida.
    const soloComida = perfil();
    soloComida.movimientos = soloComida.movimientos.filter(m => m.categoria !== 'ocio');
    expect(de(proponerJugadas(soloComida, proyectar(soloComida)), 'recortar_gasto')).toBeUndefined();
  });

  it('si el bache es chico, pausar lo resuelve y va primero por costar cero', () => {
    const base = perfil();
    const faltante = proyectar(base).deficit!.faltanteMaximo;
    const f = { ...base, saldoActual: base.saldoActual + faltante - 100 };
    const jugadas = proponerJugadas(f, proyectar(f));
    expect(jugadas[0]).toMatchObject({ resuelve: true, costo: 0 });
    expect(de(jugadas, 'pausar_suscripciones')?.resuelve).toBe(true);
  });

  it('nunca propone cambiar la fecha de pago, que no sirve para este mes', () => {
    const jugadas = proponerJugadas(perfil(), proyectar(perfil()));
    expect(jugadas.some(j => j.ajustes.some(a => a.tipo === 'mover'))).toBe(false);
    expect(JSON.stringify(jugadas)).not.toMatch(/fecha de pago|mueve|mover/i);
  });

  it('sin tarjeta no propone pagar el mínimo; sin suscripciones no propone pausar', () => {
    const sinTarjeta = perfil();
    sinTarjeta.deudas = [];
    expect(de(proponerJugadas(sinTarjeta, proyectar(sinTarjeta)), 'pagar_minimo')).toBeUndefined();
    const sinSuscripciones = perfil();
    sinSuscripciones.movimientos = sinSuscripciones.movimientos.filter(m => m.categoria !== 'suscripciones');
    expect(de(proponerJugadas(sinSuscripciones, proyectar(sinSuscripciones)), 'pausar_suscripciones')).toBeUndefined();
  });

  it('sin déficit no propone nada; sin solución conserva el recorte de 30 %', () => {
    const f = { ...perfil(), saldoActual: 100000 };
    expect(proponerJugadas(f, proyectar(f))).toEqual([]);
    const pobre = { ...perfil(), saldoActual: -20000 };
    const j = proponerJugadas(pobre, proyectar(pobre));
    expect(j.length).toBeGreaterThan(0);
    expect(j.every(x => !x.resuelve)).toBe(true);
    expect(de(j, 'recortar_gasto')?.ajustes[0]).toMatchObject({ bp: 3000 });
  });
});
