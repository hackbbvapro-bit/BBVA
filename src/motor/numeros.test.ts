import { describe, expect, it } from "vitest";
import { buscarMonto, leerAproximado, leerMonto } from "./numeros";

describe("leerMonto: montos como los escribe o dicta la gente", () => {
  it("cifras: las mismas que acepta el formulario", () => {
    expect(leerMonto("250")).toBe(25000);
    expect(leerMonto("S/ 180.50")).toBe(18050);
    expect(leerMonto("s/. 1,234.56")).toBe(123456);
    expect(leerMonto("12,50")).toBe(1250);
    expect(leerMonto("250 soles")).toBe(25000);
    expect(leerMonto("250 al mes")).toBe(25000);
  });

  it("puntos de miles: «1.000» son mil soles (en soles no existen tres decimales)", () => {
    expect(leerMonto("1.000")).toBe(100000);
    expect(leerMonto("1.000 soles")).toBe(100000);
    expect(leerMonto("12.500")).toBe(1250000);
    expect(leerMonto("1.250.000")).toBe(125000000);
  });

  it("palabras: unidades, decenas, cientos y miles", () => {
    expect(leerMonto("cien")).toBe(10000);
    expect(leerMonto("ciento ochenta")).toBe(18000);
    expect(leerMonto("doscientos cincuenta")).toBe(25000);
    expect(leerMonto("Doscientos Cincuenta Soles")).toBe(25000);
    expect(leerMonto("cuatrocientos sesenta y uno")).toBe(46100);
    expect(leerMonto("veintiún")).toBe(2100);
    expect(leerMonto("mil")).toBe(100000);
    expect(leerMonto("un mil")).toBe(100000);
    expect(leerMonto("mil quinientos")).toBe(150000);
    expect(leerMonto("dos mil trescientos")).toBe(230000);
    expect(leerMonto("quince mil")).toBe(1500000);
    expect(leerMonto("ciento veinte mil")).toBe(12000000);
    expect(leerMonto("un millón")).toBe(100000000);
  });

  it("mezcla de cifra y palabra, «lucas» y céntimos", () => {
    expect(leerMonto("2 mil")).toBe(200000);
    expect(leerMonto("2k")).toBe(200000);
    expect(leerMonto("cien lucas")).toBe(10000);
    expect(leerMonto("doscientos con cincuenta")).toBe(20050);
    expect(leerMonto("180 con 50 céntimos")).toBe(18050);
  });

  it("si algo no se entiende no adivina: devuelve null", () => {
    for (const t of ["", "   ", "abc", "doscientos gatos", "1e3", "con cincuenta", "soles", "-45", "mil millones de millones"]) {
      expect(leerMonto(t)).toBeNull();
    }
    expect(leerMonto("doscientos con cien")).toBeNull();
  });

  it("siempre devuelve céntimos enteros", () => {
    for (const t of ["0.1", "19.99", "doscientos con cincuenta", "1.000"]) expect(Number.isInteger(leerMonto(t))).toBe(true);
  });
});

describe("buscarMonto: el monto dentro de una frase", () => {
  it("encuentra el monto en frases reales del chat", () => {
    expect(buscarMonto("me van a dar 100 soles por limpiar ¿cómo cambia mi situación esto?")?.monto).toBe(10000);
    expect(buscarMonto("me acaban de pagar 1.000 soles")?.monto).toBe(100000);
    expect(buscarMonto("voy a ganar mil soles")?.monto).toBe(100000);
    expect(buscarMonto("me pagaron doscientos cincuenta")?.monto).toBe(25000);
    expect(buscarMonto("pero no sería sumarle el 461.04 + 100")?.monto).toBe(46104);
    expect(buscarMonto("gasté S/ 35.50 en el mercado")?.monto).toBe(3550);
  });

  it("no confunde un día con un monto", () => {
    expect(buscarMonto("me pagan 300 el 20 de noviembre")?.monto).toBe(30000);
    expect(buscarMonto("el 20 de noviembre me pagan 300")?.monto).toBe(30000);
    expect(buscarMonto("el día 15")).toBeNull();
    expect(buscarMonto("20 de noviembre")).toBeNull();
    expect(buscarMonto("pago 50 de luz cada mes el 15")?.monto).toBe(5000);
    expect(buscarMonto("los 15 de cada mes pago 80 de internet")?.monto).toBe(8000);
    expect(buscarMonto("hola, ¿cómo voy?")).toBeNull();
    expect(buscarMonto("tengo una deuda")).toBeNull();
  });
});

describe("leerAproximado: para quien no sabe la cifra exacta", () => {
  it("un monto dentro de una frase, en cifras o en letras", () => {
    expect(leerAproximado("2500 pero es variable")).toEqual({ min: 250_000, max: 250_000 });
    expect(leerAproximado("más o menos dos mil quinientos")).toEqual({ min: 250_000, max: 250_000 });
    expect(leerAproximado("unos 900 soles")).toEqual({ min: 90_000, max: 90_000 });
  });
  it("rangos en sus formas comunes, siempre de menor a mayor", () => {
    expect(leerAproximado("entre 1500 y 3000")).toEqual({ min: 150_000, max: 300_000 });
    expect(leerAproximado("de 1500 a 3000")).toEqual({ min: 150_000, max: 300_000 });
    expect(leerAproximado("1500-3000")).toEqual({ min: 150_000, max: 300_000 });
    expect(leerAproximado("entre 3000 y 1500")).toEqual({ min: 150_000, max: 300_000 });
  });
  it("«no» o «nada» es cero", () => {
    expect(leerAproximado("no")).toEqual({ min: 0, max: 0 });
    expect(leerAproximado("nada")).toEqual({ min: 0, max: 0 });
  });
  it("si es ambiguo, no adivina", () => {
    expect(leerAproximado("2000 y en diciembre 4000")).toBeNull();
    expect(leerAproximado("mucho")).toBeNull();
    expect(leerAproximado("")).toBeNull();
  });
});
