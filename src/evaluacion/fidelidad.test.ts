import { describe, expect, it } from "vitest";
import { fechas, montos, plazos, porcentajes, sinVerificar, totalSinVerificar } from "./fidelidad";

const fuente = JSON.stringify({
  saldo_hoy: "S/ 2,047.10",
  cuanto_falta_ese_dia: "S/ 253.06",
  primer_dia_en_negativo: "jueves 14 de mayo",
  tcea: "109.00 %",
  que_hacer: "Recorta 40 % hasta el jueves 14 de mayo y guarda S/ 277.76.",
  meses: 15,
});

describe("extracción de cifras", () => {
  it("lee montos con símbolo, con miles y dichos en soles", () => {
    expect(montos("Tienes S/ 2,047.10 y -S/ 253.06; ¿gastar 300 soles o S/50?")).toEqual([204710, 25306, 5000, 30000]);
  });
  it("lee porcentajes con signo y con palabras", () => {
    expect(porcentajes("TCEA de 109.00 %, recorta 40% o 12,5 por ciento")).toEqual([10900, 4000, 1250]);
  });
  it("lee fechas y trata setiembre como septiembre", () => {
    expect(fechas("el jueves 14 de mayo y el 2 de Setiembre")).toEqual(["14 de mayo", "2 de septiembre"]);
  });
  it("lee plazos", () => {
    expect(plazos("terminas en 15 meses, faltan 10 días")).toEqual([15, 10]);
  });
});

describe("sinVerificar", () => {
  it("no marca nada si todo lo dicho está en la fuente", () => {
    const r = sinVerificar("Hoy tienes S/ 2,047.10; el 14 de mayo faltarían S/ 253.06. Tu tarjeta cuesta 109 % y terminas en 15 meses.", fuente);
    expect(totalSinVerificar(r)).toBe(0);
  });
  it("marca un monto inventado aunque se parezca a uno real", () => {
    expect(sinVerificar("Hoy tienes S/ 2,047.00.", fuente).montos).toEqual(["2047.00"]);
  });
  it("marca porcentajes, fechas y plazos que la fuente no trae", () => {
    const r = sinVerificar("Ganarías 8 % al año; el 20 de mayo cobras y en 6 meses sales.", fuente);
    expect(r).toEqual({ montos: [], porcentajes: ["8 %"], fechas: ["20 de mayo"], plazos: [6] });
  });
  it("admite los plazos que vienen del producto y no de los datos", () => {
    expect(sinVerificar("En los próximos 7 días no hay pagos.", fuente, [7]).plazos).toEqual([]);
    expect(sinVerificar("En los próximos 7 días no hay pagos.", fuente).plazos).toEqual([7]);
  });
});
