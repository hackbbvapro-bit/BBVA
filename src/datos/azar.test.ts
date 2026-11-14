import { describe, expect, it } from 'vitest';
import { crearAzar } from './azar';
describe('azar con semilla', () => {
  it('reproduce el vector mulberry32 de semilla 1', () => {
    const a = crearAzar(1);
    expect([a.entero(0, 999), a.entero(0, 999), a.entero(0, 999)]).toEqual([627, 2, 527]);
    expect(crearAzar(1).entero(0, 999)).toBe(627);
  });
  it('elige y respeta extremos y límites', () => {
    expect(crearAzar(1).elegir(['a', 'b', 'c'])).toBe('b');
    expect(crearAzar(1).probabilidad(0)).toBe(false);
    expect(crearAzar(1).probabilidad(1)).toBe(true);
    expect(crearAzar(1).entero(5, 5)).toBe(5);
    expect(() => crearAzar(1).elegir([])).toThrow();
    expect(() => crearAzar(1).entero(5, 4)).toThrow();
    expect(() => crearAzar(1).probabilidad(2)).toThrow();
  });
});
