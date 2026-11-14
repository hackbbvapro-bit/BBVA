import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as ingresar } from "../app/api/ingresar/route";
import { POST as salir } from "../app/api/salir/route";
import { config, proxy } from "../proxy";
import {
  COOKIE_SESION,
  cookieDeIngreso,
  cookieDeSalida,
  haySesion,
  nuevaSesion,
  valorDeCookie,
} from "./sesion";

const BASE = "https://copiloto.test";
const post = (ruta: string, cabeceras: Record<string, string> = {}) =>
  new Request(`${BASE}${ruta}`, {
    method: "POST",
    headers: { "x-forwarded-host": "copiloto.test", ...cabeceras },
  });
const pagina = (ruta: string, cookie?: string) =>
  new NextRequest(`${BASE}${ruta}`, { headers: cookie ? { cookie } : {} });

describe("valor de la sesión", () => {
  it("es aleatorio, de 64 caracteres hex y sin datos personales", () => {
    const a = nuevaSesion();
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(nuevaSesion()).not.toBe(a);
  });

  it("lee la cookie entre otras y rechaza formatos raros", () => {
    const v = nuevaSesion();
    expect(valorDeCookie(`a=1; ${COOKIE_SESION}=${v}; b=2`, COOKIE_SESION)).toBe(v);
    expect(valorDeCookie(null, COOKIE_SESION)).toBeUndefined();
    expect(valorDeCookie(`x${COOKIE_SESION}=${v}`, COOKIE_SESION)).toBeUndefined();
    const con = (c: string) => new Request(BASE, { headers: { cookie: c } });
    expect(haySesion(con(`${COOKIE_SESION}=${v}`))).toBe(true);
    expect(haySesion(con(`${COOKIE_SESION}=${v}0`))).toBe(false);
    expect(haySesion(con(`${COOKIE_SESION}=`))).toBe(false);
    expect(haySesion(new Request(BASE))).toBe(false);
  });

  it("la cookie es httpOnly, SameSite=Lax, de 7 días, y Secure solo por https", () => {
    const v = nuevaSesion();
    const https = cookieDeIngreso(v, true);
    expect(https).toContain("HttpOnly");
    expect(https).toContain("SameSite=Lax");
    expect(https).toContain("Max-Age=604800");
    expect(https).toContain("Secure");
    expect(cookieDeIngreso(v, false)).not.toContain("Secure");
    expect(cookieDeSalida(true)).toContain("Max-Age=0");
  });
});

describe("POST /api/ingresar y /api/salir", () => {
  it("ingresar pone la cookie y vuelve al inicio", async () => {
    const r = await ingresar(post("/api/ingresar", { origin: BASE }));
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toBe("/");
    const cookie = r.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(new RegExp(`^${COOKIE_SESION}=[a-f0-9]{64}; `));
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
  });

  it("ingresar y salir rechazan peticiones de otro sitio", async () => {
    expect((await ingresar(post("/api/ingresar", { origin: "https://otro.example" }))).status).toBe(403);
    expect((await salir(post("/api/salir", { origin: "https://otro.example" }))).status).toBe(403);
  });

  it("salir borra la cookie y lleva a /ingresar", async () => {
    const r = await salir(post("/api/salir", { origin: BASE }));
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toBe("/ingresar");
    expect(r.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});

describe("proxy de ingreso", () => {
  const buena = `${COOKIE_SESION}=${"ab12".repeat(16)}`;

  it("sin cookie lleva a /ingresar", () => {
    for (const ruta of ["/", "/deudas", "/lo/que/sea"]) {
      const r = proxy(pagina(ruta));
      expect(r.status).toBe(307);
      expect(new URL(r.headers.get("location") ?? "").pathname).toBe("/ingresar");
    }
  });

  it("con cookie deja pasar, y /ingresar siempre está abierta", () => {
    expect(proxy(pagina("/", buena)).headers.get("location")).toBeNull();
    expect(proxy(pagina("/ingresar")).headers.get("location")).toBeNull();
  });

  it("una cookie con formato malo no abre las páginas", () => {
    expect(proxy(pagina("/", `${COOKIE_SESION}=hola`)).status).toBe(307);
  });

  it("el matcher deja fuera /api, /_next y los archivos estáticos", () => {
    const re = new RegExp(`^${config.matcher[0]}$`);
    for (const libre of [
      "/api/estado",
      "/api/agente",
      "/_next/static/a.js",
      "/manifest.webmanifest",
      "/sw.js",
      "/icono-192.png",
      "/ejemplos/reporte.png",
    ])
      expect(re.test(libre), libre).toBe(false);
    for (const guardada of ["/", "/deudas", "/ingresar"]) expect(re.test(guardada), guardada).toBe(true);
  });
});
