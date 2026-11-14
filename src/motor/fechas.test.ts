import { describe, expect, it } from "vitest";
import {
  aISO, diaSemana, diasEntre, esBisiesto, fechaEnMes, formatoCorto, formatoLargo,
  ocurrenciasCada, ocurrenciasMensuales, partes, rangoDias, sumarDias, sumarMeses, ultimoDiaDelMes,
} from "./fechas";

describe("validación", () => {
  it("rechaza fechas que no existen", () => {
    expect(() => partes("2027-02-29")).toThrow();
    expect(() => partes("2026-13-01")).toThrow();
    expect(() => partes("2026-4-01")).toThrow();
    expect(partes("2028-02-29")).toEqual({ anio: 2028, mes: 2, dia: 29 });
  });

  it("bisiestos y fin de mes", () => {
    expect(esBisiesto(2028)).toBe(true);
    expect(esBisiesto(2027)).toBe(false);
    expect(esBisiesto(2100)).toBe(false);
    expect(esBisiesto(2000)).toBe(true);
    expect(ultimoDiaDelMes(2028, 2)).toBe(29);
    expect(ultimoDiaDelMes(2027, 2)).toBe(28);
    expect(ultimoDiaDelMes(2026, 11)).toBe(30);
    expect(ultimoDiaDelMes(2026, 12)).toBe(31);
  });
});

describe("sumar meses sin deriva (desde la fecha ancla)", () => {
  it("31 de enero", () => {
    expect(sumarMeses("2027-01-31", 1)).toBe("2027-02-28");
    expect(sumarMeses("2027-01-31", 2)).toBe("2027-03-31"); // no 28-mar
    expect(sumarMeses("2027-01-31", 3)).toBe("2027-04-30");
    expect(sumarMeses("2027-01-31", 12)).toBe("2028-01-31");
    expect(sumarMeses("2028-01-31", 1)).toBe("2028-02-29"); // año bisiesto
  });

  it("29 de febrero", () => {
    expect(sumarMeses("2028-02-29", 1)).toBe("2028-03-29");
    expect(sumarMeses("2028-02-29", 12)).toBe("2029-02-28");
    expect(sumarMeses("2028-02-29", 48)).toBe("2032-02-29");
    expect(sumarMeses("2028-02-29", -12)).toBe("2027-02-28");
  });

  it("31 de diciembre cruza el año", () => {
    expect(sumarMeses("2026-12-31", 1)).toBe("2027-01-31");
    expect(sumarMeses("2026-12-31", 2)).toBe("2027-02-28");
    expect(sumarMeses("2026-12-31", 3)).toBe("2027-03-31");
    expect(sumarMeses("2026-12-31", -1)).toBe("2026-11-30");
    expect(sumarMeses("2026-12-31", -12)).toBe("2025-12-31");
  });

  it("encadenar derivaría; desde el ancla no", () => {
    const encadenado = sumarMeses(sumarMeses("2027-01-31", 1), 1);
    expect(encadenado).toBe("2027-03-28");
    expect(sumarMeses("2027-01-31", 2)).toBe("2027-03-31");
  });
});

describe("días", () => {
  it("suma y resta días cruzando mes y año", () => {
    expect(sumarDias("2026-11-13", 30)).toBe("2026-12-13");
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(sumarDias("2028-02-28", 1)).toBe("2028-02-29");
    expect(sumarDias("2027-03-01", -1)).toBe("2027-02-28");
    expect(diasEntre("2026-11-13", "2026-12-13")).toBe(30);
    expect(diasEntre("2026-12-13", "2026-11-13")).toBe(-30);
  });

  it("día de la semana", () => {
    expect(diaSemana("2026-11-13")).toBe(5); // viernes
    expect(diaSemana("2026-11-14")).toBe(6); // sábado
    expect(diaSemana("2026-11-15")).toBe(0); // domingo
    expect(diaSemana("1969-12-31")).toBe(3); // miércoles, antes de la época
  });

  it("rango de días", () => {
    expect(rangoDias("2026-11-29", 4)).toEqual(["2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02"]);
  });
});

describe("ocurrencias", () => {
  it("evento mensual el día 31 cae en el último día de los meses cortos", () => {
    expect(ocurrenciasMensuales(31, "2027-01-15", "2027-04-30")).toEqual([
      "2027-01-31", "2027-02-28", "2027-03-31", "2027-04-30",
    ]);
  });

  it("respeta los bordes del rango", () => {
    expect(ocurrenciasMensuales(15, "2026-11-15", "2026-12-15")).toEqual(["2026-11-15", "2026-12-15"]);
    expect(ocurrenciasMensuales(15, "2026-11-16", "2026-12-14")).toEqual([]);
    expect(ocurrenciasMensuales(5, "2026-12-20", "2027-01-10")).toEqual(["2027-01-05"]);
    expect(ocurrenciasMensuales(5, "2026-12-20", "2026-12-01")).toEqual([]);
  });

  it("evento cada N días a partir del ancla", () => {
    expect(ocurrenciasCada(14, "2026-11-06", "2026-11-14", "2026-12-13")).toEqual(["2026-11-20", "2026-12-04"]);
    expect(ocurrenciasCada(7, "2026-11-13", "2026-11-14", "2026-11-27")).toEqual(["2026-11-20", "2026-11-27"]);
  });

  it("fechaEnMes recorta al último día", () => {
    expect(fechaEnMes(2027, 2, 30)).toBe("2027-02-28");
    expect(fechaEnMes(2026, 11, 31)).toBe("2026-11-30");
    expect(aISO(2026, 1, 5)).toBe("2026-01-05");
  });
});

describe("formato en español", () => {
  it("corto y largo", () => {
    expect(formatoCorto("2026-11-23")).toBe("23 nov");
    expect(formatoLargo("2026-11-23")).toBe("lunes 23 de noviembre");
    expect(formatoLargo("2026-11-14")).toBe("sábado 14 de noviembre");
  });
});
