import { sumar } from './dinero';
import { diasEntre, formatoCorto, nombreDia, sumarDias, sumarMeses } from './fechas';
import type { Centimos, FechaISO, Proyeccion } from './tipos';

/** Hasta dónde mirar hacia adelante. Más de 6 meses ya no es un pronóstico serio con 12 semanas de historia. */
export type Horizonte = 'semana' | 'mes' | '2m' | '3m' | '6m';

export const HORIZONTES: readonly { id: Horizonte; etiqueta: string; titulo: string }[] = [
  { id: 'semana', etiqueta: '1 semana', titulo: 'Tu próxima semana' },
  { id: 'mes', etiqueta: '1 mes', titulo: 'Tus próximos 30 días' },
  { id: '2m', etiqueta: '2 meses', titulo: 'Tus próximos 2 meses' },
  { id: '3m', etiqueta: '3 meses', titulo: 'Tus próximos 3 meses' },
  { id: '6m', etiqueta: '6 meses', titulo: 'Tus próximos 6 meses' },
];

const MESES: Record<Horizonte, number> = { semana: 0, mes: 0, '2m': 2, '3m': 3, '6m': 6 };

/**
 * Días a proyectar. «1 mes» son 30 días, igual que el resto de la app; 2, 3 y 6 meses se cuentan con
 * meses de calendario desde hoy (sumarMeses ya resuelve 31-ene → 28/29-feb sin deriva).
 */
export function diasDelHorizonte(hoy: FechaISO, h: Horizonte): number {
  if (h === 'semana') return 7;
  if (h === 'mes') return 30;
  return diasEntre(hoy, sumarMeses(hoy, MESES[h]));
}

/** Cómo partir la tabla: día a día en una semana, por semanas en un mes, por meses en adelante. */
export function particion(h: Horizonte): 'dia' | 'semana' | 'mes' {
  return h === 'semana' ? 'dia' : h === 'mes' ? 'semana' : 'mes';
}

export interface Tramo {
  etiqueta: string;
  desde: FechaISO;
  hasta: FechaISO;
  entra: Centimos;
  sale: Centimos;
  saldoFinal: Centimos;
  saldoMinimo: Centimos;
  fechaMinimo: FechaISO;
  diasEnRojo: number;
}

/**
 * Parte una proyección en tramos (días, semanas o meses de calendario) y suma lo que entra y sale en cada
 * uno, céntimo por céntimo. La suma de (entra + sale) de todos los tramos es saldoFinal − saldoInicial.
 */
export function tramos(p: Proyeccion, hoy: FechaISO, por: 'dia' | 'semana' | 'mes'): Tramo[] {
  const cortes: FechaISO[] = [];
  if (por === 'dia') p.dias.forEach(d => cortes.push(d.fecha));
  else if (por === 'semana') for (let i = 6; i < p.dias.length + 6; i += 7) cortes.push(p.dias[Math.min(i, p.dias.length - 1)].fecha);
  else for (let k = 1; cortes.at(-1) === undefined || cortes.at(-1)! < p.hasta; k++) {
    const fin = sumarMeses(hoy, k);
    cortes.push(fin < p.hasta ? fin : p.hasta);
  }
  let inicio = p.desde;
  return [...new Set(cortes)].map((hasta, i) => {
    const dias = p.dias.filter(d => d.fecha >= inicio && d.fecha <= hasta);
    const montos = dias.flatMap(d => d.eventos.map(e => e.monto));
    const minimo = dias.reduce((a, b) => (a.saldo <= b.saldo ? a : b));
    const etiqueta = por === 'dia'
      ? `${nombreDia(hasta).replace(/^./, c => c.toUpperCase())} ${formatoCorto(hasta)}`
      : `${por === 'semana' ? 'Semana' : 'Mes'} ${i + 1}`;
    const tramo: Tramo = {
      etiqueta, desde: inicio, hasta,
      entra: sumar(montos.filter(m => m > 0)),
      sale: sumar(montos.filter(m => m < 0)),
      saldoFinal: dias[dias.length - 1].saldo,
      saldoMinimo: minimo.saldo,
      fechaMinimo: minimo.fecha,
      diasEnRojo: dias.filter(d => d.saldo < 0).length,
    };
    inicio = sumarDias(hasta, 1);
    return tramo;
  });
}

/** Cuántos días de la proyección terminan con saldo negativo. */
export const diasEnRojo = (p: Proyeccion): number => p.dias.filter(d => d.saldo < 0).length;
