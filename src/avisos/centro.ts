/**
 * Centro de avisos: se genera con código a partir de lo guardado en la base y de las cifras del motor.
 * Ningún texto sale de un modelo de lenguaje, y ningún número se calcula aquí: se copian del motor
 * o de lo que la persona guardó.
 */
import type { Datos } from "../datos/tipos";
import { avisos as avisosBase, type Aviso } from "../explica/explica";
import { formatoLargo, formatoSoles, ocurrenciasMensuales, sumarDias, diasEntre } from "../motor";
import type { Analisis, Perfil } from "../motor";
import { calificacionPorAtraso, ETIQUETA_CALIFICACION } from "../motor/sbs";

export type Destino = "hoy" | "deudas" | "cobros" | "reporte";

export interface AvisoCentro extends Aviso {
  /** Identifica el aviso para marcarlo como leído; cambia si cambia la situación (otra fecha, otro atraso). */
  clave: string;
  destino: Destino;
}

const DIAS_VENCE = 3;
const DIAS_DOCUMENTO = 7;

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

function cuando(dias: number): string {
  if (dias <= 0) return "hoy";
  return dias === 1 ? "mañana" : `en ${dias} días`;
}

function avisosDeDeudas(datos: Datos): AvisoCentro[] {
  const { hoy } = datos.perfil;
  const salida: AvisoCentro[] = [];
  for (const d of datos.deudas.filter(x => !x.pagada && x.saldo > 0)) {
    if (d.diasAtraso > 0) {
      const calificacion = calificacionPorAtraso(d.diasAtraso);
      // Solo Dudoso y Pérdida tienen fuente de la SBS (ver motor/sbs.ts): los demás tramos no se nombran.
      const sbs = calificacion === "dudoso" || calificacion === "perdida"
        ? `Por ese atraso la SBS la calificaría como «${ETIQUETA_CALIFICACION[calificacion]}». `
        : "Cuanto más se atrase, peor queda tu calificación en la SBS. ";
      salida.push({
        id: `atraso-${d.id}`,
        clave: `atraso-${d.id}-${d.diasAtraso}`,
        nivel: "urgente",
        destino: "deudas",
        titulo: `${d.nombre}: ${plural(d.diasAtraso, "día", "días")} de atraso`,
        cuerpo: `${sbs}Llama a ${d.entidad} para ponerte al día o reprogramar; debes ${formatoSoles(d.saldo)}.`,
      });
      continue;
    }
    const proxima = ocurrenciasMensuales(d.diaPago, hoy, sumarDias(hoy, DIAS_VENCE))[0];
    if (!proxima) continue;
    const dias = diasEntre(hoy, proxima);
    salida.push({
      id: `vence-${d.id}`,
      clave: `vence-${d.id}-${proxima}`,
      nivel: "atencion",
      destino: "deudas",
      fecha: proxima,
      titulo: `${d.nombre} vence ${cuando(dias)}`,
      cuerpo: `El pago de ${formatoSoles(d.pagoMinimo)} (mínimo o cuota) es el ${formatoLargo(proxima)}.`,
    });
  }
  return salida;
}

function avisosDeCobros(datos: Datos): AvisoCentro[] {
  const { hoy } = datos.perfil;
  return datos.cobros
    .filter(c => !c.cobrado && c.fechaPrometida < hoy)
    .map(c => ({
      id: `cobro-${c.id}`,
      clave: `cobro-${c.id}-${c.fechaPrometida}`,
      nivel: "atencion" as const,
      destino: "cobros" as const,
      fecha: c.fechaPrometida,
      titulo: `${c.quien} te debe ${formatoSoles(c.monto)} y ya pasó la fecha`,
      cuerpo: `Quedó para el ${formatoLargo(c.fechaPrometida)}. Si ya te pagó, márcalo como cobrado; si no, ahora puedes escribirle.`,
    }));
}

function avisosDeDocumentos(datos: Datos): AvisoCentro[] {
  const { hoy } = datos.perfil;
  return datos.documentos
    .filter(d => d.fecha <= hoy && diasEntre(d.fecha, hoy) <= DIAS_DOCUMENTO)
    .map(d => ({
      id: `documento-${d.id}`,
      clave: `documento-${d.id}`,
      nivel: "bien" as const,
      destino: d.tipo === "reporte-sbs" ? ("reporte" as const) : ("deudas" as const),
      fecha: d.fecha,
      titulo: d.tipo === "reporte-sbs" ? "Analizamos tu reporte de deudas" : "Guardamos los datos de tu documento",
      cuerpo: d.resumen,
    }));
}

/** El pago recurrente de la proyección repite lo que ya dice «vence…» si cae el mismo día: no se muestra dos veces. */
function sinPagoRepetido(base: Aviso[], propios: AvisoCentro[]): AvisoCentro[] {
  const fechasVence = new Set(propios.filter(a => a.id.startsWith("vence-")).map(a => a.fecha));
  const porId: Record<string, Destino> = { deficit: "hoy", holgura: "hoy", pago: "hoy", deuda: "deudas" };
  return base
    .filter(a => !(a.id === "pago" && a.fecha && fechasVence.has(a.fecha)))
    .map(a => ({ ...a, clave: `${a.id}-${a.fecha ?? ""}`, destino: porId[a.id] ?? "hoy" }));
}

const ORDEN = { urgente: 0, atencion: 1, bien: 2 } as const;

/** Del más urgente al menos; a igual urgencia, el que ocurre antes. Siempre hay al menos uno (la holgura o el déficit). */
export function avisosDelCentro(datos: Datos, perfil: Perfil, analisis: Analisis): AvisoCentro[] {
  const propios = [...avisosDeDeudas(datos), ...avisosDeCobros(datos), ...avisosDeDocumentos(datos)];
  return [...sinPagoRepetido(avisosBase(perfil, analisis), propios), ...propios].sort(
    (a, b) => ORDEN[a.nivel] - ORDEN[b.nivel] || (a.fecha ?? "9999").localeCompare(b.fecha ?? "9999"),
  );
}

/** Los que piden atención y la persona aún no abrió. */
export function pendientesSinLeer(lista: readonly AvisoCentro[], leidos: readonly string[]): number {
  const vistos = new Set(leidos);
  return lista.filter(a => a.nivel !== "bien" && !vistos.has(a.clave)).length;
}
