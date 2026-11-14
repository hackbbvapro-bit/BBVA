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
        // Como el SDK: entre una vuelta y la siguiente corre las herramientas que el modelo pidió.
        toolRunner: (params: { tools: { name: string; run: (input: unknown) => unknown }[] }) => ({
          async *[Symbol.asyncIterator]() {
            for (const v of vueltas) {
              yield flujoDe(v);
              for (const b of v.bloques) {
                if (b.type === "tool_use") await params.tools.find(t => t.name === b.name)?.run(b.input);
              }
            }
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

async function textoDe(pregunta = "¿Qué pago primero?") {
  let texto = "";
  let origen: string | undefined;
  const tipos: string[] = [];
  const acciones: unknown[] = [];
  for await (const e of responder({ perfil, analisis, mensajes: [{ rol: "usuario", texto: pregunta }] })) {
    tipos.push(e.tipo);
    if (e.tipo === "texto") texto += e.texto;
    else if (e.tipo === "accion") acciones.push(e.accion);
    else origen = e.origen;
  }
  return { texto, origen, tipos, acciones };
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

  it("lo que el modelo anota sale como acción antes del texto que lo explica, una sola vez", async () => {
    const anotar: Bloque = {
      type: "tool_use", id: "t2", name: "anotar_ingreso",
      input: { monto: "mil quinientos", cuando: "ya_llego", descripcion: "Pago de un cliente", anotar: true },
    };
    vueltas = [
      { bloques: [anotar, { ...anotar, id: "t3" }], stop_reason: "tool_use" },
      { bloques: [{ type: "text", text: "Listo, lo anoté." }], stop_reason: "end_turn" },
    ];
    const { texto, origen, tipos, acciones } = await textoDe("Ojo: un cliente me depositó por un trabajo");
    expect(acciones).toEqual([{ tipo: "saldo", monto: 150_000, descripcion: "Ingreso: Pago de un cliente" }]);
    expect(tipos).toEqual(["accion", "texto", "fin"]);
    expect(texto).toBe("Listo, lo anoté.");
    expect(origen).toBe("ia");
  });

  it("si anota pero no llega a explicarlo, la frase del motor lo explica y no se pierde lo anotado", async () => {
    vueltas = [{
      bloques: [{ type: "tool_use", id: "t4", name: "anotar_gasto", input: { monto: "80", cuando: "ya_paso", descripcion: "Mercado", anotar: true } }],
      stop_reason: "tool_use",
    }];
    const { texto, origen, acciones } = await textoDe("Ojo: hice compras grandes hoy");
    expect(acciones).toHaveLength(1);
    expect(texto).toContain("S/ 80.00");
    expect(origen).toBe("ia");
  });

  it("si la persona cuenta un ingreso concreto, responde el motor sin llamar a la IA", async () => {
    vueltas = [{ bloques: [{ type: "text", text: "Esto no debería verse." }], stop_reason: "end_turn" }];
    const { texto, origen, acciones } = await textoDe("me acaban de pagar 1.000 soles");
    expect(acciones).toEqual([expect.objectContaining({ tipo: "saldo", monto: 100_000 })]);
    expect(texto).not.toContain("no debería");
    expect(origen).toBe("motor");
  });
});
