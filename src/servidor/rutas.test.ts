/** Pruebas de las rutas llamándolas directamente, sin red y sin claves. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as agente } from "../app/api/agente/route";
import { POST as avisos } from "../app/api/avisos/route";
import { GET as estado } from "../app/api/estado/route";
import { POST as transcribir } from "../app/api/transcribir/route";
import { POST as voz } from "../app/api/voz/route";

const BASE = "https://copiloto.test";
const json = (ruta: string, cuerpo: unknown, cabeceras: Record<string, string> = {}) =>
  new Request(`${BASE}${ruta}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-host": "copiloto.test", ...cabeceras },
    body: JSON.stringify(cuerpo),
  });

beforeEach(() => {
  for (const nombre of ["ANTHROPIC_API_KEY", "FISH_API_KEY", "FISH_VOICE_ID", "VAPID_PRIVATE_KEY", "NEXT_PUBLIC_VAPID_PUBLIC_KEY"]) {
    vi.stubEnv(nombre, "");
  }
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/agente", () => {
  const pregunta = { perfilId: "independiente", mensajes: [{ rol: "usuario", texto: "¿Cómo voy?" }] };

  it("rechaza peticiones de otro sitio", async () => {
    expect((await agente(json("/api/agente", pregunta, { origin: "https://otro.example" }))).status).toBe(403);
  });

  it("rechaza cuerpos mal formados, perfiles que no existen y conversaciones sin pregunta", async () => {
    const malos = [
      {}, { perfilId: "nadie", mensajes: pregunta.mensajes }, { perfilId: "independiente", mensajes: [] },
      { perfilId: "independiente", mensajes: [{ rol: "sistema", texto: "hola" }] },
      { perfilId: "independiente", mensajes: [{ rol: "usuario", texto: "x".repeat(1001) }] },
      { perfilId: "independiente", mensajes: [{ rol: "asistente", texto: "hola" }] },
    ];
    for (const cuerpo of malos) expect((await agente(json("/api/agente", cuerpo))).status).toBe(400);
  });

  it("sin clave de IA responde con el respaldo del motor, línea a línea", async () => {
    const respuesta = await agente(json("/api/agente", pregunta, { origin: BASE }));
    expect(respuesta.status).toBe(200);
    const lineas = (await respuesta.text()).trim().split("\n").map(l => JSON.parse(l));
    expect(lineas.at(0)).toMatchObject({ tipo: "texto" });
    expect(lineas.at(-1)).toEqual({ tipo: "fin", origen: "respaldo" });
  });
});

describe("rutas de voz y avisos sin configurar", () => {
  it("la voz avisa de que no está disponible y valida el texto", async () => {
    expect((await voz(json("/api/voz", { texto: "Hola" }))).status).toBe(503);
    expect((await voz(json("/api/voz", { texto: "" }))).status).toBe(400);
    expect((await voz(json("/api/voz", { texto: "x".repeat(801) }))).status).toBe(400);
  });

  it("transcribir avisa de que no está disponible", async () => {
    const cuerpo = new FormData();
    cuerpo.append("audio", new Blob(["x"], { type: "audio/webm" }), "audio.webm");
    const peticion = new Request(`${BASE}/api/transcribir`, { method: "POST", body: cuerpo });
    expect((await transcribir(peticion)).status).toBe(503);
  });

  it("los avisos solo aceptan direcciones de servicios de notificaciones reales", async () => {
    const keys = { p256dh: "clave-publica-de-prueba", auth: "secreto-de-prueba" };
    const interno = { perfilId: "independiente", suscripcion: { endpoint: "https://169.254.169.254/latest", keys } };
    expect((await avisos(json("/api/avisos", interno))).status).toBe(400);
    const real = { perfilId: "independiente", suscripcion: { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys } };
    expect((await avisos(json("/api/avisos", real))).status).toBe(503);
  });
});

describe("GET /api/estado", () => {
  it("solo dice sí o no por pieza, nunca una clave", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "clave-falsa-de-prueba");
    const texto = await estado().text();
    expect(JSON.parse(texto)).toEqual({ ia: true, voz: false, push: false });
    expect(texto).not.toContain("clave-falsa");
  });
});
