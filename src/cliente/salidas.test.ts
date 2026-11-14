import { afterEach, describe, expect, it, vi } from "vitest";
import { PERFILES } from "@/datos/perfiles";
import { analizar } from "@/motor";
import { conversar } from "./agente";
import { analizarDocumento, ErrorArchivo } from "./archivo";
import { SIN_HECHOS } from "@/ruta/ruta";
import { documentosPermitidos, fijarSalidas, salidasPermitidas } from "./salidas";

const perfil = PERFILES[0];
const analisis = analizar(perfil);
const mensajes = [{ rol: "usuario" as const, texto: "¿Llego a fin de mes?" }];
const archivo = { nombre: "reporte.png", tipo: "image/png", datosBase64: "AAAA" };

afterEach(() => {
  fijarSalidas(false);
  vi.unstubAllGlobals();
});

describe("compuerta de privacidad del navegador", () => {
  it("nace cerrada", () => {
    expect(salidasPermitidas()).toBe(false);
  });

  it("cerrada: conversar responde con el motor del equipo y no llama a fetch", async () => {
    const red = vi.fn();
    vi.stubGlobal("fetch", red);
    const trozos: string[] = [];
    const r = await conversar({ perfil, analisis, mensajes, alTexto: t => trozos.push(t) });
    expect(r.origen).toBe("respaldo");
    expect(r.texto.length).toBeGreaterThan(0);
    expect(trozos.join("")).toBe(r.texto);
    expect(red).not.toHaveBeenCalled();
  });

  it("cerrada: no se envía ningún documento y no llama a fetch", async () => {
    const red = vi.fn();
    vi.stubGlobal("fetch", red);
    await expect(analizarDocumento(archivo)).rejects.toBeInstanceOf(ErrorArchivo);
    expect(red).not.toHaveBeenCalled();
  });

  it("abierta (caso de ejemplo): conversar sí consulta al servidor y, si falla, cae al respaldo", async () => {
    const red = vi.fn().mockRejectedValue(new Error("sin red"));
    vi.stubGlobal("fetch", red);
    fijarSalidas(true);
    const r = await conversar({ perfil, analisis, mensajes });
    expect(red).toHaveBeenCalledTimes(1);
    expect(red.mock.calls[0][0]).toBe("/api/agente");
    expect(r.origen).toBe("respaldo");
    expect(r.texto.length).toBeGreaterThan(0);
  });
});

describe("compuerta de dos niveles: IA y voz por un lado, documentos por otro", () => {
  it("caso propio con permiso: IA y voz abiertas, documentos cerrados y ningún archivo sale", async () => {
    const red = vi.fn();
    vi.stubGlobal("fetch", red);
    fijarSalidas(true, false);
    expect(salidasPermitidas()).toBe(true);
    expect(documentosPermitidos()).toBe(false);
    await expect(analizarDocumento(archivo)).rejects.toBeInstanceOf(ErrorArchivo);
    expect(red).not.toHaveBeenCalled();
  });

  it("los documentos nunca se abren si IA y voz están cerradas", () => {
    fijarSalidas(false, true);
    expect(salidasPermitidas()).toBe(false);
    expect(documentosPermitidos()).toBe(false);
  });

  it("caso de ejemplo: un solo argumento abre las dos, como antes", () => {
    fijarSalidas(true);
    expect(salidasPermitidas()).toBe(true);
    expect(documentosPermitidos()).toBe(true);
  });

  it("conversar envía los hechos y el consentimiento solo cuando la persona lo dio", async () => {
    const red = vi.fn().mockRejectedValue(new Error("sin red"));
    vi.stubGlobal("fetch", red);
    fijarSalidas(true, false);
    await conversar({ perfil, analisis, mensajes, hechos: SIN_HECHOS, consentimiento: true });
    await conversar({ perfil, analisis, mensajes });
    const [con, sin] = red.mock.calls.map(c => JSON.parse(c[1].body));
    expect(con).toMatchObject({ consentimiento: true, hechos: SIN_HECHOS });
    expect(sin).not.toHaveProperty("consentimiento");
    // La ruta nunca viaja: el servidor la vuelve a trazar con sus propias cuentas.
    expect(con).not.toHaveProperty("ruta");
  });
});
