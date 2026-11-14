/**
 * Compuerta única de privacidad del navegador. Todo lo que podría sacar datos de este equipo pregunta aquí
 * antes de hacerlo. Nace CERRADA: si algo falla o nadie la abre, no sale nada. Tiene dos niveles:
 *   - IA y voz (asistente, voz, dictado): se abre en el caso de ejemplo (Rosa, inventada) y en un caso armado
 *     por la persona SOLO si aceptó expresamente enviar ese caso inventado a servicios externos.
 *   - Documentos y avisos remotos (lectura de archivos, suscripción push): solo en el caso de ejemplo. En un
 *     caso armado por la persona no se abre nunca: un archivo real podría traer datos personales.
 */
let abierta = false;
let documentos = false;

/** `conDocumentos` nunca puede abrirse si la primera compuerta está cerrada. */
export function fijarSalidas(permitidas: boolean, conDocumentos: boolean = permitidas): void {
  abierta = permitidas;
  documentos = permitidas && conDocumentos;
}

/** IA, voz y dictado. */
export function salidasPermitidas(): boolean {
  return abierta;
}

/** Envío de archivos y suscripción a avisos remotos. */
export function documentosPermitidos(): boolean {
  return documentos;
}
