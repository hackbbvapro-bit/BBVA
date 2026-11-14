/** Valida el Perfil que manda el navegador (lo guardado en su base) antes de dárselo al motor. */
import { z } from "zod";
import { partes } from "../motor/fechas";

export const MAX_BYTES_PERFIL = 200_000;

const fecha = z.string().refine(f => {
  try {
    partes(f);
    return true;
  } catch {
    return false;
  }
}, "fecha_invalida");

const centimos = z.number().int().min(-100_000_000_000).max(100_000_000_000);
const texto = (max: number) => z.string().min(1).max(max);

const Movimiento = z.object({
  id: texto(120),
  fecha,
  monto: centimos,
  descripcion: texto(120),
  categoria: z.enum([
    "sueldo", "ingreso_variable", "alquiler", "servicios", "suscripciones", "deuda", "comida",
    "transporte", "salud", "educacion", "ocio", "compras", "familia", "otros",
  ]),
  canal: z.enum(["cuenta", "tarjeta", "yape", "plin", "efectivo"]),
});

const Deuda = z.object({
  id: texto(80),
  nombre: texto(80),
  tipo: z.enum(["tarjeta", "prestamo"]),
  saldo: centimos.min(0),
  tceaBp: z.number().int().min(0).max(1_000_000),
  pagoMinimo: centimos.min(0),
  pagoHabitual: centimos.min(0),
  diaPago: z.number().int().min(1).max(31),
});

export const EsquemaPerfil = z.object({
  id: texto(40),
  nombre: texto(60),
  tipo: z.enum(["dependiente", "independiente", "mixto"]),
  descripcion: z.string().max(400),
  hoy: fecha,
  saldoActual: centimos,
  movimientos: z.array(Movimiento).max(1500),
  deudas: z.array(Deuda).max(60),
});

/** Pagos que le deben a la persona (lo que el asistente puede contar como «si te pagan lo pendiente»). */
export const EsquemaCobros = z
  .array(
    z.object({
      id: texto(60),
      quien: texto(80),
      monto: z.number().int().min(1).max(100_000_000_000),
      fechaPrometida: fecha,
      cobrado: z.boolean(),
    }),
  )
  .max(50);
