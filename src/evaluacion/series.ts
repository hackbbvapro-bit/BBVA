/**
 * Series para los gráficos de «Datos de prueba»: el saldo real día por día y lo que entró y salió cada semana.
 * Es código puro, en céntimos enteros. Usa los movimientos que de verdad movieron la cuenta: cuenta los que el
 * copiloto no llegó a ver (ocultos) y deja fuera los registros repetidos y lo pagado con tarjeta de crédito.
 */
import { sumar } from "@/motor/dinero";
import { diasEntre, rangoDias, sumarDias } from "@/motor/fechas";
import type { Centimos, FechaISO } from "@/motor/tipos";
import { DIAS_FUTURO, saldosReales, tocaSaldo, type Cliente, type MovimientoEtiquetado } from "./poblacion";

export interface PuntoSaldo {
  fecha: FechaISO;
  /** Saldo real al cierre de ese día. */
  saldo: Centimos;
  /** true en los 30 días siguientes al corte, que el copiloto no ve. */
  futuro: boolean;
}

function porDia(movimientos: MovimientoEtiquetado[]): Map<FechaISO, Centimos> {
  const mapa = new Map<FechaISO, Centimos>();
  for (const m of movimientos) if (tocaSaldo(m)) mapa.set(m.fecha, (mapa.get(m.fecha) ?? 0) + m.monto);
  return mapa;
}

/** Primer día con algún movimiento de la historia (visto u oculto); el corte si no hay ninguno. */
export function inicioDeHistoria(c: Cliente): FechaISO {
  return [...c.historia, ...c.ocultos].reduce((min, m) => (m.fecha < min ? m.fecha : min), c.corte);
}

/**
 * Saldo al cierre de cada día, del primer día de historia al último de futuro. Se reconstruye hacia atrás desde
 * el saldo del corte (el único saldo que se conoce con certeza), restando lo que se movió cada día.
 */
export function saldoDiario(c: Cliente): PuntoSaldo[] {
  const inicio = inicioDeHistoria(c);
  const dias = rangoDias(inicio, diasEntre(inicio, c.corte) + 1);
  const movido = porDia([...c.historia, ...c.ocultos]);
  const historia: PuntoSaldo[] = [];
  let saldo = c.saldoCorte;
  for (let i = dias.length - 1; i >= 0; i--) {
    historia.unshift({ fecha: dias[i], saldo, futuro: false });
    saldo -= movido.get(dias[i]) ?? 0;
  }
  if (c.futuro.length === 0) return historia;
  const despues = saldosReales(c).map((s, i) => ({ fecha: sumarDias(c.corte, i + 1), saldo: s, futuro: true }));
  return [...historia, ...despues];
}

export interface Semana {
  desde: FechaISO;
  hasta: FechaISO;
  /** Lo que entró a la cuenta esa semana (positivo). */
  entra: Centimos;
  /** Lo que salió de la cuenta esa semana (positivo). */
  sale: Centimos;
  futuro: boolean;
}

function semana(desde: FechaISO, hasta: FechaISO, movimientos: MovimientoEtiquetado[], futuro: boolean): Semana {
  const dentro = movimientos.filter(m => tocaSaldo(m) && m.fecha >= desde && m.fecha <= hasta).map(m => m.monto);
  return { desde, hasta, entra: sumar(dentro.filter(x => x > 0)), sale: -sumar(dentro.filter(x => x < 0)), futuro };
}

/**
 * Entradas y salidas por semana. Las semanas se cuentan hacia atrás desde el corte (la última termina ese día), así
 * que la primera puede quedar más corta. Las del futuro, si las hay, empiezan al día siguiente del corte.
 */
export function porSemana(c: Cliente): Semana[] {
  const inicio = inicioDeHistoria(c);
  const pasadas = [...c.historia, ...c.ocultos];
  const semanas: Semana[] = [];
  for (let hasta = c.corte; hasta >= inicio; hasta = sumarDias(hasta, -7)) {
    const desde = sumarDias(hasta, -6);
    semanas.unshift(semana(desde < inicio ? inicio : desde, hasta, pasadas, false));
  }
  if (c.futuro.length === 0) return semanas;
  const fin = sumarDias(c.corte, DIAS_FUTURO);
  for (let desde = sumarDias(c.corte, 1); desde <= fin; desde = sumarDias(desde, 7)) {
    const hasta = sumarDias(desde, 6);
    semanas.push(semana(desde, hasta > fin ? fin : hasta, c.futuro, true));
  }
  return semanas;
}
