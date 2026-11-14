import { leerDia, leerEnteroOCero, leerFecha, leerSoles, leerTasa, solesParaEditar } from "../datos/formulario";
import type { Cobro, DeudaGuardada } from "../datos/tipos";
import type { Calificacion } from "../motor/sbs";
import { soles_a_centimos, type Extraccion } from "./esquema";

/** Lo que la persona revisa antes de guardar. Todo son textos de campo: se corrigen a mano y se validan al confirmar. */
export interface DeudaPropuesta {
  incluir: boolean;
  entidad: string;
  nombre: string;
  tipo: DeudaGuardada["tipo"];
  saldo: string;
  minimo: string;
  dia: string;
  tcea: string;
  atraso: string;
  calificacion: Calificacion | null;
  /** Id de una deuda ya guardada con la misma entidad y nombre: se actualiza en vez de duplicar. */
  existenteId: string | null;
}

export interface CobroPropuesta {
  incluir: boolean;
  quien: string;
  monto: string;
  fecha: string;
  nota: string;
}

const clave = (entidad: string, nombre: string) =>
  `${entidad} ${nombre}`.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function propuestaDeudas(ext: Extraccion, existentes: DeudaGuardada[]): DeudaPropuesta[] {
  return ext.deudas.map(d => ({
    incluir: true,
    entidad: d.entidad,
    nombre: d.nombre,
    tipo: d.producto,
    saldo: solesParaEditar(soles_a_centimos(d.saldo)),
    minimo: d.pagoMinimo === null ? "" : solesParaEditar(soles_a_centimos(d.pagoMinimo)),
    dia: d.diaPago === null ? "" : String(d.diaPago),
    tcea: d.tcea === null ? "" : solesParaEditar(soles_a_centimos(d.tcea)),
    atraso: String(d.diasAtraso ?? 0),
    calificacion: d.calificacion,
    existenteId: existentes.find(e => clave(e.entidad, e.nombre) === clave(d.entidad, d.nombre))?.id ?? null,
  }));
}

export function propuestaCobros(ext: Extraccion): CobroPropuesta[] {
  return ext.cobros.map(c => ({ incluir: true, quien: c.quien, monto: solesParaEditar(soles_a_centimos(c.monto)), fecha: c.fecha ?? "", nota: c.nota }));
}

/** Lanza ErrorDatos (en español) si falta o está mal un campo. `id` es el de la deuda nueva o la existente. */
export function deudaDesdePropuesta(p: DeudaPropuesta, id: string): DeudaGuardada {
  const pagoMinimo = leerSoles(p.minimo, `el pago mínimo de ${p.nombre}`);
  return {
    id,
    entidad: p.entidad,
    nombre: p.nombre,
    tipo: p.tipo,
    saldo: leerSoles(p.saldo, `el saldo de ${p.nombre}`),
    tceaBp: leerTasa(p.tcea, `la TCEA de ${p.nombre}`),
    pagoMinimo,
    pagoHabitual: pagoMinimo,
    diaPago: leerDia(p.dia, `el día de pago de ${p.nombre}`),
    diasAtraso: leerEnteroOCero(p.atraso, `los días de atraso de ${p.nombre}`),
    pagada: false,
  };
}

export function cobroDesdePropuesta(p: CobroPropuesta, id: string): Cobro {
  return { id, quien: p.quien, monto: leerSoles(p.monto, `lo que te debe ${p.quien}`), fechaPrometida: leerFecha(p.fecha, `la fecha prometida de ${p.quien}`), nota: p.nota, cobrado: false };
}
