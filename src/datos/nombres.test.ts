import { describe, expect, it } from "vitest";
import { nombreFijoRepetido } from "./nombres";
import { datosDeRosa } from "./semilla";

describe("nombreFijoRepetido", () => {
  const datos = datosDeRosa();
  const alquiler = datos.gastosFijos.find(f => /alquiler/i.test(f.descripcion))!;
  it("detecta el mismo nombre aunque cambien tildes, mayúsculas, números o espacios", () => {
    expect(nombreFijoRepetido(datos, "gasto", "  ALQUILER 2 ")).toBe(true);
    expect(nombreFijoRepetido(datos, "gasto", "Alquilér")).toBe(true);
  });
  it("no se marca a sí mismo al editar", () => {
    expect(nombreFijoRepetido(datos, "gasto", alquiler.descripcion, alquiler.id)).toBe(false);
  });
  it("un nombre nuevo pasa, y el mismo nombre en el otro sentido también", () => {
    expect(nombreFijoRepetido(datos, "gasto", "Gimnasio")).toBe(false);
    expect(nombreFijoRepetido(datos, "ingreso", alquiler.descripcion)).toBe(false);
  });
  it("un gasto fijo no puede llamarse como el pago de una deuda", () => {
    const d = datos.deudas[0];
    expect(nombreFijoRepetido(datos, "gasto", `Pago ${d.nombre}`)).toBe(true);
  });
  it("sin letras no hay colisión que detectar (otra regla lo rechaza)", () => {
    expect(nombreFijoRepetido(datos, "gasto", "123")).toBe(false);
  });
});
