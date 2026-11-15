import { describe, expect, it } from 'vitest';
import { PERFILES } from '@/datos/perfiles';
import { analizar } from './index';
import { gastosFijosDelMes } from './gastos-fijos';
import type { Deuda, Recurrente } from './tipos';

const rec = (descripcion: string, monto: number, extra: Partial<Recurrente> = {}): Recurrente => ({
  id: descripcion, descripcion, categoria: 'servicios', canal: 'cuenta', monto, frecuencia: 'mensual',
  diaDelMes: 5, ultimaFecha: '2026-10-05', veces: 3, movible: false, ...extra,
});

const deuda = (nombre: string, pagoMinimo: number): Deuda => ({
  id: nombre, nombre, tipo: 'tarjeta', saldo: 100000, tceaBp: 5000, pagoMinimo, pagoHabitual: pagoMinimo, diaPago: 10,
});

describe('gastos fijos del mes', () => {
  it('Andrea: alquiler, servicios, suscripciones, seguro y los mínimos de sus 3 deudas', () => {
    const perfil = PERFILES.find(p => p.id === 'independiente')!;
    const { total, lineas } = gastosFijosDelMes(analizar(perfil).recurrentes, perfil.deudas);
    // 850 + 270 + 160 + 120 + 99 + 89 + 80 + 65 + 45 + 39.90 + 35 + 22.90 = 1 875.80 soles.
    expect(total).toBe(187580);
    expect(lineas[0]).toEqual({ descripcion: 'Alquiler', categoria: 'alquiler', monto: 85000 });
    expect(lineas.filter(l => l.categoria === 'deuda').map(l => l.monto)).toEqual([27000, 16000, 8000]);
    expect(lineas).toHaveLength(12);
    // El préstamo se nombra como cuota; las tarjetas, como mínimo.
    expect(lineas[1].descripcion).toBe('Cuota Préstamo personal');
    expect(lineas[2].descripcion).toBe('Mínimo Tarjeta Azul');
  });

  it('el pago de una deuda que se ve en la historia no se cuenta dos veces: vale su mínimo', () => {
    const r = [rec('Pago Tarjeta', -60000, { categoria: 'deuda', deudaId: 't' }), rec('Luz', -6500)];
    expect(gastosFijosDelMes(r, [deuda('Tarjeta', 16000)]).total).toBe(22500);
  });

  it('un pago con deudaId pero otra categoría tampoco se suma aparte', () => {
    const r = [rec('Cuota', -27000, { deudaId: 'p' })];
    expect(gastosFijosDelMes(r, [deuda('Préstamo', 27000)]).total).toBe(27000);
  });

  it('un gasto semanal se lleva a un mes típico (× 52 / 12, al sol)', () => {
    const r = [rec('Movilidad', -5000, { frecuencia: 'semanal', categoria: 'transporte' })];
    // 50 × 52 / 12 = 216.67 → 217 soles.
    expect(gastosFijosDelMes(r, []).total).toBe(21700);
  });

  it('dos series con el mismo nombre (quincena) son un solo gasto fijo', () => {
    const r = [rec('Ayuda a mamá', -20000, { id: 'a' }), rec('Ayuda a mamá', -20000, { id: 'b', diaDelMes: 20 })];
    expect(gastosFijosDelMes(r, []).lineas).toEqual([{ descripcion: 'Ayuda a mamá', categoria: 'servicios', monto: 40000 }]);
  });

  it('las entradas de dinero no son gastos', () => {
    const r = [rec('Sueldo', 180000, { categoria: 'sueldo' }), rec('Agua', -3500)];
    expect(gastosFijosDelMes(r, []).total).toBe(3500);
  });

  it('sin gastos ni deudas da cero', () => {
    expect(gastosFijosDelMes([], [])).toEqual({ total: 0, lineas: [] });
  });

  it('una deuda sin mínimo no agrega línea', () => {
    expect(gastosFijosDelMes([], [deuda('Tarjeta', 0)]).lineas).toEqual([]);
  });

  it('las líneas van de mayor a menor', () => {
    const { lineas } = gastosFijosDelMes([rec('Agua', -3500), rec('Alquiler', -85000)], [deuda('Tarjeta', 16000)]);
    expect(lineas.map(l => l.monto)).toEqual([85000, 16000, 3500]);
  });
});
