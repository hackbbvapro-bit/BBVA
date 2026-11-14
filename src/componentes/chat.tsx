"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Analisis, Perfil } from "@/motor";
import { conversar, type MensajeChat } from "@/cliente/agente";
import { desbloquearAudio } from "@/cliente/voz";
import { escuchar, puedeEscuchar, type Escucha, type ErrorEscucha } from "@/cliente/escucha";
import { estaActiva, type Fase } from "@/cliente/conversacion";
import { useManosLibres, type ResultadoEnvio } from "@/cliente/manos-libres";
import { ConversacionVoz } from "@/componentes/conversacion-voz";
import { boton, Icono, desplazar, unido } from "@/componentes/ui";
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
  demo = true,
  leer,
  detener,
  sonando,
  lateral,
}: {
  perfil: Perfil;
  analisis: Analisis;
  /** Caso de ejemplo (Rosa). En el caso de práctica no hay voz, dictado ni IA externa: nada sale del equipo. */
  demo?: boolean;
  leer: (t: string) => void;
  detener: () => void;
  sonando: boolean;
  /** Panel de la derecha en pantallas anchas (≥1280 px). */
  lateral?: ReactNode;
}) {
  const [mensajes, setMensajes] = useState<Burbuja[]>([]),
    [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false),
    [micro, setMicro] = useState(false),
    [escuchando, setEscuchando] = useState(false);
  const [error, setError] = useState(""),
    [voz, setVoz] = useState(demo);
  const vozRef = useRef(demo),
    vivo = useRef(false),
    bloqueo = useRef(false),
    controlador = useRef<AbortController | null>(null),
    escucha = useRef<Escucha | undefined>(undefined),
    faseRef = useRef<Fase>("apagado"),
    fin = useRef<HTMLDivElement>(null);
  useEffect(() => {
    vivo.current = true;
    queueMicrotask(() => {
      if (vivo.current) setMicro(demo && puedeEscuchar());
    });
    return () => {
      vivo.current = false;
      controlador.current?.abort();
      escucha.current?.detener();
    };
  }, [demo]);
  useEffect(() => {
    // Al entrar solo está el saludo: no se desplaza, para que se vea el título y el interruptor de voz.
    if (mensajes.length > 1 || escuchando) desplazar(fin.current);
  }, [mensajes, escuchando]);
  const manos = useManosLibres({
    enviar: t => enviar(t, true),
    detener,
    sonando,
    hayVoz: () => vozRef.current,
  });
  const fase = manos.estado.fase;
  useEffect(() => {
    faseRef.current = fase;
  }, [fase]);
  const conversando = estaActiva(manos.estado);
  async function enviar(pregunta: string, porVoz = false): Promise<ResultadoEnvio> {
    const limpio = pregunta.trim().slice(0, 300);
    if (!limpio || bloqueo.current || !vivo.current) return "omitido";
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
      if (!vivo.current || abortador.signal.aborted) return "omitido";
      setMensajes([
        ...historial,
        { rol: "asistente", texto: respuesta.texto, respaldo: respuesta.origen === "respaldo" },
      ]);
      // Si la conversación se cerró mientras pensaba, la respuesta queda escrita pero no se lee.
      if (vozRef.current && (!porVoz || faseRef.current === "pensando")) leer(respuesta.texto);
      return "ok";
    } catch {
      if (vivo.current && !abortador.signal.aborted) setError("No pude responder. Inténtalo otra vez.");
      return "error";
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
    <section className="pb-44 xl:grid xl:grid-cols-12 xl:items-start xl:gap-x-8 xl:pb-0">
      <div className="xl:col-span-7 xl:flex xl:min-h-[calc(100dvh-5rem)] xl:flex-col">
      <header className="aparecer mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-electrico text-white">
            <span className={`flex items-end gap-1 ${sonando ? "" : "opacity-90"}`} aria-hidden="true">
              {[0, 1, 2, 3].map(i => (
                <span
                  key={i}
                  className={`w-1 rounded-full bg-white ${sonando || ocupado || escuchando ? "onda" : ""}`}
                  style={{ height: `${[10, 20, 14, 18][i]}px`, animationDelay: `${i * 120}ms` }}
                />
              ))}
            </span>
          </span>
          <div className="min-w-0">
            <h1 className="text-[1.625rem] font-semibold leading-tight tracking-[-0.02em] text-noche md:text-[1.875rem]">Asistente</h1>
            <p className="mt-1 text-[15px] leading-relaxed text-gris">
              {demo
                ? "Pregunta por escrito o por voz. Las cifras las calcula el copiloto; la IA solo las explica."
                : "En el caso de práctica el copiloto no usa voz ni IA externa: todo se calcula en este equipo."}
            </p>
            {demo && (
              <p className="mt-1 text-[13px] leading-snug text-gris">
                El caso de Rosa es inventado. Sus cifras y tu pregunta viajan a servicios externos de IA y de voz (Anthropic, Fish Audio y el dictado del navegador): no escribas ni digas datos personales.
              </p>
            )}
          </div>
        </div>
        {demo && (
        <div className="flex shrink-0 items-center gap-2">
          <button
            role="switch"
            aria-checked={voz}
            className={`${boton} flex items-center gap-2 rounded-full border text-sm ${voz ? "border-electrico bg-agua-suave text-electrico" : "border-linea-fuerte bg-white text-gris"}`}
            onClick={() => {
              vozRef.current = !voz;
              setVoz(!voz);
              if (voz) detener();
            }}
          >
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${voz ? "bg-electrico" : "bg-linea-fuerte"}`}
            />
            Voz {voz ? "sí" : "no"}
          </button>
        </div>
        )}
      </header>
      <div className="aparecer flex items-start gap-3">
        <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-xl bg-agua-suave text-electrico [&_svg]:size-5" aria-hidden="true">
          <Icono nombre="asistente" />
        </span>
        <div className="rounded-2xl rounded-tl-md border border-linea bg-white p-4 leading-relaxed">
          Hola, {perfil.nombre}. Te ayudo a entender tu plata y a decidir con tiempo. ¿Qué quieres saber?
        </div>
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
              className={`whitespace-pre-wrap break-words rounded-3xl aparecer p-4 leading-relaxed ${m.rol === "usuario" ? "rounded-tr-md bg-agua-suave text-tinta" : "rounded-tl-md border border-linea bg-white"}`}
            >
              {m.texto || "Pensando…"}
            </p>
            {m.respaldo && <p className="mt-2 px-2 text-xs text-gris">Respuesta del motor, sin IA</p>}
          </div>
        ))}
      </div>
      <div ref={fin} className="scroll-mb-72 xl:scroll-mb-24" />
      <div className="fixed inset-x-0 bottom-[calc(4rem+1px+env(safe-area-inset-bottom))] z-20 mx-auto max-w-md border-t border-linea bg-papel px-4 pb-3 pt-3 md:bottom-0 md:left-[232px] md:max-w-3xl md:px-8 md:pb-6 xl:sticky xl:inset-x-auto xl:left-auto xl:mx-0 xl:mt-auto xl:max-w-none xl:border-t-0 xl:bg-linear-to-t xl:from-papel xl:via-papel/95 xl:to-papel/0 xl:px-0 xl:pt-6">
        {demo && (
        <ConversacionVoz
          estado={manos.estado}
          soporte={manos.soporte}
          parcial={manos.parcial}
          bloqueado={ocupado || escuchando}
          alActivar={() => {
            desbloquearAudio();
            detener();
            setError("");
            manos.activar();
          }}
          alTerminar={manos.desactivar}
          alInterrumpir={manos.interrumpir}
        />
        )}
        {demo && sonando && !conversando && (
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
            className="min-h-12 min-w-0 flex-1 rounded-full bg-white px-5 ring-1 ring-linea-fuerte focus:ring-2 focus:ring-electrico"
            disabled={ocupado}
          />
          <button
            type="submit"
            aria-label="Enviar pregunta"
            disabled={ocupado || escuchando || !texto.trim()}
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-electrico text-white transition-transform duration-100 active:scale-95 disabled:opacity-40"
          >
            <Icono nombre="enviar" />
          </button>
          {micro && (
            <button
              type="button"
              aria-label={escuchando ? "Terminar de escuchar" : "Dictar una pregunta"}
              aria-pressed={escuchando}
              disabled={ocupado || conversando}
              onClick={dictar}
              className={`flex size-14 shrink-0 items-center justify-center rounded-full disabled:opacity-40 ${escuchando ? "motion-safe:animate-pulse bg-coral-suave text-coral-fuerte" : "bg-agua-suave text-agua-fuerte"}`}
            >
              <Icono nombre="micro" />
            </button>
          )}
        </form>
      </div>
      </div>
      {lateral && <aside className="mt-6 xl:sticky xl:top-8 xl:col-span-5 xl:mt-0" aria-label="Lo que sabe el copiloto">{lateral}</aside>}
    </section>
  );
}
