/**
 * Conversación con el agente. Si hay clave de IA, el modelo explica usando las herramientas del motor;
 * si no la hay o algo falla antes de decir nada, responde el propio motor (mismos números, sin IA).
 */
import Anthropic from "@anthropic-ai/sdk";
import { responderSinIA } from "../explica/explica";
import type { Analisis, Perfil } from "../motor";
import { claveAnthropic, modeloAnthropic } from "../servidor/entorno";
import { registrarFallo } from "../servidor/registro";
import { crearHerramientas } from "./herramientas";
import { promptSistema } from "./prompt";

export interface MensajeEntrada {
  rol: "usuario" | "asistente";
  texto: string;
}

export type EventoAgente = { tipo: "texto"; texto: string } | { tipo: "fin"; origen: "ia" | "respaldo" };

export interface EntradaAgente {
  perfil: Perfil;
  analisis: Analisis;
  mensajes: readonly MensajeEntrada[];
  senal?: AbortSignal;
}

const MAXIMO_DE_VUELTAS = 6;
const MAXIMO_DE_TOKENS = 2048;
const ESPERA_MS = 45_000;

/** Quita mensajes vacíos y los del asistente que queden al principio: la conversación debe abrirla la persona. */
export function limpiarMensajes(mensajes: readonly MensajeEntrada[]): MensajeEntrada[] {
  const conTexto = mensajes.map(m => ({ rol: m.rol, texto: m.texto.trim() })).filter(m => m.texto.length > 0);
  const primero = conTexto.findIndex(m => m.rol === "usuario");
  return primero === -1 ? [] : conTexto.slice(primero);
}

/** La última pregunta de la persona, o undefined si la conversación no termina en un mensaje suyo. */
export function ultimaPregunta(mensajes: readonly MensajeEntrada[]): string | undefined {
  const ultimo = limpiarMensajes(mensajes).at(-1);
  return ultimo?.rol === "usuario" ? ultimo.texto : undefined;
}

async function* conIA(clave: string, entrada: EntradaAgente): AsyncGenerator<string> {
  const cliente = new Anthropic({ apiKey: clave, maxRetries: 1, timeout: ESPERA_MS });
  const runner = cliente.beta.messages.toolRunner(
    {
      model: modeloAnthropic(),
      max_tokens: MAXIMO_DE_TOKENS,
      system: promptSistema(entrada.perfil, entrada.analisis),
      tools: crearHerramientas(entrada.perfil, entrada.analisis),
      messages: limpiarMensajes(entrada.mensajes).map(m => ({
        role: m.rol === "usuario" ? ("user" as const) : ("assistant" as const),
        content: m.texto,
      })),
      output_config: { effort: "low" },
      max_iterations: MAXIMO_DE_VUELTAS,
      stream: true,
    },
    { signal: entrada.senal },
  );
  let huboTexto = false;
  for await (const flujo of runner) {
    // El texto de cada vuelta se retiene: si la vuelta termina consultando al motor, ese texto son notas
    // de trabajo del modelo (a veces en inglés) y nunca llega a la persona. Solo se muestra la respuesta.
    const trozos: string[] = [];
    for await (const evento of flujo) {
      if (evento.type === "content_block_delta" && evento.delta.type === "text_delta") trozos.push(evento.delta.text);
    }
    const mensaje = await flujo.finalMessage();
    if (mensaje.stop_reason === "refusal") return;
    const consulta = mensaje.content.some(b => b.type === "tool_use");
    if (mensaje.stop_reason === "max_tokens" && consulta) {
      throw new Error("La respuesta se cortó antes de terminar una consulta al motor");
    }
    if (consulta) continue;
    const texto = trozos.join("").trim();
    if (!texto) continue;
    yield huboTexto ? `\n\n${texto}` : texto;
    huboTexto = true;
  }
}

export async function* responder(entrada: EntradaAgente): AsyncGenerator<EventoAgente> {
  const clave = claveAnthropic();
  if (clave) {
    let emitido = false;
    try {
      for await (const trozo of conIA(clave, entrada)) {
        emitido = true;
        yield { tipo: "texto", texto: trozo };
      }
    } catch (error) {
      if (entrada.senal?.aborted) return;
      registrarFallo("agente", error);
    }
    if (emitido) {
      yield { tipo: "fin", origen: "ia" };
      return;
    }
  }
  const pregunta = ultimaPregunta(entrada.mensajes) ?? "";
  yield { tipo: "texto", texto: responderSinIA(pregunta, entrada.perfil, entrada.analisis) };
  yield { tipo: "fin", origen: "respaldo" };
}
