/**
 * Micrófono. Primero el dictado del navegador (rápido, sin servidor);
 * si no existe o falla, graba el audio y lo transcribe en /api/transcribir.
 */
export type ErrorEscucha = "sin_permiso" | "no_soportado" | "sin_voz" | "fallo";

export interface OpcionesEscucha {
  /** Texto provisional mientras la persona habla (solo con dictado del navegador). */
  alParcial?: (texto: string) => void;
  alFinal: (texto: string) => void;
  alError: (motivo: ErrorEscucha) => void;
  /** Avisa cuando deja de escuchar (para apagar el botón). */
  alTerminar?: () => void;
}

export interface Escucha {
  /** "dictado" termina solo al callar; "grabacion" termina cuando se llama a `detener`. */
  modo: "dictado" | "grabacion";
  detener(): void;
}

interface ResultadoDictado { isFinal: boolean; 0: { transcript: string } }
interface EventoDictado { resultIndex: number; results: ArrayLike<ResultadoDictado> }
interface Dictado {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  onresult: ((evento: EventoDictado) => void) | null;
  onerror: ((evento: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
type ConstructorDictado = new () => Dictado;

const MAX_GRABACION_MS = 20_000;
let dictadoFallo = false;

function constructorDictado(): ConstructorDictado | undefined {
  if (typeof window === "undefined" || dictadoFallo) return undefined;
  const w = window as unknown as { SpeechRecognition?: ConstructorDictado; webkitSpeechRecognition?: ConstructorDictado };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function puedeGrabar(): boolean {
  return typeof window !== "undefined" && "MediaRecorder" in window && !!navigator.mediaDevices?.getUserMedia;
}

/** true si el celular puede escuchar de alguna forma. */
export function puedeEscuchar(): boolean {
  return constructorDictado() !== undefined || puedeGrabar();
}

function dictar(Constructor: ConstructorDictado, o: OpcionesEscucha): Escucha {
  const dictado = new Constructor();
  let texto = "";
  let avisado = false;
  dictado.lang = "es-PE";
  dictado.interimResults = true;
  dictado.continuous = false;
  dictado.maxAlternatives = 1;
  dictado.onresult = evento => {
    const trozos = Array.from(evento.results);
    texto = trozos.map(r => r[0].transcript).join(" ").trim();
    if (!trozos.every(r => r.isFinal)) o.alParcial?.(texto);
  };
  dictado.onerror = evento => {
    avisado = true;
    if (evento.error === "not-allowed") return o.alError("sin_permiso");
    if (evento.error === "no-speech" || evento.error === "aborted") return o.alError("sin_voz");
    dictadoFallo = true; // la próxima vez se graba y se transcribe en el servidor
    o.alError(puedeGrabar() ? "fallo" : "no_soportado");
  };
  dictado.onend = () => {
    o.alTerminar?.();
    if (avisado) return;
    if (texto) o.alFinal(texto); else o.alError("sin_voz");
  };
  dictado.start();
  return { modo: "dictado", detener: () => dictado.stop() };
}

async function transcribir(audio: Blob): Promise<string> {
  const formulario = new FormData();
  formulario.append("audio", audio, audio.type.includes("mp4") ? "audio.mp4" : "audio.webm");
  const respuesta = await fetch("/api/transcribir", { method: "POST", body: formulario });
  if (!respuesta.ok) throw new Error(`http_${respuesta.status}`);
  const dato: unknown = await respuesta.json();
  const texto = (dato as { texto?: unknown }).texto;
  return typeof texto === "string" ? texto.trim() : "";
}

function grabar(o: OpcionesEscucha): Escucha {
  let grabadora: MediaRecorder | undefined;
  let cancelado = false;
  let reloj: ReturnType<typeof setTimeout> | undefined;
  const trozos: Blob[] = [];
  const detener = () => {
    cancelado = true;
    if (reloj) clearTimeout(reloj);
    if (grabadora && grabadora.state !== "inactive") grabadora.stop();
  };
  navigator.mediaDevices.getUserMedia({ audio: true }).then(flujo => {
    const apagar = () => flujo.getTracks().forEach(pista => pista.stop());
    if (cancelado) { apagar(); o.alTerminar?.(); return; }
    const tipo = ["audio/webm", "audio/mp4"].find(t => MediaRecorder.isTypeSupported(t));
    grabadora = new MediaRecorder(flujo, tipo ? { mimeType: tipo } : undefined);
    grabadora.ondataavailable = evento => { if (evento.data.size > 0) trozos.push(evento.data); };
    grabadora.onstop = () => {
      apagar();
      o.alTerminar?.();
      const audio = new Blob(trozos, { type: grabadora?.mimeType || tipo || "audio/webm" });
      if (audio.size === 0) return o.alError("sin_voz");
      transcribir(audio)
        .then(texto => (texto ? o.alFinal(texto) : o.alError("sin_voz")))
        .catch(() => o.alError("fallo"));
    };
    grabadora.start();
    reloj = setTimeout(detener, MAX_GRABACION_MS);
  }).catch(() => { o.alTerminar?.(); o.alError("sin_permiso"); });
  return { modo: "grabacion", detener };
}

/** Empieza a escuchar. Debe llamarse dentro de un toque del usuario. */
export function escuchar(opciones: OpcionesEscucha): Escucha | undefined {
  const Constructor = constructorDictado();
  try {
    if (Constructor) return dictar(Constructor, opciones);
    if (puedeGrabar()) return grabar(opciones);
  } catch {
    opciones.alTerminar?.();
    opciones.alError("fallo");
    return undefined;
  }
  opciones.alError("no_soportado");
  return undefined;
}
