import type { EventoAgente } from "./conversar";
import { extraerFrases } from "../texto/frases";
import { limpiarCompetencia, SOLO_BBVA, tieneCompetencia } from "./competencia";

/** Ningún fragmento sin revisar cruza el límite NDJSON, tampoco si un nombre llega partido. */
export async function* filtrarEventos(eventos: AsyncIterable<EventoAgente>): AsyncGenerator<EventoAgente> {
  let pendiente = "";
  let enviado = false;
  let eliminado = false;
  function* vaciar(final: boolean): Generator<EventoAgente> {
    const { frases, resto } = extraerFrases(pendiente, final);
    pendiente = resto;
    for (const frase of frases) {
      if (tieneCompetencia(frase)) { eliminado = true; continue; }
      if (frase.trim()) { enviado = true; yield { tipo: "texto", texto: limpiarCompetencia(frase).texto }; }
    }
    if (final && eliminado && !enviado) { enviado = true; yield { tipo: "texto", texto: SOLO_BBVA }; }
  }
  for await (const evento of eventos) {
    if (evento.tipo === "texto") { pendiente += evento.texto; yield* vaciar(false); }
    else { if (evento.tipo === "fin") yield* vaciar(true); yield evento; }
  }
  yield* vaciar(true);
}
