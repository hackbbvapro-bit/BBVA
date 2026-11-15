/**
 * Cómo se dice el costo y el efecto de una jugada. Aquí no se calcula dinero: solo se elige la frase
 * según la certeza del costo que ya fijó el motor. Va aparte de explica.ts para que Mi ruta lo use sin ciclos.
 */
import { formatoSoles } from "../motor";
import type { Jugada } from "../motor";

/**
 * Costo en pocas palabras para una tarjeta o una cifra. Solo lo conocido en cero dice «Sin costo»;
 * lo estimado se marca como aproximado y lo desconocido nunca se muestra como monto.
 */
export function costoCorto(j: Pick<Jugada, "costo" | "certezaCosto">): string {
  if (j.certezaCosto === "desconocido") return "No se sabe";
  if (j.certezaCosto === "estimado") return j.costo > 0 ? `${formatoSoles(j.costo)} aprox.` : "Sin intereses";
  return j.costo > 0 ? formatoSoles(j.costo) : "Sin costo";
}

/** El mismo costo dicho en una frase (avisos, Mi ruta, asistente y voz). */
export function costoEnPalabras(j: Pick<Jugada, "costo" | "certezaCosto">): string {
  if (j.certezaCosto === "desconocido") return "no sabemos cuánto cuesta: depende de la entidad";
  if (j.certezaCosto === "estimado") {
    return j.costo > 0 ? `cuesta unos ${formatoSoles(j.costo)} (estimado)` : "no genera intereses, pero revisa si cobran algún cargo";
  }
  return j.costo > 0 ? `cuesta ${formatoSoles(j.costo)}` : "no cuesta dinero";
}

/** Qué le hace la jugada al día en rojo, en una frase. */
export function efectoEnPalabras(efecto: Jugada["efecto"]): string {
  switch (efecto) {
    case "elimina": return "Con eso ya no quedas en rojo.";
    case "reduce": return "Achica el hueco, pero sola no alcanza para salir del rojo.";
    case "posterga": return "Solo aplaza el problema: el pago se sigue debiendo más adelante.";
    default: return "Sola no alcanza para salir del rojo.";
  }
}
