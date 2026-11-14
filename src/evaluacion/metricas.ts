/**
 * Estadísticas de la evaluación. Los errores entran en céntimos enteros; los promedios salen
 * redondeados a céntimos. Con una lista vacía se devuelve null: no se inventa un cero.
 */
export function media(valores: number[]): number | null {
  return valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : null;
}

/** Cuantil con interpolación lineal. p entre 0 y 1. */
export function cuantil(valores: number[], p: number): number | null {
  if (!valores.length) return null;
  if (p < 0 || p > 1) throw new Error('El cuantil va entre 0 y 1');
  const orden = [...valores].sort((a, b) => a - b);
  const posicion = (orden.length - 1) * p;
  const abajo = Math.floor(posicion), arriba = Math.ceil(posicion);
  return orden[abajo] + (orden[arriba] - orden[abajo]) * (posicion - abajo);
}

const entero = (v: number | null) => v === null ? null : Math.round(v);
const cuatro = (v: number | null) => v === null ? null : Math.round(v * 10_000) / 10_000;

export interface ResumenError {
  n: number;
  /** Error absoluto medio, en céntimos. */
  mae: number | null;
  /** Mediana del error absoluto, en céntimos: lo que falla «el cliente del medio». */
  mediana: number | null;
  /** Percentil 90 del error absoluto: lo que falla en los casos malos. */
  p90: number | null;
  /** Error medio con signo (predicho − real). Negativo: el método se queda corto (es pesimista). */
  sesgo: number | null;
  /** Suma de errores absolutos / suma de saldos reales en valor absoluto. Sirve aunque haya saldos cerca de cero. */
  wape: number | null;
}

/** Cada par es {predicho, real} en céntimos. */
export function resumirErrores(pares: { predicho: number; real: number }[]): ResumenError {
  const errores = pares.map(p => p.predicho - p.real);
  const absolutos = errores.map(Math.abs);
  const base = pares.reduce((s, p) => s + Math.abs(p.real), 0);
  return {
    n: pares.length,
    mae: entero(media(absolutos)),
    mediana: entero(cuantil(absolutos, 0.5)),
    p90: entero(cuantil(absolutos, 0.9)),
    sesgo: entero(media(errores)),
    wape: base > 0 ? cuatro(absolutos.reduce((s, v) => s + v, 0) / base) : null,
  };
}

export interface Confusion { vp: number; fp: number; fn: number; vn: number }
export interface Tasas extends Confusion {
  /** De los avisos dados, cuántos eran ciertos. */
  precision: number | null;
  /** De los casos reales, cuántos se avisaron. */
  recall: number | null;
  f1: number | null;
  /** De quienes no tenían el problema, a cuántos se les avisó igual. */
  falsosPositivos: number | null;
  exactitud: number | null;
}

export function contar(pares: { predicho: boolean; real: boolean }[]): Confusion {
  const c: Confusion = { vp: 0, fp: 0, fn: 0, vn: 0 };
  for (const p of pares) c[p.predicho ? (p.real ? 'vp' : 'fp') : (p.real ? 'fn' : 'vn')]++;
  return c;
}

export function tasas(c: Confusion): Tasas {
  const dividir = (a: number, b: number) => b > 0 ? a / b : null;
  const precision = dividir(c.vp, c.vp + c.fp), recall = dividir(c.vp, c.vp + c.fn);
  const f1 = precision !== null && recall !== null && precision + recall > 0 ? 2 * precision * recall / (precision + recall) : null;
  return { ...c, precision: cuatro(precision), recall: cuatro(recall), f1: cuatro(f1),
    falsosPositivos: cuatro(dividir(c.fp, c.fp + c.vn)), exactitud: cuatro(dividir(c.vp + c.vn, c.vp + c.fp + c.fn + c.vn)) };
}

export function clasificar(pares: { predicho: boolean; real: boolean }[]): Tasas {
  return tasas(contar(pares));
}

/** Error cuadrático medio de una probabilidad frente a lo que pasó (0 perfecto; menor es mejor). */
export function brier(pares: { probabilidad: number; real: boolean }[]): number | null {
  return cuatro(media(pares.map(p => (p.probabilidad - (p.real ? 1 : 0)) ** 2)));
}

/**
 * Probabilidad por tramo, de peor a mejor, obligada a no subir: si un tramo mejor sale con más
 * riesgo que el anterior (ruido de pocos casos), los dos se juntan y comparten probabilidad.
 * Lleva suavizado de Laplace: con pocos casos no se afirma ni 0 % ni 100 %.
 */
export function probabilidadesDecrecientes(tramos: { casos: number; total: number }[]): number[] {
  const bloques = tramos.map(t => ({ casos: t.casos, total: t.total, tramos: 1 }));
  const p = (b: { casos: number; total: number }) => (b.casos + 1) / (b.total + 2);
  for (let i = 0; i < bloques.length - 1;) {
    if (p(bloques[i]) >= p(bloques[i + 1])) { i++; continue; }
    const siguiente = bloques.splice(i + 1, 1)[0];
    bloques[i] = { casos: bloques[i].casos + siguiente.casos, total: bloques[i].total + siguiente.total, tramos: bloques[i].tramos + siguiente.tramos };
    i = Math.max(0, i - 1);
  }
  return bloques.flatMap(b => Array.from({ length: b.tramos }, () => p(b)));
}

export const redondear4 = cuatro;
export const redondear0 = entero;
