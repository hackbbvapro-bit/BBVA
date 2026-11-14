/**
 * Detectores de datos sospechosos: movimientos duplicados y gastos fuera de patrón.
 * Son reglas simples y explicables, no un modelo entrenado. Se miden contra las etiquetas
 * de verdad de la población sintética en evaluar.ts.
 */
import { idsRecurrentes } from '@/motor';
import { diasEntre } from '@/motor/fechas';
import type { Deuda, Movimiento } from '@/motor/tipos';

const clave = (m: Movimiento) => `${m.descripcion}|${m.monto}|${m.canal}`;

function agrupar(movimientos: Movimiento[], llave: (m: Movimiento) => string): Map<string, Movimiento[]> {
  const grupos = new Map<string, Movimiento[]>();
  for (const m of movimientos) grupos.set(llave(m), [...(grupos.get(llave(m)) ?? []), m]);
  return grupos;
}

/** Regla ingenua: mismo día, mismo monto, misma descripción y canal → todo menos el primero es duplicado. */
export function duplicadosIngenuo(movimientos: Movimiento[]): Set<string> {
  const ids = new Set<string>();
  for (const grupo of agrupar(movimientos, m => `${m.fecha}|${clave(m)}`).values()) grupo.slice(1).forEach(m => ids.add(m.id));
  return ids;
}

/** Días con el mismo cobro repetido a partir de los cuales se entiende que es costumbre de la persona. */
export const DIAS_DE_COSTUMBRE = 3;
/** Un cargo fijo aparece pocas veces en 90 días; si la descripción sale más que esto, no es un cargo fijo. */
export const VECES_CARGO_FIJO = 6;

/**
 * Regla prudente:
 *  1. Repetido el mismo día, salvo que esa persona repita ese mismo cobro a menudo (dos pasajes iguales
 *     el mismo día no son un error: son ida y vuelta).
 *  2. Cargo fijo cobrado otra vez uno o dos días después con el mismo monto.
 */
export function duplicadosPrudente(movimientos: Movimiento[]): Set<string> {
  const ids = new Set<string>();
  for (const iguales of agrupar(movimientos, clave).values()) {
    const porDia = [...agrupar(iguales, m => m.fecha).values()];
    const costumbre = porDia.filter(d => d.length > 1).length >= DIAS_DE_COSTUMBRE;
    if (!costumbre) for (const dia of porDia) dia.slice(1).forEach(m => ids.add(m.id));
    // Un cobro que la persona repite el mismo día por costumbre no es un cargo fijo.
    if (!costumbre && iguales[0].monto < 0 && iguales.length <= VECES_CARGO_FIJO) {
      const orden = [...iguales].sort((a, b) => a.fecha.localeCompare(b.fecha));
      for (let i = 1; i < orden.length; i++) {
        const distancia = diasEntre(orden[i - 1].fecha, orden[i].fecha);
        if (distancia >= 1 && distancia <= 2) ids.add(orden[i].id);
      }
    }
  }
  return ids;
}

/** Un gasto es atípico si pesa más que esta parte de lo que entra en un mes… */
export const ATIPICO_PARTE_DEL_INGRESO_BP = 1000;
/** …y además es varias veces el gasto típico de esa persona. */
export const ATIPICO_VECES_LA_MEDIANA = 5;

/** Gastos grandes y únicos, fuera del patrón de la persona. Los cobros que se repiten no cuentan. */
export function gastosAtipicos(movimientos: Movimiento[], deudas: Deuda[]): Set<string> {
  const recurrentes = idsRecurrentes(movimientos, deudas);
  const dias = movimientos.length ? diasEntre(movimientos.reduce((a, m) => m.fecha < a ? m.fecha : a, movimientos[0].fecha),
    movimientos.reduce((a, m) => m.fecha > a ? m.fecha : a, movimientos[0].fecha)) + 1 : 0;
  const entradas = movimientos.filter(m => m.monto > 0).reduce((s, m) => s + m.monto, 0);
  const ingresoMensual = dias > 0 ? Math.round(entradas * 30 / dias) : 0;
  const sueltos = movimientos.filter(m => m.monto < 0 && !recurrentes.has(m.id));
  const montos = sueltos.map(m => -m.monto).sort((a, b) => a - b);
  const mediana = montos.length ? montos[Math.floor(montos.length / 2)] : 0;
  const veces = agrupar(sueltos, m => m.descripcion);
  const umbral = Math.max(Math.round(ingresoMensual * ATIPICO_PARTE_DEL_INGRESO_BP / 10_000), mediana * ATIPICO_VECES_LA_MEDIANA);
  return new Set(sueltos.filter(m => -m.monto >= umbral && umbral > 0 && veces.get(m.descripcion)!.length === 1).map(m => m.id));
}
