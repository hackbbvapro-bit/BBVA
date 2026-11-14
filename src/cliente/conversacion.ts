/**
 * Máquina de estados de la conversación por voz «manos libres».
 * Es pura (sin DOM ni temporizadores): el hook se encarga del micrófono y los tiempos.
 * Semidúplex: mientras el copiloto habla NO se escucha, para que no se oiga a sí mismo.
 */
export type Fase = "apagado" | "escuchando" | "pensando" | "hablando" | "error";

export interface EstadoConversacion {
  fase: Fase;
  /** Solo en `error`: qué pasó, en español. */
  mensaje: string;
}

export type EventoConversacion =
  | { tipo: "activar" }
  | { tipo: "desactivar" }
  | { tipo: "hablaUsuario"; texto: string }
  | { tipo: "silencio" }
  | { tipo: "respuestaLista" }
  | { tipo: "finVoz" }
  | { tipo: "interrumpir" }
  | { tipo: "fallo"; mensaje: string };

export const ESTADO_INICIAL: EstadoConversacion = { fase: "apagado", mensaje: "" };

const en = (fase: Fase, mensaje = ""): EstadoConversacion => ({ fase, mensaje });

export function reducir(estado: EstadoConversacion, evento: EventoConversacion): EstadoConversacion {
  const { fase } = estado;
  switch (evento.tipo) {
    case "activar":
      return fase === "apagado" || fase === "error" ? en("escuchando") : estado;
    case "desactivar":
      return fase === "apagado" ? estado : en("apagado");
    case "fallo":
      return fase === "apagado" ? estado : en("error", evento.mensaje || "No pude seguir la conversación.");
    case "hablaUsuario":
      // Solo se atiende mientras se escucha y si hay palabras de verdad.
      return fase === "escuchando" && evento.texto.trim() ? en("pensando") : estado;
    case "respuestaLista":
      return fase === "pensando" ? en("hablando") : estado;
    case "finVoz":
      return fase === "hablando" ? en("escuchando") : estado;
    case "interrumpir":
      return fase === "hablando" ? en("escuchando") : estado;
    case "silencio":
    default:
      return estado; // seguir escuchando: el hook reinicia el micrófono
  }
}

/** ¿Debe estar abierto el micrófono? Solo al escuchar (nunca mientras habla el copiloto). */
export const debeEscuchar = (estado: EstadoConversacion): boolean => estado.fase === "escuchando";

/** ¿Está la conversación en marcha (hay que mostrar «Terminar»)? */
export const estaActiva = (estado: EstadoConversacion): boolean =>
  estado.fase !== "apagado" && estado.fase !== "error";

export function textoEstado(fase: Fase): string {
  switch (fase) {
    case "escuchando":
      return "Te escucho…";
    case "pensando":
      return "Pensando…";
    case "hablando":
      return "Hablando… toca para interrumpir";
    default:
      return "";
  }
}
