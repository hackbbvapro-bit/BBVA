/**
 * Sesión de la cuenta demo. Es una puerta de prototipo, no autenticación real: la cookie lleva un valor
 * aleatorio sin ningún dato personal y basta con que tenga el formato correcto.
 */
import { errorJson } from "@/servidor/http";

export const COOKIE_SESION = "copiloto_sesion";
const SIETE_DIAS = 7 * 24 * 60 * 60;
const FORMATO = /^[a-f0-9]{64}$/;

export function nuevaSesion(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

export function valorDeCookie(cabecera: string | null, nombre: string): string | undefined {
  for (const par of (cabecera ?? "").split(";")) {
    const i = par.indexOf("=");
    if (i > 0 && par.slice(0, i).trim() === nombre) return par.slice(i + 1).trim();
  }
  return undefined;
}

export function valorValido(valor: string | undefined): boolean {
  return valor !== undefined && FORMATO.test(valor);
}

export function haySesion(req: Request): boolean {
  return valorValido(valorDeCookie(req.headers.get("cookie"), COOKIE_SESION));
}

/** `Secure` solo cuando la petición llegó por https (así también funciona en http://localhost). */
export function esSegura(req: Request): boolean {
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (proto) return proto === "https";
  try {
    return new URL(req.url).protocol === "https:";
  } catch {
    return false;
  }
}

function atributos(seguro: boolean, maxAge: number): string {
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${seguro ? "; Secure" : ""}`;
}

export function cookieDeIngreso(valor: string, seguro: boolean): string {
  return `${COOKIE_SESION}=${valor}; ${atributos(seguro, SIETE_DIAS)}`;
}

export function cookieDeSalida(seguro: boolean): string {
  return `${COOKIE_SESION}=; ${atributos(seguro, 0)}`;
}

/** Respuesta 401 para las rutas que gastan claves de IA o de voz. */
export function sinSesion(): Response {
  return errorJson("sin_sesion", 401);
}
