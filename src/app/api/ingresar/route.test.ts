/** Pruebas de POST /api/ingresar: abre la sesión y solo redirige a destinos de una lista cerrada. */
import { describe, expect, it } from "vitest";
import { POST } from "./route";

const BASE = "https://copiloto.test";
const peticion = (cuerpo?: string, cabeceras: Record<string, string> = {}) =>
  new Request(`${BASE}/api/ingresar`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-forwarded-host": "copiloto.test",
      "sec-fetch-site": "same-origin",
      ...cabeceras,
    },
    body: cuerpo,
  });

describe("POST /api/ingresar", () => {
  it("rechaza otro origen sin abrir sesión", async () => {
    const r = await POST(peticion("empezar=demo", { origin: "https://otro.example", "sec-fetch-site": "cross-site" }));
    expect(r.status).toBe(403);
    expect(r.headers.get("set-cookie")).toBeNull();
  });

  it.each([
    ["empezar=demo", "/?empezar=demo"],
    ["empezar=propio", "/?empezar=propio"],
  ])("con %s abre sesión y entra a %s", async (cuerpo, destino) => {
    const r = await POST(peticion(cuerpo));
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toBe(destino);
    expect(r.headers.get("set-cookie")).toMatch(/copiloto_sesion=/);
    expect(r.headers.get("cache-control")).toBe("no-store");
  });

  it.each([
    ["sin cuerpo", undefined],
    ["valor desconocido", "empezar=https://otro.example"],
    ["otro campo", "destino=/admin"],
  ])("%s: entra al inicio, nunca a otro sitio", async (_, cuerpo) => {
    const r = await POST(peticion(cuerpo));
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toBe("/");
  });

  it("un cuerpo demasiado grande no se lee y entra al inicio", async () => {
    const r = await POST(peticion(`empezar=demo&relleno=${"x".repeat(5_000)}`));
    expect(r.headers.get("location")).toBe("/");
  });
});
