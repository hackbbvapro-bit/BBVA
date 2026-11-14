"use client";
import { useEffect, useRef, useState } from "react";
import type { Analisis, Perfil } from "@/motor";
import { conversar, type MensajeChat } from "@/cliente/agente";
import { desbloquearAudio } from "@/cliente/voz";
import { escuchar, puedeEscuchar, type Escucha, type ErrorEscucha } from "@/cliente/escucha";
import { boton, Icono, desplazar, Portada, unido } from "@/componentes/ui";
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
      <Portada>
        <div className="flex items-start justify-between gap-3">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-agua to-[#3d7bff] text-noche shadow-[0_0_32px_rgb(20_200_180/.5)]">
            <span className={`flex items-end gap-1 ${sonando ? "" : "opacity-90"}`} aria-hidden="true">
              {[0, 1, 2, 3].map(i => (
                <span
                  key={i}
                  className={`w-1 rounded-full bg-noche ${sonando || ocupado || escuchando ? "onda" : ""}`}
                  style={{ height: `${[10, 20, 14, 18][i]}px`, animationDelay: `${i * 120}ms` }}
                />
              ))}
            </span>
          </span>
          <button
            role="switch"
            aria-checked={voz}
            className={`${boton} vidrio flex items-center gap-2 rounded-full text-sm ${voz ? "text-white" : "text-white/60"}`}
            onClick={() => {
              vozRef.current = !voz;
              setVoz(!voz);
              if (voz) detener();
            }}
          >
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${voz ? "punto-vivo bg-agua text-agua" : "bg-white/40"}`}
            />
            Voz {voz ? "sí" : "no"}
          </button>
        </div>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-balance">Hablemos de tu plata</h1>
        <p className="mt-2 text-white/70">
          Pregunta con confianza. Las cifras las calcula el copiloto; la IA solo te las explica.
        </p>
      </Portada>
      <div className="aparecer rounded-3xl rounded-tl-md bg-white p-5 leading-relaxed ring-1 ring-linea/80 shadow-[0_12px_32px_-16px_rgb(11_22_38/.18)]">
        Hola, {perfil.nombre}. Te ayudo a entender tu plata y a decidir con tiempo. ¿Qué quieres saber?
      </div>
      {!mensajes.length && (
        <div className="my-5 flex flex-wrap gap-2">
          {preguntas.map((p, i) => (
            <button
              key={p}
              onClick={() => void enviar(p)}
              style={{ animationDelay: `${120 + i * 70}ms` }}
              className={`${boton} aparecer rounded-full border border-agua/40 bg-agua-suave/60 text-left text-sm font-semibold text-agua-fuerte`}
            >
              {unido(p)}
            </button>
          ))}
        </div>
      )}
      <div role="log" aria-live="polite" aria-relevant="additions text" className="mt-5 space-y-4">
        {mensajes.map((m, i) => (
          <div key={i} className={`max-w-[92%] ${m.rol === "usuario" ? "ml-auto" : "mr-auto"}`}>
            <p
              className={`whitespace-pre-wrap break-words rounded-3xl aparecer p-4 leading-relaxed ${m.rol === "usuario" ? "rounded-tr-md bg-tinta text-white" : "rounded-tl-md bg-white ring-1 ring-linea/80 shadow-[0_12px_32px_-16px_rgb(11_22_38/.18)]"}`}
            >
              {m.texto || "Pensando…"}
            </p>
            {m.respaldo && <p className="mt-2 px-2 text-xs text-gris">Respuesta del motor, sin IA</p>}
          </div>
        ))}
      </div>
      <div ref={fin} className="scroll-mb-72" />
      <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-md bg-linear-to-t from-papel via-papel/95 to-papel/0 px-4 pb-3 pt-6">
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
            className="min-h-12 min-w-0 flex-1 rounded-full bg-white px-5 ring-1 ring-linea shadow-[0_8px_24px_-12px_rgb(11_22_38/.25)] focus:ring-2 focus:ring-agua"
            disabled={ocupado}
          />
          <button
            type="submit"
            aria-label="Enviar pregunta"
            disabled={ocupado || escuchando || !texto.trim()}
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-agua text-noche shadow-[0_0_20px_rgb(20_200_180/.45)] transition-transform active:scale-95 disabled:opacity-40 disabled:shadow-none"
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
