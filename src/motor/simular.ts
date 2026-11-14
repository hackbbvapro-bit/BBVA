import { exigirCentimos } from "./dinero";
import { partes } from "./fechas";
import type { Centimos, FechaISO, Proyeccion } from "./tipos";

/** Resultado de preguntar «¿me alcanza para gastar X tal día?» sobre una proyección ya calculada. */
export interface SimulacionGasto {
  fecha: FechaISO;
  monto: Centimos;
  saldoMinimoAntes: Centimos;
  saldoMinimoDespues: Centimos;
  fechaSaldoMinimoDespues: FechaISO;
  /** Primer día que cerraría bajo cero con el gasto; null si ninguno. */
  primerDiaBajoCero: FechaISO | null;
  /** Ya había un día bajo cero antes de añadir este gasto. */
  yaHabiaDeficit: boolean;
  /** true si, con el gasto, ningún día del periodo cierra bajo cero. */
  alcanza: boolean;
  /** Lo máximo que se puede gastar ese día sin que ningún día cierre bajo cero (0 si ya hay déficit). */
  maximoSinDeficit: Centimos;
}

/** Resta un gasto único al saldo de su fecha y de todos los días siguientes. No modifica la proyección. */
export function simularGasto(proyeccion: Proyeccion, fecha: FechaISO, monto: Centimos): SimulacionGasto {
  exigirCentimos(monto, "monto del gasto");
  if (monto <= 0) throw new Error("El gasto debe ser mayor que cero");
  partes(fecha);
  if (fecha < proyeccion.desde || fecha > proyeccion.hasta) {
    throw new Error(`La fecha debe estar entre ${proyeccion.desde} y ${proyeccion.hasta}`);
  }
  const despues = proyeccion.dias.map(d => ({ fecha: d.fecha, saldo: d.fecha >= fecha ? d.saldo - monto : d.saldo }));
  const minimo = despues.reduce((a, b) => (a.saldo <= b.saldo ? a : b));
  const yaHabiaDeficit = proyeccion.saldoMinimo < 0;
  const margen = Math.min(...proyeccion.dias.filter(d => d.fecha >= fecha).map(d => d.saldo));
  return {
    fecha, monto,
    saldoMinimoAntes: proyeccion.saldoMinimo,
    saldoMinimoDespues: minimo.saldo,
    fechaSaldoMinimoDespues: minimo.fecha,
    primerDiaBajoCero: despues.find(d => d.saldo < 0)?.fecha ?? null,
    yaHabiaDeficit,
    alcanza: minimo.saldo >= 0,
    maximoSinDeficit: yaHabiaDeficit ? 0 : Math.max(0, margen),
  };
}
