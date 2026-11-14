import { z } from "zod";
import { responder, ultimaPregunta, type EventoAgente } from "@/agente/conversar";
import { PERFILES } from "@/datos/perfiles";
import { analizar } from "@/motor";
import { errorJson, leerJson, mismoOrigen, visitante } from "@/servidor/http";
import { crearLimite } from "@/servidor/limite";
import { registrarFallo } from "@/servidor/registro";

export const maxDuration = 60;

const limite = crearLimite(20, 60_000);

const Peticion = z.object({
  perfilId: z.string().min(1).max(40),
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
  if (!limite.permite(visitante(req))) return errorJson("demasiadas_peticiones", 429);
  const datos = Peticion.safeParse(await leerJson(req));
  if (!datos.success) return errorJson("peticion_invalida", 400);
  const perfil = PERFILES.find(p => p.id === datos.data.perfilId);
  if (!perfil || !ultimaPregunta(datos.data.mensajes)) return errorJson("peticion_invalida", 400);

  const corte = new AbortController();
  const senal = AbortSignal.any([req.signal, corte.signal]);
  const eventos = responder({ perfil, analisis: analizar(perfil), mensajes: datos.data.mensajes, senal });
  return new Response(comoFlujo(eventos, () => corte.abort()), {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
