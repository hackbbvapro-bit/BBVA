import { sendNotification } from "web-push";
import { z } from "zod";
import { PERFILES } from "@/datos/perfiles";
import { avisos } from "@/explica/explica";
import { analizar } from "@/motor";
import { configPush } from "@/servidor/entorno";
import { errorJson, leerJson, mismoOrigen, okJson, visitante } from "@/servidor/http";
import { crearLimite } from "@/servidor/limite";
import { esServicioDePush } from "@/servidor/push";
import { registrarFallo } from "@/servidor/registro";

export const maxDuration = 15;

const limite = crearLimite(6, 60_000);
const Peticion = z.object({
  perfilId: z.string().min(1).max(40),
  suscripcion: z.object({
    endpoint: z.string().url().max(2000),
    keys: z.object({ p256dh: z.string().min(1).max(300), auth: z.string().min(1).max(100) }),
  }),
});

/**
 * Envía al celular que lo pide el aviso más importante de su perfil. El texto lo arma el motor aquí,
 * en el servidor: lo que mande el navegador como título o cuerpo no se usa.
 */
export async function POST(req: Request): Promise<Response> {
  if (!mismoOrigen(req)) return errorJson("origen_no_permitido", 403);
  if (!limite.permite(visitante(req))) return errorJson("demasiadas_peticiones", 429);
  const datos = Peticion.safeParse(await leerJson(req));
  if (!datos.success || !esServicioDePush(datos.data.suscripcion.endpoint)) return errorJson("peticion_invalida", 400);
  const perfil = PERFILES.find(p => p.id === datos.data.perfilId);
  if (!perfil) return errorJson("peticion_invalida", 400);
  const config = configPush();
  if (!config) return errorJson("avisos_no_disponibles", 503);

  const aviso = avisos(perfil, analizar(perfil)).at(0);
  if (!aviso) return errorJson("aviso_fallo", 502);
  try {
    await sendNotification(datos.data.suscripcion, JSON.stringify({ title: aviso.titulo, body: aviso.cuerpo }), {
      vapidDetails: { subject: config.asunto, publicKey: config.publica, privateKey: config.privada },
      TTL: 60,
      urgency: "high",
      timeout: 10_000,
    });
    return okJson({ ok: true });
  } catch (error) {
    registrarFallo("avisos", error);
    return errorJson("aviso_fallo", 502);
  }
}
