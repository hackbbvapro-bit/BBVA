import type { Centimos, PuntosBasicos } from "./tipos";

/** Lanza si el valor no es un entero seguro: así un decimal nunca se cuela en una suma. */
export function exigirCentimos(valor: number, nombre = "monto"): Centimos {
  if (!Number.isSafeInteger(valor)) {
    throw new Error(`${nombre} debe ser un entero de céntimos, llegó: ${valor}`);
  }
  return valor;
}

/**
 * Convierte texto en soles a céntimos sin pasar por decimales de máquina.
 * Acepta "1234.56", "1,234.56", "S/ 180", "-45.5" y también la coma decimal de los teclados en
 * español: "12,50" y "1.234,56". Un separador seguido de 1 o 2 dígitos al final es el decimal; el otro
 * solo vale como separador de miles en grupos de 3. Sin decimales, los miles van con coma ("1,250");
 * "1.250" es ambiguo y se rechaza.
 */
export function aCentimos(texto: string): Centimos {
  const limpio = texto.replace(/S\/\.?/i, "").replace(/\s/g, "");
  const m = /^(-)?([\d.,]+?)(?:([.,])(\d{1,2}))?$/.exec(limpio);
  if (!m) throw new Error(`Monto no válido: "${texto}"`);
  const separadorMiles = m[3] === "," ? "." : ",";
  const conMiles = new RegExp(`^\\d{1,3}(?:\\${separadorMiles}\\d{3})+$`);
  if (!/^\d+$/.test(m[2]) && !conMiles.test(m[2])) throw new Error(`Monto no válido: "${texto}"`);
  const enteros = Number(m[2].replace(/[.,]/g, ""));
  const decimales = Number((m[4] ?? "").padEnd(2, "0"));
  const total = enteros * 100 + decimales;
  return m[1] ? -total : total;
}

/** Atajo para escribir datos: soles(180) = 18000; soles(12, 50) = 1250. */
export function soles(enteros: number, centimos = 0): Centimos {
  exigirCentimos(enteros, "soles");
  exigirCentimos(centimos, "céntimos");
  if (centimos < 0 || centimos > 99) throw new Error("Los céntimos van de 0 a 99");
  return enteros < 0 ? enteros * 100 - centimos : enteros * 100 + centimos;
}

/** "S/ 1,234.56" (formato peruano). Negativos: "-S/ 180.00". */
export function formatoSoles(monto: Centimos, opciones: { sinDecimales?: boolean } = {}): string {
  exigirCentimos(monto);
  const abs = Math.abs(monto);
  const enteros = Math.floor(abs / 100);
  const cent = abs % 100;
  const miles = String(enteros).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const signo = monto < 0 ? "-" : "";
  if (opciones.sinDecimales && cent === 0) return `${signo}S/ ${miles}`;
  return `${signo}S/ ${miles}.${String(cent).padStart(2, "0")}`;
}

export function sumar(montos: readonly Centimos[]): Centimos {
  let total = 0;
  for (const m of montos) total += exigirCentimos(m);
  return total;
}

/** Redondeo al céntimo más cercano (mitades hacia arriba en valor absoluto). */
export function redondear(valor: number): Centimos {
  const r = Math.sign(valor) * Math.round(Math.abs(valor));
  return r === 0 ? 0 : r;
}

/**
 * Monto semanal llevado a un mes típico (× 52 / 12), redondeado al sol. Es una estimación —un mes no tiene semanas
 * exactas—, así que no se finge precisión de céntimos: 415.38 por semana son S/ 1,800 al mes, no S/ 1,799.98.
 */
export function semanalAMes(semanal: Centimos): Centimos {
  exigirCentimos(semanal);
  return redondear(redondear((semanal * 52) / 12) / 100) * 100;
}

/** Porcentaje de un monto, con el porcentaje en puntos básicos. 15 % = 1500. */
export function porcentaje(monto: Centimos, bp: PuntosBasicos): Centimos {
  exigirCentimos(monto);
  exigirCentimos(bp, "puntos básicos");
  return redondear((monto * bp) / 10_000);
}

/** "89.99 %" a partir de 8999. */
export function formatoTasa(bp: PuntosBasicos): string {
  exigirCentimos(bp, "puntos básicos");
  return `${(bp / 100).toFixed(2)} %`;
}

/**
 * Factor de interés compuesto por un número de días, con año de 360 días
 * (convención de las tasas efectivas en Perú).
 */
export function factorInteres(tasaAnualBp: PuntosBasicos, dias: number): number {
  if (dias < 0) throw new Error("Los días no pueden ser negativos");
  return Math.pow(1 + tasaAnualBp / 10_000, dias / 360) - 1;
}

/** Interés en céntimos que genera un capital durante `dias` a una tasa efectiva anual. */
export function interes(capital: Centimos, tasaAnualBp: PuntosBasicos, dias: number): Centimos {
  exigirCentimos(capital, "capital");
  if (capital <= 0 || dias === 0) return 0;
  return redondear(capital * factorInteres(tasaAnualBp, dias));
}

/** Interés de un mes de 30 días. */
export function interesMensual(capital: Centimos, tasaAnualBp: PuntosBasicos): Centimos {
  return interes(capital, tasaAnualBp, 30);
}

/** Mediana de enteros (si hay par de centrales, promedio redondeado). */
export function mediana(valores: readonly Centimos[]): Centimos {
  if (valores.length === 0) return 0;
  const o = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(o.length / 2);
  return o.length % 2 === 1 ? o[medio] : redondear((o[medio - 1] + o[medio]) / 2);
}

/** Percentil por posición más cercana hacia abajo (p entre 0 y 100). Prudente: no interpola hacia arriba. */
export function percentil(valores: readonly Centimos[], p: number): Centimos {
  if (valores.length === 0) return 0;
  if (p < 0 || p > 100) throw new Error("El percentil va de 0 a 100");
  const o = [...valores].sort((a, b) => a - b);
  const indice = Math.floor(((o.length - 1) * p) / 100);
  return o[indice];
}
