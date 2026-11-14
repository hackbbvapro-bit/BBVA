/** Mulberry32: secuencia reproducible de 32 bits, sin depender del reloj. */
export function crearAzar(semilla: number) {
  let estado = semilla >>> 0;
  function siguiente(): number {
    estado = (estado + 0x6D2B79F5) >>> 0;
    let valor = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    valor ^= valor + Math.imul(valor ^ (valor >>> 7), 61 | valor);
    return ((valor ^ (valor >>> 14)) >>> 0) / 4294967296;
  }
  function entero(min: number, max: number): number {
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || max < min) throw new Error('El intervalo debe contener enteros válidos');
    return min + Math.floor(siguiente() * (max - min + 1));
  }
  function elegir<T>(lista: readonly T[]): T {
    if (!lista.length) throw new Error('No puedes elegir de una lista vacía');
    return lista[entero(0, lista.length - 1)];
  }
  function probabilidad(p: number): boolean {
    if (!Number.isFinite(p) || p < 0 || p > 1) throw new Error('La probabilidad debe estar entre 0 y 1');
    return siguiente() < p;
  }
  return { entero, elegir, probabilidad };
}
