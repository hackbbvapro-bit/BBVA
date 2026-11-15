import { extraerFrases } from "../texto/frases";

// Plin NO va en la lista: es un servicio que BBVA ofrece en su app y está en el catálogo oficial.
export const SOLO_BBVA = "Solo puedo orientarte con productos BBVA. Si quieres, te muestro cuál de BBVA te encaja según tus números.";
const nombres = ["BCP", "Banco de Crédito", "Interbank", "Scotiabank", "BanBif", "Banco Pichincha", "Pichincha", "Mibanco", "Banco Falabella", "Falabella", "Ripley", "Banco Ripley", "Banco GNB", "GNB", "Banco de la Nación", "Citibank", "Santander", "Alfin", "Compartamos", "Caja Arequipa", "Caja Huancayo", "Caja Piura", "Caja Sullana", "Caja Cusco", "Caja Trujillo", "Caja Ica", "Caja Municipal", "Yape", "Tunki", "Lukita", "Agora", "Ligo", "Tenpo", "Nubank", "comparador", "Comparabien", "Kambista"];
const normalizar = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const patron = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${nombres.map(normalizar).join("|")})(?![\\p{L}\\p{N}_])`, "u");
export function tieneCompetencia(texto: string): boolean { return patron.test(normalizar(texto)); }
export function limpiarCompetencia(texto: string): { texto: string; cambiado: boolean } {
  if (!tieneCompetencia(texto)) return { texto, cambiado: false };
  const limpio = extraerFrases(texto, true).frases.filter(f => !tieneCompetencia(f)).join("").trim();
  return { texto: /[\p{L}\p{N}]/u.test(limpio) ? limpio : SOLO_BBVA, cambiado: true };
}
