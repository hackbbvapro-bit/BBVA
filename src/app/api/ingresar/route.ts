import { errorJson, mismoOrigen } from "@/servidor/http";
import { cookieDeIngreso, esSegura, nuevaSesion } from "@/servidor/sesion";

/** Abre la sesión de la cuenta demo: pone una cookie con un valor aleatorio y vuelve al inicio. */
export async function POST(req: Request): Promise<Response> {
  if (!mismoOrigen(req)) return errorJson("origen_no_permitido", 403);
  return new Response(null, {
    status: 303,
    headers: {
      Location: "/",
      "Cache-Control": "no-store",
      "Set-Cookie": cookieDeIngreso(nuevaSesion(), esSegura(req)),
    },
  });
}
