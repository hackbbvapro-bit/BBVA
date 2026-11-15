import { describe, expect, it } from "vitest";
import { limpiarCompetencia, SOLO_BBVA } from "./competencia";
import { filtrarEventos } from "./filtrar-eventos";
import { validarEstilo } from "./estilo";
import type { EventoAgente } from "./conversar";

describe("solo BBVA", () => {
  it("elimina el caso real completo", () => {
    expect(limpiarCompetencia("Invierte desde tu cuenta BCP. Mira el comparador de la SBS.")).toEqual({ texto: SOLO_BBVA, cambiado: true });
  });
  it.each(["BCP", "BANCO DE CREDITO", "Banco de la Nación", "Interbank", "Scotiabank", "BanBif", "Pichincha", "Mibanco", "Falabella", "Ripley", "GNB", "Citibank", "Santander", "Alfin", "Compartamos", "Caja Arequipa", "Caja Huancayo", "Caja Piura", "Caja Sullana", "Caja Cusco", "Caja Trujillo", "Caja Ica", "Caja Municipal", "Yape", "Tunki", "Lukita", "Ágora", "Ligo", "Tenpo", "Nubank", "comparador de tasas", "Comparabien", "Kambista"])("quita la oración con %s", nombre => {
    expect(limpiarCompetencia(`Consulta ${nombre}. BBVA tiene opciones.`)).toEqual({ texto: "BBVA tiene opciones.", cambiado: true });
  });
  it.each(["la SBS supervisa a los bancos", "Disciplina para ahorrar, sin agorafobia.", "BBVA tiene opciones. Consulta su web.", "Puedes pagar con Plin desde la app BBVA."])("conserva %s exactamente", texto => {
    expect(limpiarCompetencia(texto)).toEqual({ texto, cambiado: false });
  });
  it("filtra nombres partidos antes de cada bloque, preservando cifras y acciones", async () => {
    async function* fuente(): AsyncGenerator<EventoAgente> {
      yield { tipo: "texto", texto: "Usa B" };
      yield { tipo: "texto", texto: "CP. BBVA muestra S/ 119.07. " };
      yield { tipo: "texto", texto: "La SBS supervisa a los bancos." };
      yield { tipo: "fin", origen: "ia" };
    }
    const eventos = [];
    for await (const e of filtrarEventos(fuente())) eventos.push(e);
    expect(eventos.filter(e => e.tipo === "texto").map(e => e.texto).join("")).toBe("BBVA muestra S/ 119.07. La SBS supervisa a los bancos.");
    expect(eventos.at(-1)).toEqual({ tipo: "fin", origen: "ia" });
  });
  it("un flujo completamente filtrado emite el respaldo una sola vez", async () => {
    async function* fuente(): AsyncGenerator<EventoAgente> {
      yield { tipo: "texto", texto: "Consulta Yape. Usa Tunki." };
      yield { tipo: "fin", origen: "ia" };
    }
    const eventos = [];
    for await (const e of filtrarEventos(fuente())) eventos.push(e);
    expect(eventos).toEqual([{ tipo: "texto", texto: SOLO_BBVA }, { tipo: "fin", origen: "ia" }]);
  });
  it("valida el estilo sin aceptar instrucciones arbitrarias", () => {
    for (const dato of [null, undefined, 1, {}, "educativo", "DIRECTO"]) expect(validarEstilo(dato)).toBe("directo");
    expect(validarEstilo("explicado")).toBe("explicado");
  });
});
