import { z } from "zod";
import { responder, ultimaPregunta, type EventoAgente } from "@/agente/conversar";
import { analizar } from "@/motor";
import { errorJson, leerJson, mismoOrigen, visitante } from "@/servidor/http";
import { crearLimite } from "@/servidor/limite";
import { EsquemaPerfil, MAX_BYTES_PERFIL } from "@/servidor/perfil";
import { haySesion, sinSesion } from "@/servidor/sesion";
import { registrarFallo } from "@/servidor/registro";

export const maxDuration = 60;

const limite = crearLimite(20, 60_000);
// Tope para todos los visitantes juntos: acota el gasto de la clave si alguien rota direcciones.
const topeGlobal = crearLimite(300, 3_600_000);

const Peticion = z.object({
  perfil: EsquemaPerfil,
  mensajes: z
    .array(z.object({ rol: z.enum(["usuario", "asistente"]), texto: z.string().min(1).max(1000) }))
    .min(1)
    .max(20),
});

/** Convierte los eventos del agente en líneas JSON (una por evento) que el celular va leyendo según llegan. */
function comoFlujo(eventos: AsyncGenerator<EventoAgente>, cortar: () => void): ReadableStream<Uint8Array> {
  const codificador = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async pull(controlador) {
      try {
        const { value, done } = await eventos.next();
        if (done) controlador.close();
        else controlador.enqueue(codificador.encode(`${JSON.stringify(value)}\n`));
      } catch (error) {
        registrarFallo("agente", error);
        controlador.close();
      }
    },
    async cancel() {
      cortar();
      await eventos.return(undefined);
    },
  });
}

export async function POST(req: Request): Promise<Response> {
  if (!mismoOrigen(req)) return errorJson("origen_no_permitido", 403);
  if (!haySesion(req)) return sinSesion();
  if (!limite.permite(visitante(req)) || !topeGlobal.permite("todos"))
    return errorJson("demasiadas_peticiones", 429);
  const datos = Peticion.safeParse(await leerJson(req, MAX_BYTES_PERFIL));
  if (!datos.success) return errorJson("peticion_invalida", 400);
  const perfil = datos.data.perfil;
  if (!ultimaPregunta(datos.data.mensajes)) return errorJson("peticion_invalida", 400);
  let analisis;
  try {
    analisis = analizar(perfil);
  } catch {
    return errorJson("peticion_invalida", 400);
  }

  const corte = new AbortController();
  const senal = AbortSignal.any([req.signal, corte.signal]);
  const eventos = responder({ perfil, analisis, mensajes: datos.data.mensajes, senal });
  return new Response(comoFlujo(eventos, () => corte.abort()), {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
