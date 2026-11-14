import { detectarRecurrentes, estimarIngresoVariable, idsRecurrentes } from "../motor/recurrentes";
import { partes } from "../motor/fechas";
import { generarPerfil } from "./perfiles";
import { cuentasDeEjemplo } from "./cuentas-demo";
import type { TipoPerfil } from "../motor/tipos";
import type { Datos, DeudaGuardada, Fijo } from "./tipos";

/** Id del perfil cuando la persona usa sus propios datos (no la demo). */
export const ID_PROPIO = "propio";

export interface Arranque {
  nombre: string;
  tipo: TipoPerfil;
  /** Lo que tiene hoy en su cuenta, en céntimos. */
  saldo: number;
  /** Lo que gana al mes, aproximado, en céntimos. */
  ingresoAprox: number;
  /** Fecha de hoy (AAAA-MM-DD). */
  hoy: string;
}

/** Datos de arranque para una persona real: una cuenta con su saldo y nada más. El resto lo agrega ella. */
export function datosVacios(a: Arranque): Datos {
  return {
    perfil: { id: ID_PROPIO, nombre: a.nombre.trim(), tipo: a.tipo, descripcion: "", ingresoAprox: a.ingresoAprox, diasCobro: [], hoy: a.hoy },
    cuentas: [{ id: "cuenta-principal", nombre: "Cuenta principal", saldo: a.saldo }],
    ingresosFijos: [], gastosFijos: [], movimientos: [], deudas: [], cobros: [], documentos: [], avisosLeidos: [],
  };
}

/** Hoy en Lima (AAAA-MM-DD), sin depender de la zona horaria del equipo. */
export function hoyEnLima(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
}

/**
 * Datos de arranque: Rosa, la persona sintética de la demo. Se parte de `generarPerfil` para que
 * las cifras sean exactamente las de siempre; lo fijo y las deudas pasan a ser filas editables
 * y la historia variable queda como movimientos.
 */
export function datosDeRosa(): Datos {
  const rosa = generarPerfil("independiente");
  const recurrentes = detectarRecurrentes(rosa.movimientos, rosa.deudas);
  const fijosIds = idsRecurrentes(rosa.movimientos, rosa.deudas);
  const aFijo = (r: (typeof recurrentes)[number]): Fijo => ({
    id: `semilla-${r.id}`, descripcion: r.descripcion, monto: Math.abs(r.monto), dia: r.diaDelMes ?? partes(r.ultimaFecha).dia, categoria: r.categoria,
  });
  const fijos = recurrentes.filter(r => r.categoria !== "deuda" && r.frecuencia === "mensual");
  const deudas: DeudaGuardada[] = rosa.deudas.map(d => ({
    id: d.id, entidad: "Otra entidad", nombre: d.nombre, tipo: d.tipo, saldo: d.saldo, tceaBp: d.tceaBp,
    pagoMinimo: d.pagoMinimo, pagoHabitual: d.pagoHabitual, diaPago: d.diaPago, diasAtraso: 0, pagada: false,
  }));
  // Ingreso del mes aproximado (a decenas de soles) desde su semana típica; solo informativo.
  const ingresoAprox = Math.round(((estimarIngresoVariable(rosa.movimientos, rosa.deudas, rosa.hoy).semanalTipico * 52) / 12) / 1000) * 1000;
  return {
    perfil: {
      id: rosa.id, nombre: rosa.nombre, tipo: rosa.tipo, descripcion: rosa.descripcion,
      ingresoAprox, diasCobro: [], hoy: rosa.hoy,
    },
    cuentas: cuentasDeEjemplo(rosa.saldoActual),
    ingresosFijos: fijos.filter(r => r.monto > 0).map(aFijo),
    gastosFijos: fijos.filter(r => r.monto < 0).map(aFijo),
    movimientos: rosa.movimientos.filter(m => !fijosIds.has(m.id)),
    deudas, cobros: [], documentos: [], avisosLeidos: [],
  };
}
