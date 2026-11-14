import { sumar } from "../motor/dinero";
import { priorizarPagos, type EntradaPrioridad, type ResultadoPrioridad } from "../motor/prioridad";
import type { Analisis } from "../motor/tipos";
import type { Datos } from "./tipos";

/**
 * Dinero que queda para pagar deudas en los próximos 30 días: el punto más bajo de la proyección prudente (o el saldo final, si es menor)
 * (ya descontados gastos fijos, gasto diario típico y solo el ingreso variable prudente) más lo que esa
 * proyección ya reservaba para cuotas de deuda. Nunca cuenta cobros «me deben»: no son dinero seguro.
 */
export function disponibleParaDeudas(analisis: Analisis): number {
  const pagosDeDeuda = sumar(
    analisis.proyeccion.dias.flatMap(d => d.eventos).filter(e => e.categoria === "deuda" && e.monto < 0).map(e => -e.monto),
  );
  return Math.max(0, Math.min(analisis.proyeccion.saldoFinal, analisis.proyeccion.saldoMinimo) + pagosDeDeuda);
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
