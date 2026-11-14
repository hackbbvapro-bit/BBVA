/** El agente con IA simulada: solo la respuesta final llega a la persona, nunca las notas previas a una consulta. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PERFILES } from "../datos/perfiles";
import { analizar } from "../motor";

type Bloque = { type: "text"; text: string } | { type: "tool_use"; id: string; name: string; input: object };
interface Vuelta {
  bloques: Bloque[];
  stop_reason: "end_turn" | "tool_use" | "max_tokens" | "refusal";
}

let vueltas: Vuelta[] = [];

/** Una vuelta del modelo como flujo: los trozos de texto llegan como text_delta y al final el mensaje entero. */
function flujoDe(vuelta: Vuelta) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const b of vuelta.bloques) {
        if (b.type !== "text") continue;
        for (const trozo of b.text.match(/[\s\S]{1,8}/g) ?? []) {
          yield { type: "content_block_delta", delta: { type: "text_delta", text: trozo } };
        }
      }
    },
    finalMessage: async () => ({ content: vuelta.bloques, stop_reason: vuelta.stop_reason }),
  };
}

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    beta = {
      messages: {
        toolRunner: () => ({
          async *[Symbol.asyncIterator]() {
            for (const v of vueltas) yield flujoDe(v);
          },
        }),
      },
    };
  },
}));

const { responder } = await import("./conversar");

const perfil = PERFILES[0];
const analisis = analizar(perfil);
const consulta: Bloque = { type: "tool_use", id: "t1", name: "resumen", input: {} };

async function textoDe(): Promise<{ texto: string; origen?: string }> {
  let texto = "";
  let origen: string | undefined;
  for await (const e of responder({ perfil, analisis, mensajes: [{ rol: "usuario", texto: "¿Qué pago primero?" }] })) {
    if (e.tipo === "texto") texto += e.texto;
    else origen = e.origen;
  }
  return { texto, origen };
}

beforeEach(() => vi.stubEnv("ANTHROPIC_API_KEY", "clave-falsa-de-prueba"));
afterEach(() => {
  vi.unstubAllEnvs();
  vueltas = [];
});

describe("agente con IA", () => {
  it("descarta las notas que el modelo escribe antes de consultar al motor", async () => {
    vueltas = [
      { bloques: [{ type: "text", text: "Need both deudas and resumen." }, consulta], stop_reason: "tool_use" },
      { bloques: [{ type: "text", text: "Rosa, primero paga la Tarjeta Azul." }], stop_reason: "end_turn" },
    ];
    const { texto, origen } = await textoDe();
    expect(texto).toBe("Rosa, primero paga la Tarjeta Azul.");
    expect(texto).not.toContain("Need");
    expect(origen).toBe("ia");
  });

  it("si el modelo solo consulta y nunca responde, contesta el motor sin IA", async () => {
    vueltas = [{ bloques: [{ type: "text", text: "Checking." }, consulta], stop_reason: "tool_use" }];
    const { texto, origen } = await textoDe();
    expect(texto).not.toContain("Checking");
    expect(origen).toBe("respaldo");
  });

  it("si el modelo se niega, no muestra nada suyo y responde el motor", async () => {
    vueltas = [{ bloques: [{ type: "text", text: "No puedo con" }], stop_reason: "refusal" }];
    const { texto, origen } = await textoDe();
    expect(texto).not.toContain("No puedo con");
    expect(origen).toBe("respaldo");
  });
});
