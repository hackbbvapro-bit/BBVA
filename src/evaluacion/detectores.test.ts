import { describe, expect, it } from 'vitest';
import type { Movimiento } from '@/motor/tipos';
import { duplicadosIngenuo, duplicadosPrudente, gastosAtipicos } from './detectores';

function movimiento(id: string, cambios: Partial<Movimiento> = {}): Movimiento {
  return { id, fecha: '2026-01-05', monto: -300, descripcion: 'Pasaje', categoria: 'transporte', canal: 'efectivo', ...cambios };
}

function costumbre(fechas: string[]): Movimiento[] {
  return fechas.flatMap((fecha, i) => [movimiento(`ida-${i}`, { fecha }), movimiento(`vuelta-${i}`, { fecha })]);
}

describe('detectores de movimientos', () => {
  it('el ingenuo marca todo menos el primero y distingue día, descripción, monto y canal', () => {
    const movimientos = [movimiento('primero'), movimiento('segundo'), movimiento('tercero'),
      movimiento('otro-dia', { fecha: '2026-01-06' }), movimiento('otra-descripcion', { descripcion: 'Taxi' }),
      movimiento('otro-monto', { monto: -400 }), movimiento('otro-canal', { canal: 'cuenta' })];
    expect(duplicadosIngenuo(movimientos)).toEqual(new Set(['segundo', 'tercero']));
  });

  it('el prudente respeta la costumbre repetida en tres días distintos', () => {
    expect(duplicadosPrudente(costumbre(['2026-01-05', '2026-01-12', '2026-01-19']))).toEqual(new Set());
  });

  // Caso que falló en la primera versión: la regla de cargo fijo marcaba ida-1 e ida-2.
  it('el prudente respeta también la costumbre de tres días consecutivos', () => {
    expect(duplicadosPrudente(costumbre(['2026-01-05', '2026-01-06', '2026-01-07']))).toEqual(new Set());
  });

  it.each(['2026-03-06', '2026-03-07'])('marca un cargo fijo cobrado otra vez el %s', fecha => {
    const cargos = ['2026-01-05', '2026-02-05', '2026-03-05', fecha].map((dia, i) => movimiento(`cargo-${i}`, {
      fecha: dia, descripcion: 'Internet', categoria: 'servicios', canal: 'cuenta', monto: -9000,
    }));
    expect(duplicadosPrudente(cargos)).toEqual(new Set(['cargo-3']));
  });

  it('marca un gasto único grande y excluye cobros repetidos y recurrentes', () => {
    const movimientos = [
      movimiento('ingreso', { fecha: '2026-01-01', monto: 100_000, descripcion: 'Sueldo' }),
      ...Array.from({ length: 10 }, (_, i) => movimiento(`pequeno-${i}`, { descripcion: `Compra ${i}`, monto: -1000 })),
      movimiento('emergencia', { monto: -100_000, descripcion: 'Emergencia' }),
      movimiento('repetido-1', { monto: -100_000, descripcion: 'Compra repetida', fecha: '2026-02-02' }),
      movimiento('repetido-2', { monto: -100_000, descripcion: 'Compra repetida', fecha: '2026-02-17' }),
      ...['2026-01-05', '2026-02-05', '2026-03-05'].map((fecha, i) => movimiento(`alquiler-${i}`, {
        fecha, monto: -100_000, descripcion: 'Alquiler', categoria: 'alquiler', canal: 'cuenta',
      })),
    ];
    expect(gastosAtipicos(movimientos, [])).toEqual(new Set(['emergencia']));
  });

  it('devuelve conjuntos vacíos sin movimientos', () => {
    expect(duplicadosIngenuo([])).toEqual(new Set());
    expect(duplicadosPrudente([])).toEqual(new Set());
    expect(gastosAtipicos([], [])).toEqual(new Set());
  });
});
