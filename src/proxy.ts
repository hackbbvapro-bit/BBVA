import { NextResponse, type NextRequest } from "next/server";
import { haySesion } from "@/servidor/sesion";

/**
 * Sin sesión de la cuenta demo, toda página lleva a /ingresar. El matcher deja pasar las rutas /api (cada una
 * decide por su cuenta: las de IA y voz dan 401, /api/estado es pública), lo de /_next y cualquier archivo con
 * punto (manifest.webmanifest, sw.js, iconos).
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/ingresar" || pathname.startsWith("/ingresar/")) return NextResponse.next();
  if (haySesion(req)) return NextResponse.next();
  return NextResponse.redirect(new URL("/ingresar", req.url));
}

export const config = {
  matcher: ["/((?!api/|_next/|.*\\..*).*)"],
};
