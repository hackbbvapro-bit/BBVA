/**
 * Fidelidad de una respuesta del asistente: extrae los montos, porcentajes, fechas y plazos que menciona
 * y dice cuáles NO aparecen en la fuente (lo que devolvieron las herramientas del motor más la pregunta).
 * Es una alarma automática para revisar a mano, no una sentencia: compara texto, no entiende el sentido.
 */
const MESES = "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre";
const aCentesimas = (texto: string) => Math.round(Number(texto.replace(/,/g, "")) * 100);

/** Montos en céntimos: «S/ 1,234.50» y «300 soles». El signo no se compara. */
export function montos(texto: string): number[] {
  const conSimbolo = [...texto.matchAll(/S\/\.?\s?(\d[\d,]*(?:\.\d{1,2})?)/g)].map(m => aCentesimas(m[1]));
  const conPalabra = [...texto.matchAll(/(\d[\d,]*(?:\.\d{1,2})?)\s+(?:soles|sol)\b/g)].map(m => aCentesimas(m[1]));
  return [...conSimbolo, ...conPalabra];
}

/** Porcentajes en centésimas de punto: «109.00 %», «30 %» y «30 por ciento». */
export function porcentajes(texto: string): number[] {
  return [...texto.matchAll(/(\d+(?:[.,]\d+)?)\s?(?:%|por ciento)/g)].map(m => Math.round(Number(m[1].replace(",", ".")) * 100));
}

/** Fechas dichas como «14 de mayo». */
export function fechas(texto: string): string[] {
  return [...texto.matchAll(new RegExp(`(\\d{1,2}) de (${MESES})`, "gi"))].map(
    m => `${Number(m[1])} de ${m[2].toLowerCase().replace("setiembre", "septiembre")}`,
  );
}

/** Plazos dichos como «15 meses» o «10 días». */
export function plazos(texto: string): number[] {
  return [...texto.matchAll(/(\d+)\s+(?:meses|mes|días|día|semanas|semana)\b/g)].map(m => Number(m[1]));
}

/** Enteros sueltos de la fuente (días, meses, conteos). Antes se quitan montos y decimales para que «S/ 277.06» no aporte un 6. */
function enteros(texto: string): number[] {
  const sinDinero = texto.replace(/S\/\.?\s?\d[\d,]*(?:\.\d{1,2})?/g, " ").replace(/\d[\d,]*\.\d+/g, " ");
  return [...sinDinero.matchAll(/\d+/g)].map(m => Number(m[0]));
}

export interface SinVerificar {
  montos: string[];
  porcentajes: string[];
  fechas: string[];
  plazos: number[];
}

/**
 * Lo que la respuesta dice y la fuente no contiene. `plazosAdmitidos` son números que vienen del producto
 * o de la pregunta sin estar en los datos (por ejemplo 7 por «esta semana» y 30 por «los próximos 30 días»).
 */
export function sinVerificar(respuesta: string, fuente: string, plazosAdmitidos: readonly number[] = []): SinVerificar {
  const m = new Set(montos(fuente));
  const p = new Set(porcentajes(fuente));
  const f = new Set(fechas(fuente));
  const n = new Set([...enteros(fuente), ...plazosAdmitidos]);
  return {
    montos: montos(respuesta).filter(x => !m.has(x)).map(x => (x / 100).toFixed(2)),
    porcentajes: porcentajes(respuesta).filter(x => !p.has(x)).map(x => `${x / 100} %`),
    fechas: fechas(respuesta).filter(x => !f.has(x)),
    plazos: plazos(respuesta).filter(x => !n.has(x)),
  };
}

export function totalSinVerificar(s: SinVerificar): number {
  return s.montos.length + s.porcentajes.length + s.fechas.length + s.plazos.length;
}
