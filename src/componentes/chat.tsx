"use client";
import { useEffect, useRef, useState } from "react";
import type { Analisis, Perfil } from "@/motor";
import { conversar, type MensajeChat } from "@/cliente/agente";
import { desbloquearAudio } from "@/cliente/voz";
import { escuchar, puedeEscuchar, type Escucha, type ErrorEscucha } from "@/cliente/escucha";
import { boton, Icono, desplazar } from "@/componentes/ui";
type Burbuja = MensajeChat & { respaldo?: boolean };
const preguntas = [
  "¿Cómo llego a fin de mes?",
  "¿Me alcanza para gastar S/ 300?",
  "¿Qué deuda pago primero?",
  "¿Qué pasa si pago solo el mínimo?",
];
const errores: Record<ErrorEscucha, string> = {
  sin_permiso: "Activa el micrófono en los ajustes del navegador",
  sin_voz: "No te escuché. Inténtalo otra vez",
  fallo: "No pude escucharte. Toca de nuevo o escribe",
  no_soportado: "",
};
export function Chat({
  perfil,
  analisis,
  leer,
  detener,
  sonando,
}: {
  perfil: Perfil;
  analisis: Analisis;
  leer: (t: string) => void;
  detener: () => void;
  sonando: boolean;
}) {
  const [mensajes, setMensajes] = useState<Burbuja[]>([]),
    [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false),
    [micro, setMicro] = useState(false),
    [escuchando, setEscuchando] = useState(false);
  const [error, setError] = useState(""),
    [voz, setVoz] = useState(true);
  const vozRef = useRef(true),
    vivo = useRef(false),
    bloqueo = useRef(false),
    controlador = useRef<AbortController | null>(null),
    escucha = useRef<Escucha | undefined>(undefined),
    fin = useRef<HTMLDivElement>(null);
  useEffect(() => {
    vivo.current = true;
    queueMicrotask(() => {
      if (vivo.current) setMicro(puedeEscuchar());
    });
    return () => {
      vivo.current = false;
      controlador.current?.abort();
      escucha.current?.detener();
    };
  }, []);
  useEffect(() => {
    // Al entrar solo está el saludo: no se desplaza, para que se vea el título y el interruptor de voz.
    if (mensajes.length > 1 || escuchando) desplazar(fin.current);
  }, [mensajes, escuchando]);
  async function enviar(pregunta: string) {
    const limpio = pregunta.trim().slice(0, 300);
    if (!limpio || bloqueo.current || !vivo.current) return;
    desbloquearAudio();
    detener();
    bloqueo.current = true;
    setOcupado(true);
    setTexto("");
    setError("");
    const historial: Burbuja[] = [...mensajes, { rol: "usuario", texto: limpio }];
    setMensajes([...historial, { rol: "asistente", texto: "" }]);
    const abortador = new AbortController();
    controlador.current = abortador;
    try {
      const respuesta = await conversar({
        perfil,
        analisis,
        mensajes: historial,
        senal: abortador.signal,
        alTexto: trozo => {
          if (!vivo.current || abortador.signal.aborted) return;
          setMensajes(actual =>
            actual.map((m, i) => (i === actual.length - 1 ? { ...m, texto: m.texto + trozo } : m)),
          );
        },
      });
      if (!vivo.current || abortador.signal.aborted) return;
      setMensajes([
        ...historial,
        { rol: "asistente", texto: respuesta.texto, respaldo: respuesta.origen === "respaldo" },
      ]);
      if (vozRef.current) leer(respuesta.texto);
    } catch {
      if (vivo.current && !abortador.signal.aborted) setError("No pude responder. Inténtalo otra vez.");
    } finally {
      if (vivo.current) {
        bloqueo.current = false;
        setOcupado(false);
      }
    }
  }
  function dictar() {
    desbloquearAudio();
    detener();
    if (escuchando) {
      escucha.current?.detener();
      return;
    }
    setError("");
    setEscuchando(true);
    escucha.current = escuchar({
      alParcial: t => {
        if (vivo.current) setTexto(t.slice(0, 300));
      },
      alFinal: t => {
        if (vivo.current) void enviar(t);
      },
      alTerminar: () => {
        if (vivo.current) setEscuchando(false);
      },
      alError: e => {
        if (!vivo.current) return;
        setEscuchando(false);
        setError(errores[e]);
        if (e === "no_soportado") setMicro(false);
      },
    });
  }
  return (
    <section className="pb-44">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Hablemos de tu plata</h1>
          <p className="mt-1 text-gris">Pregunta con confianza.</p>
        </div>
        <button
          role="switch"
          aria-checked={voz}
          className={`${boton} ${voz ? "bg-agua-suave text-agua-fuerte" : "bg-white border border-linea"}`}
          onClick={() => {
            vozRef.current = !voz;
            setVoz(!voz);
            if (voz) detener();
          }}
        >
          Voz {voz ? "sí" : "no"}
        </button>
      </div>
      <div className="rounded-3xl rounded-tl-md border border-linea bg-white p-5 leading-relaxed">
        Hola, {perfil.nombre}. Te ayudo a entender tu plata y a decidir con tiempo. ¿Qué quieres saber?
      </div>
      {!mensajes.length && (
        <div className="my-5 flex flex-wrap gap-2">
          {preguntas.map(p => (
            <button
              key={p}
              onClick={() => void enviar(p)}
              className={`${boton} border border-linea bg-white text-left font-medium`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
      <div role="log" aria-live="polite" aria-relevant="additions text" className="mt-5 space-y-4">
        {mensajes.map((m, i) => (
          <div key={i} className={`max-w-[92%] ${m.rol === "usuario" ? "ml-auto" : "mr-auto"}`}>
            <p
              className={`whitespace-pre-wrap break-words rounded-3xl p-4 leading-relaxed ${m.rol === "usuario" ? "rounded-tr-md bg-tinta text-white" : "rounded-tl-md border border-linea bg-white"}`}
            >
              {m.texto || "Pensando…"}
            </p>
            {m.respaldo && <p className="mt-2 px-2 text-xs text-gris">Respuesta del motor, sin IA</p>}
          </div>
        ))}
      </div>
      <div ref={fin} className="scroll-mb-72" />
      <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-md border-t border-linea bg-papel px-4 pb-3 pt-3">
        {sonando && (
          <button className={`${boton} mb-2 bg-agua-suave text-agua-fuerte`} onClick={detener}>
            Detener voz
          </button>
        )}
        {error && (
          <p role="alert" className="mb-2 text-sm text-coral-fuerte">
            {error}
          </p>
        )}
        {escuchando && (
          <p className="mb-2 text-sm text-agua-fuerte" role="status">
            Escuchando… toca de nuevo para terminar.
          </p>
        )}
        <form
          className="flex items-center gap-2"
          onSubmit={e => {
            e.preventDefault();
            void enviar(texto);
          }}
        >
          <label className="sr-only" htmlFor="pregunta">
            Tu pregunta
          </label>
          <input
            id="pregunta"
            maxLength={300}
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Escribe tu pregunta…"
            className="min-h-12 min-w-0 flex-1 rounded-2xl border border-linea bg-white px-3"
            disabled={ocupado}
          />
          <button
            type="submit"
            aria-label="Enviar pregunta"
            disabled={ocupado || escuchando || !texto.trim()}
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-tinta text-white disabled:opacity-40"
          >
            <Icono nombre="enviar" />
          </button>
          {micro && (
            <button
              type="button"
              aria-label={escuchando ? "Terminar de escuchar" : "Hablar con el micrófono"}
              aria-pressed={escuchando}
              disabled={ocupado}
              onClick={dictar}
              className={`flex size-14 shrink-0 items-center justify-center rounded-full disabled:opacity-40 ${escuchando ? "motion-safe:animate-pulse bg-coral-suave text-coral-fuerte" : "bg-agua-suave text-agua-fuerte"}`}
            >
              <Icono nombre="micro" />
            </button>
          )}
        </form>
      </div>
    </section>
  );
}
