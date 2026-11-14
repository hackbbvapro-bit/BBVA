import { z } from "zod";
import { responder, ultimaPregunta, type EventoAgente } from "@/agente/conversar";
import { analizar } from "@/motor";
import { ID_PROPIO } from "@/datos/semilla";
import { EsquemaAvances, EsquemaHechos, SIN_HECHOS, avanceDe, trazarRuta } from "@/ruta/ruta";
import { errorJson, leerJson, mismoOrigen, visitante } from "@/servidor/http";
import { crearLimite } from "@/servidor/limite";
import { EsquemaCobros, EsquemaPerfil, MAX_BYTES_PERFIL } from "@/servidor/perfil";
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
  /** Hechos que el perfil no trae (si tuvo crédito, atraso máximo). La ruta se traza aquí, nunca se acepta del cliente. */
  hechos: EsquemaHechos.optional(),
  /** Obligatorio en un caso propio: la persona aceptó enviar su simulación al proveedor de IA. */
  consentimiento: z.literal(true).optional(),
  /** Pagos que le deben (aún no cobrados): el agente los ve y puede anotar nuevos. */
  cobros: EsquemaCobros.optional(),
  /** Identificadores de los pasos que la persona marcó en «Mi ruta». Solo ids de una lista cerrada; el avance se calcula aquí. */
  avances: EsquemaAvances.optional(),
});

/**
 * Convierte los eventos del agente en líneas JSON (una por evento) que el celular va leyendo según llegan.
 * Una línea «accion» es algo que el agente anotó: el navegador lo guarda en su base y lo puede deshacer.
 */
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
  if (!limite.permite(visitante(req))) return errorJson("demasiadas_peticiones", 429);
  const datos = Peticion.safeParse(await leerJson(req, MAX_BYTES_PERFIL));
  if (!datos.success) return errorJson("peticion_invalida", 400);
  const perfil = datos.data.perfil;
  // Defensa en profundidad: un caso propio solo llega al proveedor de IA si la persona lo aceptó de forma expresa.
  if (perfil.id === ID_PROPIO && datos.data.consentimiento !== true) return errorJson("falta_consentimiento", 403);
  if (!ultimaPregunta(datos.data.mensajes)) return errorJson("peticion_invalida", 400);
  let analisis;
  let ruta;
  try {
    analisis = analizar(perfil);
    ruta = trazarRuta(perfil, analisis, datos.data.hechos ?? SIN_HECHOS);
  } catch {
    return errorJson("peticion_invalida", 400);
  }

  // El tope común se gasta solo con peticiones válidas que de verdad llaman al proveedor.
  if (!topeGlobal.permite("todos")) return errorJson("demasiadas_peticiones", 429);
  const corte = new AbortController();
  const senal = AbortSignal.any([req.signal, corte.signal]);
  const cobros = (datos.data.cobros ?? []).filter(c => !c.cobrado);
  const avance = avanceDe(ruta, datos.data.avances);
  const eventos = responder({ perfil, analisis, mensajes: datos.data.mensajes, senal, ruta, cobros, avance });
  return new Response(comoFlujo(eventos, () => corte.abort()), {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
