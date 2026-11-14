import { describe, expect, it } from "vitest";
import { saldoDeCuentas } from "./cuentas";

const cuentas = [
  { id: "principal", nombre: "Cuenta principal", saldo: 46140 },
  { id: "ahorro", nombre: "Ahorros", saldo: 120055 },
  { id: "otra", nombre: "Otra cuenta", saldo: -10001 },
];

describe("saldo de la cuenta elegida", () => {
  it("el acumulado suma todas las cuentas, incluidos saldos negativos, en céntimos", () => {
    expect(saldoDeCuentas(cuentas, null)).toEqual({
      seleccion: null,
      nombre: "Acumulado general",
      saldo: 156194,
    });
  });

  it("una cuenta muestra únicamente su saldo sin alterar las demás", () => {
    const antes = structuredClone(cuentas);
    expect(saldoDeCuentas(cuentas, "ahorro")).toEqual({
      seleccion: "ahorro",
      nombre: "Ahorros",
      saldo: 120055,
    });
    expect(cuentas).toEqual(antes);
  });

  it("vuelve al acumulado si la cuenta elegida fue eliminada", () => {
    expect(saldoDeCuentas(cuentas, "eliminada").seleccion).toBeNull();
    expect(saldoDeCuentas(cuentas, "eliminada").saldo).toBe(156194);
  });

  it("sin cuentas muestra cero y permite mantener la vista general", () => {
    expect(saldoDeCuentas([], "principal")).toEqual({
      seleccion: null,
      nombre: "Acumulado general",
      saldo: 0,
    });
  });
});
