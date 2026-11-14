import { afterEach, describe, expect, it, vi } from "vitest";
import { PERFILES } from "@/datos/perfiles";
import { analizar } from "@/motor";
import { conversar } from "./agente";
import { analizarDocumento, ErrorArchivo } from "./archivo";
import { fijarSalidas, salidasPermitidas } from "./salidas";

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
