import { semanalAMes, sumar } from './dinero';
import type { Categoria, Centimos, Deuda, Recurrente } from './tipos';

export interface LineaGastoFijo {
  descripcion: string;
  categoria: Categoria;
  /** Lo que sale en un mes, en positivo. */
  monto: Centimos;
}

export interface GastosFijos {
  total: Centimos;
  /** De mayor a menor. */
  lineas: LineaGastoFijo[];
}

/**
 * Lo que sale sí o sí cada mes:
 * - los pagos que se repiten (alquiler, servicios, suscripciones…). Un pago semanal se lleva a un mes típico (× 52 / 12);
 * - el pago mínimo de cada tarjeta y la cuota de cada préstamo registrados.
 * Los pagos de deuda que se ven en la historia NO se suman aparte: el compromiso fijo es el mínimo de la deuda,
 * y contarlos dos veces inflaría la cifra. Las entradas de dinero tampoco cuentan.
 */
export function gastosFijosDelMes(recurrentes: readonly Recurrente[], deudas: readonly Deuda[]): GastosFijos {
  const porNombre = new Map<string, LineaGastoFijo>();
  for (const r of recurrentes) {
    if (r.monto >= 0 || r.categoria === 'deuda' || r.deudaId) continue;
    const mensual = r.frecuencia === 'semanal' ? semanalAMes(-r.monto) : -r.monto;
    const previa = porNombre.get(r.descripcion);
    // La quincena llega como dos series con el mismo nombre: es un solo gasto fijo.
    porNombre.set(r.descripcion, { descripcion: r.descripcion, categoria: r.categoria, monto: (previa?.monto ?? 0) + mensual });
  }
  const minimos: LineaGastoFijo[] = deudas
    .filter(d => d.pagoMinimo > 0)
    .map(d => ({ descripcion: `${d.tipo === 'prestamo' ? 'Cuota' : 'Mínimo'} ${d.nombre}`, categoria: 'deuda', monto: d.pagoMinimo }));
  const lineas = [...porNombre.values(), ...minimos].sort((a, b) => b.monto - a.monto);
  return { total: sumar(lineas.map(l => l.monto)), lineas };
}
