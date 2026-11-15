import { describe, expect, it } from "vitest";
import { analizar, formatoLargo, formatoSoles, soles } from "../motor";
import { aPerfil } from "../datos/aPerfil";
import { datosDeEjemplo } from "../datos/semilla";
import { armarCaso, tuvoCreditoSegun, type Respuestas } from "../ruta/entrada";
import { hechosDe } from "../ruta/ruta";
import { senalesDe } from "./senales";
import type { SenalDicha } from "./orientacion";

// Persona sintética: entra 2 500 al mes, salen 1 700 (900 fijos + 800 del día a día), le quedan 800 libres.
const base: Respuestas = {
  nombre: "Lucía", cobro: "fin_de_mes", ingresoMensual: soles(2500), saldo: soles(600),
  fijosMensual: soles(900), diaADiaMensual: soles(800), deuda: null, tuvoCredito: false, hoy: "2026-11-14",
};
const con = (cambios: Partial<Respuestas>): Respuestas => ({ ...base, ...cambios });
const tarjeta = (atraso: NonNullable<Respuestas["deuda"]>["atraso"] = "al_dia") =>
  ({ tipo: "tarjeta" as const, saldo: soles(3000), cuota: soles(250), atraso });

function senales(r: Respuestas, dichas: SenalDicha[] = []) {
  const datos = armarCaso(r);
  const perfil = aPerfil(datos);
  const analisis = analizar(perfil);
  const detectadas = senalesDe(perfil, analisis, hechosDe(datos, tuvoCreditoSegun(r)), dichas);
  return { detectadas, ids: detectadas.map(s => s.senal), analisis };
}

describe("senalesDe: la situación de la persona, deducida por código", () => {
  it("con un día en rojo detecta el déficit, con la fecha y el faltante del motor", () => {
    const datos = datosDeEjemplo();
    const perfil = aPerfil(datos);
    const analisis = analizar(perfil);
    const deficit = analisis.proyeccion.deficit!;
    const detectadas = senalesDe(perfil, analisis, hechosDe(datos));
    const s = detectadas.find(x => x.senal === "deficit_proyectado");
    expect(s?.por_que).toBe(`Su saldo proyectado cae bajo cero el ${formatoLargo(deficit.fecha)}: faltan ${formatoSoles(deficit.faltante)}.`);
    expect(detectadas.map(x => x.senal)).not.toContain("excedente_estable");
  });

  it("sin deudas ni crédito previo y con poco saldo: sin historial y sin colchón", () => {
    const { ids, detectadas } = senales(base);
    expect(ids).toEqual(["sin_historial", "sin_colchon"]);
    expect(detectadas[1].por_que).toBe("Su saldo de hoy cubre 10 días de gastos, menos de un mes.");
  });

  it("deuda de tarjeta al día: deuda cara, nunca excedente, aunque tenga saldo de sobra", () => {
    const { ids } = senales(con({ saldo: soles(20_000), deuda: tarjeta() }));
    expect(ids).toContain("deuda_cara");
    expect(ids).not.toContain("excedente_estable");
    expect(ids).not.toContain("sin_historial");
  });

  it("un atraso se detecta y bloquea el excedente", () => {
    const { ids } = senales(con({ saldo: soles(20_000), deuda: tarjeta("menos_de_un_mes") }));
    expect(ids).toContain("atraso");
    expect(ids).not.toContain("excedente_estable");
  });

  it("al día, con crédito previo, colchón completo y plata libre: excedente estable", () => {
    const { ids, detectadas } = senales(con({ saldo: soles(6000), tuvoCredito: true }));
    expect(ids).toEqual(["excedente_estable"]);
    expect(detectadas[0].por_que).toBe(`Le quedan libres ${formatoSoles(soles(800))} al mes y su saldo ya cubre tres meses de gastos.`);
  });

  it("al céntimo: un sol menos de los tres meses de gastos ya no es excedente", () => {
    // Meta del colchón: 3 × 1 700 = 5 100.
    expect(senales(con({ saldo: soles(5100), tuvoCredito: true })).ids).toContain("excedente_estable");
    expect(senales(con({ saldo: soles(5100) - 1, tuvoCredito: true })).ids).not.toContain("excedente_estable");
  });

  it("independiente: ingreso variable y sin planilla", () => {
    const { ids } = senales(con({ trabajo: "independiente", cobro: "variable" }));
    expect(ids).toContain("ingreso_variable");
    expect(ids).toContain("sin_planilla");
    expect(senales(base).ids).not.toContain("sin_planilla");
  });

  it("lo que solo la persona sabe entra únicamente si lo dijo, sin duplicarse", () => {
    expect(senales(base).ids).not.toContain("cobra_sueldo_bbva");
    const { detectadas } = senales(base, ["cobra_sueldo_bbva", "cobra_sueldo_bbva", "meta_vivienda"]);
    expect(detectadas.filter(s => s.senal === "cobra_sueldo_bbva")).toHaveLength(1);
    expect(detectadas.find(s => s.senal === "meta_vivienda")?.por_que).toBe("La persona dijo que quiere comprar vivienda.");
  });
});
