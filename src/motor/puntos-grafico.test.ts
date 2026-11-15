import { describe, expect, it } from 'vitest';
import { aPerfil } from '../datos/aPerfil';
import { datosDeEjemplo } from '../datos/semilla';
import { diaSemana, rangoDias } from './fechas';
import { diasDelHorizonte, type Horizonte } from './horizonte';
import { marcasDelEje, puntosDelGrafico } from './puntos-grafico';
import { proyectar } from './proyeccion';

const perfil = aPerfil(datosDeEjemplo());
const proyeccion = (h: Horizonte) => proyectar(perfil, { dias: diasDelHorizonte(perfil.hoy, h) });

/** Serie sintética: saldo fijo de 1 000 soles salvo los días indicados. */
function serie(desde: string, n: number, cambios: Record<number, number> = {}) {
  return rangoDias(desde, n).map((fecha, i) => ({ fecha, saldo: cambios[i] ?? 100_000 }));
}

describe('puntosDelGrafico: un punto por día hasta 1 mes, uno por semana después', () => {
  it('en 1 semana y 1 mes cada día lleva su punto', () => {
    for (const h of ['semana', 'mes'] as const) {
      const p = proyeccion(h);
      expect(puntosDelGrafico(p.dias, h)).toEqual(p.dias.map((_, i) => i));
    }
  });

  it('en 2, 3 y 6 meses hay un punto por semana: hoy, cada domingo y el último día', () => {
    for (const h of ['2m', '3m', '6m'] as const) {
      const p = proyeccion(h);
      const puntos = puntosDelGrafico(p.dias, h);
      expect(puntos[0]).toBe(0);
      expect(puntos.at(-1)).toBe(p.dias.length - 1);
      const domingos = p.dias.map((d, i) => (diaSemana(d.fecha) === 0 ? i : -1)).filter(i => i >= 0);
      for (const i of domingos) expect(puntos).toContain(i);
      // Como mucho: hoy + domingos + último + día más bajo + primer día en rojo.
      expect(puntos.length).toBeLessThanOrEqual(domingos.length + 4);
      expect(puntos.length).toBeLessThan(p.dias.length / 4);
    }
  });

  it('6 meses pasa de 181 puntos diarios a unos 28', () => {
    const p = proyeccion('6m');
    expect(p.dias.length).toBeGreaterThan(180);
    expect(puntosDelGrafico(p.dias, '6m').length).toBeLessThanOrEqual(30);
  });

  it('nunca esconde el día más bajo ni el primer día en rojo, aunque caigan a mitad de semana', () => {
    // 2026-11-13 es viernes: el miércoles 18 (i = 5) es el primer rojo y el jueves 26 (i = 13) el más bajo.
    const dias = serie('2026-11-13', 61, { 5: -5_000, 13: -20_000 });
    const puntos = puntosDelGrafico(dias, '2m');
    expect(diaSemana(dias[5].fecha)).toBe(3);
    expect(puntos).toContain(5);
    expect(puntos).toContain(13);
  });

  it('con el caso de Andrea, el día del déficit y el día más bajo siempre están', () => {
    for (const h of ['2m', '3m', '6m'] as const) {
      const p = proyeccion(h);
      const puntos = puntosDelGrafico(p.dias, h);
      const minimo = p.dias.findIndex(d => d.fecha === p.fechaSaldoMinimo);
      expect(puntos).toContain(minimo);
      if (p.deficit) expect(puntos).toContain(p.dias.findIndex(d => d.fecha === p.deficit!.fecha));
    }
  });

  it('devuelve índices en orden y sin repetir', () => {
    const dias = serie('2026-11-15', 92, { 0: -1 }); // domingo, primer rojo y más bajo a la vez
    const puntos = puntosDelGrafico(dias, '3m');
    expect(puntos).toEqual([...new Set(puntos)].sort((a, b) => a - b));
  });

  it('sin días no hay puntos', () => {
    expect(puntosDelGrafico([], '6m')).toEqual([]);
  });
});

describe('marcasDelEje: pocas fechas legibles bajo el gráfico', () => {
  it('nunca pasa del máximo pedido y empieza en hoy', () => {
    for (const h of ['semana', 'mes', '2m', '3m', '6m'] as const) {
      const p = proyeccion(h);
      const puntos = puntosDelGrafico(p.dias, h);
      for (const maximo of [4, 6]) {
        const marcas = marcasDelEje(p.dias, puntos, maximo);
        expect(marcas.length).toBeLessThanOrEqual(maximo);
        expect(marcas.length).toBeGreaterThanOrEqual(2);
        expect(marcas[0]).toBe(0);
        for (const m of marcas) expect(puntos).toContain(m);
      }
    }
  });

  it('las marcas quedan repartidas a pasos iguales de semana', () => {
    const p = proyeccion('6m');
    const marcas = marcasDelEje(p.dias, puntosDelGrafico(p.dias, '6m'), 5);
    const pasos = marcas.slice(2).map((m, i) => m - marcas[i + 1]);
    expect(new Set(pasos).size).toBe(1);
    expect(pasos[0] % 7).toBe(0);
  });
});
