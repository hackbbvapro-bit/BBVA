/** Piezas comunes de las rutas: respuestas de error sin detalles internos, lectura segura del cuerpo y origen. */

export type CodigoError =
  | "peticion_invalida"
  | "sin_sesion"
  | "origen_no_permitido"
  | "demasiadas_peticiones"
  | "ia_no_disponible"
  | "voz_no_disponible"
  | "voz_fallo"
  | "transcripcion_no_disponible"
  | "transcripcion_fallo"
  | "avisos_no_disponibles"
  | "aviso_fallo";

const SIN_CACHE = { "Cache-Control": "no-store" } as const;

/** Error para el navegador: solo un código corto. Nunca el mensaje del proveedor ni una traza. */
export function errorJson(error: CodigoError, estado: number): Response {
  return Response.json({ error }, { status: estado, headers: SIN_CACHE });
}

export function okJson(datos: unknown): Response {
  return Response.json(datos, { headers: SIN_CACHE });
}

/**
 * Identifica al visitante para el límite de uso. Solo se confía en cabeceras que fija la plataforma
 * (x-vercel-forwarded-for, x-real-ip); x-forwarded-for lo escribe el cliente y se falsifica para saltarse
 * el límite. Sin ninguna, todos comparten la clave "local": más estricto, pero no evadible.
 */
export function visitante(req: Request): string {
  const vercel = req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercel) return vercel;
  const real = req.headers.get("x-real-ip")?.trim();
  return real || "local";
}

/**
 * true si la petición sale de esta misma web. Los navegadores mandan `Origin` en todo POST; sin él solo
 * se acepta si el navegador declara `Sec-Fetch-Site: same-origin`. Un script suelto sin ninguna de las
 * dos cabeceras queda fuera (no reemplaza a la sesión ni a los límites, pero sube el costo del abuso).
 */
export function mismoOrigen(req: Request): boolean {
  const origen = req.headers.get("origin");
  if (!origen) return req.headers.get("sec-fetch-site") === "same-origin";
  const anfitrion = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origen).host === anfitrion;
  } catch {
    return false;
  }
}

/** Lee un cuerpo JSON pequeño. Devuelve undefined si es demasiado grande o no es JSON. */
export async function leerJson(req: Request, maximoBytes = 64_000): Promise<unknown> {
  const declarado = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declarado) && declarado > maximoBytes) return undefined;
  try {
    const texto = await req.text();
    if (texto.length > maximoBytes) return undefined;
    return JSON.parse(texto) as unknown;
  } catch {
    return undefined;
  }
}
