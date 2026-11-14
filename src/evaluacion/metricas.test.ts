import { describe, expect, it } from 'vitest';
import { brier, clasificar, contar, cuantil, media, probabilidadesDecrecientes, resumirErrores, tasas } from './metricas';

describe('métricas de evaluación', () => {
  it('calcula la media y devuelve null sin observaciones', () => {
    expect(media([100, -200, 400])).toBe(100);
    expect(media([])).toBeNull();
  });

  it('interpola cuantiles sin modificar la entrada y valida la probabilidad', () => {
    const valores = [400, 100, 200, 300];
    expect(cuantil(valores, 0)).toBe(100);
    expect(cuantil(valores, 0.5)).toBe(250);
    expect(cuantil(valores, 0.9)).toBe(370);
    expect(cuantil(valores, 1)).toBe(400);
    expect(valores).toEqual([400, 100, 200, 300]);
    expect(cuantil([123], 0.9)).toBe(123);
    expect(cuantil([], 0.5)).toBeNull();
    expect(() => cuantil(valores, -0.1)).toThrow();
    expect(() => cuantil(valores, 1.1)).toThrow();
  });

  it('resume errores calculados a mano con sesgo predicho menos real', () => {
    // Errores: 100, -200, 300, -400; absolutos suman 1000 y la base es 2000.
    expect(resumirErrores([
      { predicho: 1100, real: 1000 }, { predicho: 300, real: 500 },
      { predicho: -200, real: -500 }, { predicho: -400, real: 0 },
    ])).toEqual({ n: 4, mae: 250, mediana: 250, p90: 370, sesgo: -50, wape: 0.5 });
    expect(resumirErrores([{ predicho: 100, real: 0 }]).wape).toBeNull();
    expect(resumirErrores([])).toEqual({ n: 0, mae: null, mediana: null, p90: null, sesgo: null, wape: null });
  });

  it('cuenta las cuatro clases y calcula sus tasas con redondeo', () => {
    const pares = [
      { predicho: true, real: true }, { predicho: true, real: true },
      { predicho: true, real: false }, { predicho: false, real: true },
      { predicho: false, real: false }, { predicho: false, real: false },
    ];
    const confusion = { vp: 2, fp: 1, fn: 1, vn: 2 };
    const esperado = { ...confusion, precision: 0.6667, recall: 0.6667, f1: 0.6667,
      falsosPositivos: 0.3333, exactitud: 0.6667 };
    expect(contar(pares)).toEqual(confusion);
    expect(tasas(confusion)).toEqual(esperado);
    expect(clasificar(pares)).toEqual(esperado);
  });

  it('no inventa precisión sin positivos predichos ni tasas sin datos', () => {
    expect(clasificar([{ predicho: false, real: true }, { predicho: false, real: false }]))
      .toEqual({ vp: 0, fp: 0, fn: 1, vn: 1, precision: null, recall: 0, f1: null, falsosPositivos: 0, exactitud: 0.5 });
    expect(clasificar([])).toEqual({ vp: 0, fp: 0, fn: 0, vn: 0,
      precision: null, recall: null, f1: null, falsosPositivos: null, exactitud: null });
  });

  it('calcula Brier como error cuadrático medio', () => {
    expect(brier([{ probabilidad: 0.8, real: true }, { probabilidad: 0.4, real: false }])).toBe(0.1);
    expect(brier([{ probabilidad: 1, real: true }, { probabilidad: 0, real: false }])).toBe(0);
    expect(brier([{ probabilidad: 0, real: true }, { probabilidad: 1, real: false }])).toBe(1);
    expect(brier([])).toBeNull();
  });
});

describe('probabilidades decrecientes', () => {
  it('suaviza con Laplace incluso tramos vacíos y extremos', () => {
    expect(probabilidadesDecrecientes([{ casos: 4, total: 4 }, { casos: 0, total: 0 }, { casos: 0, total: 4 }]))
      .toEqual([5 / 6, 1 / 2, 1 / 6]);
    expect(probabilidadesDecrecientes([])).toEqual([]);
  });

  it('junta un tramo ascendente con el anterior usando los totales combinados', () => {
    expect(probabilidadesDecrecientes([{ casos: 1, total: 4 }, { casos: 6, total: 8 }, { casos: 0, total: 4 }]))
      .toEqual([8 / 14, 8 / 14, 1 / 6]);
  });

  it('revisa bloques anteriores tras una unión y conserva longitud y monotonía', () => {
    const tramos = [{ casos: 4, total: 8 }, { casos: 0, total: 8 }, { casos: 80, total: 80 }, { casos: 0, total: 8 }];
    const probabilidades = probabilidadesDecrecientes(tramos);
    expect(probabilidades).toEqual([85 / 98, 85 / 98, 85 / 98, 1 / 10]);
    expect(probabilidades).toHaveLength(tramos.length);
    for (let i = 1; i < probabilidades.length; i++) expect(probabilidades[i]).toBeLessThanOrEqual(probabilidades[i - 1]);
  });
});
