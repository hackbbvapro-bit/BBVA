import { afterEach, describe, expect, it, vi } from "vitest";
import { PERFILES } from "../datos/perfiles";
import { analizar } from "../motor";
import { SIN_HECHOS, rutaExplicada, trazarRuta } from "../ruta/ruta";
import { ESPERA_ENTRE_TROZOS_MS, ESPERA_PRIMERA_MS, conversar } from "./agente";
import { fijarSalidas } from "./salidas";

const perfil = PERFILES[0];
const analisis = analizar(perfil);
const ruta = trazarRuta(perfil, analisis, SIN_HECHOS);

describe("asistente sin IA en el celular (compuerta cerrada)", () => {
  it("en Directo responde corto y «Explícame más» amplía la pregunta anterior", async () => {
    fijarSalidas(false);
    const pregunta = { rol: "usuario" as const, texto: "¿Por dónde empiezo?" };
    const directo = await conversar({ perfil, analisis, ruta, estilo: "directo", mensajes: [pregunta] });
    expect(directo.origen).toBe("respaldo");
    expect(directo.texto).not.toContain("Tu ruta es");
    expect(directo.texto).toMatch(/empieza por esto: /);
    const mas = await conversar({
      perfil, analisis, ruta, estilo: "directo",
      mensajes: [pregunta, { rol: "asistente", texto: directo.texto }, { rol: "usuario", texto: "Explícame más sobre eso" }],
    });
    expect(mas.texto).toBe(rutaExplicada(ruta));
    expect(mas.texto.split(/\s+/).length).toBeGreaterThan(directo.texto.split(/\s+/).length * 2);
  });
});

/** Un fetch que nunca responde por su cuenta: solo termina cuando le cortan la señal. */
function fetchColgado(primeraLinea?: string) {
  return vi.fn((_url: string, init: RequestInit) => new Promise<Response>((resolver, rechazar) => {
    const abortado = () => rechazar(new DOMException("cortado", "AbortError"));
    init.signal?.addEventListener("abort", abortado);
    if (primeraLinea === undefined) return;
    const cuerpo = new ReadableStream<Uint8Array>({
      start(control) {
        control.enqueue(new TextEncoder().encode(primeraLinea + "\n"));
        init.signal?.addEventListener("abort", () => control.error(new DOMException("cortado", "AbortError")));
      },
    });
    resolver(new Response(cuerpo, { status: 200 }));
  }));
}

describe("asistente con IA que no responde a tiempo", () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); fijarSalidas(false); });
  const pregunta = [{ rol: "usuario" as const, texto: "¿Por dónde empiezo?" }];

  it("si el servidor no dice nada, al vencer el plazo responde el motor del celular", async () => {
    vi.useFakeTimers();
    fijarSalidas(true);
    vi.stubGlobal("fetch", fetchColgado());
    const respuesta = conversar({ perfil, analisis, ruta, mensajes: pregunta });
    await vi.advanceTimersByTimeAsync(ESPERA_PRIMERA_MS + 10);
    const r = await respuesta;
    expect(r.origen).toBe("respaldo");
    expect(r.texto.length).toBeGreaterThan(20);
  });

  it("si empezó a responder y se queda callado, se queda con lo recibido", async () => {
    vi.useFakeTimers();
    fijarSalidas(true);
    vi.stubGlobal("fetch", fetchColgado(JSON.stringify({ tipo: "texto", texto: "Empieza por tu tarjeta." })));
    const respuesta = conversar({ perfil, analisis, ruta, mensajes: pregunta });
    await vi.advanceTimersByTimeAsync(ESPERA_ENTRE_TROZOS_MS + 10);
    const r = await respuesta;
    expect(r).toMatchObject({ origen: "ia", texto: "Empieza por tu tarjeta." });
  });

  it("si la persona cancela, se propaga la cancelación (no responde el motor)", async () => {
    fijarSalidas(true);
    vi.stubGlobal("fetch", fetchColgado());
    const control = new AbortController();
    const respuesta = conversar({ perfil, analisis, ruta, mensajes: pregunta, senal: control.signal });
    control.abort();
    await expect(respuesta).rejects.toThrow();
  });
});
