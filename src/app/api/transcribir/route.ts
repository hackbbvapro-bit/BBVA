import { z } from "zod";
import { claveFish } from "@/servidor/entorno";
import { errorJson, mismoOrigen, okJson, visitante } from "@/servidor/http";
import { crearLimite } from "@/servidor/limite";
import { registrarFallo } from "@/servidor/registro";

export const maxDuration = 30;

const FISH_ASR = "https://api.fish.audio/v1/asr";
const ESPERA_MS = 25_000;
const MAXIMO_BYTES = 4_000_000;
const MAXIMO_TEXTO = 1000;
const limite = crearLimite(15, 60_000);
const Transcripcion = z.object({ text: z.string() });

async function leerAudio(req: Request): Promise<File | undefined> {
  if (Number(req.headers.get("content-length") ?? 0) > MAXIMO_BYTES + 100_000) return undefined;
  try {
    const audio = (await req.formData()).get("audio");
    if (!(audio instanceof File) || audio.size === 0 || audio.size > MAXIMO_BYTES) return undefined;
    return audio.type.startsWith("audio/") ? audio : undefined;
  } catch {
    return undefined;
  }
}

/** Pasa a texto un audio corto grabado en el celular (respaldo cuando el navegador no reconoce voz). */
export async function POST(req: Request): Promise<Response> {
  if (!mismoOrigen(req)) return errorJson("origen_no_permitido", 403);
  if (!limite.permite(visitante(req))) return errorJson("demasiadas_peticiones", 429);
  const clave = claveFish();
  if (!clave) return errorJson("transcripcion_no_disponible", 503);
  const audio = await leerAudio(req);
  if (!audio) return errorJson("peticion_invalida", 400);

  try {
    const cuerpo = new FormData();
    cuerpo.append("audio", audio, audio.type.includes("mp4") ? "audio.mp4" : "audio.webm");
    cuerpo.append("language", "es");
    const respuesta = await fetch(FISH_ASR, {
      method: "POST",
      headers: { Authorization: `Bearer ${clave}` },
      body: cuerpo,
      signal: AbortSignal.timeout(ESPERA_MS),
    });
    if (respuesta.status === 401 || respuesta.status === 402) return errorJson("transcripcion_no_disponible", 503);
    const datos = respuesta.ok ? Transcripcion.safeParse(await respuesta.json()) : undefined;
    if (!datos?.success) {
      registrarFallo("transcribir", { name: "RespuestaDeFish", status: respuesta.status });
      return errorJson("transcripcion_fallo", 502);
    }
    return okJson({ texto: datos.data.text.trim().slice(0, MAXIMO_TEXTO) });
  } catch (error) {
    registrarFallo("transcribir", error);
    return errorJson("transcripcion_fallo", 502);
  }
}
