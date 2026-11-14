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

/** Céntimos → texto para un campo editable: 18000 → «180», 1250 → «12.50». */
export function solesParaEditar(monto: Centimos): string {
  const signo = monto < 0 ? "-" : "";
  const abs = Math.abs(monto);
  const enteros = Math.floor(abs / 100);
  const cent = abs % 100;
  return cent === 0 ? `${signo}${enteros}` : `${signo}${enteros}.${String(cent).padStart(2, "0")}`;
}
