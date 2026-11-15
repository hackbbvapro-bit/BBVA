import { describe, expect, it } from 'vitest';
import { aPerfil } from '../datos/aPerfil';
import { datosDeEjemplo } from '../datos/semilla';
import { rangoDias } from './fechas';
import { diasDelHorizonte, tramos, type Horizonte } from './horizonte';
import { episodiosEnRojo, puntosDelGrafico, semanasDelGrafico } from './puntos-grafico';
import { proyectar } from './proyeccion';

const perfil = aPerfil(datosDeEjemplo());
const proyeccion = (h: Horizonte) => proyectar(perfil, { dias: diasDelHorizonte(perfil.hoy, h) });

/** Serie sintética: saldo fijo de 1 000 soles salvo los días indicados. */
function serie(desde: string, n: number, cambios: Record<number, number> = {}) {
  return rangoDias(desde, n).map((fecha, i) => ({ fecha, saldo: cambios[i] ?? 100_000 }));
}

describe('episodiosEnRojo: una alerta por cada caída a rojo', () => {
  it('se recupera y vuelve a caer: dos alertas, cada una en su primer día en rojo', () => {
    const dias = serie('2026-11-13', 30, { 5: -1_000, 6: -2_000, 7: 500, 20: -300, 21: -10 });
    expect(episodiosEnRojo(dias)).toEqual([5, 20]);
  });

  it('tres caídas dan tres alertas', () => {
    const dias = serie('2026-11-13', 30, { 2: -1, 10: -1, 25: -1 });
    expect(episodiosEnRojo(dias)).toEqual([2, 10, 25]);
  });

  it('quedarse en rojo varios días seguidos es una sola alerta', () => {
    const dias = serie('2026-11-13', 10, { 3: -1, 4: -5, 5: -9, 6: -2 });
    expect(episodiosEnRojo(dias)).toEqual([3]);
  });

  it('si arranca en rojo, el día 0 ya es alerta; cero exacto no es rojo', () => {
    expect(episodiosEnRojo(serie('2026-11-13', 5, { 0: -1, 1: 0, 2: -1 }))).toEqual([0, 2]);
  });

  it('sin rojo no hay alertas', () => {
    expect(episodiosEnRojo(serie('2026-11-13', 30))).toEqual([]);
    expect(episodiosEnRojo([])).toEqual([]);
  });
});

describe('semanasDelGrafico: el acumulado por semanas, con los mismos cortes que la tabla', () => {
  it('corta en semanas de 7 días desde hoy y la última se cierra en el último día', () => {
    const dias = serie('2026-11-13', 61);
    const semanas = semanasDelGrafico(dias);
    expect(semanas).toHaveLength(9);
    expect(semanas[0]).toMatchObject({ indice: 6, desde: '2026-11-13', hasta: '2026-11-19' });
    expect(semanas[1]).toMatchObject({ indice: 13, desde: '2026-11-20', hasta: '2026-11-26' });
    expect(semanas.at(-1)).toMatchObject({ indice: 60, desde: '2027-01-08', hasta: '2027-01-12' });
  });

  it('el punto de cada semana es el saldo con que cierra; el mínimo de adentro no se pierde', () => {
    const dias = serie('2026-11-13', 14, { 3: -12_345, 6: 80_000 });
    const [primera] = semanasDelGrafico(dias);
    expect(primera.saldo).toBe(80_000);
    expect(primera.saldoMinimo).toBe(-12_345);
    expect(primera.fechaMinimo).toBe('2026-11-16');
    expect(primera.diasEnRojo).toBe(1);
    expect(primera.alerta).toBe(true);
  });

  it('marca alerta en cada semana donde empieza una caída, no en las que siguen en rojo', () => {
    // Rojo del día 5 al 9 (cruza dos semanas) y otra caída el día 30.
    const cambios: Record<number, number> = { 30: -50 };
    for (let i = 5; i <= 9; i++) cambios[i] = -100;
    const semanas = semanasDelGrafico(serie('2026-11-13', 61, cambios));
    expect(semanas.map(s => s.alerta)).toEqual([true, false, false, false, true, false, false, false, false]);
    expect(semanas[1].diasEnRojo).toBe(3);
  });

  it('con el caso de Andrea coincide céntimo a céntimo con la tabla por semanas', () => {
    for (const h of ['2m', '3m', '6m'] as const) {
      const p = proyeccion(h);
      const tabla = tramos(p, perfil.hoy, 'semana');
      const semanas = semanasDelGrafico(p.dias);
      expect(semanas.map(s => [s.desde, s.hasta, s.saldo, s.saldoMinimo, s.diasEnRojo]))
        .toEqual(tabla.map(t => [t.desde, t.hasta, t.saldoFinal, t.saldoMinimo, t.diasEnRojo]));
    }
  });

  it('con el caso de Andrea, la semana del déficit lleva alerta', () => {
    const p = proyeccion('2m');
    expect(p.deficit).toBeDefined();
    const semana = semanasDelGrafico(p.dias).find(s => s.desde <= p.deficit!.fecha && p.deficit!.fecha <= s.hasta);
    expect(semana?.alerta).toBe(true);
  });

  it('sin días no hay semanas', () => {
    expect(semanasDelGrafico([])).toEqual([]);
  });
});

describe('puntosDelGrafico: un punto por día hasta 1 mes, uno por semana después', () => {
  it('en 1 semana y 1 mes cada día lleva su punto', () => {
    for (const h of ['semana', 'mes'] as const) {
      const p = proyeccion(h);
      expect(puntosDelGrafico(p.dias, h)).toEqual(p.dias.map((_, i) => i));
    }
  });

  it('en 2, 3 y 6 meses: hoy y el cierre de cada semana', () => {
    for (const h of ['2m', '3m', '6m'] as const) {
      const p = proyeccion(h);
      const puntos = puntosDelGrafico(p.dias, h);
      expect(puntos).toEqual([0, ...semanasDelGrafico(p.dias).map(s => s.indice)]);
      expect(puntos.at(-1)).toBe(p.dias.length - 1);
    }
  });

  it('6 meses pasa de 181 puntos diarios a unos 28', () => {
    const p = proyeccion('6m');
    expect(p.dias.length).toBeGreaterThan(180);
    expect(puntosDelGrafico(p.dias, '6m').length).toBeLessThanOrEqual(28);
  });

  it('devuelve índices en orden y sin repetir, aunque la serie sea de un día', () => {
    expect(puntosDelGrafico(serie('2026-11-15', 1), '3m')).toEqual([0]);
    const puntos = puntosDelGrafico(serie('2026-11-15', 92), '3m');
    expect(puntos).toEqual([...new Set(puntos)].sort((a, b) => a - b));
  });

  it('sin días no hay puntos', () => {
    expect(puntosDelGrafico([], '6m')).toEqual([]);
  });
});
