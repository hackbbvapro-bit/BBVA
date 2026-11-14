import { afterEach, describe, expect, it, vi } from "vitest";
import { borrarSituacion, guardarSituacion, leerSituacion, SIN_SITUACION } from "./situacion";

function almacen(inicial: Record<string, string> = {}) {
  const datos = new Map(Object.entries(inicial));
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
    datos,
  };
}
const roto = {
  getItem: () => { throw new Error("bloqueado"); },
  setItem: () => { throw new Error("bloqueado"); },
  removeItem: () => { throw new Error("bloqueado"); },
};
const usar = (localStorage: unknown) => vi.stubGlobal("window", { localStorage });

afterEach(() => vi.unstubAllGlobals());

describe("situación guardada en el navegador", () => {
  it("sin nada guardado, todo está cerrado", () => {
    usar(almacen());
    expect(leerSituacion()).toEqual(SIN_SITUACION);
    expect(SIN_SITUACION).toEqual({ tuvoCredito: false, sinDeudas: false, externo: false });
  });

  it("guarda y lee los tres datos", () => {
    usar(almacen());
    guardarSituacion({ tuvoCredito: true, sinDeudas: true, externo: true });
    expect(leerSituacion()).toEqual({ tuvoCredito: true, sinDeudas: true, externo: true });
    guardarSituacion({ tuvoCredito: false, sinDeudas: true, externo: false });
    expect(leerSituacion()).toEqual({ tuvoCredito: false, sinDeudas: true, externo: false });
  });

  it("solo un verdadero de verdad abre el permiso: textos, números o basura cuentan como no", () => {
    for (const crudo of ['{"externo":"true","tuvoCredito":1,"sinDeudas":"si"}', "null", "[]", "no es json", '"true"']) {
      usar(almacen({ "copiloto-situacion": crudo }));
      expect(leerSituacion()).toEqual(SIN_SITUACION);
    }
  });

  it("una situación guardada antes de existir sinDeudas se lee sin romper", () => {
    usar(almacen({ "copiloto-situacion": '{"tuvoCredito":true,"externo":true}' }));
    expect(leerSituacion()).toEqual({ tuvoCredito: true, sinDeudas: false, externo: true });
  });

  it("borrar deja todo cerrado otra vez", () => {
    const a = almacen();
    usar(a);
    guardarSituacion({ tuvoCredito: true, sinDeudas: false, externo: true });
    borrarSituacion();
    expect(a.datos.size).toBe(0);
    expect(leerSituacion()).toEqual(SIN_SITUACION);
  });

  it("si el almacenamiento falla no lanza y la respuesta es la cerrada", () => {
    usar(roto);
    expect(() => guardarSituacion({ tuvoCredito: true, sinDeudas: true, externo: true })).not.toThrow();
    expect(() => borrarSituacion()).not.toThrow();
    expect(leerSituacion()).toEqual(SIN_SITUACION);
  });
});
