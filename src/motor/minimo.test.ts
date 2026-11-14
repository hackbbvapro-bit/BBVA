import { describe, expect, it } from 'vitest';
import { leccionMinimo, leccionesMinimo } from './minimo';
import { interesMensual } from './dinero';
import type { Deuda } from './tipos';

// La tarjeta del caso de ejemplo: S/ 1,800 al 100 % de TCEA, mínimo S/ 160, suele pagar S/ 600.
const tarjeta: Deuda = { id: 't', nombre: 'Tarjeta Azul', tipo: 'tarjeta', saldo: 180000, tceaBp: 10000, pagoMinimo: 16000, pagoHabitual: 60000, diaPago: 23 };

describe('lección del pago mínimo', () => {
  it('reparte el mínimo del primer mes entre interés y abono, sin perder céntimos', () => {
    const l = leccionMinimo(tarjeta)!;
    // 180000 × (2^(30/360) − 1) = 10 703,4… → 10 703 céntimos.
    expect(l.interesPrimerMes).toBe(10703);
    expect(l.interesPrimerMes).toBe(interesMensual(180000, 10000));
    expect(l.abonoPrimerMes).toBe(16000 - 10703);
    expect(l.interesPrimerMes + l.abonoPrimerMes).toBe(tarjeta.pagoMinimo);
  });

  it('solo el mínimo tarda mucho más y cuesta mucho más interés que lo que suele pagar', () => {
    const l = leccionMinimo(tarjeta)!;
    expect(l.soloMinimo.noTermina).toBe(false);
    expect(l.conLoQuePaga).not.toBeNull();
    expect(l.soloMinimo.meses).toBeGreaterThan(l.conLoQuePaga!.meses * 3);
    expect(l.soloMinimo.interesTotal).toBeGreaterThan(l.conLoQuePaga!.interesTotal * 3);
    // Lo pagado = deuda + intereses: el simulador no crea ni pierde dinero.
    expect(l.soloMinimo.totalPagado).toBe(tarjeta.saldo + l.soloMinimo.interesTotal);
    expect(l.conLoQuePaga!.totalPagado).toBe(tarjeta.saldo + l.conLoQuePaga!.interesTotal);
  });

  it('no compara con «lo que suele pagar» si paga justo el mínimo', () => {
    expect(leccionMinimo({ ...tarjeta, pagoHabitual: 16000 })!.conLoQuePaga).toBeNull();
  });

  it('si el mínimo no cubre ni el interés, la deuda no termina y el abono es cero', () => {
    const l = leccionMinimo({ ...tarjeta, pagoMinimo: 10000 })!;
    expect(l.abonoPrimerMes).toBe(0);
    expect(l.soloMinimo.noTermina).toBe(true);
  });

  it('si el saldo es menor que el mínimo, se cancela en un mes', () => {
    const l = leccionMinimo({ ...tarjeta, saldo: 5000 })!;
    expect(l.soloMinimo.meses).toBe(1);
    expect(l.abonoPrimerMes).toBe(5000);
  });

  it('no da lección sin tasa conocida, sin mínimo, sin saldo o si no es tarjeta', () => {
    expect(leccionMinimo({ ...tarjeta, tceaBp: 0 })).toBeNull();
    expect(leccionMinimo({ ...tarjeta, pagoMinimo: 0 })).toBeNull();
    expect(leccionMinimo({ ...tarjeta, saldo: 0 })).toBeNull();
    expect(leccionMinimo({ ...tarjeta, tipo: 'prestamo' })).toBeNull();
  });

  it('ordena las tarjetas de la tasa más alta a la más baja y salta las demás', () => {
    const verde: Deuda = { ...tarjeta, id: 'v', nombre: 'Verde', saldo: 90000, tceaBp: 5500, pagoMinimo: 8000 };
    const prestamo: Deuda = { ...tarjeta, id: 'p', tipo: 'prestamo' };
    expect(leccionesMinimo([verde, prestamo, tarjeta]).map(l => l.id)).toEqual(['t', 'v']);
  });

  it('no modifica las deudas que recibe', () => {
    const copia = { ...tarjeta };
    leccionMinimo(tarjeta);
    expect(tarjeta).toEqual(copia);
  });
});
