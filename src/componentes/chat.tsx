"use client";
import { useEffect, useRef, useState } from "react";
import { validarEstilo, type Estilo } from "@/agente/estilo";
import { formatoSoles } from "@/motor";
import type { Analisis, Perfil } from "@/motor";
import type { CobroPendiente } from "@/motor/cobros";
import { describir, type Accion } from "@/agente/registro";
import { ErrorDatos } from "@/datos/validar";
import { TarjetaAnotado, type Nota } from "@/componentes/anotado";
import { conversar, type MensajeChat } from "@/cliente/agente";
import { hablarEnVivo, callar, desbloquearAudio, type VozEnVivo } from "@/cliente/voz";
import { escuchar, puedeEscuchar, type Escucha, type ErrorEscucha } from "@/cliente/escucha";
import { estaActiva, type Fase } from "@/cliente/conversacion";
import { useManosLibres, type ResultadoEnvio } from "@/cliente/manos-libres";
import { ConversacionVoz } from "@/componentes/conversacion-voz";
import { boton, botonPrincipal, botonSecundario, Icono, desplazar, unido } from "@/componentes/ui";
import {
  ElegirArchivo,
  Fallo,
  Leyendo,
  Revision,
  useLecturaDisponible,
  useSubida,
  type Guardado,
} from "@/componentes/subida";
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
const PREGUNTAS_DE_DEUDAS = new Set(["¿Qué deuda pago primero?", "¿Qué pasa si pago solo el mínimo?"]);
/** Lista de respaldo (sin ruta): sin deudas no se sugiere nada sobre deudas. */
export function preguntasDeRespaldo(conDeudas: boolean): string[] {
  return conDeudas ? preguntas : preguntas.filter(p => !PREGUNTAS_DE_DEUDAS.has(p));
}
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
/** Preguntas sobre productos: se responden con los tipos genéricos de la ruta y qué preguntar en el banco, sin marcas. */
const preguntasDeProducto = [
  "¿Qué producto financiero me conviene?",
  "¿Qué pregunto en BBVA antes de contratar un producto?",
];
const ICONOS_SUGERENCIA = ["rumbo", "deudas", "tendencia", "dinero"] as const;
const AYUDA: readonly { icono: "hoy" | "deudas" | "dinero" | "manos"; texto: string }[] = [
  { icono: "hoy", texto: "Tu saldo día a día y si llegas a fin de mes" },
  { icono: "deudas", texto: "Qué deuda pagar primero y cuánto" },
  { icono: "dinero", texto: "Si te alcanza para un gasto antes de hacerlo" },
  { icono: "manos", texto: "Qué tipo de producto te conviene y qué preguntar en BBVA" },
];
/** «Te ayudo con»: sin deudas no se ofrece ayuda con deudas. */
export function ayudaVisible(conDeudas: boolean) {
  return conDeudas ? AYUDA : AYUDA.filter(a => a.icono !== "deudas");
}
/** Panel lateral (pantallas grandes): el caso en una mirada, en qué ayuda y cómo responde. Cifras del motor. */
function PanelLateral({ ruta, avance, conDeudas }: { ruta?: Ruta; avance?: Avance; conDeudas: boolean }) {
  const f = ruta?.flujo;
  return (
    <aside aria-label="Tu caso en una mirada" className="hidden xl:block">
      <div className="sticky top-8 space-y-4">
        {ruta && f && (
          <div className="rounded-2xl bg-white p-5 ring-1 ring-linea">
            <p className="text-xs font-semibold uppercase tracking-wide text-gris">Tu ruta</p>
            <p className="mt-1 text-base font-semibold leading-snug text-noche">{ruta.titulo}</p>
            <dl className="mt-4 space-y-2 text-sm">
              {[
                ["Te entra al mes", f.ingresos, "text-noche"],
                ["Gastos y cuotas al mes", f.gastos + f.cuotas, "text-noche"],
                [
                  f.libre >= 0 ? "Te queda al mes" : "Te falta al mes",
                  Math.abs(f.libre),
                  f.libre >= 0 ? "text-verde-fuerte" : "text-coral-fuerte",
                ],
              ].map(([t, m, c]) => (
                <div
                  key={t as string}
                  className="flex items-baseline justify-between gap-3 border-t border-linea pt-2 first:border-t-0 first:pt-0"
                >
                  <dt className="text-gris">{t}</dt>
                  <dd className={`font-semibold tabular-nums ${c}`}>{unido(formatoSoles(m as number))}</dd>
                </div>
              ))}
            </dl>
            {avance?.siguiente && (
              <div className="mt-4 rounded-xl bg-agua-suave/60 px-3 py-2.5">
                <p className="text-xs font-semibold text-agua-fuerte">Tu siguiente paso</p>
                <p className="mt-0.5 text-[13px] leading-snug text-noche">{avance.siguiente}</p>
              </div>
            )}
          </div>
        )}
        <div className="rounded-2xl bg-white p-5 ring-1 ring-linea">
          <p className="text-xs font-semibold uppercase tracking-wide text-gris">Te ayudo con</p>
          <ul className="mt-3 space-y-3">
            {ayudaVisible(conDeudas).map(a => (
              <li key={a.texto} className="flex items-start gap-3 text-sm leading-snug text-noche">
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-niebla text-electrico [&_svg]:size-4"
                >
                  <Icono nombre={a.icono} />
                </span>
                <span className="pt-1.5">{a.texto}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-niebla p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gris">Cómo respondo</p>
          <ul className="mt-3 space-y-2 text-[13px] leading-snug text-tinta">
            {[
              "Cada monto y cada fecha los calcula el código del copiloto.",
              "Te oriento con productos BBVA, sin tasas inventadas.",
              "La decisión de aprobar un producto es siempre de BBVA.",
            ].map(t => (
              <li key={t} className="flex items-start gap-2">
                <span aria-hidden="true" className="mt-0.5 text-verde-fuerte [&_svg]:size-3.5">
                  <Icono nombre="check" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
export function Chat({
  perfil,
  analisis,
  demo = true,
  externo = demo,
  ruta,
  hechos,
  apertura,
  alCambiarExterno,
  detener: detenerExterior,
  sonando: sonandoExterior,
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
  const [estilo, setEstilo] = useState<Estilo>("directo");
  const [vozEnCurso, setVozEnCurso] = useState(false);
  const sesionVoz = useRef<VozEnVivo | null>(null);
  const silenciado = useRef(false);
  const sonando = sonandoExterior || vozEnCurso;
  function detener() {
    silenciado.current = true;
    callar(); sesionVoz.current = null; setVozEnCurso(false); detenerExterior();
  }
  useEffect(() => {
    let preferido: Estilo = "directo";
    try { preferido = validarEstilo(localStorage.getItem("bbva-estilo")); } catch { /* directo */ }
    queueMicrotask(() => setEstilo(preferido));
  }, []);
  function cambiarEstilo(valor: Estilo) {
    try { localStorage.setItem("bbva-estilo", valor); setEstilo(valor); }
    catch { setEstilo("directo"); }
  }
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
      callar();
    };
  }, [externo]);
  useEffect(() => {
    // Al entrar solo está el saludo: no se desplaza, para que se vea el título y el interruptor de voz.
    if (mensajes.length > 1 || escuchando) desplazar(fin.current);
  }, [mensajes, escuchando]);
  useEffect(() => {
    // Guarda la conversación cuando termina cada respuesta (no en cada trozo que llega).
    if (ocupado || !guardar) return;
    guardarHistorial(
      perfil.id,
      mensajes.map(({ rol, texto, respaldo }) => ({ rol, texto, respaldo })),
    );
  }, [perfil.id, mensajes, ocupado, guardar]);
  useEffect(() => {
    // Al abrir el panel o cambiar de paso (elegir, leyendo, revisar) se lleva a la vista su inicio.
    if (subiendo) desplazar(panel.current, "start");
  }, [subiendo, paso]);
  function fijarNota(id: string, nota: Nota) {
    if (vivo.current) setNotas(actual => ({ ...actual, [id]: nota }));
  }
  async function guardarNota(id: string, accion: Accion) {
    if (!alAnotar)
      return fijarNota(id, { estado: "error", accion, mensaje: "En esta vista no se puede guardar." });
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
  async function enviar(pregunta: string, porVoz = false, estiloPeticion?: Estilo): Promise<ResultadoEnvio> {
    const limpio = pregunta.trim().slice(0, 300);
    if (!limpio || bloqueo.current || !vivo.current) return "omitido";
    desbloquearAudio();
    detener();
    silenciado.current = false;
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
          if (n?.estado === "deshecho")
            return [`[La persona lo deshizo con el botón; ya no está en su panel: ${describir(n.accion)}.]`];
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
        estilo: estiloPeticion ?? estilo,
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
          setMensajes(actual =>
            actual.map((m, i) => (i === actual.length - 1 ? { ...m, notas: [...deEsta] } : m)),
          );
          void guardarNota(id, accion);
        },
        alTexto: trozo => {
          if (!vivo.current || abortador.signal.aborted) return;
          if (!silenciado.current && vozRef.current && (!porVoz || faseRef.current === "pensando")) {
            if (!sesionVoz.current) {
              setVozEnCurso(true);
              const apagar = () => { if (vivo.current) setVozEnCurso(false); };
              // Si otra voz la corta (botón «Escuchar», nueva lectura), el indicador también se apaga.
              sesionVoz.current = hablarEnVivo(apagar, apagar);
            }
            sesionVoz.current.agregar(trozo);
          }
          setMensajes(actual =>
            actual.map((m, i) => (i === actual.length - 1 ? { ...m, texto: m.texto + trozo } : m)),
          );
        },
      });
      if (!vivo.current || abortador.signal.aborted) return "omitido";
      setMensajes([
        ...historial,
        {
          rol: "asistente",
          texto: respuesta.texto,
          respaldo: respuesta.origen === "respaldo",
          cerebro: respuesta.cerebro,
          notas: deEsta.length ? [...deEsta] : undefined,
        },
      ]);
      // Si la conversación se cerró mientras pensaba, la respuesta queda escrita pero no se lee.
      sesionVoz.current?.terminar();
      return "ok";
    } catch {
      // No deja la burbuja «Pensando…» colgada: se queda lo que alcanzó a llegar, o nada.
      if (vivo.current)
        setMensajes(actual =>
          actual.at(-1)?.texto || actual.at(-1)?.notas?.length ? actual : actual.slice(0, -1),
        );
      if (vivo.current && !abortador.signal.aborted) setError("No pude responder. Inténtalo otra vez.");
      return "error";
    } finally {
      sesionVoz.current?.terminar();
      if (vivo.current) {
        bloqueo.current = false;
        setOcupado(false);
      }
    }
  }
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
  const sugerencias = [
    ...(ruta ? preguntasSugeridas(ruta) : preguntasDeRespaldo(perfil.deudas.length > 0)).map((p, i) => ({
      p,
      icono: ICONOS_SUGERENCIA[i % 4],
      tema: "Tu plata",
    })),
    ...preguntasDeProducto.map(p => ({ p, icono: "manos" as const, tema: "Productos" })),
  ];
  // Tras cada respuesta: 2-3 preguntas de seguimiento (las mismas sugerencias, sin repetir las que ya hizo).
  const yaPreguntadas = new Set(mensajes.filter(m => m.rol === "usuario").map(m => m.texto));
  const seguimiento = sugerencias.map(x => x.p).filter(p => !yaPreguntadas.has(p)).slice(0, 3);
  return (
    <section
      aria-labelledby="titulo-asistente"
      className="mx-auto max-w-3xl pb-44 xl:grid xl:max-w-6xl xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-8 xl:pb-0"
    >
      <div className="xl:flex xl:min-h-[calc(100dvh-5rem)] xl:flex-col">
        {/* Cabecera: quién responde y cómo; la voz se apaga desde aquí. */}
        <header className="aparecer flex flex-wrap items-center gap-3 border-b border-linea pb-4">
          <span
            className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-electrico text-white shadow-[0_6px_16px_-8px_rgb(7_33_70/0.6)]"
            aria-hidden="true"
          >
            <span className="flex items-end gap-[2.5px]">
              {[0, 1, 2, 3].map(i => (
                <span
                  key={i}
                  className={`w-[2.5px] rounded-full bg-white ${sonando || ocupado || escuchando ? "onda" : ""}`}
                  style={{ height: `${[6, 12, 8, 10][i]}px`, animationDelay: `${i * 120}ms` }}
                />
              ))}
            </span>
            <span
              className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-papel ${externo ? "bg-verde-fuerte" : "bg-linea-fuerte"}`}
            />
          </span>
          <div className="min-w-0 flex-1">
            <h1 id="titulo-asistente" className="text-lg font-semibold leading-tight text-noche md:text-xl">
              Asistente
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-gris">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${externo ? "bg-verde-suave text-verde-fuerte" : "bg-niebla text-gris"}`}
              >
                <span
                  aria-hidden="true"
                  className={`size-1.5 rounded-full ${externo ? "bg-verde-fuerte" : "bg-linea-fuerte"}`}
                />
                {externo ? "IA y voz activas" : "Sin IA: nada sale de este equipo"}
              </span>
              <span className="hidden sm:inline">Copiloto de tu plata · caso de simulación</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {!demo && alCambiarExterno && !externo && (
              <button
                className="inline-flex min-h-11 items-center rounded-full bg-electrico px-4 text-[13px] font-semibold text-white transition-transform duration-150 active:scale-[.97]"
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
                className={`relative flex size-11 items-center justify-center rounded-full ring-1 transition-colors duration-150 [&_svg]:size-[18px] ${voz ? "bg-agua-suave text-electrico ring-electrico/20" : "text-gris ring-linea hover:bg-niebla"}`}
                onClick={() => {
                  vozRef.current = !voz;
                  setVoz(!voz);
                  if (voz) detener();
                }}
              >
                <Icono nombre="voz" />
                {!voz && (
                  <span
                    aria-hidden="true"
                    className="absolute h-5 w-[2px] rotate-45 rounded-full bg-current"
                  />
                )}
              </button>
            )}
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
          <span className="shrink-0 text-xs font-semibold text-gris">Respuestas:</span>
          <div role="group" aria-label="Estilo de respuesta" className="flex flex-1 gap-1 rounded-full bg-niebla p-1 sm:flex-none">
            {(["directo", "explicado"] as const).map(valor => (
              <button key={valor} type="button" aria-pressed={estilo === valor}
                onClick={() => cambiarEstilo(valor)}
                className={`min-h-11 flex-1 whitespace-nowrap rounded-full px-4 text-sm font-semibold ${estilo === valor ? "bg-electrico text-white shadow-sm" : "text-gris"}`}>
                {valor === "directo" ? "Directo" : "Explicado"}
              </button>
            ))}
          </div>
          </div>
        </header>
        {pidiendo && !externo && alCambiarExterno && (
          <div
            role="group"
            aria-label="Activar IA y voz"
            className="aparecer mt-4 rounded-2xl border border-electrico/30 bg-agua-suave/50 p-4"
          >
            <p className="font-semibold text-noche">¿Activar el asistente de IA y la voz?</p>
            <p className="mt-1 text-sm leading-relaxed text-gris">
              Si aceptas, este caso de simulación y tus preguntas se envían a servicios externos de IA y de
              voz para poder responderte. No pongas datos reales. Puedes desactivarlo cuando quieras.
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
        {/* Saludo del asistente: una sola burbuja, con la garantía de que las cifras son del motor. */}
        <div className="aparecer mt-5 flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-1 hidden size-8 shrink-0 items-center justify-center rounded-full bg-agua-suave text-electrico sm:flex [&_svg]:size-4"
          >
            <Icono nombre="asistente" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="rounded-2xl rounded-tl-md bg-white px-4 py-3.5 text-[15px] leading-relaxed text-tinta shadow-[0_1px_2px_rgb(7_33_70/0.06),0_8px_24px_-16px_rgb(7_33_70/0.25)] ring-1 ring-linea md:px-5 md:py-4 md:text-base">
              <p>
                {apertura ??
                  `Hola, ${perfil.nombre}. Te ayudo a entender tu plata y a decidir con tiempo. ¿Qué quieres saber?`}
              </p>
              <p className="mt-3 flex items-center gap-1.5 border-t border-linea pt-2.5 text-xs text-gris">
                <span aria-hidden="true" className="text-verde-fuerte [&_svg]:size-3.5">
                  <Icono nombre="check" />
                </span>
                Las cifras las calcula el copiloto; la IA solo las explica.
              </p>
            </div>
            <details className="group mt-1.5 text-xs leading-snug text-gris">
              <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1 font-medium text-gris hover:text-noche [&::-webkit-details-marker]:hidden">
                Privacidad y datos
                <span
                  aria-hidden="true"
                  className="transition-transform duration-150 group-open:rotate-180 [&_svg]:size-3.5"
                >
                  <Icono nombre="abajo" />
                </span>
              </summary>
              <div className="mt-1 space-y-1.5 rounded-xl bg-niebla px-3 py-2.5">
                {externo && (
                  <p>
                    {demo
                      ? "El caso de Andrea es inventado. Sus cifras y tu pregunta"
                      : "Tu caso de simulación y tus preguntas"}{" "}
                    viajan a servicios externos de IA y de voz (Anthropic, Fish Audio y el dictado del
                    navegador): no escribas ni digas datos personales.
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
        {!mensajes.length && (
          <div className="mt-5 sm:ml-11">
            <p className="text-[13px] font-semibold text-noche">Prueba con una de estas preguntas</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {sugerencias.map(({ p, icono, tema }, i) => (
                <button
                  key={p}
                  onClick={() => void enviar(p)}
                  style={{ animationDelay: `${120 + i * 60}ms` }}
                  className="aparecer group flex min-h-14 items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-left ring-1 ring-linea transition-[transform,box-shadow] duration-150 hover:ring-electrico/50 hover:shadow-[0_6px_18px_-12px_rgb(7_33_70/0.45)] active:scale-[.98]"
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-[18px] ${tema === "Productos" ? "bg-agua-suave text-agua-fuerte" : "bg-niebla text-electrico"}`}
                  >
                    <Icono nombre={icono} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-gris">
                      {tema}
                    </span>
                    <span className="block text-sm font-medium leading-snug text-noche">{unido(p)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        {mensajes.length > 0 && !ocupado && (
          <div className="mt-4 flex items-center justify-between gap-3 text-[13px] text-gris">
            <p>
              {guardar
                ? "Conversación guardada en este equipo."
                : "En esta pestaña la conversación no se guarda."}
            </p>
            {guardar && (
              <button
                type="button"
                className="min-h-11 shrink-0 rounded-full px-3 font-semibold text-electrico hover:bg-agua-suave"
                onClick={() => {
                  if (
                    !window.confirm(
                      "¿Borrar toda la conversación con el asistente? Tus datos y tu ruta no cambian.",
                    )
                  )
                    return;
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
        <div role="log" aria-live="polite" aria-relevant="additions text" className="mt-5 space-y-5">
          {mensajes.map((m, i) =>
            m.rol === "usuario" ? (
              <div key={i} className="ml-auto max-w-[85%]">
                <p className="aparecer whitespace-pre-wrap break-words rounded-2xl rounded-tr-md bg-electrico px-4 py-3 text-[15px] leading-relaxed text-white shadow-[0_6px_16px_-10px_rgb(7_33_70/0.6)] md:text-base">
                  {m.texto}
                </p>
              </div>
            ) : (
              <div key={i} className="flex max-w-[92%] items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-1 hidden size-8 shrink-0 items-center justify-center rounded-full bg-agua-suave text-electrico sm:flex [&_svg]:size-4"
                >
                  <Icono nombre="asistente" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="aparecer whitespace-pre-wrap break-words rounded-2xl rounded-tl-md bg-white px-4 py-3 text-[15px] leading-relaxed text-tinta ring-1 ring-linea md:px-5 md:text-base">
                    {m.texto || (
                      <span className="inline-flex items-center gap-2 text-gris" role="status">
                        Pensando
                        <span aria-hidden="true" className="inline-flex gap-1">
                          <span className="punto-pensando size-1.5 rounded-full bg-gris" />
                          <span className="punto-pensando size-1.5 rounded-full bg-gris [animation-delay:0.15s]" />
                          <span className="punto-pensando size-1.5 rounded-full bg-gris [animation-delay:0.3s]" />
                        </span>
                      </span>
                    )}
                  </p>
                  {m.texto && i === mensajes.length - 1 && i > 0 && <button type="button" disabled={ocupado}
                    className="mt-1 inline-flex min-h-11 items-center px-2 text-xs font-semibold text-electrico disabled:opacity-40"
                    onClick={() => void enviar("Explícame más sobre eso", false, "explicado")}>
                    Explícame más
                  </button>}
                  {m.texto && i === mensajes.length - 1 && !ocupado && seguimiento.length > 0 && (
                    <div role="group" aria-label="Preguntas para seguir" className="mt-2 flex flex-wrap gap-2">
                      {seguimiento.map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => void enviar(p)}
                          className="min-h-11 rounded-full bg-white px-3.5 py-2 text-left text-[13px] font-medium leading-snug text-electrico ring-1 ring-linea transition-[transform,box-shadow] duration-150 hover:ring-electrico/50 active:scale-[.98]"
                        >
                          {unido(p)}
                        </button>
                      ))}
                    </div>
                  )}
                  {m.notas?.map(
                    id =>
                      notas[id] && (
                        <TarjetaAnotado key={id} nota={notas[id]} alDeshacer={() => void deshacerNota(id)} />
                      ),
                  )}
                  {(m.respaldo || m.cerebro) && <p className="mt-1.5 px-1 text-xs text-gris">Calculado con tus datos</p>}
                </div>
              </div>
            ),
          )}
        </div>
        {subiendo && (
          <section
            ref={panel}
            id="panel-subida"
            aria-labelledby="subir-documento"
            className="aparecer mt-5 scroll-mt-24 rounded-2xl border border-linea bg-white p-4 md:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id="subir-documento" className="text-lg font-semibold text-noche">
                {paso !== "revisar"
                  ? "Subir un documento"
                  : subida.estado.ejemplo
                    ? "Reporte de ejemplo, ya leído"
                    : "Esto encontré"}
              </h2>
              <button
                type="button"
                aria-label="Cerrar la subida de documentos"
                onClick={cerrarSubida}
                className="flex size-11 shrink-0 items-center justify-center rounded-full text-gris hover:bg-niebla [&_svg]:size-5"
              >
                <Icono nombre="cerrar" />
              </button>
            </div>
            {paso === "inicio" && (
              <>
                <p className="mt-1 leading-relaxed text-gris">
                  Sube un reporte de deudas o un resumen de tu situación financiera. Te muestro lo que trae,
                  tú corriges y decides qué guardar, y con eso actualizo tu plan.
                </p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-noche">
                  Solo documentos inventados: este es un prototipo de simulación y no debe recibir datos
                  reales de ninguna persona.
                </p>
                {lectura && (
                  <ElegirArchivo
                    id="archivo-chat"
                    alElegir={(archivo, inventado) => void subida.elegir(archivo, inventado)}
                  />
                )}
                {!externo && (
                  <p className="mt-3 text-sm leading-relaxed text-gris">
                    Para leer un archivo con IA, primero activa IA y voz arriba. Mientras tanto puedes usar el
                    reporte de ejemplo: no envía nada fuera de este equipo.
                  </p>
                )}
                {externo && !lectura && (
                  <p className="mt-3 text-sm leading-relaxed text-gris">
                    La lectura de archivos con IA está apagada en este prototipo. Puedes usar el reporte de
                    ejemplo, que ya viene leído.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => subida.precargada(EXTRACCION_EJEMPLO)}
                    className={lectura ? botonSecundario : botonPrincipal}
                  >
                    Usar reporte de ejemplo
                  </button>
                  {lectura && (
                    <a
                      href={RUTA_PDF_EJEMPLO}
                      download
                      className="text-sm font-semibold text-electrico underline underline-offset-4"
                    >
                      Descargar un PDF inventado para probar
                    </a>
                  )}
                </div>
              </>
            )}
            {subida.estado.paso === "analizando" && (
              <Leyendo nombre={subida.estado.nombre} alCancelar={subida.reiniciar} />
            )}
            {subida.estado.paso === "revisar" && (
              <Revision
                ext={subida.estado.ext}
                ejemplo={subida.estado.ejemplo}
                alGuardar={alGuardarDocumento}
                alDescartar={subida.reiniciar}
              />
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
            className="flex items-center gap-1.5 rounded-2xl bg-white p-1.5 shadow-[0_10px_30px_-18px_rgb(7_33_70/0.45)] ring-1 ring-linea-fuerte transition-shadow duration-150 focus-within:ring-2 focus-within:ring-electrico"
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
              title="Subir un documento"
              onClick={() => (subiendo ? cerrarSubida() : setSubiendo(true))}
              className={`flex size-11 shrink-0 items-center justify-center rounded-xl transition-[transform,background-color] duration-100 active:scale-95 disabled:opacity-40 [&_svg]:size-5 ${subiendo ? "bg-agua-suave text-electrico" : "text-gris hover:bg-niebla hover:text-electrico"}`}
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
              placeholder="Escribe tu pregunta…"
              className="min-h-11 min-w-0 flex-1 bg-transparent px-2 text-[15px] text-noche outline-none placeholder:text-gris md:text-base"
              disabled={ocupado}
            />
            {micro && (
              <button
                type="button"
                aria-label={escuchando ? "Terminar de escuchar" : "Dictar una pregunta"}
                aria-pressed={escuchando}
                disabled={ocupado || conversando}
                onClick={dictar}
                className={`flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-150 disabled:opacity-40 [&_svg]:size-5 ${escuchando ? "motion-safe:animate-pulse bg-coral-suave text-coral-fuerte" : "text-agua-fuerte hover:bg-agua-suave"}`}
              >
                <Icono nombre="micro" />
              </button>
            )}
            <button
              type="submit"
              aria-label="Enviar pregunta"
              disabled={ocupado || escuchando || !texto.trim()}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-electrico text-white transition-[transform,opacity] duration-100 active:scale-95 disabled:opacity-35 [&_svg]:size-5"
            >
              <Icono nombre="enviar" />
            </button>
          </form>
          <p className="mt-2 hidden text-center text-xs text-gris md:block">
            Caso de simulación · las cifras las calcula el copiloto con tus datos, no la IA
          </p>
        </div>
      </div>
      <PanelLateral ruta={ruta} avance={avance} conDeudas={perfil.deudas.length > 0} />
    </section>
  );
}
