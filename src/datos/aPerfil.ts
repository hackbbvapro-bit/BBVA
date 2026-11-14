import { sumar } from "../motor/dinero";
import { ocurrenciasMensuales, sumarDias } from "../motor/fechas";
import type { Deuda, Movimiento, Perfil } from "../motor/tipos";
import type { Datos, DeudaGuardada, Fijo } from "./tipos";

/**
 * El motor detecta lo fijo mirando la historia (3 meses el mismo día). Para que todo lo que la
 * persona guarda llegue al motor sin tocarlo, cada fijo y cada pago de deuda se expande a sus
 * últimas tres ocurrencias hasta «hoy». Son movimientos sintéticos de proyección: no cambian ningún saldo.
 */
const OCURRENCIAS = 3;

function ultimasOcurrencias(dia: number, hoy: string): string[] {
  return ocurrenciasMensuales(dia, sumarDias(hoy, -130), hoy).slice(-OCURRENCIAS);
}

function expandirFijo(f: Fijo, signo: 1 | -1, hoy: string): Movimiento[] {
  return ultimasOcurrencias(f.dia, hoy).map(fecha => ({
    id: `fijo-${f.id}-${fecha}`, fecha, monto: signo * f.monto, descripcion: f.descripcion,
    categoria: f.categoria, canal: "cuenta" as const,
  }));
}

function vigente(d: DeudaGuardada): boolean {
  return !d.pagada && d.saldo > 0;
}

function aDeudaMotor(d: DeudaGuardada): Deuda {
  return {
    id: d.id, nombre: d.nombre, tipo: d.tipo === "tarjeta" ? "tarjeta" : "prestamo", saldo: d.saldo,
    tceaBp: d.tceaBp ?? 0, pagoMinimo: d.pagoMinimo, pagoHabitual: Math.max(d.pagoHabitual, d.pagoMinimo), diaPago: d.diaPago,
  };
}

function pagosDeDeuda(d: Deuda, hoy: string): Movimiento[] {
  if (d.pagoHabitual <= 0) return [];
  return ultimasOcurrencias(d.diaPago, hoy).map(fecha => ({
    id: `pago-${d.id}-${fecha}`, fecha, monto: -d.pagoHabitual, descripcion: `Pago ${d.nombre}`,
    categoria: "deuda" as const, canal: "cuenta" as const,
  }));
}

/** Convierte lo guardado en la entrada del motor. Pura: no muta `datos`. */
export function aPerfil(datos: Datos): Perfil {
  const { perfil } = datos;
  const deudas = datos.deudas.filter(vigente).map(aDeudaMotor);
  const movimientos = [
    ...datos.movimientos,
    ...datos.ingresosFijos.flatMap(f => expandirFijo(f, 1, perfil.hoy)),
    ...datos.gastosFijos.flatMap(f => expandirFijo(f, -1, perfil.hoy)),
    ...deudas.flatMap(d => pagosDeDeuda(d, perfil.hoy)),
  ].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id));
  return {
    id: perfil.id, nombre: perfil.nombre, tipo: perfil.tipo, descripcion: perfil.descripcion, hoy: perfil.hoy,
    saldoActual: sumar(datos.cuentas.map(c => c.saldo)), movimientos, deudas,
  };
}
