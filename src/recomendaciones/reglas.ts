import { Extraccion } from "../documentos/esquema";
import { prioridadDePagos } from "../datos/paraPrioridad";
import type { Datos } from "../datos/tipos";
import { formatoSoles } from "../motor/dinero";
import { formatoCorto } from "../motor/fechas";
import { calificacionPorAtraso } from "../motor/sbs";
import type { Analisis } from "../motor/tipos";
import { CATALOGO, type EntradaCatalogo } from "./catalogo";

export interface Recomendacion {
  entrada: EntradaCatalogo;
  /** La regla que se cumplió, en español y con las cifras reales de los datos. */
  porQue: string;
}

const plural = (n: number, uno: string, varios: string): string => `${n} ${n === 1 ? uno : varios}`;

/**
 * Motivo de la garantía líquida: un atraso que ya saca la calificación de Normal, o una calificación
 * distinta de Normal en el último reporte SBS. Un atraso de pocos días sigue en Normal: no basta.
 */
function motivoCalificacion(datos: Datos): string | null {
  const abiertas = datos.deudas.filter(d => !d.pagada && d.saldo > 0);
  const atrasadas = abiertas.filter(d => calificacionPorAtraso(d.diasAtraso) !== "normal");
  if (atrasadas.length > 0) {
    const mayor = Math.max(...atrasadas.map(d => d.diasAtraso));
    return atrasadas.length === 1
      ? `Tienes una deuda con ${plural(mayor, "día", "días")} de atraso.`
      : `Tienes ${atrasadas.length} deudas con atraso; la mayor, de ${plural(mayor, "día", "días")}.`;
  }
  const doc = [...datos.documentos].reverse().find(d => d.tipo === "reporte-sbs" && Extraccion.safeParse(d.datos).success);
  if (doc) {
    const e = Extraccion.parse(doc.datos);
    const conMarca = e.deudas.filter(x => x.calificacion !== null && x.calificacion !== "normal");
    if (conMarca.length > 0) return `Tu calificación no es Normal en tu reporte de la SBS del ${doc.fecha} (${plural(conMarca.length, "deuda", "deudas")}).`;
  }
  return null;
}

/** Motivo de reprogramar: déficit proyectado, o mínimos que no alcanzan según la prioridad de pagos. */
function motivoReprogramar(datos: Datos, analisis: Analisis): string | null {
  const deficit = analisis.proyeccion.deficit;
  if (deficit) {
    return `Tu proyección deja el saldo bajo cero el ${formatoCorto(deficit.fecha)}: faltarían ${formatoSoles(deficit.faltante)}.`;
  }
  const prioridad = prioridadDePagos(datos, analisis);
  const negociar = prioridad.decisiones.filter(d => d.grupo === "negociar");
  if (prioridad.faltante > 0 || negociar.length > 0) {
    return `Con lo que tienes disponible no alcanzas a cubrir ${plural(negociar.length, "pago mínimo", "pagos mínimos")}: faltarían ${formatoSoles(prioridad.faltante)}.`;
  }
  return null;
}

/** Qué opciones del catálogo tienen sentido para estos datos. Puro: mismas entradas, mismo resultado. */
export function recomendar(datos: Datos, analisis: Analisis): Recomendacion[] {
  const entrada = (id: EntradaCatalogo["id"]): EntradaCatalogo => {
    const e = CATALOGO.find(x => x.id === id);
    if (!e) throw new Error(`Falta ${id} en el catálogo`);
    return e;
  };
  const salida: Recomendacion[] = [];
  const reprogramar = motivoReprogramar(datos, analisis);

  // Las dos tarjetas piden inmovilizar un depósito: no se proponen a quien ya no llega a fin de mes.
  if (!reprogramar) {
    const calificacion = motivoCalificacion(datos);
    if (calificacion) salida.push({ entrada: entrada("garantia-liquida"), porQue: calificacion });

    const hayTarjeta = datos.deudas.some(d => d.tipo === "tarjeta" && !d.pagada && d.saldo > 0);
    if (!hayTarjeta) salida.push({ entrada: entrada("tarjeta-start"), porQue: "No tienes ninguna tarjeta de crédito abierta, así que aún no hay historial con tarjeta en tu base." });
  }

  if (reprogramar) salida.push({ entrada: entrada("reprogramar"), porQue: reprogramar });

  return salida;
}
