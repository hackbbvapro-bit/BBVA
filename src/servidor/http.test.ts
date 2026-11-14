import { describe, expect, it } from "vitest";
import { errorJson, leerJson, mismoOrigen, visitante } from "./http";

function peticion(cabeceras: Record<string, string>, cuerpo?: string): Request {
  return new Request("https://demo.test/api/x", { method: "POST", headers: cabeceras, body: cuerpo });
}

describe("origen de la petición", () => {
  it("acepta el mismo sitio y las llamadas sin cabecera Origin", () => {
    expect(mismoOrigen(peticion({ host: "demo.test", origin: "https://demo.test" }))).toBe(true);
    expect(mismoOrigen(peticion({ host: "demo.test" }))).toBe(true);
    expect(mismoOrigen(peticion({ host: "localhost:3000", origin: "http://localhost:3000" }))).toBe(true);
  });

  it("rechaza otra web y un Origin ilegible", () => {
    expect(mismoOrigen(peticion({ host: "demo.test", origin: "https://otra.test" }))).toBe(false);
    expect(mismoOrigen(peticion({ host: "demo.test", origin: "null" }))).toBe(false);
  });
});

describe("visitante", () => {
  it("usa la IP que fija la plataforma y, si no hay, un valor fijo", () => {
    expect(visitante(peticion({ "x-real-ip": "203.0.113.7" }))).toBe("203.0.113.7");
    expect(visitante(peticion({ "x-vercel-forwarded-for": "203.0.113.5, 10.0.0.1" }))).toBe("203.0.113.5");
    expect(visitante(peticion({}))).toBe("local");
  });

  it("ignora x-forwarded-for: dos valores distintos comparten cupo y no se puede rotar la IP", () => {
    const a = visitante(peticion({ "x-forwarded-for": "198.51.100.1" }));
    const b = visitante(peticion({ "x-forwarded-for": "198.51.100.2" }));
    expect(a).toBe("local");
    expect(b).toBe(a);
  });
});

describe("cuerpo JSON", () => {
  it("lee un cuerpo válido", async () => {
    expect(await leerJson(peticion({}, '{"a":1}'))).toEqual({ a: 1 });
  });

  it("devuelve undefined si no es JSON o si es demasiado grande", async () => {
    expect(await leerJson(peticion({}, "hola"))).toBeUndefined();
    expect(await leerJson(peticion({}, JSON.stringify({ a: "x".repeat(200) })), 100)).toBeUndefined();
  });
});

describe("errores", () => {
  it("solo exponen un código corto", async () => {
    const respuesta = errorJson("voz_no_disponible", 503);
    expect(respuesta.status).toBe(503);
    expect(await respuesta.json()).toEqual({ error: "voz_no_disponible" });
    expect(respuesta.headers.get("cache-control")).toBe("no-store");
  });
});
