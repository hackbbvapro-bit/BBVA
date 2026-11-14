import { describe, expect, it } from "vitest";
import { etiquetaVencimiento, proximoVencimiento } from "./prioridad";

describe("próximo vencimiento para el calendario", () => {
  it("elige el pago más cercano aunque otro día del mes ya haya pasado", () => {
    expect(proximoVencimiento("2026-11-13", [23, 5])).toBe("2026-11-23");
  });
  it("incluye un vencimiento de hoy", () => {
    expect(proximoVencimiento("2026-11-23", [23, 5])).toBe("2026-11-23");
  });
  it("ajusta meses cortos y cambio de año", () => {
    expect(proximoVencimiento("2027-02-01", [31])).toBe("2027-02-28");
    expect(proximoVencimiento("2026-12-30", [5])).toBe("2027-01-05");
  });
  it("no muestra una fecha inventada si no hay deudas", () => {
    expect(proximoVencimiento("2026-11-13", [])).toBeUndefined();
  });
  it("cambia el texto cuando el siguiente vencimiento cae en el próximo mes", () => {
    expect(etiquetaVencimiento("2026-11-13", proximoVencimiento("2026-11-13", [23]))).toBe("Deuda del pago normal de este mes");
    expect(etiquetaVencimiento("2026-11-24", proximoVencimiento("2026-11-24", [23]))).toBe("Deuda del pago normal del siguiente mes");
    expect(etiquetaVencimiento("2026-12-24", proximoVencimiento("2026-12-24", [23]))).toBe("Deuda del pago normal del siguiente mes");
  });
  it("mantiene este mes si hay otra deuda con vencimiento pendiente", () => {
    expect(etiquetaVencimiento("2026-11-24", proximoVencimiento("2026-11-24", [23, 28]))).toBe("Deuda del pago normal de este mes");
  });
});
