import { beforeAll, describe, expect, it } from 'vitest';
import { evaluar, type Resultados } from './evaluar';
import { METODOS } from './pronostico';

describe('evaluación integral', () => {
  const opciones = { clientes: 40, semillaAjuste: 11, semillaEvaluacion: 12 };
  let resultado: Resultados;

  beforeAll(() => {
    resultado = evaluar(opciones);
  }, 60_000);

  it('rechaza semillas iguales para ajuste y evaluación', () => {
    expect(() => evaluar({ ...opciones, semillaEvaluacion: 11 })).toThrow('Ajuste y evaluación necesitan semillas distintas');
  });

  it('produce exactamente el mismo resultado en dos corridas iguales', () => {
    expect(evaluar(opciones)).toEqual(resultado);
  }, 60_000);

  it('cuenta los 40 clientes en la matriz de avisos de cada método', () => {
    expect(resultado.poblacion.clientes).toBe(40);
    for (const metodo of METODOS) {
      const { vp, fp, fn, vn } = resultado.pronostico.global.metodos[metodo].aviso;
      expect(vp + fp + fn + vn).toBe(40);
    }
  });

  it('incluye todas las secciones del informe', () => {
    expect(Object.keys(resultado).sort()).toEqual([
      'configuracion', 'poblacion', 'pronostico', 'origenDelError', 'calibracion', 'recurrentes', 'detectores', 'decision',
    ].sort());
  });

  it('no contiene NaN ni Infinity en el JSON ni números no finitos ocultos como null', () => {
    const json = JSON.stringify(resultado);
    expect(json).not.toContain('NaN');
    expect(json).not.toContain('Infinity');
    // JSON convierte números no finitos a null; revisar también los valores originales.
    const verificar = (valor: unknown): void => {
      if (typeof valor === 'number') expect(Number.isFinite(valor)).toBe(true);
      else if (valor !== null && typeof valor === 'object') Object.values(valor).forEach(verificar);
    };
    verificar(resultado);
  });
});
