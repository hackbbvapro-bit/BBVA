import { describe, expect, it } from "vitest";
import { analizar } from "../motor";
import { aPerfil } from "../datos/aPerfil";
import { armarCaso, type Respuestas } from "./entrada";
import { avanceDe, EsquemaAvances, fraseAvance, hechosDe, IDS_PASO, saludoDeRuta, trazarRuta } from "./ruta";
import { datosRuta } from "../agente/datos";
import { responderSinIA } from "../explica/explica";

const base: Respuestas = {
  nombre: "Lucho", cobro: "fin_de_mes", ingresoMensual: 320_000, saldo: 90_000,
  fijosMensual: 110_000, diaADiaMensual: 100_000, deuda: null, tuvoCredito: false, hoy: "2026-11-14",
};
const datos = armarCaso(base);
const perfil = aPerfil(datos);
const analisis = analizar(perfil);
const ruta = trazarRuta(perfil, analisis, hechosDe(datos, false));

describe("avance de la ruta", () => {
  it("sin marcas: cero hechos y el siguiente es el primer paso", () => {
    const a = avanceDe(ruta);
    expect(a).toMatchObject({ cumplidos: 0, total: ruta.pasos.length, siguiente: ruta.pasos[0] });
    expect(fraseAvance(a)).toContain("Todavía no marcas");
  });

  it("marcas de pasos que ya no están en la ruta no cuentan", () => {
    const ajeno = IDS_PASO.find(id => !ruta.idsPasos.includes(id));
    if (!ajeno) return;
    expect(avanceDe(ruta, [ajeno]).cumplidos).toBe(0);
  });

  it("todo marcado: no hay siguiente y la frase lo dice", () => {
    const a = avanceDe(ruta, ruta.idsPasos);
    expect(a.siguiente).toBeNull();
    expect(a.cumplidos).toBe(a.total);
    expect(fraseAvance(a)).toContain("todos los pasos");
  });

  it("el saludo retoma desde el siguiente paso cuando ya hay avance", () => {
    const a = avanceDe(ruta, [ruta.idsPasos[0]]);
    const saludo = saludoDeRuta("Lucho", ruta, true, a);
    expect(saludo).toContain("Hola de nuevo, Lucho");
    expect(saludo).toContain("Llevas 1 de");
  });

  it("el servidor solo acepta identificadores de paso conocidos", () => {
    expect(EsquemaAvances.safeParse([ruta.idsPasos[0]]).success).toBe(true);
    expect(EsquemaAvances.safeParse(["borrar-todo"]).success).toBe(false);
    expect(EsquemaAvances.safeParse([...IDS_PASO, IDS_PASO[0]]).success).toBe(false);
  });
});

describe("el asistente conoce el avance", () => {
  const a = avanceDe(ruta, [ruta.idsPasos[0]]);

  it("ver_ruta marca cada paso y dice cuál sigue", () => {
    const d = datosRuta(ruta, a);
    expect(d.pasos[0]).toEqual({ paso: ruta.pasos[0], marcado_como_hecho: true });
    expect(d).toMatchObject({ avance: `1 de ${ruta.pasos.length} pasos hechos`, siguiente_paso: ruta.pasos[1] });
    expect(datosRuta(ruta)).not.toHaveProperty("avance");
  });

  it("sin IA: «¿cómo voy?» responde con el avance", () => {
    for (const p of ["¿Cómo voy?", "¿Cuál es mi siguiente paso?", "¿qué sigue?", "ya hice el primero, ¿qué paso me toca?"]) {
      expect(responderSinIA(p, perfil, analisis, ruta, a)).toBe(fraseAvance(a));
    }
  });

  it("sin IA: frases parecidas que no son del avance siguen su camino", () => {
    for (const p of ["¿Me conviene un avance de efectivo?", "¿Qué pasó con mi sueldo?", "¿Cuánto me falta para pagar la tarjeta?"]) {
      expect(responderSinIA(p, perfil, analisis, ruta, a)).not.toBe(fraseAvance(a));
    }
  });
});
