/**
 * Compuerta única de privacidad del navegador.
 *
 * Todo lo que podría sacar datos de este equipo (asistente de IA, voz, dictado,
 * lectura de documentos, avisos push) pregunta aquí antes de hacerlo.
 * Nace CERRADA: si algo falla o nadie la abre, no sale nada.
 * Solo se abre para el caso de ejemplo (Rosa), cuyos datos son inventados.
 * En el caso de práctica se queda cerrada y todo se calcula en el equipo.
 */
let abierta = false;

export function fijarSalidas(permitidas: boolean): void {
  abierta = permitidas;
}

export function salidasPermitidas(): boolean {
  return abierta;
}
