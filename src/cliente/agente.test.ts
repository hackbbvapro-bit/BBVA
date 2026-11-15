import { describe, expect, it } from "vitest";
import { PERFILES } from "../datos/perfiles";
import { analizar } from "../motor";
import { SIN_HECHOS, rutaExplicada, trazarRuta } from "../ruta/ruta";
import { conversar } from "./agente";
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
