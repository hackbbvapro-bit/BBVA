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

  it("una respuesta normal se parte por frases sin perder texto", async () => {
    const { partirParaVoz } = await cargar();
    const texto = paraVoz(RESPUESTA);
    const partes = partirParaVoz(texto);
    expect(partes.length).toBeGreaterThanOrEqual(2);
    expect(partes.join(" ")).toBe(texto);
    expect(partes[0].length).toBeGreaterThanOrEqual(60);
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
  it("precarga un trozo, suena en orden y avisa solo al terminar el último", async () => {
    const { hablar, partirParaVoz } = await cargar();
    const partes = partirParaVoz(paraVoz(RESPUESTA));
    const alTerminar = vi.fn();
    expect(await hablar(RESPUESTA, alTerminar)).toBe("fish");
    expect(pedidos).toEqual(partes.slice(0, 2));
    expect(sonados).toEqual([`blob:${partes[0]}`]);
    expect(alTerminar).not.toHaveBeenCalled();
    await terminarAudio();
    expect(sonados).toEqual([`blob:${partes[0]}`, `blob:${partes[1]}`]);
    expect(alTerminar).not.toHaveBeenCalled();
    for (let i = 1; i < partes.length; i++) await terminarAudio();
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
    expect(leidoPorNavegador).toEqual(partes.slice(1));
    expect(pedidos.filter(t => t === partes[1])).toHaveLength(2);
    expect(alTerminar).toHaveBeenCalledTimes(1);
  });

  it("si falla la primera parte, todo el texto lo dice la voz del celular una sola vez", async () => {
    const { hablar, partirEnFrases } = await cargar();
    servidor = () => false;
    const alTerminar = vi.fn();
    expect(await hablar(RESPUESTA, alTerminar)).toBe("navegador");
    expect(leidoPorNavegador).toEqual(partirEnFrases(paraVoz(RESPUESTA)));
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

describe("voz en vivo y textos largos", () => {
  it("conserva más de 800 caracteres, sin superar el límite por petición", async () => {
    const { partirEnFrases } = await cargar();
    const texto = "Una frase larga para explicar las opciones BBVA sin perder palabras. ".repeat(30).trim();
    const partes = partirEnFrases(texto);
    expect(partes.join(" ")).toBe(texto);
    expect(partes.every(p => p.length <= 180)).toBe(true);
    const sinPuntos = "palabra ".repeat(250).trim();
    expect(partirEnFrases(sinPuntos).join(" ")).toBe(sinPuntos);
    expect(partirEnFrases(sinPuntos).every(p => p.length <= 800)).toBe(true);
  });
  it("espera el fin de la respuesta aunque la primera frase ya haya sonado", async () => {
    const { hablarEnVivo } = await cargar();
    const fin = vi.fn();
    const sesion = hablarEnVivo(fin);
    sesion.agregar("Una frase todavía incompleta");
    expect(pedidos).toEqual([]);
    sesion.agregar(". Otra ");
    expect(await sesion.inicio).toBe("fish");
    await terminarAudio();
    expect(fin).not.toHaveBeenCalled();
    sesion.agregar("frase completa.");
    sesion.terminar();
    await new Promise(r => setTimeout(r, 0));
    await terminarAudio();
    expect(fin).toHaveBeenCalledTimes(1);
  });
  it("precarga como máximo dos trozos mientras suena el primero", async () => {
    const { hablar } = await cargar();
    await hablar(RESPUESTA.repeat(10));
    expect(pedidos).toHaveLength(2);
  });
  it("un fallo intermedio recuperado mantiene Fish", async () => {
    const { hablar, partirEnFrases } = await cargar();
    const partes = partirEnFrases(paraVoz(RESPUESTA));
    let intento = 0;
    servidor = t => t !== partes[1] || ++intento > 1;
    await hablar(RESPUESTA);
    await terminarAudio();
    expect(intento).toBe(2);
    expect(leidoPorNavegador).toEqual([]);
    expect(sonados[1]).toBe(`blob:${partes[1]}`);
  });
});

it("callar cancela también una petición pendiente y no deja arrancar su audio", async () => {
  const { hablar, callar } = await cargar();
  let responder!: (r: unknown) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise(r => { responder = r; })));
  const fin = vi.fn();
  const inicio = hablar("Una sola frase.", fin);
  callar();
  responder({ ok: true, blob: async () => ({ size: 10, texto: "Una sola frase." }) });
  expect(await inicio).toBe("ninguna");
  await new Promise(r => setTimeout(r, 0));
  expect(sonados).toEqual([]);
  expect(fin).not.toHaveBeenCalled();
});

it("el navegador lee todo un texto de más de 800 caracteres", async () => {
  const { hablar } = await cargar();
  servidor = () => false;
  const texto = "Puedes consultar las opciones disponibles de BBVA en su web oficial. ".repeat(30).trim();
  const fin = vi.fn();
  expect(await hablar(texto, fin)).toBe("navegador");
  expect(leidoPorNavegador.join(" ")).toBe(texto);
  expect(fin).toHaveBeenCalledTimes(1);
});
