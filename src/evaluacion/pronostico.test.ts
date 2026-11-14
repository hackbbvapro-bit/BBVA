import { describe, expect, it } from 'vitest';
import { proyectar } from '@/motor';
import { aPerfil, generarCliente } from './poblacion';
import { HORIZONTES, METODOS, avisoDe, evaluarCliente, pronosticar } from './pronostico';

describe('pronóstico por cliente', () => {
  const cliente = generarCliente(11, 0);

  it('mantiene el saldo del corte con saldo plano en los tres horizontes', () => {
    const saldos = pronosticar(cliente, 'saldo_plano');
    expect(saldos).toHaveLength(30);
    for (const horizonte of HORIZONTES) expect(saldos[horizonte - 1]).toBe(cliente.saldoCorte);
  });

  it('coincide con la proyección del motor en los días 7, 14 y 30', () => {
    const saldos = pronosticar(cliente, 'motor');
    const proyeccion = proyectar(aPerfil(cliente));
    for (const horizonte of HORIZONTES) expect(saldos[horizonte - 1]).toBe(proyeccion.dias[horizonte - 1].saldo);
  });

  it('no avisa sin saldos negativos y señala el primer día negativo', () => {
    expect(avisoDe([100, 0, 500])).toEqual({ hay: false, dia: null });
    expect(avisoDe([])).toEqual({ hay: false, dia: null });
    expect(avisoDe([100, 0, -1, 200, -500])).toEqual({ hay: true, dia: 3 });
    expect(avisoDe([-1, -200])).toEqual({ hay: true, dia: 1 });
  });

  it('evalúa de forma determinista y conserva céntimos enteros en todos los métodos', () => {
    const primero = evaluarCliente(cliente);
    expect(evaluarCliente(cliente)).toEqual(primero);
    for (const metodo of METODOS) {
      expect(primero.previsto[metodo]).toHaveLength(30);
      for (const saldo of primero.previsto[metodo]) expect(Number.isSafeInteger(saldo)).toBe(true);
    }
  });
});
