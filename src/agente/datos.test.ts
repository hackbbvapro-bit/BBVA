import { describe, expect, it } from "vitest";
import { PERFILES } from "../datos/perfiles";
import { analizar, simularGasto } from "../motor";
import { datosDeudas, datosJugadas, datosProximosPagos, datosResumen, datosSimulacion } from "./datos";

const porId = (id: string) => {
  const perfil = PERFILES.find(p => p.id === id);
  if (!perfil) throw new Error(`No existe el perfil ${id}`);
  return { perfil, analisis: analizar(perfil) };
};

describe("datos que ve el agente", () => {
  it("no dejan pasar NaN, undefined ni montos sin formato en ningún perfil", () => {
    for (const perfil of PERFILES) {
      const analisis = analizar(perfil);
      const todo = JSON.stringify([
        datosResumen(perfil, analisis), datosJugadas(analisis), datosDeudas(perfil, analisis),
        datosProximosPagos(analisis, 30), datosSimulacion(analisis, 150, analisis.hoy),
      ]);
      expect(todo).not.toMatch(/NaN|undefined|Infinity|null,null/);
      expect(todo).toContain("S/ ");
    }
  });

  it("el resumen de Rosa dice el día y el monto exactos del déficit", () => {
    const { perfil, analisis } = porId("independiente");
    const resumen = datosResumen(perfil, analisis);
    expect(resumen.deficit?.primer_dia_en_negativo).toBe("lunes 23 de noviembre");
    expect(resumen.deficit?.cuanto_falta_ese_dia).toBe("S/ 200.00");
    expect(resumen.deficit?.causas.length).toBeGreaterThan(0);
  });

  it("Carlos no tiene déficit ni jugadas que proponer", () => {
    const { perfil, analisis } = porId("dependiente");
    expect(datosResumen(perfil, analisis).deficit).toBeNull();
    expect(datosJugadas(analisis).hay_deficit).toBe(false);
  });

  it("las jugadas de Rosa llevan costo y señalan la más barata que resuelve", () => {
    const { analisis } = porId("independiente");
    const jugadas = datosJugadas(analisis);
    expect(jugadas.hay_deficit).toBe(true);
    expect(jugadas.jugadas?.length).toBe(analisis.jugadas.length);
    for (const j of jugadas.jugadas ?? []) expect(j.cuesta).toMatch(/^S\/ |^no cuesta dinero$/);
  });

  it("las deudas van de mayor a menor TCEA y la primera es la que hay que atacar", () => {
    for (const perfil of PERFILES.filter(p => p.deudas.length > 0)) {
      const deudas = datosDeudas(perfil, analizar(perfil));
      const masCara = [...perfil.deudas].sort((a, b) => b.tceaBp - a.tceaBp)[0];
      expect(deudas.pagar_primero).toBe(masCara.nombre);
      expect(deudas.deudas_de_mayor_a_menor_tcea?.[0].nombre).toBe(masCara.nombre);
      expect(deudas.deudas_de_mayor_a_menor_tcea?.length).toBe(perfil.deudas.length);
    }
  });

  it("los próximos pagos se muestran como montos positivos", () => {
    const { analisis } = porId("independiente");
    for (const pago of datosProximosPagos(analisis, 30).pagos) expect(pago.monto).toMatch(/^S\/ /);
  });
});

describe("simular un gasto", () => {
  const { analisis } = porId("dependiente");

  it("pasa los soles a céntimos enteros sin errores de decimales", () => {
    expect(datosSimulacion(analisis, 19.99, analisis.hoy)).toMatchObject({ gasto: "S/ 19.99" });
    expect(datosSimulacion(analisis, 0.07, analisis.hoy)).toMatchObject({ gasto: "S/ 0.07" });
    expect(datosSimulacion(analisis, 1234.56, analisis.hoy)).toMatchObject({ gasto: "S/ 1,234.56" });
  });

  it("el máximo que informa es exactamente el límite: alcanza con él y no con un céntimo más", () => {
    const maximo = simularGasto(analisis.proyeccion, analisis.proyeccion.desde, 100).maximoSinDeficit;
    expect(maximo).toBeGreaterThan(0);
    expect(datosSimulacion(analisis, maximo / 100, analisis.hoy)).toMatchObject({ alcanza: true });
    const pasado = datosSimulacion(analisis, (maximo + 1) / 100, analisis.hoy);
    expect(pasado).toMatchObject({ alcanza: false });
    expect(JSON.stringify(pasado)).toContain("No alcanza");
  });

  it("devuelve un error legible, sin lanzar, con montos o fechas que no valen", () => {
    for (const monto of [0, -5, Number.NaN, Number.POSITIVE_INFINITY, 2_000_000]) {
      expect(datosSimulacion(analisis, monto, analisis.hoy)).toHaveProperty("error");
    }
    for (const fecha of ["2020-01-01", "2026-02-30", "mañana", "2099-12-31"]) {
      expect(datosSimulacion(analisis, 50, fecha)).toHaveProperty("error");
    }
  });

  it("un gasto hecho hoy cuenta igual que uno hecho el primer día proyectado, y se nombra como hoy", () => {
    const hoy = datosSimulacion(analisis, 80, analisis.hoy);
    const manana = datosSimulacion(analisis, 80, analisis.proyeccion.desde);
    expect(hoy).toMatchObject({ dia_del_gasto: "viernes 13 de noviembre", alcanza: true });
    expect({ ...hoy, dia_del_gasto: "" }).toEqual({ ...manana, dia_del_gasto: "" });
  });
});
