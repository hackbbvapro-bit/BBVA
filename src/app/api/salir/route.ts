import { errorJson, mismoOrigen } from "@/servidor/http";
import { cookieDeSalida, esSegura } from "@/servidor/sesion";

/** Cierra la sesión de la cuenta demo: borra la cookie y vuelve a la pantalla de ingreso. */
export async function POST(req: Request): Promise<Response> {
  if (!mismoOrigen(req)) return errorJson("origen_no_permitido", 403);
  return new Response(null, {
    status: 303,
    headers: { Location: "/ingresar", "Cache-Control": "no-store", "Set-Cookie": cookieDeSalida(esSegura(req)) },
  });
}
