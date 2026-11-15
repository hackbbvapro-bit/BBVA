import { z } from "zod";
import { configVoz } from "@/servidor/entorno";
import { errorJson, leerJson, mismoOrigen, visitante } from "@/servidor/http";
import { crearLimite } from "@/servidor/limite";
import { haySesion, sinSesion } from "@/servidor/sesion";
import { registrarFallo } from "@/servidor/registro";

export const maxDuration = 30;

const FISH_TTS = "https://api.fish.audio/v1/tts";
const ESPERA_MS = 20_000;
// Una respuesta larga son 4-6 trozos de audio: con 30 por minuto, dos preguntas seguidas caían a la voz robótica.
const limite = crearLimite(90, 60_000);
// Tope para todos los visitantes juntos: acota el gasto de la clave si alguien rota direcciones.
const topeGlobal = crearLimite(800, 3_600_000);
const Peticion = z.object({ texto: z.string().trim().min(1).max(800) });

/** Convierte un texto en audio con Fish Audio. La clave nunca sale del servidor. */
export async function POST(req: Request): Promise<Response> {
  if (!mismoOrigen(req)) return errorJson("origen_no_permitido", 403);
  if (!haySesion(req)) return sinSesion();
  if (!limite.permite(visitante(req))) return errorJson("demasiadas_peticiones", 429);
  const datos = Peticion.safeParse(await leerJson(req));
  if (!datos.success) return errorJson("peticion_invalida", 400);
  const config = configVoz();
  if (!config) return errorJson("voz_no_disponible", 503);

  // El tope común se gasta solo con peticiones válidas que de verdad llaman al proveedor.
  if (!topeGlobal.permite("todos")) return errorJson("demasiadas_peticiones", 429);
  try {
    const respuesta = await fetch(FISH_TTS, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.clave}`, "Content-Type": "application/json", model: config.modelo },
      body: JSON.stringify({ text: datos.data.texto, reference_id: config.voz, format: "mp3" }),
      signal: AbortSignal.timeout(ESPERA_MS),
    });
    // Clave inválida o sin saldo: el celular deja de insistir y usa su propia voz.
    if (respuesta.status === 401 || respuesta.status === 402) return errorJson("voz_no_disponible", 503);
    if (!respuesta.ok || !respuesta.body) {
      registrarFallo("voz", { name: "RespuestaDeFish", status: respuesta.status });
      return errorJson("voz_fallo", 502);
    }
    return new Response(respuesta.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (error) {
    registrarFallo("voz", error);
    return errorJson("voz_fallo", 502);
  }
}
