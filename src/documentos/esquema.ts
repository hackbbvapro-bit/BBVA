/**
 * Esquema de lo que la IA extrae de un documento financiero (reporte SBS, estado de cuenta, recibo, captura).
 * Regla: la IA SOLO copia lo escrito en el documento; nunca calcula ni infiere montos. Lo que no esté, va como null.
 * Los montos viajan en soles (con 2 decimales como máximo); el motor trabaja en céntimos enteros: usa `soles_a_centimos`.
 */
import { z } from "zod";

/** Mismos literales que `Calificacion` de src/motor/sbs.ts (se repiten aquí a propósito para no acoplar archivos). */
export const CALIFICACIONES = ["normal", "cpp", "deficiente", "dudoso", "perdida"] as const;

/**
 * Pasa soles a céntimos enteros sin deriva de float: 19.99 -> 1999, 0.1 + 0.2 -> 30, 1.005 -> 101 (medio céntimo sube).
 * Lanza RangeError si el número no es finito.
 */
export function soles_a_centimos(soles: number): number {
  if (!Number.isFinite(soles)) throw new RangeError("Los soles deben ser un número finito");
  const centimos = Math.round(Number((Math.abs(soles) * 100).toPrecision(12)));
  return soles < 0 ? -centimos : centimos;
}

/** true si el monto no tiene más de 2 decimales (1.005 no vale: sería medio céntimo). */
function esMontoEnSoles(n: number): boolean {
  const exacto = Number((Math.abs(n) * 100).toPrecision(12));
  return exacto === Math.round(exacto);
}

const soles = z.number().refine(esMontoEnSoles, "Máximo 2 decimales");
const solesNoNegativo = soles.min(0);
const fecha = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "Fecha AAAA-MM-DD");

export const Deuda = z.object({
  entidad: z.string().min(1).max(80),
  nombre: z.string().min(1).max(100),
  producto: z.enum(["tarjeta", "prestamo", "personal"]),
  saldo: solesNoNegativo.max(100_000_000),
  calificacion: z.enum(CALIFICACIONES).nullable(),
  diasAtraso: z.number().int().min(0).max(36_500).nullable(),
  pagoMinimo: solesNoNegativo.max(100_000_000).nullable(),
  /** Porcentaje anual tal como está escrito: 55 significa 55 %. */
  tcea: z.number().min(0).max(1000).nullable(),
  diaPago: z.number().int().min(1).max(31).nullable(),
});

export const Movimiento = z.object({
  fecha: fecha.nullable(),
  descripcion: z.string().min(1).max(200),
  /** Soles; negativo = gasto. */
  monto: soles.min(-100_000_000).max(100_000_000),
  categoria: z.string().max(40).optional(),
});

export const Cobro = z.object({
  quien: z.string().min(1).max(100),
  monto: solesNoNegativo.max(100_000_000),
  fecha: fecha.nullable(),
  nota: z.string().max(200),
});

export const Extraccion = z.object({
  tipo: z.enum(["reporte-sbs", "estado-cuenta", "recibo", "captura-app", "otro"]),
  resumen: z.string().max(300),
  deudas: z.array(Deuda).max(30),
  movimientos: z.array(Movimiento).max(60),
  cobros: z.array(Cobro).max(20),
});

export type Extraccion = z.infer<typeof Extraccion>;
export type DeudaExtraida = z.infer<typeof Deuda>;
export type MovimientoExtraido = z.infer<typeof Movimiento>;
export type CobroExtraido = z.infer<typeof Cobro>;
