import { describe, expect, it } from "vitest";
import { sumar } from "@/motor/dinero";
import { completarCuentasDemo, cuentasDeEjemplo } from "./cuentas-demo";
import { datosDeRosa, datosVacios } from "./semilla";

function rosaAnterior() {
  return {
    ...datosDeRosa(),
    cuentas: [{ id: "cuenta-principal", nombre: "Cuenta principal", saldo: 46140 }],
  };
}

describe("dos cuentas para la demo de Rosa", () => {
  it("ofrece dos nombres y saldos distintos sin cambiar el acumulado", () => {
    const datos = datosDeRosa();
    expect(datos.cuentas.map(c => c.nombre)).toEqual(["Cuenta sueldo", "Cuenta de ahorros"]);
    expect(datos.cuentas.map(c => c.saldo)).toEqual([31140, 15000]);
    expect(sumar(datos.cuentas.map(c => c.saldo))).toBe(46140);
  });

  it("actualiza la cuenta original sin modificar el resto del caso ni mutar los datos recibidos", () => {
    const anterior = rosaAnterior();
    const copia = structuredClone(anterior);
    const nuevo = completarCuentasDemo(anterior);
    expect(nuevo.cuentas).toEqual(datosDeRosa().cuentas);
    expect({ ...nuevo, cuentas: anterior.cuentas }).toEqual(anterior);
    expect(anterior).toEqual(copia);
  });

  it("no duplica la cuenta al reabrir ni la recrea si se elimina después", () => {
    const actualizado = completarCuentasDemo(rosaAnterior());
    expect(completarCuentasDemo(actualizado)).toBe(actualizado);
    const sinAhorros = { ...actualizado, cuentas: [actualizado.cuentas[0]] };
    expect(completarCuentasDemo(sinAhorros)).toBe(sinAhorros);
  });

  it("conserva las cuentas propias y los nombres personalizados", () => {
    const propio = datosVacios({
      nombre: "Ana",
      tipo: "dependiente",
      saldo: 46140,
      ingresoAprox: 200000,
      hoy: "2026-11-14",
    });
    expect(completarCuentasDemo(propio)).toBe(propio);
    const personalizado = rosaAnterior();
    personalizado.cuentas[0].nombre = "Cuenta personalizada";
    expect(completarCuentasDemo(personalizado)).toBe(personalizado);
  });

  it("conserva los céntimos también con saldos pequeños, nulos o negativos", () => {
    for (const saldo of [0, 5001, 10000, -5000]) {
      const cuentas = cuentasDeEjemplo(saldo);
      expect(sumar(cuentas.map(c => c.saldo))).toBe(saldo);
      expect(cuentas.every(c => Number.isInteger(c.saldo))).toBe(true);
      expect(cuentas[1].saldo).toBeGreaterThanOrEqual(0);
    }
  });

  it("actualiza los nombres anteriores sin cambiar los saldos ni duplicar cuentas", () => {
    const anterior = datosDeRosa();
    anterior.cuentas = [
      { id: "cuenta-principal", nombre: "Día a día", saldo: 12345 },
      { id: "cuenta-ahorros-demo", nombre: "Mis ahorros", saldo: 67890 },
    ];
    const actualizado = completarCuentasDemo(anterior);
    expect(actualizado.cuentas.map(c => c.nombre)).toEqual(["Cuenta sueldo", "Cuenta de ahorros"]);
    expect(actualizado.cuentas.map(c => c.saldo)).toEqual([12345, 67890]);
    expect(completarCuentasDemo(actualizado)).toBe(actualizado);
  });
});
