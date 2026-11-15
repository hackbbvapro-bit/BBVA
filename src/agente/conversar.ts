import { preguntaSinIA, type Estilo } from "./estilo";
/**
 * Conversación con el agente. Primero mira si la persona cuenta algo para anotar («me acaban de pagar
 * 1.000»): eso lo resuelve el código, sin IA. Si no, y hay clave de IA, el modelo explica usando las
 * herramientas del motor (y puede anotar con ellas); si no la hay o algo falla antes de decir nada,
 * responde el propio motor (mismos números, sin IA).
 */
import Anthropic from "@anthropic-ai/sdk";
import { responderSinIA } from "../explica/explica";
import type { Analisis, Perfil } from "../motor";
import type { Avance, Hechos, Ruta } from "../ruta/ruta";
import { claveAnthropic } from "../servidor/entorno";
import { registrarFallo } from "../servidor/registro";
import type { CobroPendiente } from "../motor/cobros";
import { cerebroDeRespaldo, elegirCerebro, etiquetaCerebro, type Cerebro } from "./cerebro";
import { crearHerramientas } from "./herramientas";
import { responderRegistro, type Accion } from "./registro";
import { promptSistema } from "./prompt";

export interface MensajeEntrada {
  rol: "usuario" | "asistente";
  texto: string;
}

/** ia: respondió el modelo. motor: el código entendió algo para anotar. respaldo: el motor sin IA, para lo demás. */
export type OrigenAgente = "ia" | "motor" | "respaldo";

export type EventoAgente =
  | { tipo: "texto"; texto: string }
  /** Algo que la persona contó y debe quedar en su panel (lo guarda el navegador). */
  | { tipo: "accion"; accion: Accion }
  /** cerebro: qué modelo respondió y con cuánto esfuerzo («Opus 5.5 · respuesta rápida»), solo si fue la IA. */
  | { tipo: "fin"; origen: OrigenAgente; cerebro?: string };

export interface EntradaAgente {
  estilo?: Estilo;
  perfil: Perfil;
  analisis: Analisis;
  mensajes: readonly MensajeEntrada[];
  senal?: AbortSignal;
  /** Ruta trazada por el motor en el servidor; habilita la herramienta ver_ruta. */
  ruta?: Ruta;
  /** Pagos que le deben a la persona (aún no cobrados). */
  cobros?: readonly CobroPendiente[];
  /** Pasos de la ruta que la persona marcó como hechos, cruzados con la ruta del servidor. */
  avance?: Avance;
  /** Historial crediticio declarado: afina las señales con que el catálogo de BBVA cruza cada producto. */
  hechos?: Hechos;
}

const MAXIMO_DE_VUELTAS = 6;
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

type Salida = { tipo: "texto"; texto: string } | { tipo: "accion"; accion: Accion; texto: string };

/** Fable admite el respaldo del servidor: si rechaza por precaución, responde otro modelo en la misma llamada. */
const conRespaldoDelServidor = (modelo: string) => modelo.startsWith("claude-fable");

async function* conIA(clave: string, entrada: EntradaAgente, cerebro: Cerebro): AsyncGenerator<Salida> {
  const cliente = new Anthropic({ apiKey: clave, maxRetries: 1, timeout: ESPERA_MS });
  const anotadas: { accion: Accion; texto: string }[] = [];
  const runner = cliente.beta.messages.toolRunner(
    {
      model: cerebro.modelo,
      max_tokens: cerebro.maximoTokens,
      // Las instrucciones y las herramientas no cambian entre turnos: se guardan en caché y cada turno
      // siguiente las lee en vez de procesarlas de nuevo (más rápido y más barato).
      system: [
        {
          type: "text",
          text: promptSistema(entrada.perfil, entrada.analisis, entrada.ruta, entrada.estilo),
          cache_control: { type: "ephemeral" },
        },
      ],
      cache_control: { type: "ephemeral" },
      ...(conRespaldoDelServidor(cerebro.modelo)
        ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
        : {}),
      tools: crearHerramientas(entrada.perfil, entrada.analisis, entrada.ruta, {
        cobros: entrada.cobros,
        avance: entrada.avance,
        hechos: entrada.hechos,
        alAccion: (accion, texto) => anotadas.push({ accion, texto }),
      }),
      messages: limpiarMensajes(entrada.mensajes).map(m => ({
        role: m.rol === "usuario" ? ("user" as const) : ("assistant" as const),
        content: m.texto,
      })),
      output_config: { effort: cerebro.esfuerzo },
      max_iterations: MAXIMO_DE_VUELTAS,
      stream: true,
    },
    { signal: entrada.senal },
  );
  // Lo anotado sale en cuanto la herramienta corre (entre vueltas), antes que el texto que lo explica.
  function* anotado(): Generator<Salida> {
    for (const a of anotadas.splice(0)) yield { tipo: "accion", ...a };
  }
  let huboTexto = false;
  for await (const flujo of runner) {
    yield* anotado();
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
    yield { tipo: "texto", texto: huboTexto ? `\n\n${texto}` : texto };
    huboTexto = true;
  }
  yield* anotado();
}

export async function* responder(entrada: EntradaAgente): AsyncGenerator<EventoAgente> {
  const clave = claveAnthropic();
  // 1) ¿Cuenta algo para anotar? Lo entiende el código: rápido, sin IA y con los números del motor.
  const registro = responderRegistro(limpiarMensajes(entrada.mensajes), {
    perfil: entrada.perfil,
    cobros: (entrada.cobros ?? []).filter(c => !c.cobrado),
  });
  if (registro && !(registro.guia && clave)) {
    if (registro.accion) yield { tipo: "accion", accion: registro.accion };
    yield { tipo: "texto", texto: registro.texto };
    yield { tipo: "fin", origen: "motor" };
    return;
  }
  // 2) Con IA: el código elige el modelo según lo que pide (un dato, un consejo o un plan) y el modelo
  //    conversa y consulta (o anota) con las herramientas del motor.
  if (clave) {
    let huboTexto = false;
    let ultimaAnotada: string | undefined;
    let usado: Cerebro = elegirCerebro(ultimaPregunta(entrada.mensajes) ?? "");
    let cerebro: Cerebro | undefined = usado;
    while (cerebro) {
      usado = cerebro;
      let algoSalio = false;
      try {
        for await (const salida of conIA(clave, entrada, cerebro)) {
          algoSalio = true;
          if (salida.tipo === "accion") {
            ultimaAnotada = salida.texto;
            yield { tipo: "accion", accion: salida.accion };
          } else {
            huboTexto = true;
            yield salida;
          }
        }
        cerebro = undefined;
      } catch (error) {
        if (entrada.senal?.aborted) return;
        registrarFallo("agente", error);
        // Si el modelo profundo falla sin haber dicho ni anotado nada, responde el base pensando más.
        cerebro = algoSalio ? undefined : cerebroDeRespaldo(usado);
      }
    }
    // Si anotó algo pero no llegó a explicarlo, la frase del motor lo explica (y no se vuelve a anotar).
    if (!huboTexto && ultimaAnotada) {
      yield { tipo: "texto", texto: ultimaAnotada };
      huboTexto = true;
    }
    if (huboTexto) {
      yield { tipo: "fin", origen: "ia", cerebro: etiquetaCerebro(usado) };
      return;
    }
  }
  // 3) Sin IA (o falló antes de decir nada): el motor responde con sus propios textos.
  if (registro) {
    yield { tipo: "texto", texto: registro.texto };
    yield { tipo: "fin", origen: "motor" };
    return;
  }
  const { pregunta, estilo } = preguntaSinIA(limpiarMensajes(entrada.mensajes), entrada.estilo ?? "directo");
  yield { tipo: "texto", texto: responderSinIA(pregunta, entrada.perfil, entrada.analisis, entrada.ruta, entrada.avance, estilo) };
  yield { tipo: "fin", origen: "respaldo" };
}
