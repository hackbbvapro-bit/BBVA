"use client";
/**
 * Hook de la conversación «manos libres». Une la máquina de estados (conversacion.ts)
 * con el micrófono del navegador. Aquí viven los temporizadores y el micrófono;
 * todo se libera al desactivar o desmontar.
 */
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { crearDictado, puedeConversar } from "@/cliente/escucha";
import { ESTADO_INICIAL, reducir, type EstadoConversacion } from "@/cliente/conversacion";

/** Silencio que cuenta como «terminó de hablar». */
export const SILENCIO_FIN_MS = 1800;
/** Si la voz nunca llega a sonar, no nos quedamos esperando. */
const ESPERA_VOZ_MS = 2500;

export type Soporte = "desconocido" | "si" | "no";
export type ResultadoEnvio = "ok" | "error" | "omitido";

export interface OpcionesManosLibres {
  /** Envía la pregunta por el mismo camino que el chat de texto. */
  enviar: (texto: string) => Promise<ResultadoEnvio>;
  /** Detiene la voz del copiloto. */
  detener: () => void;
  /** true mientras el copiloto está hablando (viene de la app). */
  sonando: boolean;
  /** ¿La voz del copiloto está encendida? Si no, no hay nada que esperar tras responder. */
  hayVoz: () => boolean;
}

export interface ManosLibres {
  estado: EstadoConversacion;
  soporte: Soporte;
  /** Texto provisional mientras la persona habla. */
  parcial: string;
  activar: () => void;
  desactivar: () => void;
  interrumpir: () => void;
}

const MENSAJE_PERMISO = "Activa el micrófono en los ajustes del navegador para hablar con el copiloto.";

export function useManosLibres(opciones: OpcionesManosLibres): ManosLibres {
  const [estado, despachar] = useReducer(reducir, ESTADO_INICIAL);
  const [soporte, setSoporte] = useState<Soporte>("desconocido");
  const [parcial, setParcial] = useState("");
  const [ciclo, setCiclo] = useState(0);
  const ultimas = useRef(opciones);
  const vivo = useRef(false);
  const vistoSonando = useRef(false);
  useEffect(() => {
    ultimas.current = opciones;
  });
  useEffect(() => {
    vivo.current = true;
    queueMicrotask(() => {
      if (vivo.current) setSoporte(puedeConversar() ? "si" : "no");
    });
    return () => {
      vivo.current = false;
    };
  }, []);

  // Micrófono: abierto solo mientras se escucha (semidúplex).
  const escuchando = estado.fase === "escuchando";
  useEffect(() => {
    if (!escuchando) return;
    const dictado = crearDictado();
    if (!dictado) {
      queueMicrotask(() =>
        despachar({ tipo: "fallo", mensaje: "Este navegador no permite hablar con el copiloto. Escribe tu pregunta." }),
      );
      return;
    }
    let cerrado = false;
    let texto = "";
    let reloj: ReturnType<typeof setTimeout> | undefined;
    const cerrar = () => {
      cerrado = true;
      if (reloj) clearTimeout(reloj);
      dictado.onresult = dictado.onerror = dictado.onend = null;
      try {
        dictado.abort();
      } catch {
        /* ya estaba detenido */
      }
    };
    const terminarFrase = () => {
      if (cerrado) return;
      const dicho = texto.trim();
      cerrar();
      setParcial("");
      if (!dicho) return;
      despachar({ tipo: "hablaUsuario", texto: dicho });
      void ultimas.current.enviar(dicho).then(resultado => {
        if (!vivo.current) return;
        if (resultado === "ok") {
          despachar({ tipo: "respuestaLista" });
          if (!ultimas.current.hayVoz()) despachar({ tipo: "finVoz" });
        } else if (resultado === "error") {
          despachar({ tipo: "fallo", mensaje: "No pude responderte. Toca el botón para intentarlo otra vez." });
        } else {
          despachar({ tipo: "fallo", mensaje: "Estoy respondiendo otra pregunta. Inténtalo de nuevo en un momento." });
        }
      });
    };
    dictado.lang = "es-PE";
    dictado.interimResults = true;
    dictado.continuous = true;
    dictado.maxAlternatives = 1;
    dictado.onresult = evento => {
      texto = Array.from(evento.results)
        .map(r => r[0].transcript)
        .join(" ")
        .trim();
      setParcial(texto.slice(0, 300));
      if (reloj) clearTimeout(reloj);
      reloj = setTimeout(terminarFrase, SILENCIO_FIN_MS);
    };
    dictado.onerror = evento => {
      if (cerrado || evento.error === "no-speech" || evento.error === "aborted") return;
      cerrar();
      const sinPermiso = evento.error === "not-allowed" || evento.error === "service-not-allowed";
      despachar({
        tipo: "fallo",
        mensaje: sinPermiso ? MENSAJE_PERMISO : "No pude escucharte. Toca el botón para intentarlo otra vez o escribe.",
      });
    };
    dictado.onend = () => {
      if (cerrado) return;
      if (texto.trim()) return terminarFrase();
      // El navegador cortó por silencio: se vuelve a abrir el micrófono.
      cerrar();
      despachar({ tipo: "silencio" });
      setCiclo(c => c + 1);
    };
    try {
      dictado.start();
    } catch {
      cerrar();
      queueMicrotask(() =>
        despachar({ tipo: "fallo", mensaje: "No pude abrir el micrófono. Toca el botón para intentarlo otra vez." }),
      );
    }
    return () => {
      if (!cerrado) cerrar();
      setParcial("");
    };
  }, [escuchando, ciclo]);

  // Cuando el copiloto termina de hablar, vuelve a escuchar.
  const hablando = estado.fase === "hablando";
  const { sonando } = opciones;
  useEffect(() => {
    if (!hablando) {
      vistoSonando.current = false;
      return;
    }
    if (sonando) {
      vistoSonando.current = true;
      return;
    }
    if (vistoSonando.current) {
      despachar({ tipo: "finVoz" });
      return;
    }
    const reloj = setTimeout(() => despachar({ tipo: "finVoz" }), ESPERA_VOZ_MS);
    return () => clearTimeout(reloj);
  }, [hablando, sonando]);

  // Al apagar o salir por error, la voz también se calla.
  const encendida = estado.fase !== "apagado" && estado.fase !== "error";
  useEffect(() => {
    if (!encendida) return;
    return () => ultimas.current.detener();
  }, [encendida]);

  const activar = useCallback(() => despachar({ tipo: "activar" }), []);
  const desactivar = useCallback(() => despachar({ tipo: "desactivar" }), []);
  const interrumpir = useCallback(() => {
    ultimas.current.detener();
    despachar({ tipo: "interrumpir" });
  }, []);

  return { estado, soporte, parcial, activar, desactivar, interrumpir };
}
