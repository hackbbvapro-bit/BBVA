import { describe, expect, it } from "vitest";
import { crearLimite } from "./limite";

describe("límite de uso por visitante", () => {
  it("deja pasar hasta el máximo y corta la siguiente", () => {
    const limite = crearLimite(3, 60_000);
    expect([1, 2, 3, 4].map(() => limite.permite("a", 1000))).toEqual([true, true, true, false]);
  });

  it("cada visitante lleva su propia cuenta", () => {
    const limite = crearLimite(1, 60_000);
    expect(limite.permite("a", 0)).toBe(true);
    expect(limite.permite("b", 0)).toBe(true);
    expect(limite.permite("a", 1)).toBe(false);
  });

  it("al terminar la ventana se vuelve a abrir", () => {
    const limite = crearLimite(1, 60_000);
    expect(limite.permite("a", 0)).toBe(true);
    expect(limite.permite("a", 59_999)).toBe(false);
    expect(limite.permite("a", 60_000)).toBe(true);
    expect(limite.permite("a", 60_001)).toBe(false);
  });

  it("no crece sin tope aunque lleguen muchísimos visitantes distintos", () => {
    const limite = crearLimite(1, 60_000);
    for (let i = 0; i < 12_000; i += 1) limite.permite(`v${i}`, 0);
    expect(limite.permite("nuevo", 1)).toBe(true);
  });

  it("al llenarse expulsa solo la más antigua y no borra las cuentas vigentes", () => {
    const limite = crearLimite(1, 60_000);
    for (let i = 0; i < 5000; i += 1) limite.permite(`v${i}`, i);
    expect(limite.permite("nuevo", 5000)).toBe(true);
    expect(limite.permite("v4999", 5001)).toBe(false);
    expect(limite.permite("v0", 5002)).toBe(true);
  });

  it("rechaza configuraciones sin sentido", () => {
    expect(() => crearLimite(0, 1000)).toThrow();
    expect(() => crearLimite(5, 0)).toThrow();
    expect(() => crearLimite(1.5, 1000)).toThrow();
  });
});
