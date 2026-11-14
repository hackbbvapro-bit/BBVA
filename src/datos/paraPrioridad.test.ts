import { describe, expect, it } from "vitest";
import { analizar } from "../motor";
import { aPerfil } from "./aPerfil";
import { datosDeRosa } from "./semilla";
import { disponibleParaDeudas, entradaPrioridad, prioridadDePagos } from "./paraPrioridad";

describe("puente base → prioridad de pagos", () => {
  it("con la semilla de Rosa arma la entrada con sus deudas abiertas", () => {
    const datos = datosDeRosa();
    const entrada = entradaPrioridad(datos, analizar(aPerfil(datos)));
    expect(entrada.hoy).toBe("2026-11-13");
    expect(entrada.deudas).toHaveLength(datos.deudas.length);
    expect(entrada.disponible).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(entrada.disponible)).toBe(true);
  });
  it("una deuda pagada no entra y no hay deudas sin decisiones", () => {
    const datos = datosDeRosa();
    datos.deudas = datos.deudas.map(d => ({ ...d, pagada: true }));
    const r = prioridadDePagos(datos, analizar(aPerfil(datos)));
    expect(r.decisiones).toEqual([]);
  });
  it("un cobro «me deben» no aumenta el dinero disponible", () => {
    const datos = datosDeRosa();
    const antes = disponibleParaDeudas(analizar(aPerfil(datos)));
    datos.cobros = [{ id: "c1", quien: "Juan", monto: 500000, fechaPrometida: "2026-11-20", nota: "", cobrado: false }];
    expect(disponibleParaDeudas(analizar(aPerfil(datos)))).toBe(antes);
  });
  it("agregar una deuda cambia las decisiones", () => {
    const datos = datosDeRosa();
    const antes = prioridadDePagos(datos, analizar(aPerfil(datos))).decisiones.length;
    datos.deudas = [...datos.deudas, { id: "x", entidad: "Caja Ejemplo", nombre: "Préstamo ejemplo", tipo: "prestamo", saldo: 100000, tceaBp: 4800, pagoMinimo: 20000, pagoHabitual: 20000, diaPago: 25, diasAtraso: 0, pagada: false }];
    expect(prioridadDePagos(datos, analizar(aPerfil(datos))).decisiones.length).toBe(antes + 1);
  });
});
