import { describe, expect, it } from 'vitest';
import { aPerfil } from '../datos/aPerfil';
import { datosDeEjemplo } from '../datos/semilla';
import { sumar } from './dinero';
import { diasDelHorizonte, diasEnRojo, particion, tramos } from './horizonte';
import { proyectar } from './proyeccion';

describe('diasDelHorizonte', () => {
  it('una semana son 7 días y un mes son 30, como en el resto de la app', () => {
    expect(diasDelHorizonte('2026-11-14', 'semana')).toBe(7);
    expect(diasDelHorizonte('2026-11-14', 'mes')).toBe(30);
  });
  it('2, 3 y 6 meses se cuentan con meses de calendario', () => {
    expect(diasDelHorizonte('2026-11-14', '2m')).toBe(61); // 14-nov → 14-ene
    expect(diasDelHorizonte('2026-11-14', '3m')).toBe(92); // → 14-feb
    expect(diasDelHorizonte('2026-11-14', '6m')).toBe(181); // → 14-may
  });
  it('sin deriva en fin de mes: 31-dic + 2 meses es el 28-feb (o 29 en bisiesto)', () => {
    expect(diasDelHorizonte('2026-12-31', '2m')).toBe(59); // → 28-feb-2027
    expect(diasDelHorizonte('2027-12-31', '2m')).toBe(60); // → 29-feb-2028
    expect(diasDelHorizonte('2026-01-31', '3m')).toBe(89); // → 30-abr
  });
  it('la tabla va día a día, por semanas o por meses', () => {
    expect(particion('semana')).toBe('dia');
    expect(particion('mes')).toBe('semana');
    expect(particion('6m')).toBe('mes');
  });
});

describe('tramos (caso de Andrea)', () => {
  const perfil = aPerfil(datosDeEjemplo());

  for (const [h, n] of [['semana', 7], ['mes', 5], ['3m', 3], ['6m', 6]] as const) {
    it(`${h}: ${n} tramos que suman exactamente el cambio de saldo`, () => {
      const p = proyectar(perfil, { dias: diasDelHorizonte(perfil.hoy, h) });
      const t = tramos(p, perfil.hoy, particion(h));
      expect(t).toHaveLength(n);
      expect(t[0].desde).toBe(p.desde);
      expect(t.at(-1)!.hasta).toBe(p.hasta);
      expect(t.at(-1)!.saldoFinal).toBe(p.saldoFinal);
      expect(sumar(t.flatMap(x => [x.entra, x.sale]))).toBe(p.saldoFinal - p.saldoInicial);
      expect(sumar(t.map(x => x.diasEnRojo))).toBe(diasEnRojo(p));
      expect(Math.min(...t.map(x => x.saldoMinimo))).toBe(p.saldoMinimo);
      for (const x of t) {
        expect(Number.isInteger(x.entra) && Number.isInteger(x.sale)).toBe(true);
        expect(x.entra).toBeGreaterThanOrEqual(0);
        expect(x.sale).toBeLessThanOrEqual(0);
      }
    });
  }

  it('los tramos no se pisan ni dejan huecos', () => {
    const p = proyectar(perfil, { dias: diasDelHorizonte(perfil.hoy, '6m') });
    const t = tramos(p, perfil.hoy, 'mes');
    const dias = t.reduce((n, x) => n + p.dias.filter(d => d.fecha >= x.desde && d.fecha <= x.hasta).length, 0);
    expect(dias).toBe(p.dias.length);
    expect(t.map(x => x.etiqueta)).toEqual(['Mes 1', 'Mes 2', 'Mes 3', 'Mes 4', 'Mes 5', 'Mes 6']);
  });

  it('la semana a la vista pone nombre al día', () => {
    const p = proyectar(perfil, { dias: 7 });
    expect(tramos(p, perfil.hoy, 'dia')[0].etiqueta).toMatch(/^[A-ZÁÉÍÓÚ][a-záéíóú]+ \d{1,2} [a-z]{3}$/);
  });
});
