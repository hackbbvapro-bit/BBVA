/** La voz: el texto se parte en un arranque corto y el resto, y suena en orden sin perder nada. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { paraVoz } from "../explica/explica";

const RESPUESTA =
  "Andrea, llegas a fin de mes, pero con un bache: el lunes 23 de noviembre te faltarían S/ 119.07, porque ese día salen juntos el alquiler de S/ 850.00 y el pago de la Tarjeta Azul de S/ 600.00. La opción más barata es pausar tus suscripciones este mes: streaming, gimnasio y música en línea. Liberas S/ 161.80 y no te cuesta intereses. Tu paso de hoy es pausarlas desde la app de cada servicio antes del 16.";

interface AudioFalso { src: string; paused: boolean; onended: (() => void) | null; play: () => Promise<void>; pause: () => void }
let audios: AudioFalso[] = [];
let sonados: string[] = [];
let leidoPorNavegador: string[] = [];
let pedidos: string[] = [];
/** Qué responde el servidor de voz a cada texto: true = audio, false = fallo. */
let servidor: (texto: string) => boolean = () => true;

async function cargar() {
  const voz = await import("./voz");
  const { fijarSalidas } = await import("./salidas");
  fijarSalidas(true);
  return voz;
}
const reproductor = () => audios[0];
const terminarAudio = async () => { reproductor().onended?.(); await new Promise(r => setTimeout(r, 0)); };

beforeEach(() => {
  vi.resetModules();
  audios = []; sonados = []; leidoPorNavegador = []; pedidos = [];
  servidor = () => true;
  class Audio implements AudioFalso {
    src = ""; paused = true; onended: (() => void) | null = null;
    constructor() { audios.push(this); }
    play() { this.paused = false; sonados.push(this.src); return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  class SpeechSynthesisUtterance { voice = null; lang = ""; rate = 1; onend: (() => void) | null = null; onerror = null; constructor(public text: string) {} }
  const speechSynthesis = {
    getVoices: () => [], cancel: () => undefined,
    speak: (f: SpeechSynthesisUtterance) => { leidoPorNavegador.push(f.text); f.onend?.(); },
  };
  vi.stubGlobal("window", { speechSynthesis });
  vi.stubGlobal("Audio", Audio);
  vi.stubGlobal("SpeechSynthesisUtterance", SpeechSynthesisUtterance);
  vi.spyOn(URL, "createObjectURL").mockImplementation(b => `blob:${(b as unknown as { texto: string }).texto}`);
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init: { body: string }) => {
    const { texto } = JSON.parse(init.body) as { texto: string };
    pedidos.push(texto);
    if (!servidor(texto)) return { ok: false, status: 502 };
    return { ok: true, status: 200, blob: async () => ({ size: 10, texto }) };
  }));
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("partirParaVoz", () => {
  it("un texto corto no se parte", async () => {
    const { partirParaVoz } = await cargar();
    const corto = "No, hoy no te alcanza. Mejor espera al viernes.";
    expect(partirParaVoz(corto)).toEqual([corto]);
  });

  it("una respuesta normal se parte en un arranque corto y el resto, en un fin de frase y sin perder texto", async () => {
    const { partirParaVoz } = await cargar();
    const texto = paraVoz(RESPUESTA);
    const partes = partirParaVoz(texto);
    expect(partes).toHaveLength(2);
    expect(partes.join(" ")).toBe(texto);
    expect(partes[0].length).toBeGreaterThanOrEqual(140);
    expect(partes[0].length).toBeLessThan(texto.length / 2);
    expect(partes[0]).toMatch(/[.!?…]$/);
  });

  it("no corta dentro de un número con decimales ni de un monto", async () => {
    const { partirParaVoz } = await cargar();
    const texto = `${"La tasa es 12.5 por ciento y el monto es 1.250 soles en total para este mes de prueba, ".repeat(2)}eso es todo. ${"Luego viene el resto de la explicación con más detalle. ".repeat(3)}`.trim();
    const partes = partirParaVoz(texto);
    expect(partes.join(" ")).toBe(texto);
    for (const parte of partes) expect(parte).not.toMatch(/\d\.$/);
  });

  it("si lo que queda tras el arranque es muy poco, no se parte", async () => {
    const { partirParaVoz } = await cargar();
    const texto = `${"a".repeat(150)}. Fin corto.`;
    expect(partirParaVoz(texto)).toEqual([texto]);
  });
});

describe("hablar", () => {
  it("pide las dos partes a la vez, suena primero el arranque y avisa solo al terminar la última", async () => {
    const { hablar, partirParaVoz } = await cargar();
    const partes = partirParaVoz(paraVoz(RESPUESTA));
    const alTerminar = vi.fn();
    expect(await hablar(RESPUESTA, alTerminar)).toBe("fish");
    expect(pedidos).toEqual(partes);
    expect(sonados).toEqual([`blob:${partes[0]}`]);
    expect(alTerminar).not.toHaveBeenCalled();
    await terminarAudio();
    expect(sonados).toEqual([`blob:${partes[0]}`, `blob:${partes[1]}`]);
    expect(alTerminar).not.toHaveBeenCalled();
    await terminarAudio();
    expect(alTerminar).toHaveBeenCalledTimes(1);
    expect(leidoPorNavegador).toEqual([]);
  });

  it("si falla la segunda parte, el resto lo dice la voz del celular y no se pierde nada", async () => {
    const { hablar, partirParaVoz } = await cargar();
    const partes = partirParaVoz(paraVoz(RESPUESTA));
    servidor = texto => texto === partes[0];
    const alTerminar = vi.fn();
    expect(await hablar(RESPUESTA, alTerminar)).toBe("fish");
    await terminarAudio();
    expect(leidoPorNavegador).toEqual([partes[1]]);
    expect(alTerminar).toHaveBeenCalledTimes(1);
  });

  it("si falla la primera parte, todo el texto lo dice la voz del celular una sola vez", async () => {
    const { hablar } = await cargar();
    servidor = () => false;
    const alTerminar = vi.fn();
    expect(await hablar(RESPUESTA, alTerminar)).toBe("navegador");
    expect(leidoPorNavegador).toEqual([paraVoz(RESPUESTA)]);
    expect(sonados).toEqual([]);
    expect(alTerminar).toHaveBeenCalledTimes(1);
  });

  it("si la persona calla la voz en medio, la segunda parte no suena ni se avisa el final", async () => {
    const { hablar, callar } = await cargar();
    const alTerminar = vi.fn();
    await hablar(RESPUESTA, alTerminar);
    callar();
    await terminarAudio();
    expect(sonados).toHaveLength(1);
    expect(alTerminar).not.toHaveBeenCalled();
    expect(leidoPorNavegador).toEqual([]);
  });

  it("con la compuerta de privacidad cerrada no pide voz ni suena nada", async () => {
    const { hablar } = await cargar();
    const { fijarSalidas } = await import("./salidas");
    fijarSalidas(false);
    const alTerminar = vi.fn();
    expect(await hablar(RESPUESTA, alTerminar)).toBe("ninguna");
    expect(pedidos).toEqual([]);
    expect(alTerminar).toHaveBeenCalledTimes(1);
  });
});
