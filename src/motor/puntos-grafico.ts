import { diaSemana } from './fechas';
import type { Horizonte } from './horizonte';
import type { Centimos, FechaISO } from './tipos';

interface Dia { fecha: FechaISO; saldo: Centimos }

/** Hasta 1 mes se ve cada día; desde 2 meses, un punto por semana para que el gráfico respire. */
const SEMANAL: Record<Horizonte, boolean> = { semana: false, mes: false, '2m': true, '3m': true, '6m': true };

/**
 * Qué días del gráfico llevan punto (índices en orden y sin repetir).
 * Semanal: hoy, cada domingo (cierre de semana) y el último día. Además, siempre el día más bajo y el primer
 * día en rojo: muestrear por semanas nunca puede esconder la caída que motiva el aviso.
 */
export function puntosDelGrafico(dias: readonly Dia[], h: Horizonte): number[] {
  if (!dias.length) return [];
  if (!SEMANAL[h]) return dias.map((_, i) => i);
  const elegidos = new Set<number>([0, dias.length - 1]);
  dias.forEach((d, i) => { if (diaSemana(d.fecha) === 0) elegidos.add(i); });
  let minimo = 0;
  dias.forEach((d, i) => { if (d.saldo < dias[minimo].saldo) minimo = i; });
  elegidos.add(minimo);
  const rojo = dias.findIndex(d => d.saldo < 0);
  if (rojo >= 0) elegidos.add(rojo);
  return [...elegidos].sort((a, b) => a - b);
}

/**
 * Qué puntos llevan fecha bajo el eje: hoy y luego pasos iguales (en días o en semanas), como mucho `maximo`.
 * Las marcas caen siempre sobre un punto visible, para que cada fecha tenga su punto encima.
 */
export function marcasDelEje(dias: readonly Dia[], puntos: readonly number[], maximo: number): number[] {
  if (puntos.length < 2 || maximo < 2) return puntos.slice(0, 1);
  const semanal = puntos.length < dias.length;
  if (!semanal) {
    // Paso hacia abajo para que las fechas lleguen hasta el final del eje (y luego se recorta al máximo).
    const paso = Math.max(1, Math.floor((dias.length - 1) / (maximo - 1)));
    const marcas: number[] = [];
    for (let i = 0; i < dias.length && marcas.length < maximo; i += paso) marcas.push(i);
    return marcas;
  }
  const domingos = puntos.filter(i => i > 0 && diaSemana(dias[i].fecha) === 0);
  // Paso hacia abajo: las fechas se reparten hasta el final del eje (lo que sobra lo recorta el máximo).
  const cada = Math.max(1, Math.floor(domingos.length / (maximo - 1)));
  // Se empieza en el domingo `cada`-ésimo para dejar aire entre «hoy» y la primera fecha.
  const elegidos = domingos.filter((_, j) => (j + 1) % cada === 0 && (cada > 1 || domingos[j] >= 3));
  return [0, ...elegidos.slice(0, maximo - 1)];
}
