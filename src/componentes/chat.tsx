"use client";
import { useEffect, useRef, useState } from "react";
import type { Analisis, Perfil } from "@/motor";
import type { CobroPendiente } from "@/motor/cobros";
import { describir, type Accion } from "@/agente/registro";
import { ErrorDatos } from "@/datos/validar";
import { TarjetaAnotado, type Nota } from "@/componentes/anotado";
import { conversar, type MensajeChat } from "@/cliente/agente";
import { desbloquearAudio } from "@/cliente/voz";
import { escuchar, puedeEscuchar, type Escucha, type ErrorEscucha } from "@/cliente/escucha";
import { estaActiva, type Fase } from "@/cliente/conversacion";
import { useManosLibres, type ResultadoEnvio } from "@/cliente/manos-libres";
import { ConversacionVoz } from "@/componentes/conversacion-voz";
import { boton, botonPrincipal, botonSecundario, Icono, desplazar, unido } from "@/componentes/ui";
import { ElegirArchivo, Fallo, Leyendo, Revision, useLecturaDisponible, useSubida, type Guardado } from "@/componentes/subida";
import { EXTRACCION_EJEMPLO } from "@/documentos/ejemplo";
import { AVISO_SIMULACION, preguntasSugeridas, type Avance, type Hechos, type Ruta } from "@/ruta/ruta";
import { borrarHistorial, guardarHistorial, leerHistorial } from "@/cliente/memoria";
type Burbuja = MensajeChat & {
  respaldo?: boolean;
  /** Lo que el asistente anotó con esta respuesta. */
  notas?: string[];
  /** Qué modelo respondió («Opus 5.5 · respuesta rápida»). Solo en esta sesión: no se guarda. */
  cerebro?: string;
};
/** Guarda en el panel lo que anotó el asistente y devuelve cómo deshacerlo. */
export type Anotar = (accion: Accion) => Promise<() => Promise<void>>;
const preguntas = [
  "¿Cómo llego a fin de mes?",
  "¿Me alcanza para gastar S/ 300?",
  "¿Qué deuda pago primero?",
  "¿Qué pasa si pago solo el mínimo?",
];
/** PDF inventado para probar la lectura de documentos (ninguna persona ni entidad es real). */
export const RUTA_PDF_EJEMPLO = "/ejemplos/situacion-financiera-ejemplo.pdf";
const cuantos = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
/**
 * Pregunta que se le hace al asistente después de guardar un documento. La redacta el código con los
 * conteos: nunca lleva texto leído del archivo, para que un documento no pueda darle órdenes al asistente.
 */
export function preguntaTrasGuardar({ deudas, cobros }: Guardado): string | null {
  const partes = [
    ...(deudas > 0 ? [cuantos(deudas, "deuda", "deudas")] : []),
    ...(cobros > 0 ? [cuantos(cobros, "cobro pendiente", "cobros pendientes")] : []),
  ];
  return partes.length ? `Subí un documento y guardé ${partes.join(" y ")}. ¿Qué cambia en mi plan?` : null;
}
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
  externo = demo,
  ruta,
  hechos,
  apertura,
  alCambiarExterno,
  leer,
  detener,
  sonando,
  cobros,
  alAnotar,
  avance,
  guardar = true,
}: {
  perfil: Perfil;
  analisis: Analisis;
  /** Caso de ejemplo (Andrea, inventada). Si no, es el caso que armó la persona. */
  demo?: boolean;
  /** IA, voz y dictado permitidos: siempre en el ejemplo; en un caso propio, solo si la persona aceptó. */
  externo?: boolean;
  /** Ruta que trazó el código: de ella salen las preguntas sugeridas y lo que el asistente puede recomendar. */
  ruta?: Ruta;
  hechos?: Hechos;
  /** Saludo inicial ya redactado por el código (con la ruta). */
  apertura?: string;
  /** Solo en un caso propio: la persona activa o desactiva IA y voz. */
  alCambiarExterno?: (activo: boolean) => void;
  leer: (t: string) => void;
  detener: () => void;
  sonando: boolean;
  /** Pagos que le deben a la persona: el asistente los cuenta y puede anotar nuevos. */
  cobros?: readonly CobroPendiente[];
  /** Guarda en el panel lo que el asistente anotó («me acaban de pagar 1.000»). Sin esto, solo se muestra. */
  alAnotar?: Anotar;
  /** Pasos de «Mi ruta» que la persona ya marcó: el asistente sigue desde el siguiente. */
  avance?: Avance;
  /** false en una pestaña de solo mirar (otra pestaña tiene la base): muestra lo guardado pero no lo pisa. */
  guardar?: boolean;
}) {
  // La conversación se guarda en este equipo (por caso) y se recupera al volver.
  const [mensajes, setMensajes] = useState<Burbuja[]>(() => leerHistorial(perfil.id)),
    [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false),
    [micro, setMicro] = useState(false),
    [escuchando, setEscuchando] = useState(false);
  const [error, setError] = useState(""),
    [voz, setVoz] = useState(externo),
    [pidiendo, setPidiendo] = useState(false);
  const [subiendo, setSubiendo] = useState(false),
    [porExplicar, setPorExplicar] = useState<string | null>(null);
  const [notas, setNotas] = useState<Record<string, Nota>>({});
  const subida = useSubida();
  const lectura = useLecturaDisponible(externo);
  const paso = subida.estado.paso;
  const vozRef = useRef(externo),
    vivo = useRef(false),
    bloqueo = useRef(false),
    controlador = useRef<AbortController | null>(null),
    escucha = useRef<Escucha | undefined>(undefined),
    faseRef = useRef<Fase>("apagado"),
    panel = useRef<HTMLElement>(null),
    fin = useRef<HTMLDivElement>(null);
  useEffect(() => {
    vivo.current = true;
    queueMicrotask(() => {
      if (vivo.current) setMicro(externo && puedeEscuchar());
    });
    return () => {
      vivo.current = false;
      controlador.current?.abort();
      escucha.current?.detener();
    };
  }, [externo]);
  useEffect(() => {
    // Al entrar solo está el saludo: no se desplaza, para que se vea el título y el interruptor de voz.
    if (mensajes.length > 1 || escuchando) desplazar(fin.current);
  }, [mensajes, escuchando]);
  useEffect(() => {
    // Guarda la conversación cuando termina cada respuesta (no en cada trozo que llega).
    if (ocupado || !guardar) return;
    guardarHistorial(perfil.id, mensajes.map(({ rol, texto, respaldo }) => ({ rol, texto, respaldo })));
  }, [perfil.id, mensajes, ocupado, guardar]);
  useEffect(() => {
    // Al abrir el panel o cambiar de paso (elegir, leyendo, revisar) se lleva a la vista su inicio.
    if (subiendo) desplazar(panel.current, "start");
  }, [subiendo, paso]);
  useEffect(() => {
    // Tras guardar un documento, el asistente explica qué cambió. Espera a estar libre y usa el perfil ya actualizado.
    if (!porExplicar || ocupado) return;
    queueMicrotask(() => {
      if (!vivo.current) return;
      setPorExplicar(null);
      void enviar(porExplicar);
    });
    // `enviar` se recrea en cada pintado; solo interesa reaccionar a la pregunta pendiente y a que quede libre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [porExplicar, ocupado]);
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
  function fijarNota(id: string, nota: Nota) {
    if (vivo.current) setNotas(actual => ({ ...actual, [id]: nota }));
  }
  async function guardarNota(id: string, accion: Accion) {
    if (!alAnotar) return fijarNota(id, { estado: "error", accion, mensaje: "En esta vista no se puede guardar." });
    try {
      const deshacer = await alAnotar(accion);
      fijarNota(id, { estado: "listo", accion, deshacer });
    } catch (e) {
      const mensaje = e instanceof ErrorDatos ? e.message : "Inténtalo otra vez o agrégalo desde Mi dinero.";
      fijarNota(id, { estado: "error", accion, mensaje });
    }
  }
  async function deshacerNota(id: string) {
    const nota = notas[id];
    if (nota?.estado !== "listo") return;
    fijarNota(id, { estado: "deshaciendo", accion: nota.accion });
    try {
      await nota.deshacer();
      fijarNota(id, { estado: "deshecho", accion: nota.accion });
    } catch {
      fijarNota(id, nota);
      setError("No pude deshacerlo. Inténtalo otra vez.");
    }
  }
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
    // El asistente se entera de lo que la persona deshizo con el botón o de lo que no se pudo guardar
    // (va al inicio porque los mensajes largos se recortan por el final).
    const conLoDeshecho = (lista: Burbuja[]): Burbuja[] =>
      lista.map(m => {
        const avisos = (m.notas ?? []).flatMap(id => {
          const n = notas[id];
          if (n?.estado === "deshecho") return [`[La persona lo deshizo con el botón; ya no está en su panel: ${describir(n.accion)}.]`];
          if (n?.estado === "error") return [`[No se pudo guardar en su panel: ${describir(n.accion)}.]`];
          return [];
        });
        return avisos.length ? { ...m, texto: `${avisos.join(" ")} ${m.texto}` } : m;
      });
    setMensajes([...historial, { rol: "asistente", texto: "" }]);
    const abortador = new AbortController();
    controlador.current = abortador;
    const deEsta: string[] = [];
    try {
      const respuesta = await conversar({
        perfil,
        analisis,
        mensajes: conLoDeshecho(historial),
        hechos,
        ruta,
        avance,
        consentimiento: !demo && externo,
        cobros,
        senal: abortador.signal,
        alAccion: accion => {
          if (!vivo.current || abortador.signal.aborted) return;
          const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
          deEsta.push(id);
          fijarNota(id, { estado: "guardando", accion });
          setMensajes(actual => actual.map((m, i) => (i === actual.length - 1 ? { ...m, notas: [...deEsta] } : m)));
          void guardarNota(id, accion);
        },
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
        { rol: "asistente", texto: respuesta.texto, respaldo: respuesta.origen === "respaldo", cerebro: respuesta.cerebro, notas: deEsta.length ? [...deEsta] : undefined },
      ]);
      // Si la conversación se cerró mientras pensaba, la respuesta queda escrita pero no se lee.
      if (vozRef.current && (!porVoz || faseRef.current === "pensando")) leer(respuesta.texto);
      return "ok";
    } catch {
      // No deja la burbuja «Pensando…» colgada: se queda lo que alcanzó a llegar, o nada.
      if (vivo.current) setMensajes(actual => (actual.at(-1)?.texto || actual.at(-1)?.notas?.length ? actual : actual.slice(0, -1)));
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
  function cerrarSubida() {
    subida.reiniciar();
    setSubiendo(false);
  }
  function alGuardarDocumento(guardado: Guardado) {
    cerrarSubida();
    setPorExplicar(preguntaTrasGuardar(guardado));
  }
  return (
    <section aria-labelledby="titulo-asistente" className="mx-auto max-w-3xl pb-44 xl:flex xl:min-h-[calc(100dvh-5rem)] xl:flex-col xl:pb-0">
      <h1 id="titulo-asistente" className="sr-only">Asistente</h1>
      {/* Saludo: firma del asistente y una sola burbuja; las opciones de IA y voz quedan discretas, a la derecha. */}
      <div className="aparecer flex items-start gap-3">
        <span className="relative mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-electrico text-white md:size-10" aria-hidden="true">
          <span className="flex items-end gap-[2.5px]">
            {[0, 1, 2, 3].map(i => (
              <span
                key={i}
                className={`w-[2.5px] rounded-full bg-white ${sonando || ocupado || escuchando ? "onda" : ""}`}
                style={{ height: `${[6, 12, 8, 10][i]}px`, animationDelay: `${i * 120}ms` }}
              />
            ))}
          </span>
          <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-papel ${externo ? "bg-verde-fuerte" : "bg-linea-fuerte"}`} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-semibold text-noche">
              Copiloto <span className="font-medium text-gris">· {externo ? "IA y voz activas" : "Sin IA: nada sale de este equipo"}</span>
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              {!demo && alCambiarExterno && !externo && (
                <button
                  className="inline-flex min-h-9 items-center rounded-full bg-electrico px-3 text-[13px] font-semibold text-white transition-transform duration-150 active:scale-[.97]"
                  aria-expanded={pidiendo}
                  onClick={() => setPidiendo(true)}
                >
                  Activar IA y voz
                </button>
              )}
              {externo && (
                <button
                  role="switch"
                  aria-checked={voz}
                  aria-label="Respuestas en voz alta"
                  title={voz ? "Respuestas en voz alta: activadas" : "Respuestas en voz alta: apagadas"}
                  className={`relative flex size-9 items-center justify-center rounded-full transition-colors duration-150 [&_svg]:size-[18px] ${voz ? "bg-agua-suave text-electrico" : "text-gris hover:bg-niebla"}`}
                  onClick={() => {
                    vozRef.current = !voz;
                    setVoz(!voz);
                    if (voz) detener();
                  }}
                >
                  <Icono nombre="voz" />
                  {!voz && <span aria-hidden="true" className="absolute h-5 w-[2px] rotate-45 rounded-full bg-current" />}
                </button>
              )}
            </div>
          </div>
          <div className="mt-1.5 rounded-2xl rounded-tl-md bg-white px-4 py-3.5 text-[15px] leading-relaxed text-tinta shadow-[0_1px_2px_rgb(7_33_70/0.06),0_8px_24px_-16px_rgb(7_33_70/0.25)] ring-1 ring-linea md:px-5 md:py-4 md:text-base">
            <p>{apertura ?? `Hola, ${perfil.nombre}. Te ayudo a entender tu plata y a decidir con tiempo. ¿Qué quieres saber?`}</p>
            <p className="mt-2.5 flex items-center gap-1.5 border-t border-linea pt-2.5 text-xs text-gris">
              <span aria-hidden="true" className="text-verde-fuerte [&_svg]:size-3.5"><Icono nombre="check" /></span>
              Las cifras las calcula el copiloto; la IA solo las explica.
            </p>
          </div>
          <details className="group mt-1.5 text-xs leading-snug text-gris">
            <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1 font-medium text-gris hover:text-noche [&::-webkit-details-marker]:hidden">
              Privacidad y datos
              <span aria-hidden="true" className="transition-transform duration-150 group-open:rotate-180 [&_svg]:size-3.5"><Icono nombre="abajo" /></span>
            </summary>
            <div className="mt-1 space-y-1.5 rounded-xl bg-niebla px-3 py-2.5">
              {externo && (
                <p>
                  {demo ? "El caso de Andrea es inventado. Sus cifras y tu pregunta" : "Tu caso de simulación y tus preguntas"} viajan a servicios externos de IA y de voz (Anthropic, Fish Audio y el dictado del navegador): no escribas ni digas datos personales.
                </p>
              )}
              <p>{AVISO_SIMULACION}</p>
              {!demo && alCambiarExterno && externo && (
                <button
                  className="min-h-9 font-semibold text-electrico underline underline-offset-2"
                  onClick={() => {
                    detener();
                    manos.desactivar();
                    vozRef.current = false;
                    setVoz(false);
                    alCambiarExterno(false);
                  }}
                >
                  Desactivar IA y voz
                </button>
              )}
            </div>
          </details>
        </div>
      </div>
      {pidiendo && !externo && alCambiarExterno && (
        <div role="group" aria-label="Activar IA y voz" className="aparecer mt-3 rounded-2xl border border-electrico/30 bg-agua-suave/50 p-4 md:ml-[52px]">
          <p className="font-semibold text-noche">¿Activar el asistente de IA y la voz?</p>
          <p className="mt-1 text-sm leading-relaxed text-gris">
            Si aceptas, este caso de simulación y tus preguntas se envían a servicios externos de IA y de voz para poder responderte. No pongas datos reales. Puedes desactivarlo cuando quieras.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className={botonPrincipal}
              onClick={() => {
                desbloquearAudio();
                vozRef.current = true;
                setVoz(true);
                setPidiendo(false);
                alCambiarExterno(true);
              }}
            >
              Sí, activar
            </button>
            <button className={botonSecundario} onClick={() => setPidiendo(false)}>
              Ahora no
            </button>
          </div>
        </div>
      )}
      {!mensajes.length && (
        <div className="-mx-4 my-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:my-4 md:ml-[52px] md:flex-wrap md:overflow-visible md:px-0">
          {(ruta ? preguntasSugeridas(ruta) : preguntas).map((p, i) => (
            <button
              key={p}
              onClick={() => void enviar(p)}
              style={{ animationDelay: `${120 + i * 70}ms` }}
              className="aparecer inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full border border-linea bg-white px-3.5 text-[13px] font-medium text-noche transition-[transform,border-color,background-color] duration-150 hover:border-electrico/40 hover:bg-agua-suave/50 active:scale-[.97] md:whitespace-normal md:px-4 md:text-sm"
            >
              {unido(p)}
            </button>
          ))}
        </div>
      )}
      {mensajes.length > 0 && !ocupado && (
        <div className="mt-4 flex items-center justify-between gap-3 text-[13px] text-gris">
          <p>{guardar ? "Conversación guardada en este equipo." : "En esta pestaña la conversación no se guarda."}</p>
          {guardar && (
            <button
              type="button"
              className="min-h-11 shrink-0 rounded-full px-3 font-semibold text-electrico hover:bg-agua-suave"
              onClick={() => {
                if (!window.confirm("¿Borrar toda la conversación con el asistente? Tus datos y tu ruta no cambian.")) return;
                borrarHistorial(perfil.id);
                setMensajes([]);
                setNotas({});
              }}
            >
              Borrar conversación
            </button>
          )}
        </div>
      )}
      <div role="log" aria-live="polite" aria-relevant="additions text" className="mt-5 space-y-4">
        {mensajes.map((m, i) => (
          <div key={i} className={`max-w-[92%] ${m.rol === "usuario" ? "ml-auto" : "mr-auto"}`}>
            <p
              className={`aparecer whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-[15px] leading-relaxed md:text-base ${m.rol === "usuario" ? "rounded-tr-md bg-electrico text-white" : "rounded-tl-md bg-white text-tinta ring-1 ring-linea"}`}
            >
              {m.texto || "Pensando…"}
            </p>
            {m.notas?.map(id => notas[id] && <TarjetaAnotado key={id} nota={notas[id]} alDeshacer={() => void deshacerNota(id)} />)}
            {m.respaldo && <p className="mt-2 px-2 text-xs text-gris">Respuesta del motor, sin IA</p>}
            {m.cerebro && <p className="mt-2 px-2 text-xs text-gris">Respondió {m.cerebro}</p>}
          </div>
        ))}
      </div>
      {subiendo && (
        <section ref={panel} id="panel-subida" aria-labelledby="subir-documento" className="aparecer mt-5 scroll-mt-24 rounded-2xl border border-linea bg-white p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 id="subir-documento" className="text-lg font-semibold text-noche">
              {paso !== "revisar" ? "Subir un documento" : subida.estado.ejemplo ? "Reporte de ejemplo, ya leído" : "Esto encontré"}
            </h2>
            <button type="button" aria-label="Cerrar la subida de documentos" onClick={cerrarSubida} className="flex size-11 shrink-0 items-center justify-center rounded-full text-gris hover:bg-niebla [&_svg]:size-5">
              <Icono nombre="cerrar" />
            </button>
          </div>
          {paso === "inicio" && (
            <>
              <p className="mt-1 leading-relaxed text-gris">
                Sube un reporte de deudas o un resumen de tu situación financiera. Te muestro lo que trae, tú corriges y decides qué guardar, y con eso actualizo tu plan.
              </p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-noche">
                Solo documentos inventados: este es un prototipo de simulación y no debe recibir datos reales de ninguna persona.
              </p>
              {lectura && <ElegirArchivo id="archivo-chat" alElegir={(archivo, inventado) => void subida.elegir(archivo, inventado)} />}
              {!externo && <p className="mt-3 text-sm leading-relaxed text-gris">Para leer un archivo con IA, primero activa IA y voz arriba. Mientras tanto puedes usar el reporte de ejemplo: no envía nada fuera de este equipo.</p>}
              {externo && !lectura && <p className="mt-3 text-sm leading-relaxed text-gris">La lectura de archivos con IA está apagada en este prototipo. Puedes usar el reporte de ejemplo, que ya viene leído.</p>}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => subida.precargada(EXTRACCION_EJEMPLO)} className={lectura ? botonSecundario : botonPrincipal}>
                  Usar reporte de ejemplo
                </button>
                {lectura && (
                  <a href={RUTA_PDF_EJEMPLO} download className="text-sm font-semibold text-electrico underline underline-offset-4">
                    Descargar un PDF inventado para probar
                  </a>
                )}
              </div>
            </>
          )}
          {subida.estado.paso === "analizando" && <Leyendo nombre={subida.estado.nombre} alCancelar={subida.reiniciar} />}
          {subida.estado.paso === "revisar" && (
            <Revision ext={subida.estado.ext} ejemplo={subida.estado.ejemplo} alGuardar={alGuardarDocumento} alDescartar={subida.reiniciar} />
          )}
          {subida.error && <Fallo texto={subida.error} />}
        </section>
      )}
      <div ref={fin} className="scroll-mb-72 xl:scroll-mb-24" />
      <div className="fixed inset-x-0 bottom-[calc(4rem+1px+env(safe-area-inset-bottom))] z-20 mx-auto max-w-md border-t border-linea/70 bg-papel/80 px-4 pb-3 pt-3 backdrop-blur-2xl backdrop-saturate-150 xl:backdrop-blur-none md:bottom-0 md:left-[232px] md:max-w-3xl md:px-8 md:pb-6 xl:sticky xl:inset-x-auto xl:left-auto xl:mx-0 xl:mt-auto xl:max-w-none xl:border-t-0 xl:bg-linear-to-t xl:from-papel xl:via-papel/95 xl:to-papel/0 xl:px-0 xl:pt-6">
        {externo && (
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
        {externo && sonando && !conversando && (
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
          <button
            type="button"
            aria-label="Subir un documento"
            aria-expanded={subiendo}
            aria-controls={subiendo ? "panel-subida" : undefined}
            disabled={ocupado}
            onClick={() => (subiendo ? cerrarSubida() : setSubiendo(true))}
            className={`flex size-12 shrink-0 items-center justify-center rounded-full ring-1 transition-transform duration-100 active:scale-95 disabled:opacity-40 [&_svg]:size-5 ${subiendo ? "bg-agua-suave text-electrico ring-electrico" : "bg-white text-electrico ring-linea-fuerte"}`}
          >
            <Icono nombre="subir" />
          </button>
          <label className="sr-only" htmlFor="pregunta">
            Tu pregunta
          </label>
          <input
            id="pregunta"
            maxLength={300}
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Tu pregunta…"
            className="min-h-12 min-w-0 flex-1 rounded-full bg-white px-4 ring-1 md:px-5 ring-linea-fuerte focus:ring-2 focus:ring-electrico"
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
    </section>
  );
}
