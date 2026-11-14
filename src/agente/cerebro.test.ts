import { afterEach, describe, expect, it, vi } from "vitest";
import { cerebroDeRespaldo, elegirCerebro, etiquetaCerebro, nivelDe, nombreModelo } from "./cerebro";

afterEach(() => vi.unstubAllEnvs());

describe("nivelDe: cuánto tiene que pensar el asistente", () => {
  it.each([
    "me encontré 1500 soles",
    "¿cuánto tengo?",
    "¿me alcanza para unas zapatillas de 200?",
    "y si gasto 300 el sábado",
    "pago 50 de internet cada 15",
    "¿cuánto pago del plan del celular?",
  ])("rápido: «%s»", frase => expect(nivelDe(frase)).toBe("rapido"));

  it.each([
    "¿por qué me sale negativo el 28?",
    "¿qué me recomiendas hacer con lo que me sobra?",
    "explícame qué es la TCEA",
  ])("pensado: «%s»", frase => expect(nivelDe(frase)).toBe("pensado"));

  it.each([
    "armame un plan para salir de deudas en 6 meses, ¿qué me conviene más?",
    "compara pagar primero la tarjeta o el préstamo y dime cuál me conviene",
    "quiero ahorrar para un viaje de 3000 en 8 meses ganando 2500 y pagando 900 de alquiler, ¿cómo lo organizo?",
  ])("profundo: «%s»", frase => expect(nivelDe(frase)).toBe("profundo"));
});

describe("elegirCerebro", () => {
  it("lo rápido va al modelo base con poco esfuerzo; lo profundo, al modelo más capaz", () => {
    expect(elegirCerebro("¿cuánto tengo?")).toMatchObject({ modelo: "claude-opus-5-5", esfuerzo: "low" });
    expect(elegirCerebro("¿por qué me sale negativo?")).toMatchObject({ modelo: "claude-opus-5-5", esfuerzo: "medium" });
    expect(elegirCerebro("armame un plan para salir de deudas en 6 meses")).toMatchObject({ modelo: "claude-fable-5-2", esfuerzo: "medium" });
  });

  it("los modelos se cambian por variables de entorno", () => {
    vi.stubEnv("ANTHROPIC_MODEL_PROFUNDO", "claude-opus-5-5");
    expect(elegirCerebro("armame un plan para salir de deudas en 6 meses").modelo).toBe("claude-opus-5-5");
  });

  it("si falla el profundo, responde el base pensando más; si falla el base, no hay otro intento", () => {
    const profundo = elegirCerebro("armame un plan para salir de deudas en 6 meses");
    expect(cerebroDeRespaldo(profundo)).toMatchObject({ modelo: "claude-opus-5-5", esfuerzo: "medium" });
    expect(cerebroDeRespaldo(elegirCerebro("¿cuánto tengo?"))).toBeUndefined();
  });
});

describe("etiquetas para la pantalla", () => {
  it("nombre legible del modelo", () => {
    expect(nombreModelo("claude-opus-5-5")).toBe("Opus 5.5");
    expect(nombreModelo("claude-fable-5-2")).toBe("Fable 5.2");
    expect(nombreModelo("otro-modelo")).toBe("otro-modelo");
  });

  it("modelo y nivel juntos", () => {
    expect(etiquetaCerebro(elegirCerebro("armame un plan para salir de deudas en 6 meses"))).toBe("Fable 5.2 · análisis profundo");
    expect(etiquetaCerebro(elegirCerebro("¿cuánto tengo?"))).toBe("Opus 5.5 · respuesta rápida");
  });
});
