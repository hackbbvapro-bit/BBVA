/**
 * Voz del copiloto. Primero intenta la voz de Fish Audio (vía /api/voz);
 * si no está disponible, usa la voz del propio celular.
 */
import { salidasPermitidas } from "./salidas";
import { extraerFrases } from "../texto/frases";
import { paraVoz } from "../explica/explica";

export type MotorVoz = "fish" | "navegador" | "ninguna";

const SILENCIO = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
let reproductor: HTMLAudioElement | undefined;
let urlActual: string | undefined;
let cancelarSesion: (() => void) | undefined;
let turno = 0;

function obtenerReproductor(): HTMLAudioElement {
  reproductor ??= new Audio();
  return reproductor;
}

function liberarUrl(): void {
  if (urlActual) URL.revokeObjectURL(urlActual);
  urlActual = undefined;
}

/**
 * Llamar dentro de un toque del usuario (botón de micrófono, enviar, escuchar).
 * Los celulares solo dejan sonar audio que empezó con un toque; esto «abre la puerta».
 */
export function desbloquearAudio(): void {
  if (typeof window === "undefined") return;
  const audio = obtenerReproductor();
  if (!audio.paused && audio.src !== SILENCIO) return;
  audio.src = SILENCIO;
  audio.play().catch(() => undefined);
}

export function callar(): void {
  turno += 1;
  cancelarSesion?.();
  cancelarSesion = undefined;
  if (typeof window === "undefined") return;
  reproductor?.pause();
  liberarUrl();
  window.speechSynthesis?.cancel();
}

function elegirVoz(): SpeechSynthesisVoice | undefined {
  const voces = window.speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith("es"));
  const preferidas = ["es-pe", "es-419", "es-mx", "es-us", "es-co", "es-es"];
  for (const idioma of preferidas) {
    const voz = voces.find(v => v.lang.toLowerCase().replace("_", "-") === idioma);
    if (voz) return voz;
  }
  return voces[0];
}

function hablarConNavegador(texto: string, alTerminar?: () => void, alEmpezar?: () => void): MotorVoz {
  if (!("speechSynthesis" in window)) { alTerminar?.(); return "ninguna"; }
  const frase = new SpeechSynthesisUtterance(texto);
  const voz = elegirVoz();
  if (voz) frase.voice = voz;
  frase.lang = voz?.lang ?? "es-PE";
  frase.rate = 1.02;
  let finalizada = false;
  const acabar = () => { if (!finalizada) { finalizada = true; alTerminar?.(); } };
  frase.onstart = () => alEmpezar?.();
  frase.onend = acabar;
  frase.onerror = acabar;
  window.speechSynthesis.speak(frase);
  return "navegador";
}

async function pedirAudio(texto: string, signal: AbortSignal): Promise<Blob | undefined> {
  if (!salidasPermitidas() || signal.aborted) return undefined;
  try {
    const respuesta = await fetch("/api/voz", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto }), signal,
    });
    if (!respuesta.ok) return undefined;
    const audio = await respuesta.blob();
    return audio.size ? audio : undefined;
  } catch { return undefined; }
}

/** Agrupa frases cortas; en frases largas prefiere comas. Nunca descarta texto. */
export function partirEnFrases(texto: string): string[] {
  const unidades = extraerFrases(texto, true).frases.flatMap(f =>
    f.length > 220 ? f.split(/(?<=,)\s+/) : [f],
  );
  const partes: string[] = [];
  let actual = "";
  for (const unidad of unidades) {
    const limpia = unidad.trim();
    if (!limpia) continue;
    if (actual && actual.length + limpia.length + 1 > 180) { partes.push(actual); actual = ""; }
    actual += (actual ? " " : "") + limpia;
    if (actual.length >= 60) { partes.push(actual); actual = ""; }
  }
  if (actual) {
    if (partes.length && partes.at(-1)!.length + actual.length + 1 <= 180) partes[partes.length - 1] += " " + actual;
    else partes.push(actual);
  }
  // Caso extremo sin puntuación: respeta el límite de la API sin cortar palabras ni perder texto.
  return partes.flatMap(p => {
    const trozos: string[] = [];
    while (p.length > 800) {
      const espacio = p.lastIndexOf(" ", 800);
      const corte = espacio > 0 ? espacio : 800;
      trozos.push(p.slice(0, corte)); p = p.slice(corte).trimStart();
    }
    if (p) trozos.push(p);
    return trozos;
  });
}
export const partirParaVoz = partirEnFrases;

export interface VozEnVivo {
  agregar: (texto: string) => void;
  terminar: () => void;
  inicio: Promise<MotorVoz>;
}

/** Mantiene el turno abierto entre bloques; el callback solo llega tras cerrar y vaciar la cola. */
export function hablarEnVivo(alTerminar?: () => void): VozEnVivo {
  callar();
  const miTurno = turno;
  const corte = new AbortController();
  const cola: { texto: string; audio?: Promise<Blob | undefined> }[] = [];
  const inicioTiempo = performance.now();
  let resolver!: (motor: MotorVoz) => void;
  const inicio = new Promise<MotorVoz>(r => { resolver = r; });
  let iniciado = false, cerrado = false, ocupado = false, terminado = false;
  let navegador = false, sonaron = 0, pendiente = "";
  const vigente = () => miTurno === turno && !corte.signal.aborted;
  let medido = false;
  const medir = () => {
    if (medido || !vigente()) return;
    medido = true;
    if (process.env.NODE_ENV !== "production")
      console.debug("[voz] tiempo hasta primer audio (ms)", Math.round(performance.now() - inicioTiempo));
  };
  const marcar = (motor: MotorVoz) => {
    if (iniciado) return;
    iniciado = true;
    resolver(motor);

  };
  cancelarSesion = () => { corte.abort(); marcar("ninguna"); };
  const acabar = () => {
    if (!vigente() || terminado || !cerrado || ocupado || cola.length) return;
    terminado = true; marcar("ninguna"); liberarUrl(); alTerminar?.();
  };
  const precargar = () => {
    if (navegador || !vigente()) return;
    // Como máximo el actual y uno por delante.
    for (const item of cola.slice(0, 2)) item.audio ??= pedirAudio(item.texto, corte.signal);
  };
  const siguiente = () => {
    if (!vigente()) return;
    cola.shift(); ocupado = false; sonaron += 1;
    void avanzar();
  };
  async function avanzar(): Promise<void> {
    if (!vigente() || ocupado) return;
    if (!salidasPermitidas() || typeof window === "undefined") {
      cola.length = 0; pendiente = ""; cerrado = true; acabar(); return;
    }
    if (!cola.length) { acabar(); return; }
    ocupado = true;
    const item = cola[0];
    precargar();
    if (!navegador) {
      let audio = await item.audio;
      if (!vigente()) return;
      if (!audio && sonaron > 0) audio = await pedirAudio(item.texto, corte.signal);
      if (!vigente()) return;
      if (!salidasPermitidas()) { cola.length = 0; cerrado = true; ocupado = false; acabar(); return; }
      if (audio) {
        try {
          const elemento = obtenerReproductor();
          liberarUrl(); urlActual = URL.createObjectURL(audio); elemento.src = urlActual;
          elemento.onended = siguiente;
          elemento.onerror = () => { navegador = true; leerNavegador(); };
          await elemento.play();
          if (vigente()) { marcar("fish"); medir(); }
          return;
        } catch { /* Desde aquí la voz del navegador permanece hasta el final. */ }
      }
      navegador = true;
    }
    leerNavegador();
    function leerNavegador() {
      if (!vigente()) return;
      marcar("speechSynthesis" in window ? "navegador" : "ninguna");
      hablarConNavegador(item.texto, siguiente, medir);
    }
  }
  function agregar(texto: string, final = false) {
    if (!vigente() || terminado) return;
    pendiente += texto;
    const extraidas = extraerFrases(pendiente, final);
    pendiente = extraidas.resto;
    for (const parte of partirEnFrases(paraVoz(extraidas.frases.join("")))) cola.push({ texto: parte });
    precargar();
    void avanzar();
  }
  return {
    inicio,
    agregar: texto => { if (!cerrado) agregar(texto); },
    terminar: () => { if (!cerrado) { cerrado = true; agregar("", true); acabar(); } },
  };
}

/** API compatible: resuelve al empezar; alTerminar se llama tras el último trozo. */
export async function hablar(texto: string, alTerminar?: () => void): Promise<MotorVoz> {
  const sesion = hablarEnVivo(alTerminar);
  sesion.agregar(texto + " ");
  sesion.terminar();
  return sesion.inicio;
}
