/**
 * Voz del copiloto. Primero intenta la voz de Fish Audio (vía /api/voz);
 * si no está disponible, usa la voz del propio celular.
 */
import { paraVoz } from "../explica/explica";

export type MotorVoz = "fish" | "navegador" | "ninguna";

const SILENCIO = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
const MAX_TEXTO = 800;

let reproductor: HTMLAudioElement | undefined;
let urlActual: string | undefined;
let fishDisponible = true;
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

function hablarConNavegador(texto: string, alTerminar?: () => void): MotorVoz {
  if (!("speechSynthesis" in window)) { alTerminar?.(); return "ninguna"; }
  const frase = new SpeechSynthesisUtterance(texto);
  const voz = elegirVoz();
  if (voz) frase.voice = voz;
  frase.lang = voz?.lang ?? "es-PE";
  frase.rate = 1.02;
  frase.onend = () => alTerminar?.();
  frase.onerror = () => alTerminar?.();
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(frase);
  return "navegador";
}

async function pedirAudio(texto: string): Promise<Blob | undefined> {
  if (!fishDisponible) return undefined;
  try {
    const respuesta = await fetch("/api/voz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto }),
    });
    if (respuesta.status === 503 || respuesta.status === 404) fishDisponible = false;
    if (!respuesta.ok) return undefined;
    const audio = await respuesta.blob();
    return audio.size > 0 ? audio : undefined;
  } catch {
    return undefined;
  }
}

/** Lee un texto en voz alta. Devuelve qué voz se usó. `alTerminar` se llama al acabar (o si no pudo sonar). */
export async function hablar(texto: string, alTerminar?: () => void): Promise<MotorVoz> {
  if (typeof window === "undefined") return "ninguna";
  callar();
  const miTurno = turno;
  const limpio = paraVoz(texto).slice(0, MAX_TEXTO);
  if (!limpio) { alTerminar?.(); return "ninguna"; }
  const audio = await pedirAudio(limpio);
  if (miTurno !== turno) return "ninguna";
  if (!audio) return hablarConNavegador(limpio, alTerminar);
  const elemento = obtenerReproductor();
  liberarUrl();
  urlActual = URL.createObjectURL(audio);
  elemento.src = urlActual;
  elemento.onended = () => alTerminar?.();
  try {
    await elemento.play();
    return "fish";
  } catch {
    return miTurno === turno ? hablarConNavegador(limpio, alTerminar) : "ninguna";
  }
}
