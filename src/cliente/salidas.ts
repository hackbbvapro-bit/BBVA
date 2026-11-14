/**
 * Compuerta única de privacidad del navegador. Todo lo que podría sacar datos de este equipo pregunta aquí
 * antes de hacerlo. Nace CERRADA: si algo falla o nadie la abre, no sale nada. Tiene dos niveles:
 *   - IA y voz (asistente, voz, dictado y lectura de un archivo): se abre en el caso de ejemplo (Rosa, inventada)
 *     y en un caso armado por la persona SOLO si aceptó expresamente enviar ese caso inventado a servicios
 *     externos. Un archivo necesita además que la persona declare, cada vez, que el documento es inventado
 *     (ver `analizarDocumento`); el servidor vuelve a exigir esa declaración.
 *   - Avisos remotos (suscripción push): solo en el caso de ejemplo. En un caso armado por la persona no se
 *     abre nunca.
 */
let abierta = false;
let avisos = false;

/** `conAvisos` nunca puede abrirse si la primera compuerta está cerrada. */
export function fijarSalidas(permitidas: boolean, conAvisos: boolean = permitidas): void {
  abierta = permitidas;
  avisos = permitidas && conAvisos;
}

/** IA, voz, dictado y lectura de archivos declarados como inventados. */
export function salidasPermitidas(): boolean {
  return abierta;
}

/** Suscripción a avisos remotos (push). */
export function avisosRemotosPermitidos(): boolean {
  return avisos;
}
