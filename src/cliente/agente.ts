/**
 * Conversación con el agente. Si la IA no responde (sin clave, sin red, error),
 * contesta el propio motor en el celular: la demo nunca se queda muda.
 */
import { salidasPermitidas } from "./salidas";
import { responderSinIA } from "../explica/explica";
import type { Analisis, Perfil } from "../motor";

export type Rol = "usuario" | "asistente";
export interface MensajeChat { rol: Rol; texto: string }
/** "ia" = respondió el modelo · "respaldo" = respondió el motor (en el servidor o en el celular). */
export type OrigenRespuesta = "ia" | "respaldo";
export interface RespuestaAgente { texto: string; origen: OrigenRespuesta }

interface Peticion {
  perfil: Perfil;
  analisis: Analisis;
  /** Conversación completa; el último mensaje es la pregunta del usuario. */
  mensajes: MensajeChat[];
  /** Se llama con cada trozo de texto según llega. */
  alTexto?: (trozo: string) => void;
  senal?: AbortSignal;
}

const MAX_MENSAJES = 20;
const MAX_CARACTERES = 1000;

type Linea = { tipo: "texto"; texto: string } | { tipo: "fin"; origen: OrigenRespuesta };

function leerLinea(cruda: string): Linea | undefined {
  try {
    const dato: unknown = JSON.parse(cruda);
    if (typeof dato !== "object" || dato === null) return undefined;
    const { tipo, texto, origen } = dato as Record<string, unknown>;
    if (tipo === "texto" && typeof texto === "string") return { tipo, texto };
    if (tipo === "fin" && (origen === "ia" || origen === "respaldo")) return { tipo, origen };
    return undefined;
  } catch {
    return undefined;
  }
}

async function leerFlujo(respuesta: Response, alTexto?: (trozo: string) => void): Promise<RespuestaAgente> {
  const lector = respuesta.body?.getReader();
  if (!lector) throw new Error("sin_cuerpo");
  const decodificador = new TextDecoder();
  let pendiente = "";
  let texto = "";
  let origen: OrigenRespuesta = "ia";
  const procesar = (cruda: string) => {
    const linea = cruda.trim() ? leerLinea(cruda) : undefined;
    if (linea?.tipo === "texto") { texto += linea.texto; alTexto?.(linea.texto); }
    if (linea?.tipo === "fin") origen = linea.origen;
  };
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    pendiente += decodificador.decode(value, { stream: true });
    const lineas = pendiente.split("\n");
    pendiente = lineas.pop() ?? "";
    lineas.forEach(procesar);
  }
  procesar(pendiente);
  return { texto, origen };
}

export async function conversar({ perfil, analisis, mensajes, alTexto, senal }: Peticion): Promise<RespuestaAgente> {
  const recientes = mensajes.slice(-MAX_MENSAJES).map(m => ({ rol: m.rol, texto: m.texto.slice(0, MAX_CARACTERES) }));
  const pregunta = [...mensajes].reverse().find(m => m.rol === "usuario")?.texto ?? "";
  if (!salidasPermitidas()) {
    // Caso de práctica: nada sale del equipo; responde el motor local.
    const texto = responderSinIA(pregunta, perfil, analisis);
    alTexto?.(texto);
    return { texto, origen: "respaldo" };
  }
  let recibido = "";
  try {
    const respuesta = await fetch("/api/agente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ perfil, mensajes: recientes }),
      signal: senal,
    });
    if (!respuesta.ok) throw new Error(`http_${respuesta.status}`);
    const resultado = await leerFlujo(respuesta, trozo => { recibido += trozo; alTexto?.(trozo); });
    if (resultado.texto.trim()) return resultado;
    throw new Error("respuesta_vacia");
  } catch (error) {
    if (senal?.aborted) throw error;
    if (recibido.trim()) return { texto: recibido, origen: "ia" };
    const texto = responderSinIA(pregunta, perfil, analisis);
    alTexto?.(texto);
    return { texto, origen: "respaldo" };
  }
}
