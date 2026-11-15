import { describe, expect, it } from "vitest";
import {
  aCentimos, exigirCentimos, formatoSoles, formatoTasa, interes, interesMensual,
  mediana, percentil, porcentaje, redondear, semanalAMes, soles, sumar,
} from "./dinero";

describe("céntimos enteros", () => {
  it("rechaza decimales y valores no numéricos", () => {
    expect(() => exigirCentimos(10.5)).toThrow();
    expect(() => exigirCentimos(Number.NaN)).toThrow();
    expect(exigirCentimos(-1250)).toBe(-1250);
  });

  it("convierte texto a céntimos sin errores de decimales", () => {
    expect(aCentimos("1234.56")).toBe(123456);
    expect(aCentimos("S/ 1,234.56")).toBe(123456);
    expect(aCentimos("180")).toBe(18000);
    expect(aCentimos("-45.5")).toBe(-4550);
    expect(aCentimos("0.07")).toBe(7);
    expect(() => aCentimos("12.345")).toThrow();
    expect(() => aCentimos("doce")).toThrow();
  });

  it("entiende la coma decimal del teclado en español sin multiplicar por 100", () => {
    expect(aCentimos("12,50")).toBe(1250);
    expect(aCentimos("180,5")).toBe(18050);
    expect(aCentimos("S/ 1.234,56")).toBe(123456);
    expect(aCentimos("1,250")).toBe(125000);
    expect(aCentimos("1,250.00")).toBe(125000);
    expect(aCentimos("12,345,678")).toBe(1234567800);
    expect(aCentimos("-0,07")).toBe(-7);
    expect(() => aCentimos("1.250")).toThrow();
    expect(() => aCentimos("1,2,3")).toThrow();
    expect(() => aCentimos("12,")).toThrow();
    expect(() => aCentimos("1,23,456.00")).toThrow();
    expect(() => aCentimos("")).toThrow();
  });

  it("0.10 + 0.20 da exactamente 0.30", () => {
    expect(sumar([aCentimos("0.10"), aCentimos("0.20")])).toBe(30);
  });

  it("soles() arma montos con signo", () => {
    expect(soles(180)).toBe(18000);
    expect(soles(12, 50)).toBe(1250);
    expect(soles(-12, 50)).toBe(-1250);
    expect(() => soles(1, 100)).toThrow();
  });

  it("sumar rechaza un decimal colado", () => {
    expect(() => sumar([100, 0.5])).toThrow();
    expect(sumar([])).toBe(0);
  });
});

describe("formato", () => {
  it("formatea soles al estilo peruano", () => {
    expect(formatoSoles(123456)).toBe("S/ 1,234.56");
    expect(formatoSoles(-18000)).toBe("-S/ 180.00");
    expect(formatoSoles(5)).toBe("S/ 0.05");
    expect(formatoSoles(100000000)).toBe("S/ 1,000,000.00");
    expect(formatoSoles(18000, { sinDecimales: true })).toBe("S/ 180");
    expect(formatoSoles(18050, { sinDecimales: true })).toBe("S/ 180.50");
  });

  it("formatea tasas", () => {
    expect(formatoTasa(8999)).toBe("89.99 %");
    expect(formatoTasa(11413)).toBe("114.13 %");
  });
});

describe("porcentajes e intereses", () => {
  it("redondea mitades alejándose de cero y nunca devuelve -0", () => {
    expect(redondear(2.5)).toBe(3);
    expect(redondear(-2.5)).toBe(-3);
    expect(Object.is(redondear(-0.2), 0)).toBe(true);
  });

  it("porcentaje en puntos básicos", () => {
    expect(porcentaje(100000, 1500)).toBe(15000);
    expect(porcentaje(333, 5000)).toBe(167);
    expect(porcentaje(-333, 5000)).toBe(-167);
  });

  it("interés compuesto con año de 360 días", () => {
    // S/ 1,000 a 100 % anual durante 360 días = S/ 1,000 de interés
    expect(interes(100000, 10000, 360)).toBe(100000);
    // 30 días: 1000 × (2^(1/12) − 1) = 59.46
    expect(interesMensual(100000, 10000)).toBe(5946);
    // 12 meses al 79.59 % anual sobre S/ 2,500 → un mes = 2500 × (1.7959^(1/12) − 1) = 125.01
    expect(interesMensual(250000, 7959)).toBe(12501);
    expect(interes(100000, 10000, 0)).toBe(0);
    expect(interes(0, 10000, 30)).toBe(0);
    expect(interes(-500, 10000, 30)).toBe(0);
    expect(() => interes(100000, 10000, -1)).toThrow();
  });
});

describe("estadística prudente", () => {
  it("mediana", () => {
    expect(mediana([])).toBe(0);
    expect(mediana([300, 100, 200])).toBe(200);
    expect(mediana([100, 200, 300, 400])).toBe(250);
    expect(mediana([100, 201])).toBe(151);
  });

  it("percentil no interpola hacia arriba", () => {
    const semanas = [10000, 20000, 30000, 40000, 50000];
    expect(percentil(semanas, 25)).toBe(20000);
    expect(percentil(semanas, 0)).toBe(10000);
    expect(percentil(semanas, 100)).toBe(50000);
    expect(percentil([70000], 25)).toBe(70000);
    expect(percentil([], 25)).toBe(0);
  });
});

describe("semanalAMes: de semana a mes típico, al sol", () => {
  it("415.38 por semana son S/ 1,800 al mes, sin céntimos fantasma", () => {
    expect(semanalAMes(41_538)).toBe(180_000);
  });
  it("700 por semana son S/ 3,033 (52/12 = 4.33 semanas)", () => {
    expect(semanalAMes(70_000)).toBe(303_300);
  });
  it("los negativos (gastos) se redondean igual en valor absoluto y el cero no es -0", () => {
    expect(semanalAMes(-41_538)).toBe(-180_000);
    expect(Object.is(semanalAMes(0), 0)).toBe(true);
  });
  it("rechaza montos que no son céntimos enteros", () => {
    expect(() => semanalAMes(1.5)).toThrow();
  });
});
