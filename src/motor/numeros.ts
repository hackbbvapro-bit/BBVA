/**
 * Montos escritos como habla la gente: «250», «S/ 180.50», «1.000 soles», «doscientos cincuenta»,
 * «mil quinientos», «2 mil», «cien lucas», «doscientos con cincuenta». Todo se resuelve con código
 * (sin IA) y en céntimos enteros. Si algo no se entiende, devuelve null: nunca adivina.
 */
import { aCentimos, exigirCentimos } from "./dinero";
import type { Centimos } from "./tipos";

const UNIDADES: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22,
  veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28,
  veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80,
  noventa: 90, cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600,
  setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900,
};

/** Palabras que acompañan a un monto sin cambiarlo: moneda y periodicidad. */
const MONEDA = new Set(["s/", "s/.", "s", "sol", "soles", "nuevos", "luca", "lucas", "pen"]);
const RELLENO = new Set(["al", "mes", "mensual", "mensuales", "por", "cada", "aprox", "aproximadamente", "unos", "unas", "como"]);
const CENTIMOS = new Set(["centimo", "centimos", "ctms", "cts"]);

export const LIMITE_MONTO: Centimos = 2_000_000_000;

function sinTildes(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** «1.000», «12.500», «1.250.000»: con puntos cada tres cifras y sin decimales, en soles solo pueden ser miles. */
function cifra(token: string): Centimos | null {
  if (/^\d{1,3}(\.\d{3})+$/.test(token)) return Number(token.replace(/\./g, "")) * 100;
  try {
    return aCentimos(token);
  } catch {
    return null;
  }
}

function separar(texto: string): string[] {
  return sinTildes(texto)
    .replace(/s\/\.?/g, " ")
    .replace(/(\d)\s*(k)\b/g, "$1 mil")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .split(/\s+/)
    .map(t => t.replace(/^[¿?¡!(]+|[¿?¡!),;:]+$/g, ""))
    .filter(t => t.length > 0);
}

/** Lee una secuencia de palabras/números ya separada. Devuelve null si alguna palabra no es parte de un monto. */
function leerTokens(tokens: string[]): Centimos | null {
  const util = tokens.filter(t => !MONEDA.has(t) && !RELLENO.has(t) && t !== "y");
  if (util.length === 0) return null;
  const corte = util.indexOf("con");
  const enteros = corte === -1 ? util : util.slice(0, corte);
  const resto = corte === -1 ? [] : util.slice(corte + 1).filter(t => !CENTIMOS.has(t));
  if (enteros.length === 0) return null;

  let total = 0;
  let actual = 0;
  let vistos = 0;
  for (const t of enteros) {
    if (t === "mil") {
      total += (actual || 100) * 1000;
      actual = 0;
    } else if (t === "millon" || t === "millones") {
      total = (total + (actual || 100)) * 1_000_000;
      actual = 0;
    } else if (t in UNIDADES) {
      actual += UNIDADES[t] * 100;
    } else {
      const c = cifra(t);
      if (c === null) return null;
      actual += c;
    }
    vistos++;
  }
  if (vistos === 0) return null;
  let monto = total + actual;
  if (resto.length > 0) {
    const cents = leerTokens(resto);
    if (cents === null || cents % 100 !== 0 || cents / 100 > 99) return null;
    monto += cents / 100;
  }
  if (!Number.isSafeInteger(monto) || monto < 0 || monto > LIMITE_MONTO) return null;
  exigirCentimos(monto);
  return monto;
}

/** Un monto que ocupa todo el texto («250», «doscientos cincuenta soles», «1.000»). null si no se entiende. */
export function leerMonto(texto: string): Centimos | null {
  const limpio = texto.trim();
  if (!limpio) return null;
  return leerTokens(separar(limpio));
}

const MESES = new Set(["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "septiembre", "octubre", "noviembre", "diciembre", "mes"]);

const ES_PARTE = (t: string) =>
  t in UNIDADES || t === "mil" || t === "millon" || t === "millones" || t === "con" || t === "y" ||
  MONEDA.has(t) || CENTIMOS.has(t) || /^\d[\d.,]*$/.test(t);

/**
 * Busca el primer monto dentro de una frase («me van a dar cien soles por limpiar»). Devuelve el monto y
 * el texto sin él. Una cifra suelta de 1-2 dígitos que es un día («el 20», «20 de noviembre») no cuenta; «50 de luz» sí.
 */
export function buscarMonto(frase: string): { monto: Centimos; resto: string } | null {
  const tokens = separar(frase);
  for (let i = 0; i < tokens.length; i++) {
    if (!ES_PARTE(tokens[i]) || tokens[i] === "y" || tokens[i] === "con" || MONEDA.has(tokens[i]) || CENTIMOS.has(tokens[i])) continue;
    const previo = tokens[i - 1];
    if (/^\d{1,2}$/.test(tokens[i]) && (previo === "el" || previo === "dia" || previo === "los" || (tokens[i + 1] === "de" && MESES.has(tokens[i + 2] ?? "")))) continue;
    if (tokens[i] === "un" || tokens[i] === "una" || tokens[i] === "uno") {
      if (!ES_PARTE(tokens[i + 1] ?? "") || tokens[i + 1] === "y" || tokens[i + 1] === "con") continue;
    }
    let j = i;
    while (j < tokens.length && ES_PARTE(tokens[j])) j++;
    // No terminar en un conector.
    let fin = j;
    while (fin > i && (tokens[fin - 1] === "y" || tokens[fin - 1] === "con")) fin--;
    const monto = leerTokens(tokens.slice(i, fin));
    if (monto !== null && monto > 0) {
      return { monto, resto: [...tokens.slice(0, i), ...tokens.slice(fin)].join(" ") };
    }
  }
  return null;
}

/** Un monto aproximado: un número solo (min = max) o un rango («entre 1500 y 3000»). */
export interface Aproximado {
  min: Centimos;
  max: Centimos;
}

/** Palabras que pueden ir entre los dos extremos de un rango: «de 1500 a 2500», «a veces 1000 a veces 3000». */
const ENTRE_EXTREMOS = new Set(["a", "hasta", "o", "u", "y", "entre", "veces", "de", "al", "mas", "menos"]);
/** Respuestas que significan cero en una pregunta de soles: «no», «nada», «no pago». */
const CERO = /^(no|nada|ninguno|ninguna|cero|nunca|no tengo|no pago|no gasto|no apoyo|no estudio|no aplica|no,? nada|nada por ahora|por ahora no|no por ahora)$/;

/**
 * Lee lo que escribe alguien cuyo ingreso o gasto cambia mes a mes: «2500 pero es variable», «más o menos 2 mil»,
 * «entre 1500 y 3000», «de 1500 a 2500», «2000-3000», «entre dos mil y tres mil». Devuelve null si no hay
 * monto o si hay dos montos que no forman un rango («2000 y en diciembre 4000»): nunca suma ni adivina.
 */
export function leerAproximado(texto: string): Aproximado | null {
  const limpio = texto.trim();
  if (!limpio) return null;
  const tokens = separar(limpio.replace(/(\d)\s*[-–—]\s*(\d)/g, "$1 a $2"));
  const montos: { aprox: Aproximado; desde: number; hasta: number }[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!ES_PARTE(t) || t === "y" || t === "con" || MONEDA.has(t) || CENTIMOS.has(t)) continue;
    const previo = tokens[i - 1];
    if (/^\d{1,2}$/.test(t) && (previo === "el" || previo === "dia" || previo === "los" || (tokens[i + 1] === "de" && MESES.has(tokens[i + 2] ?? "")))) continue;
    if ((t === "un" || t === "una" || t === "uno") && (!ES_PARTE(tokens[i + 1] ?? "") || tokens[i + 1] === "y" || tokens[i + 1] === "con")) continue;
    let j = i;
    while (j < tokens.length && ES_PARTE(tokens[j])) j++;
    let fin = j;
    while (fin > i && (tokens[fin - 1] === "y" || tokens[fin - 1] === "con")) fin--;
    const tramo = tokens.slice(i, fin);
    const aprox = leerTramo(tramo);
    if (aprox === null) return null;
    montos.push({ aprox, desde: i, hasta: fin });
    i = fin - 1;
  }
  if (montos.length === 0) return CERO.test(sinTildes(limpio).replace(/[.!¡¿?]/g, "").trim()) ? { min: 0, max: 0 } : null;
  if (montos.length === 1) return montos[0].aprox;
  if (montos.length > 2) return null;
  const [a, b] = montos;
  const enMedio = tokens.slice(a.desde < b.desde ? a.hasta : b.hasta, b.desde);
  if (a.aprox.min !== a.aprox.max || b.aprox.min !== b.aprox.max) return null;
  if (!enMedio.every(t => ENTRE_EXTREMOS.has(t))) return null;
  return { min: Math.min(a.aprox.min, b.aprox.min), max: Math.max(a.aprox.min, b.aprox.min) };
}

/**
 * Un tramo seguido de palabras de monto. Si tiene una «y» que separa dos montos de menor a mayor, es un rango
 * («dos mil y tres mil»); si no, es un solo monto («treinta y cinco», «dos mil y quinientos»).
 */
function leerTramo(tramo: string[]): Aproximado | null {
  // Dos cifras seguidas («1500 2000») no se pueden leer sin adivinar.
  const cifras = tramo.filter(t => !MONEDA.has(t));
  for (let k = 1; k < cifras.length; k++) if (/^\d/.test(cifras[k - 1]) && /^\d/.test(cifras[k])) return null;
  for (let k = tramo.length - 1; k > 0; k--) {
    if (tramo[k] !== "y") continue;
    const izquierda = leerTokens(tramo.slice(0, k));
    const derecha = leerTokens(tramo.slice(k + 1));
    if (izquierda === null || derecha === null) continue;
    if (izquierda < derecha) return { min: izquierda, max: derecha };
    // «3000 y 1500» en cifras nunca es una suma: es un rango dicho al revés.
    const soloCifras = (lado: string[]) => lado.filter(t => !MONEDA.has(t)).every(t => /^\d/.test(t));
    if (soloCifras(tramo.slice(0, k)) && soloCifras(tramo.slice(k + 1))) return { min: derecha, max: izquierda };
  }
  const monto = leerTokens(tramo);
  return monto === null ? null : { min: monto, max: monto };
}
