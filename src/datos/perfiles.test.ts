import { describe, expect, it } from 'vitest';
import { generarPerfil, PERFILES, HOY_DEMO } from './perfiles';
import { analizar } from '../motor';
import { partes } from '../motor/fechas';
function verificar(valor: unknown): void {
  if (typeof valor === 'number') expect(Number.isSafeInteger(valor)).toBe(true);
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) expect(() => partes(valor)).not.toThrow();
  if (valor && typeof valor === 'object') Object.values(valor).forEach(verificar);
}
describe('perfiles sintéticos', () => {
  for (const perfil of PERFILES) {
    it(`${perfil.tipo}: determinismo, 90 días, enteros y saldo contable`, () => {
      expect(generarPerfil(perfil.tipo)).toEqual(generarPerfil(perfil.tipo));
      expect(perfil.hoy).toBe(HOY_DEMO);
      const fechas = perfil.movimientos.map(m => m.fecha);
      expect(fechas).toEqual([...fechas].sort());
      expect(fechas[0]).toBe('2026-08-16');
      expect(fechas.at(-1)).toBe('2026-11-13');
      expect(new Set(fechas).size).toBe(90);
      expect(new Set(perfil.movimientos.map(m => m.id)).size).toBe(perfil.movimientos.length);
      // Saldo = apertura elegida + movimientos que sí afectan la cuenta.
      const apertura = { independiente: 97605, dependiente: 180000, mixto: 219560 }[perfil.tipo];
      expect(perfil.saldoActual).toBe(apertura + perfil.movimientos.filter(m => m.canal !== 'tarjeta').reduce((s, m) => s + m.monto, 0));
      for (const d of perfil.deudas) {
        expect(d.tceaBp).toBeGreaterThanOrEqual(4500); expect(d.tceaBp).toBeLessThanOrEqual(11000);
        expect(d.tipo === 'tarjeta' ? d.pagoHabitual > d.pagoMinimo : d.pagoHabitual === d.pagoMinimo).toBe(true);
      }
      verificar(perfil); verificar(analizar(perfil));
    });
  }
  it('Rosa: déficit en 7–15 días, de 100–400 soles y al menos una solución', () => {
    const a = analizar(generarPerfil('independiente')), d = a.proyeccion.deficit!;
    expect(d).not.toBeNull(); expect(d.diasRestantes).toBeGreaterThanOrEqual(7); expect(d.diasRestantes).toBeLessThanOrEqual(15);
    expect(d.faltanteMaximo).toBeGreaterThanOrEqual(10000); expect(d.faltanteMaximo).toBeLessThanOrEqual(40000);
    expect(a.jugadas.some(j => j.resuelve)).toBe(true);
  });
  it('Carlos llega justo y Lucía tiene déficit pequeño', () => {
    const c = analizar(generarPerfil('dependiente')).proyeccion;
    expect(c.deficit).toBeNull(); expect(c.saldoMinimo).toBeLessThan(30000);
    const l = analizar(generarPerfil('mixto')).proyeccion.deficit!;
    expect(l).not.toBeNull(); expect(l.faltanteMaximo).toBeGreaterThan(0); expect(l.faltanteMaximo).toBeLessThan(15000);
  });
});
