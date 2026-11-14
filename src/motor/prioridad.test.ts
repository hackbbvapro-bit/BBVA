import { describe, expect, it } from "vitest";
import { soles } from "./dinero";
import { priorizarPagos, type DeudaPrioridad } from "./prioridad";

const HOY = "2026-11-13"; // viernes

function deuda(parcial: Partial<DeudaPrioridad> & { id: string }): DeudaPrioridad {
  return {
    nombre: `Deuda ${parcial.id}`,
    entidad: `Banco ${parcial.id}`,
    saldo: soles(1000),
    tceaBp: 5000,
    pagoMinimo: soles(100),
    diaPago: 28,
    diasAtraso: 0,
    ...parcial,
  };
}

describe("priorizarPagos: 5 deudas, dinero para solo 2", () => {
  const deudas = [
    deuda({ id: "a", pagoMinimo: soles(200), diaPago: 15, tceaBp: 8999, saldo: soles(3000) }),
    deuda({ id: "b", pagoMinimo: soles(150), diaPago: 21, tceaBp: 5000, saldo: soles(2000) }),
    deuda({ id: "c", pagoMinimo: soles(300), diaPago: 30, tceaBp: 7000, saldo: soles(5000) }),
    deuda({ id: "d", pagoMinimo: soles(100), diaPago: 25, tceaBp: 3000, saldo: soles(900) }),
    deuda({ id: "e", pagoMinimo: soles(250), diaPago: 5, tceaBp: 9500, saldo: soles(4000) }),
  ];
  const r = priorizarPagos({ hoy: HOY, disponible: soles(450), deudas });

  it("paga las dos primeras en prioridad y manda el resto a negociar", () => {
    expect(r.decisiones.map((d) => d.id)).toEqual(["a", "e", "c", "b", "d"]);
    expect(r.decisiones.map((d) => d.orden)).toEqual([1, 2, 3, 4, 5]);
    expect(r.decisiones.map((d) => d.grupo)).toEqual([
      "pagar-ya", // vence en 2 días
      "pagar-este-mes", // vence el 5 de diciembre
      "negociar",
      "negociar",
      "negociar",
    ]);
    expect(r.decisiones.map((d) => d.monto)).toEqual([soles(200), soles(250), 0, 0, 0]);
  });

  it("totales: comprometido, sobrante y faltante", () => {
    expect(r.disponible).toBe(soles(450));
    expect(r.comprometido).toBe(soles(450));
    expect(r.sobrante).toBe(0);
    expect(r.faltante).toBe(soles(300 + 150 + 100));
    expect(r.alcanzaParaTodo).toBe(false);
  });

  it("los motivos de negociar piden llamar ANTES del atraso y nunca dicen que dejes de pagar", () => {
    for (const d of r.decisiones.filter((x) => x.grupo === "negociar")) {
      expect(d.motivo).toContain("reprogramar ANTES de caer en atraso");
      expect(d.motivo).toContain(d.entidad);
      expect(d.motivo.toLowerCase()).not.toContain("deja de pagar");
    }
    expect(r.decisiones[2].motivo).toContain("S/ 300.00");
  });
});

describe("priorizarPagos: todo alcanza", () => {
  const deudas = [
    deuda({ id: "x", saldo: soles(1000), pagoMinimo: soles(100), tceaBp: 9000 }),
    deuda({ id: "y", saldo: soles(5000), pagoMinimo: soles(200), tceaBp: 5000 }),
  ];

  it("la avalancha reparte el extra al de mayor TCEA sin pasar de su saldo", () => {
    const r = priorizarPagos({ hoy: HOY, disponible: soles(1500), deudas });
    const x = r.decisiones.find((d) => d.id === "x");
    const y = r.decisiones.find((d) => d.id === "y");
    expect(x?.monto).toBe(soles(1000)); // mínimo 100 + extra 900 = su saldo
    expect(y?.monto).toBe(soles(500)); // mínimo 200 + los 300 que quedan
    expect(r.comprometido).toBe(soles(1500));
    expect(r.sobrante).toBe(0);
    expect(r.faltante).toBe(0);
    expect(r.alcanzaParaTodo).toBe(true);
    expect(x?.grupo).toBe("pagar-este-mes");
    expect(x?.motivo).toContain("extra");
  });

  it("si sobra más que los saldos, queda sobrante y ninguna deuda paga de más", () => {
    const r = priorizarPagos({ hoy: HOY, disponible: soles(10_000), deudas });
    expect(r.decisiones.map((d) => d.monto)).toEqual([soles(1000), soles(5000)]);
    expect(r.comprometido).toBe(soles(6000));
    expect(r.sobrante).toBe(soles(4000));
  });

  it("solo con los mínimos justos no hay extra", () => {
    const r = priorizarPagos({ hoy: HOY, disponible: soles(300), deudas });
    expect(r.decisiones.map((d) => d.monto)).toEqual([soles(100), soles(200)]);
    expect(r.sobrante).toBe(0);
    expect(r.alcanzaParaTodo).toBe(true);
  });
});

describe("priorizarPagos: nada alcanza", () => {
  it("todo va a negociar con monto 0 y el faltante suma los mínimos", () => {
    const deudas = [
      deuda({ id: "a", pagoMinimo: soles(300) }),
      deuda({ id: "b", pagoMinimo: soles(150, 50) }),
    ];
    const r = priorizarPagos({ hoy: HOY, disponible: soles(100), deudas });
    expect(r.decisiones.every((d) => d.grupo === "negociar" && d.monto === 0)).toBe(true);
    expect(r.comprometido).toBe(0);
    expect(r.sobrante).toBe(soles(100));
    expect(r.faltante).toBe(soles(450, 50));
    expect(r.alcanzaParaTodo).toBe(false);
    expect(r.decisiones.map((d) => d.orden)).toEqual([1, 2]);
  });

  it("con disponible 0 todo va a negociar", () => {
    const r = priorizarPagos({ hoy: HOY, disponible: 0, deudas: [deuda({ id: "a" }), deuda({ id: "b" })] });
    expect(r.decisiones.map((d) => d.grupo)).toEqual(["negociar", "negociar"]);
    expect(r.disponible).toBe(0);
    expect(r.sobrante).toBe(0);
    expect(r.faltante).toBe(soles(200));
  });

  it("un disponible negativo se trata como 0", () => {
    const r = priorizarPagos({ hoy: HOY, disponible: -5000, deudas: [deuda({ id: "a" })] });
    expect(r.disponible).toBe(0);
    expect(r.sobrante).toBe(0);
    expect(r.decisiones[0].grupo).toBe("negociar");
  });
});

describe("priorizarPagos: empates deterministas", () => {
  it("mismo TCEA y atraso: gana el saldo menor; si empata, el id menor", () => {
    const deudas = [
      deuda({ id: "z", saldo: soles(500), tceaBp: 6000, pagoMinimo: soles(100) }),
      deuda({ id: "b", saldo: soles(900), tceaBp: 6000, pagoMinimo: soles(100) }),
      deuda({ id: "m", saldo: soles(500), tceaBp: 6000, pagoMinimo: soles(100) }),
    ];
    const r = priorizarPagos({ hoy: HOY, disponible: soles(200), deudas });
    expect(r.decisiones.map((d) => d.id)).toEqual(["m", "z", "b"]);
    expect(r.decisiones.map((d) => d.grupo)).toEqual(["pagar-este-mes", "pagar-este-mes", "negociar"]);
  });

  it("el resultado no depende del orden de entrada", () => {
    const deudas = [
      deuda({ id: "a", tceaBp: 4000 }),
      deuda({ id: "b", tceaBp: 9000, diaPago: 18 }),
      deuda({ id: "c", tceaBp: 4000, saldo: soles(300) }),
      deuda({ id: "d", tceaBp: 9000, diasAtraso: 3 }),
    ];
    const base = priorizarPagos({ hoy: HOY, disponible: soles(250), deudas });
    const inverso = priorizarPagos({ hoy: HOY, disponible: soles(250), deudas: [...deudas].reverse() });
    expect(inverso).toEqual(base);
  });

  it("entre pagos que vencen igual de pronto manda el mayor TCEA", () => {
    const deudas = [deuda({ id: "a", tceaBp: 3000 }), deuda({ id: "b", tceaBp: 8000 })];
    const r = priorizarPagos({ hoy: HOY, disponible: soles(100), deudas });
    expect(r.decisiones.map((d) => d.id)).toEqual(["b", "a"]);
    expect(r.decisiones[1].grupo).toBe("negociar");
  });

  it("un pago que vence en ≤ 7 días pasa delante de uno con más TCEA que vence después", () => {
    const deudas = [deuda({ id: "caro", tceaBp: 9000, diaPago: 28 }), deuda({ id: "pronto", tceaBp: 2000, diaPago: 16 })];
    const r = priorizarPagos({ hoy: HOY, disponible: soles(100), deudas });
    expect(r.decisiones.map((d) => d.id)).toEqual(["pronto", "caro"]);
    expect(r.decisiones[0].grupo).toBe("pagar-ya");
  });
});

describe("priorizarPagos: atrasos", () => {
  it("la deuda con atraso va primero aunque tenga menos TCEA", () => {
    const deudas = [
      deuda({ id: "caro", tceaBp: 9500, diaPago: 15 }),
      deuda({ id: "atrasada", tceaBp: 1500, diasAtraso: 5 }),
    ];
    const r = priorizarPagos({ hoy: HOY, disponible: soles(100), deudas });
    expect(r.decisiones[0]).toMatchObject({ id: "atrasada", grupo: "pagar-ya", orden: 1, calificacion: "normal" });
    expect(r.decisiones[0].motivo).toContain("5 días de atraso");
    expect(r.decisiones[0].motivo).toContain("4 días");
    expect(r.decisiones[1]).toMatchObject({ id: "caro", grupo: "negociar" });
  });

  it("entre atrasadas va primero la más cerca de empeorar su calificación", () => {
    const deudas = [
      deuda({ id: "a", diasAtraso: 25 }), // CPP, faltan 6
      deuda({ id: "b", diasAtraso: 5 }), // Normal, faltan 4
      deuda({ id: "c", diasAtraso: 130 }), // Pérdida, no empeora
    ];
    const r = priorizarPagos({ hoy: HOY, disponible: soles(300), deudas });
    expect(r.decisiones.map((d) => d.id)).toEqual(["b", "a", "c"]);
    expect(r.decisiones.map((d) => d.calificacion)).toEqual(["normal", "cpp", "perdida"]);
  });

  it("una atrasada que no se alcanza a cubrir pide regularizar con la entidad", () => {
    const deudas = [deuda({ id: "a", diasAtraso: 40, pagoMinimo: soles(500), entidad: "Banco Sol" })];
    const r = priorizarPagos({ hoy: HOY, disponible: soles(100), deudas });
    const d = r.decisiones[0];
    expect(d.grupo).toBe("negociar");
    expect(d.monto).toBe(0);
    expect(d.calificacion).toBe("deficiente");
    expect(d.motivo).toContain("40 días de atraso");
    expect(d.motivo).toContain("S/ 500.00");
    expect(d.motivo).toMatch(/Regulariza/);
    expect(d.motivo).toContain("Banco Sol");
    expect(d.motivo.toLowerCase()).not.toContain("deja de pagar");
  });
});

describe("priorizarPagos: céntimos exactos", () => {
  it("todo son enteros y comprometido + sobrante == disponible, sin deriva", () => {
    const deudas = [
      deuda({ id: "a", saldo: 20_000, pagoMinimo: 10_333, tceaBp: 8999 }),
      deuda({ id: "b", saldo: 98_765, pagoMinimo: 6_667, tceaBp: 4573 }),
      deuda({ id: "c", saldo: 50_001, pagoMinimo: 3_301, tceaBp: 4573 }),
    ];
    const r = priorizarPagos({ hoy: HOY, disponible: 33_333, deudas });
    // Mínimos 20.301; quedan 13.032: 9.667 liquidan «a» y 3.365 van a «c» (mismo TCEA que «b», saldo menor).
    expect(r.decisiones.map((d) => d.id)).toEqual(["a", "c", "b"]);
    expect(r.decisiones.map((d) => d.monto)).toEqual([20_000, 3_301 + 3_365, 6_667]);
    for (const d of r.decisiones) expect(Number.isInteger(d.monto)).toBe(true);
    expect(r.comprometido + r.sobrante).toBe(r.disponible);
    expect(r.comprometido).toBe(33_333);
    expect(r.sobrante).toBe(0);
  });

  it("con un céntimo de holgura el sobrante es exactamente 1", () => {
    const deudas = [deuda({ id: "a", saldo: 10_001, pagoMinimo: 3_333 }), deuda({ id: "b", saldo: 5_000, pagoMinimo: 1_111, tceaBp: 1000 })];
    const r = priorizarPagos({ hoy: HOY, disponible: 15_002, deudas });
    expect(r.decisiones.map((d) => d.monto)).toEqual([10_001, 5_000]);
    expect(r.sobrante).toBe(1);
  });

  it("rechaza decimales en dinero", () => {
    expect(() => priorizarPagos({ hoy: HOY, disponible: 10.5, deudas: [] })).toThrow();
    expect(() => priorizarPagos({ hoy: HOY, disponible: 100, deudas: [deuda({ id: "a", pagoMinimo: 0.1 + 0.2 })] })).toThrow();
  });
});

describe("priorizarPagos: próximo pago y fin de mes", () => {
  const prox = (hoy: string, diaPago: number) =>
    priorizarPagos({ hoy, disponible: soles(100), deudas: [deuda({ id: "a", diaPago })] }).decisiones[0].proximoPago;

  it("día 31 con hoy en febrero cae el último día (28 y 29 en bisiesto)", () => {
    expect(prox("2026-02-10", 31)).toBe("2026-02-28");
    expect(prox("2028-02-10", 31)).toBe("2028-02-29");
  });
  it("día 31 con hoy en abril cae el 30", () => {
    expect(prox("2026-04-10", 31)).toBe("2026-04-30");
  });
  it("hoy 2026-11-13: día 31 -> 30 nov; día 15 -> 15 nov; día 13 -> hoy; día 5 -> 5 dic", () => {
    expect(prox(HOY, 31)).toBe("2026-11-30");
    expect(prox(HOY, 15)).toBe("2026-11-15");
    expect(prox(HOY, 13)).toBe(HOY);
    expect(prox(HOY, 5)).toBe("2026-12-05");
  });
  it("sin deriva al pasar al mes siguiente y al año siguiente", () => {
    expect(prox("2026-01-31", 31)).toBe("2026-01-31");
    expect(prox("2026-02-28", 31)).toBe("2026-02-28");
    expect(prox("2026-03-01", 31)).toBe("2026-03-31");
    expect(prox("2026-04-30", 31)).toBe("2026-04-30");
    expect(prox("2026-12-20", 5)).toBe("2027-01-05");
    expect(prox("2026-12-31", 31)).toBe("2026-12-31");
    expect(prox("2026-01-31", 30)).toBe("2026-02-28"); // 30 ene ya pasó
    expect(prox("2026-01-31", 29)).toBe("2026-02-28");
  });
  it("«pagar-ya» si vence en 7 días o menos; «pagar-este-mes» si falta más", () => {
    const grupo = (diaPago: number) =>
      priorizarPagos({ hoy: HOY, disponible: soles(100), deudas: [deuda({ id: "a", diaPago })] }).decisiones[0].grupo;
    expect(grupo(13)).toBe("pagar-ya");
    expect(grupo(20)).toBe("pagar-ya");
    expect(grupo(21)).toBe("pagar-este-mes");
  });
  it("un día de pago fuera de 1-31 da proximoPago null sin romper", () => {
    expect(prox(HOY, 0)).toBeNull();
    expect(prox(HOY, 40)).toBeNull();
  });
});

describe("priorizarPagos: casos borde", () => {
  it("saldo menor que el mínimo: paga solo el saldo y queda en cero", () => {
    const deudas = [deuda({ id: "a", saldo: soles(80), pagoMinimo: soles(200) })];
    const r = priorizarPagos({ hoy: HOY, disponible: soles(1000), deudas });
    expect(r.decisiones[0].monto).toBe(soles(80));
    expect(r.decisiones[0].motivo).toContain("S/ 80.00");
    expect(r.sobrante).toBe(soles(920));
    expect(r.alcanzaParaTodo).toBe(true);
  });

  it("para cubrir un mínimo se usa el saldo cuando es menor", () => {
    const deudas = [deuda({ id: "a", saldo: soles(80), pagoMinimo: soles(200) })];
    const r = priorizarPagos({ hoy: HOY, disponible: soles(80), deudas });
    expect(r.decisiones[0].grupo).not.toBe("negociar");
    expect(r.faltante).toBe(0);
  });

  it("lista vacía", () => {
    const r = priorizarPagos({ hoy: HOY, disponible: soles(500), deudas: [] });
    expect(r).toEqual({
      decisiones: [],
      disponible: soles(500),
      comprometido: 0,
      sobrante: soles(500),
      faltante: 0,
      alcanzaParaTodo: true,
    });
  });

  it("una deuda con saldo 0 no entra", () => {
    const r = priorizarPagos({
      hoy: HOY,
      disponible: soles(500),
      deudas: [deuda({ id: "pagada", saldo: 0 }), deuda({ id: "viva" })],
    });
    expect(r.decisiones.map((d) => d.id)).toEqual(["viva"]);
  });

  it("si algo va a negociar no se reparte avalancha con lo que queda", () => {
    const deudas = [deuda({ id: "a", pagoMinimo: soles(100) }), deuda({ id: "b", pagoMinimo: soles(500), tceaBp: 1000 })];
    const r = priorizarPagos({ hoy: HOY, disponible: soles(300), deudas });
    expect(r.decisiones.find((d) => d.id === "a")?.monto).toBe(soles(100));
    expect(r.sobrante).toBe(soles(200));
    expect(r.alcanzaParaTodo).toBe(false);
  });

  it("no modifica la entrada", () => {
    const deudas = [deuda({ id: "a", diasAtraso: -2 }), deuda({ id: "b" })];
    const copia = structuredClone(deudas);
    priorizarPagos({ hoy: HOY, disponible: soles(500), deudas });
    expect(deudas).toEqual(copia);
  });
});
