import { sumar } from "../motor/dinero";
import { priorizarPagos, type EntradaPrioridad, type ResultadoPrioridad } from "../motor/prioridad";
import type { Analisis } from "../motor/tipos";
import type { Datos } from "./tipos";

/**
 * Dinero que se puede dedicar a deudas en los próximos 30 días sin quedar en rojo ningún día: el punto más bajo del saldo
 * de la proyección prudente si no se pagara ninguna deuda (se suma cada pago de deuda desde el día en que ocurre).
 * Nunca cuenta cobros «me deben»: no son dinero seguro.
 */
export function disponibleParaDeudas(analisis: Analisis): number {
  let pagado = 0;
  let minimo = Number.POSITIVE_INFINITY;
  for (const dia of analisis.proyeccion.dias) {
    pagado += sumar(dia.eventos.filter(e => e.categoria === "deuda" && e.monto < 0).map(e => -e.monto));
    minimo = Math.min(minimo, dia.saldo + pagado);
  }
  return Math.max(0, Number.isFinite(minimo) ? minimo : 0);
}

export function entradaPrioridad(datos: Datos, analisis: Analisis): EntradaPrioridad {
  return {
    hoy: datos.perfil.hoy,
    disponible: disponibleParaDeudas(analisis),
    deudas: datos.deudas
      .filter(d => !d.pagada && d.saldo > 0)
      .map(d => ({
        id: d.id, nombre: d.nombre, entidad: d.entidad, saldo: d.saldo, tceaBp: d.tceaBp ?? 0,
        pagoMinimo: d.pagoMinimo, diaPago: d.diaPago, diasAtraso: d.diasAtraso,
      })),
  };
}

export function prioridadDePagos(datos: Datos, analisis: Analisis): ResultadoPrioridad {
  return priorizarPagos(entradaPrioridad(datos, analisis));
}
