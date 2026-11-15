import { errorJson, leerTextoAcotado, mismoOrigen } from "@/servidor/http";
import { cookieDeIngreso, esSegura, nuevaSesion } from "@/servidor/sesion";

/** Destinos permitidos tras ingresar: una lista cerrada, así nadie puede usar este paso para redirigir a otro sitio. */
const DESTINOS = { demo: "/?empezar=demo", propio: "/?empezar=propio" } as const;

async function destino(req: Request): Promise<string> {
  try {
    // El formulario solo trae «empezar=demo|propio»: se lee con tope para que un cuerpo enorme no llene la memoria.
    const texto = await leerTextoAcotado(req, 1_000);
    const v = texto === undefined ? null : new URLSearchParams(texto).get("empezar");
    return v === "demo" || v === "propio" ? DESTINOS[v] : "/";
  } catch {
    return "/"; // sin cuerpo o cuerpo ilegible: se entra al inicio
  }
}

/** Abre la sesión de la cuenta demo: pone una cookie con un valor aleatorio y entra a la opción elegida en la portada. */
export async function POST(req: Request): Promise<Response> {
  if (!mismoOrigen(req)) return errorJson("origen_no_permitido", 403);
  return new Response(null, {
    status: 303,
    headers: {
      Location: await destino(req),
      "Cache-Control": "no-store",
      "Set-Cookie": cookieDeIngreso(nuevaSesion(), esSegura(req)),
    },
  });
}
