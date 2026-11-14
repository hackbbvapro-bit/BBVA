import { describe, expect, it } from "vitest";
import { simularGasto } from "./simular";
import type { Proyeccion } from "./tipos";

function proyeccion(saldos: number[]): Proyeccion {
  const dias = saldos.map((saldo, i) => ({ fecha: `2026-11-${String(14 + i).padStart(2, "0")}`, saldo, eventos: [] }));
  const minimo = dias.reduce((a, b) => (a.saldo <= b.saldo ? a : b));
  return { perfilId: "p", desde: dias[0].fecha, hasta: dias[dias.length - 1].fecha, saldoInicial: 50000, dias,
    saldoMinimo: minimo.saldo, fechaSaldoMinimo: minimo.fecha, saldoFinal: dias[dias.length - 1].saldo, deficit: null };
}

describe("simular un gasto único («¿me alcanza para…?»)", () => {
  const base = proyeccion([50000, 30000, 12000, 40000]);

  it("alcanza si ningún día posterior cierra bajo cero", () => {
    const r = simularGasto(base, "2026-11-15", 10000);
    expect(r).toMatchObject({ alcanza: true, saldoMinimoAntes: 12000, saldoMinimoDespues: 2000,
      fechaSaldoMinimoDespues: "2026-11-16", primerDiaBajoCero: null, yaHabiaDeficit: false, maximoSinDeficit: 12000 });
  });

  it("no alcanza y dice el primer día en rojo", () => {
    const r = simularGasto(base, "2026-11-14", 12001);
    expect(r).toMatchObject({ alcanza: false, saldoMinimoDespues: -1, primerDiaBajoCero: "2026-11-16", maximoSinDeficit: 12000 });
  });

  it("gastar justo el máximo deja el saldo en cero, no en rojo", () => {
    expect(simularGasto(base, "2026-11-14", 12000)).toMatchObject({ alcanza: true, saldoMinimoDespues: 0 });
  });

  it("el gasto no toca los días anteriores a su fecha", () => {
    const r = simularGasto(base, "2026-11-17", 35000);
    expect(r).toMatchObject({ alcanza: true, saldoMinimoDespues: 5000, fechaSaldoMinimoDespues: "2026-11-17", maximoSinDeficit: 40000 });
  });

  it("si ya había déficit, no alcanza y el máximo es cero", () => {
    const r = simularGasto(proyeccion([5000, -2000, 9000]), "2026-11-16", 100);
    expect(r).toMatchObject({ alcanza: false, yaHabiaDeficit: true, maximoSinDeficit: 0, primerDiaBajoCero: "2026-11-15" });
  });

  it("no cambia la proyección original", () => {
    simularGasto(base, "2026-11-14", 10000);
    expect(base.dias.map(d => d.saldo)).toEqual([50000, 30000, 12000, 40000]);
  });

  it("rechaza montos no enteros, no positivos y fechas fuera del periodo", () => {
    expect(() => simularGasto(base, "2026-11-14", 10.5)).toThrow();
    expect(() => simularGasto(base, "2026-11-14", 0)).toThrow();
    expect(() => simularGasto(base, "2026-11-13", 100)).toThrow();
    expect(() => simularGasto(base, "2026-11-18", 100)).toThrow();
    expect(() => simularGasto(base, "mañana", 100)).toThrow();
  });
});
