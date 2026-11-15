import { limpiarCompetencia } from "../agente/competencia";
import type { Estilo } from "../agente/estilo";
/**
 * Conversación con el agente. Si la IA no responde (sin clave, sin red, error),
 * contesta el propio motor en el celular: la demo nunca se queda muda.
 */
import { salidasPermitidas } from "./salidas";
import { responderSinIA } from "../explica/explica";
import { EsquemaAccion, responderRegistro, type Accion } from "../agente/registro";
import type { Analisis, Perfil } from "../motor";
import type { CobroPendiente } from "../motor/cobros";
import type { Avance, Hechos, Ruta } from "../ruta/ruta";

export type Rol = "usuario" | "asistente";
export interface MensajeChat { rol: Rol; texto: string }
/**
 * "ia" = respondió el modelo · "motor" = el código anotó o calculó lo que la persona dijo (ingreso, gasto…)
 * · "respaldo" = respondió el motor porque la IA no estaba (en el servidor o en el celular).
 */
export type OrigenRespuesta = "ia" | "motor" | "respaldo";
export interface RespuestaAgente {
  texto: string;
  origen: OrigenRespuesta;
  acciones: Accion[];
  /** Qué modelo respondió y con cuánto esfuerzo («Fable 5.2 · análisis profundo»), si fue la IA. */
  cerebro?: string;
}

interface Peticion {
  estilo?: Estilo;
  perfil: Perfil;
  analisis: Analisis;
  /** Conversación completa; el último mensaje es la pregunta del usuario. */
  mensajes: MensajeChat[];
  /** Se llama con cada trozo de texto según llega. */
  alTexto?: (trozo: string) => void;
  senal?: AbortSignal;
  /** Hechos que el motor no puede deducir del perfil (si tuvo crédito, atraso máximo). El servidor traza la ruta con ellos. */
  hechos?: Hechos;
  /** En un caso propio: la persona aceptó enviar su simulación a la IA. Sin esto el servidor rechaza la petición. */
  consentimiento?: boolean;
  /** Ruta ya trazada en el equipo: solo se usa para responder sin IA; nunca se envía. */
  ruta?: Ruta;
  /** Pagos que le deben (se envían sin la nota, que puede ser personal). */
  cobros?: readonly CobroPendiente[];
  /** Cómo va la persona en «Mi ruta». Al servidor solo viajan los identificadores de los pasos marcados. */
  avance?: Avance;
  /** Se llama con cada cosa que el agente anotó («me acaban de pagar 1.000»): el navegador la guarda en su base. */
  alAccion?: (accion: Accion) => void;
}

const MAX_MENSAJES = 20;
const MAX_CARACTERES = 1000;

type Linea = { tipo: "texto"; texto: string } | { tipo: "accion"; accion: Accion } | { tipo: "fin"; origen: OrigenRespuesta; cerebro?: string };

function leerLinea(cruda: string): Linea | undefined {
  try {
    const dato: unknown = JSON.parse(cruda);
    if (typeof dato !== "object" || dato === null) return undefined;
    const { tipo, texto, origen, accion, cerebro } = dato as Record<string, unknown>;
    if (tipo === "texto" && typeof texto === "string") return { tipo, texto };
    if (tipo === "accion") {
      // Lo que se va a guardar se vuelve a validar aquí: nunca se guarda algo que no cumpla el esquema.
      const valida = EsquemaAccion.safeParse(accion);
      return valida.success ? { tipo, accion: valida.data } : undefined;
    }
    if (tipo === "fin" && (origen === "ia" || origen === "motor" || origen === "respaldo")) {
      return { tipo, origen, cerebro: typeof cerebro === "string" ? cerebro.slice(0, 60) : undefined };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function leerFlujo(
  respuesta: Response,
  alTexto: (trozo: string) => void,
  alAccion: (accion: Accion) => void,
): Promise<Omit<RespuestaAgente, "acciones">> {
  const lector = respuesta.body?.getReader();
  if (!lector) throw new Error("sin_cuerpo");
  const decodificador = new TextDecoder();
  let pendiente = "";
  let texto = "";
  let origen: OrigenRespuesta = "ia";
  let cerebro: string | undefined;
  const procesar = (cruda: string) => {
    const linea = cruda.trim() ? leerLinea(cruda) : undefined;
    if (linea?.tipo === "texto") { texto += linea.texto; alTexto(linea.texto); }
    if (linea?.tipo === "accion") alAccion(linea.accion);
    if (linea?.tipo === "fin") { origen = linea.origen; cerebro = linea.cerebro; }
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
  return { texto, origen, cerebro };
}

/** Sin IA: primero el registro («me acaban de pagar 1.000»), y si no es eso, la respuesta del motor. */
function responderLocal(
  mensajes: readonly MensajeChat[],
  { perfil, analisis, ruta, avance, cobros = [], alTexto, alAccion }: Peticion,
): RespuestaAgente {
  const registro = responderRegistro(mensajes, { perfil, cobros: cobros.filter(c => !c.cobrado) });
  if (registro) {
    if (registro.accion) alAccion?.(registro.accion);
    registro.texto = limpiarCompetencia(registro.texto).texto;
    alTexto?.(registro.texto);
    return { texto: registro.texto, origen: "motor", acciones: registro.accion ? [registro.accion] : [] };
  }
  const pregunta = [...mensajes].reverse().find(m => m.rol === "usuario")?.texto ?? "";
  const texto = limpiarCompetencia(responderSinIA(pregunta, perfil, analisis, ruta, avance)).texto;
  alTexto?.(texto);
  return { texto, origen: "respaldo", acciones: [] };
}

export async function conversar(peticion: Peticion): Promise<RespuestaAgente> {
  const { perfil, mensajes, alTexto, alAccion, senal, hechos, consentimiento, cobros, avance } = peticion;
  const recientes = mensajes.slice(-MAX_MENSAJES).map(m => ({ rol: m.rol, texto: m.texto.slice(0, MAX_CARACTERES) }));
  // Sin permiso para IA: nada sale del equipo; responde el motor local.
  if (!salidasPermitidas()) return responderLocal(mensajes, peticion);
  let recibido = "";
  const acciones: Accion[] = [];
  try {
    const respuesta = await fetch("/api/agente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        estilo: peticion.estilo ?? "directo",
        perfil,
        mensajes: recientes,
        hechos,
        avances: avance?.pasos.filter(p => p.hecho).map(p => p.id),
        consentimiento: consentimiento || undefined,
        cobros: cobros?.filter(c => !c.cobrado).slice(0, 50).map(({ id, quien, monto, fechaPrometida, cobrado }) => ({ id, quien, monto, fechaPrometida, cobrado })),
      }),
      signal: senal,
    });
    if (!respuesta.ok) throw new Error(`http_${respuesta.status}`);
    const resultado = await leerFlujo(
      respuesta,
      trozo => { recibido += trozo; alTexto?.(trozo); },
      accion => { acciones.push(accion); alAccion?.(accion); },
    );
    if (resultado.texto.trim()) return { ...resultado, acciones };
    throw new Error("respuesta_vacia");
  } catch (error) {
    if (senal?.aborted) throw error;
    if (recibido.trim()) return { texto: recibido, origen: "ia", acciones };
    // Si el servidor ya anotó algo, no se vuelve a anotar aquí (evita el doble registro).
    if (acciones.length) {
      const texto = "Lo anoté en tu panel.";
      alTexto?.(texto);
      return { texto, origen: "motor", acciones };
    }
    return responderLocal(mensajes, peticion);
  }
}
