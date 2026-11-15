import { describe, expect, it } from "vitest";
import { analizar, sumar } from "../motor";
import { aPerfil } from "../datos/aPerfil";
import { datosDeEjemplo } from "../datos/semilla";
import { detalleDelMes, repartir } from "./mes";
import { flujoMensual, resumenDelMes } from "./ruta";

describe("repartir", () => {
  it("no pierde ni inventa céntimos", () => {
    expect(repartir(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(sumar(repartir(174_690, [109_242, 45_018, 20_428]))).toBe(174_690);
  });
  it("sin pesos devuelve vacío y con pesos en cero da todo al primero", () => {
    expect(repartir(500, [])).toEqual([]);
    expect(repartir(500, [0, 0])).toEqual([500, 0]);
  });
});

describe("detalleDelMes (caso de Andrea)", () => {
  const perfil = aPerfil(datosDeEjemplo());
  const analisis = analizar(perfil);
  const detalle = detalleDelMes(perfil, analisis);
  const f = flujoMensual(perfil, analisis);

  it("los totales son exactamente los de Mi dinero, Inicio y Mi ruta", () => {
    const mes = resumenDelMes(perfil, analisis);
    expect(detalle.entra.total).toBe(mes.entra);
    expect(detalle.sale.total).toBe(mes.sale);
    expect(detalle.cuotas.total).toBe(f.cuotas);
    expect(detalle.libre).toBe(f.libre);
  });

  it("cada bloque suma su subtotal, céntimo por céntimo", () => {
    expect(sumar([...detalle.entra.fijos, ...detalle.entra.variables].map(l => l.monto))).toBe(detalle.entra.total);
    expect(sumar(detalle.sale.fijos.map(l => l.monto))).toBe(detalle.sale.subtotalFijos);
    expect(sumar(detalle.sale.diaADia.map(l => l.monto))).toBe(detalle.sale.subtotalDiaADia);
    expect(detalle.sale.subtotalFijos + detalle.sale.subtotalDiaADia).toBe(detalle.sale.total);
    expect(sumar(detalle.cuotas.lineas.map(l => l.monto))).toBe(detalle.cuotas.total);
  });

  it("dice de dónde viene lo que entra: las sesiones de fisioterapia", () => {
    expect(detalle.entra.variables[0].nombre).toBe("Sesiones de fisioterapia");
    expect(detalle.entra.variables[0].detalle).toMatch(/cobros en las últimas 12 semanas/);
  });

  it("detalla lo que sale: alquiler, salidas y cada cuota de deuda", () => {
    expect(detalle.sale.fijos[0]).toMatchObject({ nombre: "Alquiler", monto: 85_000 });
    expect(detalle.sale.diaADia.map(l => l.nombre)).toContain("Salidas y delivery");
    expect(detalle.cuotas.lineas.map(l => l.nombre)).toEqual(["Tarjeta Azul", "Préstamo personal", "Tarjeta Verde"]);
    expect(detalle.cuotas.total).toBe(102_000);
  });
});

describe("detalleDelMes con cuota declarada sin saldo (cuestionario corto)", () => {
  it("la cuota va en Cuotas, no en Gastos, y las tres partes suman lo que sale", async () => {
    const { aRespuestas, proximoPaso, responder } = await import("./guion");
    const { armarCaso } = await import("./entrada");
    const respuestas = { nombre: "Lucho", trabajo: "dependiente", cobro: "fin_de_mes", diaPago: "31", ingreso: "2500", saldo: "600", gastos: "1000", deudas: "al_dia", cuotaDeuda: "300", meta: "ahorrar" } as const;
    let borrador = {};
    for (let paso = proximoPaso(borrador); paso !== null; paso = proximoPaso(borrador)) {
      borrador = responder(borrador, paso, respuestas[paso as keyof typeof respuestas]).borrador;
    }
    const perfil = aPerfil(armarCaso(aRespuestas(borrador, "2026-11-14")));
    const analisis = analizar(perfil);
    const detalle = detalleDelMes(perfil, analisis);
    expect(detalle.sale.fijos.map(l => l.nombre)).not.toContain("Cuotas de deudas por detallar");
    expect(detalle.sale.subtotalFijos + detalle.sale.subtotalDiaADia).toBe(detalle.sale.total);
    expect(detalle.sale.total).toBe(100_000);
    expect(detalle.cuotas.total).toBe(30_000);
    expect(sumar(detalle.cuotas.lineas.map(l => l.monto))).toBe(30_000);
    expect(detalle.libre).toBe(detalle.entra.total - detalle.sale.total - detalle.cuotas.total);
    expect(resumenDelMes(perfil, analisis).notaSale ?? "").not.toContain("1,300");
  });
});
