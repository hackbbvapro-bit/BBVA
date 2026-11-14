import { describe, expect, it } from "vitest";
import {
  calificacionPorAtraso,
  diasParaEmpeorar,
  ETIQUETA_CALIFICACION,
  RANGOS_ATRASO,
  siguienteCalificacion,
} from "./sbs";

describe("calificacionPorAtraso", () => {
  it.each([
    [0, "normal"], [8, "normal"], [9, "cpp"], [30, "cpp"], [31, "deficiente"],
    [60, "deficiente"], [61, "dudoso"], [120, "dudoso"], [121, "perdida"], [900, "perdida"],
  ] as const)("%i días -> %s", (dias, esperada) => {
    expect(calificacionPorAtraso(dias)).toBe(esperada);
  });

  it("días negativos cuentan como sin atraso y decimales se rechazan", () => {
    expect(calificacionPorAtraso(-3)).toBe("normal");
    expect(() => calificacionPorAtraso(2.5)).toThrow();
  });
});

describe("diasParaEmpeorar", () => {
  it("cuenta los días que faltan para el siguiente tramo", () => {
    expect(diasParaEmpeorar(0)).toBe(9);
    expect(diasParaEmpeorar(8)).toBe(1);
    expect(diasParaEmpeorar(9)).toBe(22);
    expect(diasParaEmpeorar(30)).toBe(1);
    expect(diasParaEmpeorar(60)).toBe(1);
    expect(diasParaEmpeorar(61)).toBe(60);
    expect(diasParaEmpeorar(120)).toBe(1);
  });
  it("es null si ya es Pérdida", () => {
    expect(diasParaEmpeorar(121)).toBeNull();
  });
  it("al sumar esos días la calificación cambia", () => {
    for (const d of [0, 5, 9, 25, 31, 61, 100]) {
      const falta = diasParaEmpeorar(d) as number;
      expect(calificacionPorAtraso(d + falta)).not.toBe(calificacionPorAtraso(d));
      expect(calificacionPorAtraso(d + falta - 1)).toBe(calificacionPorAtraso(d));
    }
  });
});

describe("rangos y fuentes", () => {
  it("solo Dudoso y Pérdida son verificados y citan el boletín", () => {
    expect(RANGOS_ATRASO.dudoso).toMatchObject({ desde: 61, hasta: 120, verificado: true });
    expect(RANGOS_ATRASO.perdida).toMatchObject({ desde: 121, hasta: null, verificado: true });
    expect(RANGOS_ATRASO.dudoso.fuente).toContain("idbulletin/2350");
    for (const c of ["normal", "cpp", "deficiente"] as const) {
      expect(RANGOS_ATRASO[c].verificado).toBe(false);
      expect(RANGOS_ATRASO[c].fuente).toContain("[SIN VERIFICAR]");
    }
  });
  it("los tramos son contiguos y hay etiqueta para todos", () => {
    const orden = ["normal", "cpp", "deficiente", "dudoso", "perdida"] as const;
    orden.slice(1).forEach((c, i) => {
      expect(RANGOS_ATRASO[c].desde).toBe((RANGOS_ATRASO[orden[i]].hasta as number) + 1);
    });
    expect(ETIQUETA_CALIFICACION.cpp).toBe("Con problemas potenciales (CPP)");
    expect(ETIQUETA_CALIFICACION.perdida).toBe("Pérdida");
  });
  it("siguienteCalificacion", () => {
    expect(siguienteCalificacion("normal")).toBe("cpp");
    expect(siguienteCalificacion("perdida")).toBeNull();
  });
});
