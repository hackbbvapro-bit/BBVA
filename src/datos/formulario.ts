import { aCentimos } from "../motor/dinero";
import type { Centimos } from "../motor/tipos";
import { ErrorDatos } from "./validar";

/** Lo que escribe la persona en un campo de soles → céntimos enteros, sin pasar por decimales de máquina. */
export function leerSoles(texto: string, campo: string): Centimos {
  if (!texto.trim()) throw new ErrorDatos(`Escribe ${campo}.`);
  try {
    return aCentimos(texto);
  } catch {
    throw new ErrorDatos(`Revisa ${campo}: escríbelo en soles, por ejemplo 180 o 180.50.`);
  }
}

export function leerDia(texto: string, campo: string): number {
  if (!/^\d{1,2}$/.test(texto.trim())) throw new ErrorDatos(`Revisa ${campo}: un número del 1 al 31.`);
  return Number(texto.trim());
}

/** TCEA en porcentaje → puntos básicos (55.5 → 5550). Vacío = no la conoce (null). Misma lectura sin decimales de máquina que los soles. */
export function leerTasa(texto: string, campo: string): number | null {
  if (!texto.trim()) return null;
  try {
    return aCentimos(texto.trim().replace(/\s*%+\s*$/, ""));
  } catch {
    throw new ErrorDatos(`Revisa ${campo}: escríbela en porcentaje, por ejemplo 55 o 89.99.`);
  }
}

/** Número entero de 0 en adelante (días de atraso). Vacío cuenta como 0. */
export function leerEnteroOCero(texto: string, campo: string): number {
  if (!texto.trim()) return 0;
  if (!/^\d{1,4}$/.test(texto.trim())) throw new ErrorDatos(`Revisa ${campo}: un número entero, o 0.`);
  return Number(texto.trim());
}

/** Fecha de un campo `type="date"` (AAAA-MM-DD). */
export function leerFecha(texto: string, campo: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto.trim())) throw new ErrorDatos(`Elige ${campo}.`);
  return texto.trim();
}

/** Puntos básicos → texto del campo de porcentaje: 5500 → «55», 8999 → «89.99». */
export function tasaParaEditar(bp: number | null): string {
  return bp === null ? "" : solesParaEditar(bp);
}

/** Céntimos → texto para un campo editable: 18000 → «180», 1250 → «12.50». */
export function solesParaEditar(monto: Centimos): string {
  const signo = monto < 0 ? "-" : "";
  const abs = Math.abs(monto);
  const enteros = Math.floor(abs / 100);
  const cent = abs % 100;
  return cent === 0 ? `${signo}${enteros}` : `${signo}${enteros}.${String(cent).padStart(2, "0")}`;
}
