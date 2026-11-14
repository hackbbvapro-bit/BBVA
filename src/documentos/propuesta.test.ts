import { describe, expect, it } from "vitest";
import { datosDeRosa } from "../datos/semilla";
import { ErrorDatos } from "../datos/validar";
import { EXTRACCION_EJEMPLO } from "./ejemplo";
import { cobroDesdePropuesta, deudaDesdePropuesta, propuestaCobros, propuestaDeudas } from "./propuesta";

describe("propuesta de un documento", () => {
  it("convierte las 5 deudas del reporte de ejemplo a céntimos exactos", () => {
    const p = propuestaDeudas(EXTRACCION_EJEMPLO, []);
    expect(p).toHaveLength(5);
    const bbva = deudaDesdePropuesta(p[0], "d1");
    expect(bbva).toMatchObject({ entidad: "BBVA", saldo: 235000, pagoMinimo: 18000, tceaBp: 6900, diaPago: 12, diasAtraso: 0, pagada: false });
    const caja = deudaDesdePropuesta(p[1], "d2");
    expect(caja).toMatchObject({ saldo: 480000, diasAtraso: 22 });
  });
  it("reconoce una deuda ya guardada para actualizarla y no duplicarla", () => {
    const datos = datosDeRosa();
    const guardada = { ...datos.deudas[0], entidad: "BBVA", nombre: "Tarjeta de crédito BBVA" };
    const p = propuestaDeudas(EXTRACCION_EJEMPLO, [guardada]);
    expect(p[0].existenteId).toBe(guardada.id);
    expect(p[1].existenteId).toBeNull();
  });
  it("si el documento no trae el pago mínimo o el día, pide completarlo en vez de inventarlo", () => {
    const p = propuestaDeudas({ ...EXTRACCION_EJEMPLO, deudas: [{ ...EXTRACCION_EJEMPLO.deudas[0], pagoMinimo: null, diaPago: null }] }, [])[0];
    expect(p.minimo).toBe("");
    expect(p.dia).toBe("");
    expect(() => deudaDesdePropuesta(p, "x")).toThrow(ErrorDatos);
  });
  it("un cobro sin fecha no se puede confirmar", () => {
    const ext = { ...EXTRACCION_EJEMPLO, cobros: [{ quien: "Juan", monto: 50, fecha: null, nota: "" }] };
    const [c] = propuestaCobros(ext);
    expect(c.monto).toBe("50");
    expect(() => cobroDesdePropuesta(c, "c1")).toThrow(/fecha/);
    expect(cobroDesdePropuesta({ ...c, fecha: "2026-11-20" }, "c1").monto).toBe(5000);
  });
});
