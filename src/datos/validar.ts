import { partes } from "../motor/fechas";
import type { Cobro, Cuenta, DatosPerfil, DeudaGuardada, DocumentoAnalizado, Fijo } from "./tipos";

/** Error de datos con mensaje en español, listo para mostrarse al usuario. */
export class ErrorDatos extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorDatos";
  }
}

const TIPOS_PERFIL = ["dependiente", "independiente", "mixto"];
const TIPOS_DEUDA = ["tarjeta", "prestamo", "personal"];
const LIMITE_CENTIMOS = 2_000_000_000;

function texto(valor: string, campo: string, max = 80): string {
  const limpio = valor.trim();
  if (!limpio) throw new ErrorDatos(`Escribe ${campo}.`);
  if (limpio.length > max) throw new ErrorDatos(`${campo[0].toUpperCase()}${campo.slice(1)} es muy largo (máximo ${max} letras).`);
  return limpio;
}
function entero(valor: number, campo: string, min: number, max: number): number {
  if (!Number.isInteger(valor) || valor < min || valor > max) throw new ErrorDatos(`Revisa ${campo}.`);
  return valor;
}
const monto = (v: number, campo: string, min = 0) => entero(v, campo, min, LIMITE_CENTIMOS);
const dia = (v: number, campo: string) => entero(v, campo, 1, 31);
function fecha(valor: string, campo: string): string {
  try {
    partes(valor);
  } catch {
    throw new ErrorDatos(`Revisa ${campo}.`);
  }
  return valor;
}
/** Los nombres se agrupan por sus letras; sin ninguna, dos fijos se confundirían. */
function conLetras(valor: string, campo: string): string {
  if (!/\p{L}/u.test(valor)) throw new ErrorDatos(`${campo[0].toUpperCase()}${campo.slice(1)} necesita al menos una letra.`);
  return valor;
}

export function validarPerfil(p: DatosPerfil): DatosPerfil {
  if (!TIPOS_PERFIL.includes(p.tipo)) throw new ErrorDatos("Elige cómo ganas tu dinero.");
  const dias = [...new Set(p.diasCobro.map(d => dia(d, "el día de cobro")))].sort((a, b) => a - b);
  if (dias.length > 4) throw new ErrorDatos("Indica hasta 4 días de cobro.");
  return {
    ...p,
    id: texto(p.id, "el identificador"),
    nombre: texto(p.nombre, "cómo te llamamos", 40),
    descripcion: p.descripcion.trim().slice(0, 240),
    ingresoAprox: monto(p.ingresoAprox, "el ingreso del mes"),
    diasCobro: dias,
    hoy: fecha(p.hoy, "la fecha de hoy"),
  };
}
export function validarCuenta(c: Cuenta): Cuenta {
  return { id: texto(c.id, "el identificador"), nombre: texto(c.nombre, "el nombre de la cuenta"), saldo: monto(c.saldo, "el saldo", -LIMITE_CENTIMOS) };
}
export function validarFijo(f: Fijo): Fijo {
  return {
    id: texto(f.id, "el identificador"),
    descripcion: conLetras(texto(f.descripcion, "el nombre"), "el nombre"),
    monto: monto(f.monto, "el monto", 1),
    dia: dia(f.dia, "el día"),
    categoria: f.categoria,
  };
}
export function validarDeuda(d: DeudaGuardada): DeudaGuardada {
  if (!TIPOS_DEUDA.includes(d.tipo)) throw new ErrorDatos("Elige el tipo de deuda.");
  const pagoMinimo = monto(d.pagoMinimo, "el pago mínimo");
  if (!d.pagada && d.saldo > 0 && pagoMinimo === 0) throw new ErrorDatos("Indica el pago mínimo o la cuota.");
  return {
    id: texto(d.id, "el identificador"),
    entidad: texto(d.entidad, "con quién tienes la deuda"),
    nombre: conLetras(texto(d.nombre, "el nombre de la deuda"), "el nombre de la deuda"),
    tipo: d.tipo,
    saldo: monto(d.saldo, "el saldo"),
    tceaBp: d.tceaBp === null ? null : entero(d.tceaBp, "la TCEA", 0, 100_000),
    pagoMinimo,
    pagoHabitual: monto(Math.max(d.pagoHabitual, pagoMinimo), "el pago habitual"),
    diaPago: dia(d.diaPago, "el día de pago"),
    diasAtraso: entero(d.diasAtraso, "los días de atraso", 0, 3650),
    pagada: d.pagada,
  };
}
export function validarCobro(c: Cobro): Cobro {
  return {
    id: texto(c.id, "el identificador"),
    quien: texto(c.quien, "quién te debe", 40),
    monto: monto(c.monto, "el monto", 1),
    fechaPrometida: fecha(c.fechaPrometida, "la fecha prometida"),
    nota: c.nota.trim().slice(0, 160),
    cobrado: c.cobrado,
  };
}
export function validarDocumento(d: DocumentoAnalizado): DocumentoAnalizado {
  return { id: texto(d.id, "el identificador"), tipo: texto(d.tipo, "el tipo"), resumen: d.resumen.trim().slice(0, 500), datos: d.datos, fecha: fecha(d.fecha, "la fecha") };
}
