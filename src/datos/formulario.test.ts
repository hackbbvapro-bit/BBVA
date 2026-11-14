import { describe, expect, it } from "vitest";
import { leerDia, leerSoles, solesParaEditar } from "./formulario";
import { ErrorDatos } from "./validar";

describe("leerSoles", () => {
  it("convierte a céntimos exactos", () => {
    expect(leerSoles("180", "el monto")).toBe(18000);
    expect(leerSoles("S/ 1,234.56", "el monto")).toBe(123456);
    expect(leerSoles("0.1", "el monto")).toBe(10);
    expect(leerSoles("19.99", "el monto")).toBe(1999);
    expect(leerSoles("-45.5", "el saldo")).toBe(-4550);
  });
  it("rechaza vacío y basura con un mensaje en español", () => {
    expect(() => leerSoles("  ", "el monto")).toThrow(ErrorDatos);
    expect(() => leerSoles("abc", "el monto")).toThrow(/soles/);
    expect(() => leerSoles("12.345", "el monto")).toThrow(ErrorDatos);
    expect(() => leerSoles("1e3", "el monto")).toThrow(ErrorDatos);
  });
});

describe("leerDia", () => {
  it("acepta números enteros y deja el rango a la validación del repositorio", () => {
    expect(leerDia(" 15 ", "el día")).toBe(15);
    expect(leerDia("31", "el día")).toBe(31);
  });
  it("rechaza texto, decimales y vacío", () => {
    for (const malo of ["", "uno", "1.5", "-3", "100"]) expect(() => leerDia(malo, "el día")).toThrow(ErrorDatos);
  });
});

describe("solesParaEditar", () => {
  it("ida y vuelta sin perder céntimos", () => {
    for (const c of [0, 1, 99, 100, 1250, 18000, 123456, -4550]) expect(leerSoles(solesParaEditar(c), "x")).toBe(c);
  });
});
