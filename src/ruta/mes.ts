import { formatoSoles, semanalAMes, sumar } from "../motor/dinero";
import { variables } from "../motor/recurrentes";
import type { Analisis, Categoria, Centimos, Perfil, Recurrente } from "../motor/tipos";
import { CUOTAS_POR_DETALLAR, cuotasPorDetallar, desgloseMensual, flujoMensual } from "./ruta";

/** Nombre de cada categoría en lenguaje de la calle. */
export const NOMBRE_CATEGORIA: Record<Categoria, string> = {
  sueldo: "Sueldo",
  ingreso_variable: "Ingresos variables",
  alquiler: "Alquiler o vivienda",
  servicios: "Servicios",
  suscripciones: "Suscripciones",
  deuda: "Deudas",
  comida: "Comida y mercado",
  transporte: "Transporte",
  salud: "Salud",
  educacion: "Educación",
  ocio: "Salidas y delivery",
  compras: "Compras",
  familia: "Familia",
  otros: "Otros",
};

export interface LineaDelMes {
  nombre: string;
  /** Una frase corta que dice de dónde sale la cifra. */
  detalle: string;
  monto: Centimos;
}

export interface DetalleDelMes {
  entra: { fijos: LineaDelMes[]; variables: LineaDelMes[]; total: Centimos };
  sale: { fijos: LineaDelMes[]; diaADia: LineaDelMes[]; subtotalFijos: Centimos; subtotalDiaADia: Centimos; total: Centimos };
  cuotas: { lineas: LineaDelMes[]; total: Centimos };
  /** entra − sale − cuotas: lo mismo que `flujoMensual().libre`. */
  libre: Centimos;
}

/**
 * Reparte `total` céntimos en proporción a `pesos` sin perder ni inventar un céntimo (método del mayor resto).
 * Sirve para que las líneas de un bloque sumen EXACTAMENTE el subtotal que usa el resto de la app.
 */
export function repartir(total: Centimos, pesos: readonly number[]): Centimos[] {
  const suma = pesos.reduce((a, b) => a + b, 0);
  if (pesos.length === 0) return [];
  if (suma <= 0) return pesos.map((_, i) => (i === 0 ? total : 0));
  const crudos = pesos.map(p => (total * p) / suma);
  const base = crudos.map(Math.floor);
  let falta = total - base.reduce((a, b) => a + b, 0);
  const orden = crudos.map((c, i) => ({ i, resto: c - Math.floor(c) })).sort((a, b) => b.resto - a.resto || a.i - b.i);
  for (const { i } of orden) {
    if (falta <= 0) break;
    base[i] += 1;
    falta -= 1;
  }
  return base;
}

const alMes = (r: Recurrente): Centimos => (r.frecuencia === "mensual" ? r.monto : semanalAMes(r.monto));
const cuando = (r: Recurrente) => (r.frecuencia === "mensual" ? `Cada mes, el día ${r.diaDelMes}` : "Cada semana");

/** Las descripciones más repetidas de un grupo de movimientos, para decir qué hay dentro de una categoría. */
function principales(descripciones: string[], cuantas = 3): string {
  const veces = new Map<string, number>();
  for (const d of descripciones) veces.set(d, (veces.get(d) ?? 0) + 1);
  return [...veces].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, cuantas).map(([d]) => d).join(", ");
}

/**
 * Tu mes, línea por línea: de dónde viene cada sol que entra y a dónde se va cada sol que sale.
 * Los subtotales son EXACTAMENTE los de `desgloseMensual` y `flujoMensual` (los mismos de Inicio y Mi ruta);
 * las líneas variables se reparten en proporción a lo observado en las últimas 12 semanas.
 */
export function detalleDelMes(perfil: Perfil, analisis: Analisis): DetalleDelMes {
  const d = desgloseMensual(analisis);
  const f = flujoMensual(perfil, analisis);
  const fijos = analisis.recurrentes.filter(r => r.categoria !== "deuda" && r.descripcion !== CUOTAS_POR_DETALLAR);
  const porDetallar = cuotasPorDetallar(analisis);
  const linea = (r: Recurrente): LineaDelMes => ({ nombre: r.descripcion, detalle: cuando(r), monto: Math.abs(alMes(r)) });
  const porMonto = (a: LineaDelMes, b: LineaDelMes) => b.monto - a.monto;

  const historia = variables(perfil.movimientos, perfil.deudas, perfil.hoy);
  const semanas = analisis.ingresoVariable.semanasObservadas;

  // Lo que entra variable: cada fuente pesa lo que pesó en la historia.
  const entradas = historia.filter(m => m.monto > 0);
  const fuentes = [...new Set(entradas.map(m => m.descripcion))];
  const pesosEntrada = fuentes.map(n => sumar(entradas.filter(m => m.descripcion === n).map(m => m.monto)));
  const montosEntrada = repartir(d.ingresoVariable, pesosEntrada);
  const variablesEntra = d.ingresoVariable > 0
    ? fuentes.map((nombre, i) => {
        const veces = entradas.filter(m => m.descripcion === nombre).length;
        return { nombre, detalle: `Varía cada semana: ${veces} cobros en las últimas ${semanas} semanas`, monto: montosEntrada[i] };
      }).filter(l => l.monto > 0).sort(porMonto)
    : [];

  // Lo que sale en el día a día, por categoría, con ejemplos de qué hay dentro.
  const categorias = analisis.gastoVariable.porCategoria;
  const montosDia = repartir(d.gastoVariable, categorias.map(c => c.mensual));
  const salidas = historia.filter(m => m.monto < 0);
  const diaADia = categorias.map((c, i) => ({
    nombre: NOMBRE_CATEGORIA[c.categoria],
    detalle: principales(salidas.filter(m => m.categoria === c.categoria).map(m => m.descripcion)) || "Gasto variable",
    monto: montosDia[i],
  })).filter(l => l.monto > 0);

  const cuotas = perfil.deudas.map(deuda => {
    const cuota = Math.max(deuda.pagoHabitual, deuda.pagoMinimo);
    const extra = cuota > deuda.pagoMinimo ? ` · mínimo ${formatoSoles(deuda.pagoMinimo)}` : "";
    return { nombre: deuda.nombre, detalle: `Vence el día ${deuda.diaPago}${extra}`, monto: cuota };
  });
  if (porDetallar > 0) cuotas.push({ nombre: "Cuotas de tus deudas", detalle: "Lo que pagas al mes; el detalle de cada deuda lo puedes agregar después", monto: porDetallar });
  cuotas.sort(porMonto);

  return {
    entra: { fijos: fijos.filter(r => r.monto > 0).map(linea).sort(porMonto), variables: variablesEntra, total: f.ingresos },
    sale: {
      fijos: fijos.filter(r => r.monto < 0).map(linea).sort(porMonto),
      diaADia,
      subtotalFijos: d.gastosFijos - porDetallar,
      subtotalDiaADia: d.gastoVariable,
      total: f.gastos,
    },
    cuotas: { lineas: cuotas, total: f.cuotas },
    libre: f.libre,
  };
}
