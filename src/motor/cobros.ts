import { exigirCentimos, sumar } from './dinero';
import type { Centimos, FechaISO, Proyeccion } from './tipos';

export interface CobroPendiente { id: string; quien: string; monto: Centimos; fechaPrometida: FechaISO; cobrado: boolean }

export interface DiaConCobros { fecha: FechaISO; saldo: Centimos; saldoBase: Centimos }

export interface EscenarioCobros {
  dias: DiaConCobros[];
  /** Cobros sin cobrar prometidos dentro del periodo: los únicos que mueven la línea. */
  contados: CobroPendiente[];
  /** Sin cobrar y prometidos para hoy o antes: no se sabe cuándo llegan, no se cuentan. */
  vencidos: CobroPendiente[];
  /** Sin cobrar y prometidos después del periodo. */
  fueraDelPeriodo: CobroPendiente[];
  totalContado: Centimos;
  saldoMinimo: Centimos;
  fechaSaldoMinimo: FechaISO;
  saldoFinal: Centimos;
  /** Primer día en que el saldo con cobros cierra bajo cero; null si nunca. */
  primerDiaNegativo: FechaISO | null;
  /** Faltante máximo con cobros (positivo); 0 si no hay. */
  faltanteMaximo: Centimos;
  /** Cuánto sube el punto más bajo respecto a la proyección sin cobros (≥ 0). */
  mejoraDelMinimo: Centimos;
  /** La proyección base tenía déficit y con los cobros desaparece. */
  resuelveElDeficit: boolean;
  /** Cobros contados que llegan DESPUÉS del primer día negativo de la proyección base: no evitan ese día. */
  llegaronTarde: CobroPendiente[];
}

/** Escenario «si te pagan»: suma cada cobro sin cobrar en su fecha prometida sobre la proyección prudente. No muta nada. */
export function conCobros(proyeccion: Proyeccion, cobros: CobroPendiente[]): EscenarioCobros {
  const pendientes = cobros.filter(c => !c.cobrado && c.monto > 0);
  pendientes.forEach(c => exigirCentimos(c.monto));
  const enRango = (c: CobroPendiente) => c.fechaPrometida >= proyeccion.desde && c.fechaPrometida <= proyeccion.hasta;
  const contados = pendientes.filter(enRango);
  const vencidos = pendientes.filter(c => c.fechaPrometida < proyeccion.desde);
  const fueraDelPeriodo = pendientes.filter(c => c.fechaPrometida > proyeccion.hasta);

  const dias = proyeccion.dias.map(d => ({
    fecha: d.fecha,
    saldoBase: d.saldo,
    saldo: d.saldo + sumar(contados.filter(c => c.fechaPrometida <= d.fecha).map(c => c.monto)),
  }));
  const minimo = dias.reduce((a, b) => (a.saldo <= b.saldo ? a : b));
  const negativo = dias.find(d => d.saldo < 0);
  const baseNegativo = proyeccion.dias.find(d => d.saldo < 0);
  return {
    dias, contados, vencidos, fueraDelPeriodo,
    totalContado: sumar(contados.map(c => c.monto)),
    saldoMinimo: minimo.saldo,
    fechaSaldoMinimo: minimo.fecha,
    saldoFinal: dias[dias.length - 1].saldo,
    primerDiaNegativo: negativo?.fecha ?? null,
    faltanteMaximo: Math.max(0, -minimo.saldo),
    mejoraDelMinimo: minimo.saldo - proyeccion.saldoMinimo,
    resuelveElDeficit: proyeccion.deficit !== null && negativo === undefined,
    llegaronTarde: baseNegativo ? contados.filter(c => c.fechaPrometida > baseNegativo.fecha) : [],
  };
}
