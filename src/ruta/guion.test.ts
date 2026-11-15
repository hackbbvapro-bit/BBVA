import { describe, expect, it } from "vitest";
import { analizar } from "../motor";
import { aPerfil } from "../datos/aPerfil";
import { armarCaso } from "./entrada";
import { aRespuestas, avance, pasosPrevistos, pregunta, proximoPaso, responder, MONTO_MAXIMO, type Borrador, type Paso } from "./guion";
import { flujoMensual } from "./ruta";

const comunes: Partial<Record<Paso, string>> = { nombre: "Lucho", trabajo: "dependiente", cobro: "fin_de_mes", diaPago: "31", ingreso: "2500", saldo: "600", gastos: "1700", deudas: "no", meta: "ahorrar" };
function recorrer(respuestas = comunes) {
  let borrador: Borrador = {};
  const orden: Paso[] = [];
  for (let i = 0; i < 12; i++) {
    const paso = proximoPaso(borrador);
    if (paso === null) return { borrador, orden };
    expect(pasosPrevistos(borrador)).toContain(paso);
    const a = avance(borrador);
    expect(a.actual).toBeGreaterThanOrEqual(1);
    expect(a.actual).toBeLessThanOrEqual(a.total);
    orden.push(paso);
    if (respuestas[paso] === undefined) throw new Error(`Falta ${paso}`);
    borrador = responder(borrador, paso, respuestas[paso]!).borrador;
  }
  throw new Error("No terminó");
}
describe("cuestionario corto", () => {
  it("sigue el orden, con ocho preguntas base y las condicionales necesarias", () => {
    expect(recorrer().orden).toEqual(["nombre", "trabajo", "cobro", "diaPago", "ingreso", "saldo", "gastos", "deudas", "meta"]);
    expect(recorrer({ ...comunes, cobro: "quincena" }).orden).toHaveLength(8);
    expect(recorrer({ ...comunes, trabajo: "independiente", cobro: "variable", flojo: "1500", deudas: "al_dia", cuotaDeuda: "250" }).orden).toEqual(["nombre", "trabajo", "cobro", "ingreso", "flojo", "saldo", "gastos", "deudas", "cuotaDeuda", "meta"]);
  });
  it("el total de «Pregunta X de N» nunca sube a mitad del cuestionario y termina en el número real de preguntas", () => {
    const casos: Partial<Record<Paso, string>>[] = [
      comunes,
      { ...comunes, cobro: "quincena" },
      { ...comunes, trabajo: "independiente", cobro: "semanal", flojo: "1500", deudas: "al_dia", cuotaDeuda: "250" },
      { ...comunes, trabajo: "independiente", cobro: "variable", flojo: "1500" },
    ];
    for (const respuestas of casos) {
      let borrador: Borrador = {};
      const totales: number[] = [];
      for (let paso = proximoPaso(borrador); paso !== null; paso = proximoPaso(borrador)) {
        totales.push(avance(borrador).total);
        borrador = responder(borrador, paso, respuestas[paso]!).borrador;
      }
      totales.forEach((t, i) => { if (i > 0) expect(t).toBeLessThanOrEqual(totales[i - 1]); });
      expect(totales.at(-1)).toBe(pasosPrevistos(borrador).length);
    }
  });
  it("el mes flojo pide el total del mes y, si cobra por semana, lo aclara", () => {
    expect(pregunta("flojo", { cobro: "semanal" })).toMatchObject({ texto: "Y en un mes flojo, ¿cuánto te entra en todo el mes?", ayuda: "El total del mes, no de una semana." });
    expect(pregunta("flojo", { cobro: "variable" }).ayuda).toBeUndefined();
  });
  it("ofrece las cinco frecuencias a ambos trabajos y adapta el ingreso", () => {
    for (const trabajo of ["dependiente", "independiente"] as const) {
      expect(pregunta("cobro", { trabajo }).opciones?.map(o => o.valor)).toEqual(["diario", "semanal", "quincena", "fin_de_mes", "variable"]);
    }
    for (const cobro of ["diario", "semanal"] as const) expect(pregunta("ingreso", { cobro }).texto).toBe("¿Cuánto juntas en una semana normal?");
    expect(pregunta("ingreso", { cobro: "quincena" }).texto).toBe("¿Cuánto recibes cada quincena?");
    expect(pregunta("ingreso", { cobro: "fin_de_mes" }).texto).toBe("¿Cuánto recibes al mes?");
    expect(pregunta("ingreso", { cobro: "variable" }).texto).toBe("En un mes normal, ¿cuánto te llega en total?");
  });
  it("solo ofrece salir de deudas cuando las declara", () => {
    expect(pregunta("meta", { deudas: "no" }).opciones?.map(o => o.valor)).not.toContain("salir_deudas");
    expect(pregunta("meta", { deudas: "al_dia" }).opciones?.map(o => o.valor)).toContain("salir_deudas");
    expect(() => responder({ deudas: "no" }, "meta", "salir_deudas")).toThrow();
  });
  it("evita duplicar el punto del apodo", () => {
    expect(pregunta("trabajo", { nombre: "Sergio Ch." }).texto).toContain("Sergio Ch. ¿");
    expect(pregunta("trabajo", { nombre: "Sergio Ch." }).texto).not.toContain("..");
  });
  it("mantiene validación de apodos, días y montos fuera de rango", () => {
    for (const nombre of ["", "x".repeat(41), "Lucho 987654321"]) expect(() => responder({}, "nombre", nombre)).toThrow();
    expect(responder({}, "nombre", "  Lucho   Pe ").borrador.nombre).toBe("Lucho Pe");
    for (const dia of ["0", "32", "1.5"]) expect(() => responder({}, "diaPago", dia)).toThrow();
    for (const monto of ["0", "-1", String(MONTO_MAXIMO / 100 + 1)]) expect(() => responder({}, "ingreso", monto)).toThrow();
    expect(responder({}, "saldo", "0").borrador.saldo).toBe(0);
    expect(responder({}, "ingreso", "2500.50").borrador.ingreso).toBe(250050);
    expect(() => aRespuestas({}, "2026-11-14")).toThrow();
  });
  it("usa el ingreso bajo y el gasto alto de rangos, incluidos números escritos", () => {
    expect(responder({ trabajo: "independiente" }, "ingreso", "entre 1500 y 3000").borrador.ingreso).toBe(150000);
    expect(responder({}, "ingreso", "dos mil quinientos").borrador.ingreso).toBe(250000);
    expect(responder({}, "gastos", "entre 800 y 1000").borrador.gastos).toBe(100000);
    expect(responder({}, "saldo", "entre 300 y 500").borrador.saldo).toBe(30000);
  });
  it.each([["cuotaDeuda", "pago toda la deuda"], ["gastos", "no sé"], ["gastos", "depende"], ["cuotaDeuda", "no tengo"]] as const)("%s: %s recibe ayuda y opciones, sin error ni avanzar", (paso, valor) => {
    const b: Borrador = { nombre: "Lucho" };
    const r = responder(b, paso, valor);
    expect(r.borrador).toBe(b);
    expect(r.ayuda).toBeTruthy();
    expect(pregunta(paso, b).opciones?.length).toBeGreaterThan(0);
  });
  it("puede detallar gastos y cuotas después; no inventa deuda ni atraso", () => {
    const { borrador } = recorrer({ ...comunes, gastos: "despues", deudas: "al_dia", cuotaDeuda: "despues" });
    const r = aRespuestas(borrador, "2026-11-14");
    expect(r.deuda).toEqual({ cuota: 0 });
    expect(r.gastosMensual).toBe(0);
    expect(armarCaso(r).deudas).toEqual([]);
  });
  it("lleva el gasto total y las cuotas al motor una sola vez, sin inventar saldo de deuda", () => {
    const r = aRespuestas(recorrer({ ...comunes, deudas: "al_dia", cuotaDeuda: "250.01" }).borrador, "2026-11-14");
    const datos = armarCaso(r);
    const perfil = aPerfil(datos);
    expect(flujoMensual(perfil, analizar(perfil))).toEqual({ ingresos: 250000, gastos: 170000, cuotas: 25001, libre: 54999 });
    expect(datos.deudas).toEqual([]);
  });
  it("convierte la semana y la quincena con céntimos enteros", () => {
    const semanal = aRespuestas(recorrer({ ...comunes, cobro: "semanal", ingreso: "500.01" }).borrador, "2026-11-14");
    expect(semanal.ingresoMensual).toBe(216_700); // 500.01 × 52 / 12 ≈ 2,166.71: estimado al sol
    expect(semanal.ingresoSemanal).toBe(50001);
    const perfil = aPerfil(armarCaso(semanal));
    expect(analizar(perfil).recurrentes.filter(r => r.monto > 0)).toMatchObject([{ monto: 50001, frecuencia: "semanal" }]);
    const quincena = aRespuestas(recorrer({ ...comunes, cobro: "quincena", ingreso: "1250.01" }).borrador, "2026-11-14");
    expect(quincena.ingresoMensual).toBe(250002);
    expect(armarCaso(quincena).ingresosFijos.map(f => [f.dia, f.monto])).toEqual([[15, 125001], [31, 125001]]);
  });
  it("compara el mes flojo con el ingreso mensual, no con la semana", () => {
    expect(responder({ ingreso: 50000, cobro: "semanal" }, "flojo", "1500").borrador.flojo).toBe(150000);
    expect(() => responder({ ingreso: 50000, cobro: "semanal" }, "flojo", "2500")).toThrow();
  });
});
