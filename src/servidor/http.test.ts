import { describe, expect, it } from "vitest";
import { errorJson, leerJson, leerTextoAcotado, mismoOrigen, visitante } from "./http";

function peticion(cabeceras: Record<string, string>, cuerpo?: string): Request {
  return new Request("https://demo.test/api/x", { method: "POST", headers: cabeceras, body: cuerpo });
}

describe("origen de la petición", () => {
  it("acepta el mismo sitio, también sin Origin si el navegador dice same-origin", () => {
    expect(mismoOrigen(peticion({ host: "demo.test", origin: "https://demo.test" }))).toBe(true);
    expect(mismoOrigen(peticion({ host: "demo.test", "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(mismoOrigen(peticion({ host: "localhost:3000", origin: "http://localhost:3000" }))).toBe(true);
  });

  it("rechaza un POST sin Origin ni Sec-Fetch-Site de mismo sitio", () => {
    expect(mismoOrigen(peticion({ host: "demo.test" }))).toBe(false);
    expect(mismoOrigen(peticion({ host: "demo.test", "sec-fetch-site": "cross-site" }))).toBe(false);
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

describe("leerTextoAcotado", () => {
  /** Cuerpo en trozos y sin content-length: lo que manda un cliente que miente o usa transferencia por partes. */
  function enTrozos(trozos: string[]) {
    let leidos = 0;
    let cancelado = false;
    const cuerpo = new ReadableStream<Uint8Array>({
      pull(control) {
        if (leidos >= trozos.length) { control.close(); return; }
        control.enqueue(new TextEncoder().encode(trozos[leidos++]));
      },
      cancel() { cancelado = true; },
    });
    const req = new Request("https://demo.test/api/x", { method: "POST", body: cuerpo, duplex: "half" } as RequestInit);
    return { req, leidos: () => leidos, cancelado: () => cancelado };
  }

  it("corta en cuanto pasa el tope, sin leer el resto", async () => {
    const flujo = enTrozos(["a".repeat(60), "b".repeat(60), "c".repeat(60), "d".repeat(60)]);
    expect(await leerTextoAcotado(flujo.req, 100)).toBeUndefined();
    expect(flujo.leidos()).toBeLessThan(4);
    expect(flujo.cancelado()).toBe(true);
  });

  it("cuenta bytes, no letras (las tildes pesan dos bytes)", async () => {
    expect(await leerTextoAcotado(peticion({}, "á".repeat(60)), 100)).toBeUndefined();
    expect(await leerTextoAcotado(peticion({}, "á".repeat(50)), 100)).toBe("á".repeat(50));
  });

  it("une bien un cuerpo que llega en trozos", async () => {
    expect(await leerTextoAcotado(enTrozos(['{"a":', '"hola"}']).req, 100)).toBe('{"a":"hola"}');
  });
});
