/** Las herramientas para anotar: el monto lo lee el código (no el modelo) y lo anotado cambia lo que ven las demás. */
import { describe, expect, it, vi } from "vitest";
import { datosDeRosa } from "../datos/semilla";
import { aPerfil } from "../datos/aPerfil";
import { analizar, formatoSoles } from "../motor";
import { crearHerramientas, leerTcea } from "./herramientas";
import { leerFecha, type Accion } from "./registro";

const datos = datosDeRosa();
const perfil = aPerfil(datos);
const analisis = analizar(perfil);

function armar(cobros = datos.cobros) {
  const alAccion = vi.fn<(a: Accion, t: string) => void>();
  const herramientas = crearHerramientas(perfil, analisis, undefined, { cobros, alAccion });
  const correr = async (nombre: string, entrada: object) =>
    JSON.parse(String(await herramientas.find(h => h.name === nombre)?.run(entrada as never)));
  return { alAccion, correr };
}

describe("anotar_ingreso", () => {
  it("«me acaban de pagar mil» con anotar=true suma al saldo, avisa al navegador y el resumen lo refleja", async () => {
    const { alAccion, correr } = armar();
    const r = await correr("anotar_ingreso", { monto: "mil", cuando: "ya_llego", anotar: true });
    expect(r.anotado_en_su_panel).toBe(true);
    expect(r.antes.saldo_hoy).toBe(formatoSoles(perfil.saldoActual));
    expect(r.despues.saldo_hoy).toBe(formatoSoles(perfil.saldoActual + 100_000));
    expect(alAccion).toHaveBeenCalledTimes(1);
    expect(alAccion.mock.calls[0][0]).toEqual({ tipo: "saldo", monto: 100_000, descripcion: "Ingreso extra" });
    const resumen = await correr("ver_resumen", {});
    expect(resumen.saldo_hoy).toBe(formatoSoles(perfil.saldoActual + 100_000));
  });

  it("con anotar=false solo calcula el «¿y si…?»: no guarda nada ni cambia el resumen", async () => {
    const { alAccion, correr } = armar();
    const r = await correr("anotar_ingreso", { monto: "500", cuando: "ya_llego", anotar: false });
    expect(r.anotado_en_su_panel).toBe(false);
    expect(r.despues.saldo_hoy).toBe(formatoSoles(perfil.saldoActual + 50_000));
    expect(alAccion).not.toHaveBeenCalled();
    expect((await correr("ver_resumen", {})).saldo_hoy).toBe(formatoSoles(perfil.saldoActual));
  });

  it("la misma llamada repetida no se anota dos veces", async () => {
    const { alAccion, correr } = armar();
    const entrada = { monto: "100", cuando: "ya_llego", anotar: true };
    await correr("anotar_ingreso", entrada);
    await correr("anotar_ingreso", entrada);
    expect(alAccion).toHaveBeenCalledTimes(1);
  });

  it("un pago por llegar se anota como cobro en la fecha que dijo la persona", async () => {
    const { alAccion, correr } = armar([]);
    const r = await correr("anotar_ingreso", { monto: "100", cuando: "por_llegar", fecha_dicha: "el viernes", descripcion: "Limpieza", anotar: true });
    expect(r.error).toBeUndefined();
    expect(alAccion.mock.calls[0][0]).toEqual({ tipo: "cobro", quien: "Limpieza", monto: 10_000, fecha: leerFecha("el viernes", perfil.hoy) });
    const resumen = await correr("ver_resumen", {});
    expect(resumen.cobros_pendientes).toEqual([expect.objectContaining({ quien: "Limpieza", monto: "S/ 100.00" })]);
    // El plan prudente no cuenta lo que aún no llega: el saldo de hoy no cambia.
    expect(resumen.saldo_hoy).toBe(formatoSoles(perfil.saldoActual));
  });

  it("sin fecha o con un monto que no se entiende, devuelve un error para que el modelo pregunte", async () => {
    const { alAccion, correr } = armar();
    expect((await correr("anotar_ingreso", { monto: "100", cuando: "por_llegar", anotar: true })).error).toMatch(/día/);
    expect((await correr("anotar_ingreso", { monto: "bastante", cuando: "ya_llego", anotar: true })).error).toMatch(/monto/);
    expect((await correr("anotar_ingreso", { monto: "1500", cuando: "cada_mes", anotar: true })).error).toMatch(/día del mes/);
    expect(alAccion).not.toHaveBeenCalled();
  });
});

describe("anotar_gasto y anotar_deuda", () => {
  it("un gasto que ya pasó resta del saldo; uno mensual se anota como fijo", async () => {
    const { alAccion, correr } = armar();
    const r = await correr("anotar_gasto", { monto: "S/ 80.50", cuando: "ya_paso", descripcion: "Mercado", anotar: true });
    expect(r.despues.saldo_hoy).toBe(formatoSoles(perfil.saldoActual - 8_050));
    await correr("anotar_gasto", { monto: "cincuenta", cuando: "cada_mes", dia_del_mes: 15, descripcion: "Internet nuevo", categoria: "servicios", anotar: true });
    expect(alAccion.mock.calls.map(c => c[0])).toEqual([
      { tipo: "saldo", monto: -8_050, descripcion: "Gasto: Mercado" },
      { tipo: "fijo", sentido: "gasto", descripcion: "Internet nuevo", monto: 5_000, dia: 15, categoria: "servicios" },
    ]);
  });

  it("una deuda con sus datos se anota con la TCEA leída por código", async () => {
    const { alAccion, correr } = armar();
    const r = await correr("anotar_deuda", {
      entidad: "Caja", nombre: "Préstamo moto", tipo: "prestamo", saldo: "3 mil", pago_mensual: "250", dia_de_pago: 18, tcea_dicha: "45,5 %", anotar: true,
    });
    expect(r.error).toBeUndefined();
    expect(alAccion.mock.calls[0][0]).toEqual({
      tipo: "deuda", entidad: "Caja", nombre: "Préstamo moto", tipoDeuda: "prestamo", saldo: 300_000, pagoMensual: 25_000, dia: 18, tceaBp: 4_550,
    });
  });

  it("leerTcea no adivina", () => {
    expect(leerTcea("45%")).toBe(4_500);
    expect(leerTcea(undefined)).toBeNull();
    expect(leerTcea("alta")).toBeNull();
  });
});
