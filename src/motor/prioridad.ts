import { exigirCentimos, formatoSoles, formatoTasa, sumar } from "./dinero";
import { diasEntre, fechaEnMes, formatoCorto, partes } from "./fechas";
import {
  calificacionPorAtraso,
  diasParaEmpeorar,
  ETIQUETA_CALIFICACION,
  siguienteCalificacion,
  type Calificacion,
} from "./sbs";
import type { Centimos, FechaISO } from "./tipos";

/**
 * Prioridad de pagos: con el dinero disponible, qué pagar primero, cuánto, y qué
 * negociar con la entidad. Puro y determinista: sin IA, sin azar, todo en céntimos.
 *
 * Reglas:
 * 1. Primero los pagos mínimos/cuotas que evitan la mora.
 *    Orden: con atraso (las más cerca de empeorar su calificación SBS primero),
 *    luego las que vencen en ≤ 7 días (riesgo de cargos), luego mayor TCEA,
 *    luego saldo menor, luego id.
 * 2. Si no alcanza para todos los mínimos, los que no caben van a «negociar»
 *    (monto 0): reprogramar con la entidad ANTES de caer en atraso.
 * 3. Si alcanza para todos, lo que sobra va por avalancha (mayor TCEA primero),
 *    sin pasar del saldo de cada deuda. EXCEPCIÓN: si la proyección ya tiene un día
 *    en rojo (`rojoEl`), no se suma extra a ninguna deuda: ese margen se guarda para
 *    tapar el hueco (misma regla que Mi ruta y el asistente).
 */

/** Días hasta el vencimiento para considerar un pago «ya». */
const DIAS_URGENTE = 7;

export interface DeudaPrioridad {
  id: string;
  nombre: string;
  entidad: string;
  saldo: Centimos;
  /** TCEA en puntos básicos; si no se conoce, quien llama pasa 0. */
  tceaBp: number;
  pagoMinimo: Centimos;
  /** Día del mes en que vence (1-31; en meses cortos, el último día). */
  diaPago: number;
  /** Días de atraso actuales (0 si está al día). */
  diasAtraso: number;
}

export interface EntradaPrioridad {
  hoy: FechaISO;
  /** Ya calculado por quien llama: saldo + ingresos seguros − gastos esenciales. */
  disponible: Centimos;
  deudas: DeudaPrioridad[];
  /** Primer día en que el saldo proyectado queda en negativo, si lo hay. Con valor, no hay avalancha. */
  rojoEl?: FechaISO | null;
}

export type GrupoPago = "pagar-ya" | "pagar-este-mes" | "negociar";

export interface DecisionPago {
  id: string;
  nombre: string;
  entidad: string;
  grupo: GrupoPago;
  monto: Centimos;
  motivo: string;
  calificacion: Calificacion;
  proximoPago: FechaISO | null;
  /** 1 = lo primero. Sigue la prioridad. */
  orden: number;
}

export interface ResultadoPrioridad {
  decisiones: DecisionPago[];
  disponible: Centimos;
  comprometido: Centimos;
  /** disponible − comprometido (≥ 0). */
  sobrante: Centimos;
  /** Suma de los pagos mínimos que no se alcanzan a cubrir. */
  faltante: Centimos;
  alcanzaParaTodo: boolean;
  /** Copia de `EntradaPrioridad.rojoEl`: si tiene valor, el sobrante se guardó a propósito. */
  rojoEl: FechaISO | null;
}

/** Próxima fecha de pago desde hoy (hoy cuenta). Fin de mes sin deriva: día 31 en febrero -> 28/29. */
function proximoPagoDesde(hoy: FechaISO, diaPago: number): FechaISO | null {
  if (!Number.isInteger(diaPago) || diaPago < 1 || diaPago > 31) return null;
  const { anio, mes } = partes(hoy);
  const esteMes = fechaEnMes(anio, mes, diaPago);
  if (esteMes >= hoy) return esteMes;
  return mes === 12 ? fechaEnMes(anio + 1, 1, diaPago) : fechaEnMes(anio, mes + 1, diaPago);
}

interface Fila {
  d: DeudaPrioridad;
  /** Lo mínimo a pagar: el mínimo, o el saldo si es menor. */
  minimo: Centimos;
  proximoPago: FechaISO | null;
  diasParaPago: number | null;
  calificacion: Calificacion;
  empeora: number | null;
  atrasada: boolean;
  urgente: boolean;
  monto: Centimos;
  grupo: GrupoPago;
  extra: Centimos;
}

function comparar(a: Fila, b: Fila): number {
  // 1) Con atraso primero; entre ellas, la que está más cerca de empeorar (null = ya es Pérdida, al final).
  if (a.atrasada !== b.atrasada) return a.atrasada ? -1 : 1;
  if (a.atrasada) {
    const ea = a.empeora ?? Number.POSITIVE_INFINITY;
    const eb = b.empeora ?? Number.POSITIVE_INFINITY;
    if (ea !== eb) return ea < eb ? -1 : 1;
  }
  // 2) Las que vencen pronto (riesgo de cargos) antes que las que tienen margen.
  if (a.urgente !== b.urgente) return a.urgente ? -1 : 1;
  // 3) Mayor TCEA, 4) saldo menor, 5) id.
  return b.d.tceaBp - a.d.tceaBp || a.d.saldo - b.d.saldo || a.d.id.localeCompare(b.d.id);
}

/** Avalancha: mayor TCEA, luego saldo menor, luego id. */
function compararAvalancha(a: Fila, b: Fila): number {
  return b.d.tceaBp - a.d.tceaBp || a.d.saldo - b.d.saldo || a.d.id.localeCompare(b.d.id);
}

const dias = (n: number): string => `${n} ${n === 1 ? "día" : "días"}`;

function motivoCubierto(f: Fila): string {
  const partesMotivo: string[] = [];
  const pagoTotal = f.minimo === f.d.saldo && f.d.saldo < f.d.pagoMinimo;
  if (f.atrasada) {
    const sig = siguienteCalificacion(f.calificacion);
    const aviso =
      f.empeora !== null && sig !== null
        ? ` Si pasan ${dias(f.empeora)} más sin pagar, tu calificación bajaría a «${ETIQUETA_CALIFICACION[sig]}».`
        : "";
    partesMotivo.push(
      `Ya llevas ${dias(f.d.diasAtraso)} de atraso (calificación ${ETIQUETA_CALIFICACION[f.calificacion]}). Pagar ${formatoSoles(f.minimo)} primero evita que empeore.${aviso}`,
    );
  } else if (f.grupo === "pagar-ya" && f.proximoPago && f.diasParaPago !== null) {
    const cuando =
      f.diasParaPago === 0 ? "vence hoy" : `vence en ${dias(f.diasParaPago)} (${formatoCorto(f.proximoPago)})`;
    partesMotivo.push(`Esta ${cuando}. Cubre ${formatoSoles(f.minimo)} para no caer en mora ni pagar cargos.`);
  } else {
    const cuando = f.proximoPago ? ` Vence el ${formatoCorto(f.proximoPago)}.` : "";
    partesMotivo.push(`Reserva ${formatoSoles(f.minimo)} para el pago de este mes y evita la mora.${cuando}`);
  }
  if (pagoTotal) partesMotivo.push(`Solo te quedan ${formatoSoles(f.d.saldo)} por pagar: con esto la dejas en cero.`);
  if (f.extra > 0) {
    partesMotivo.push(
      `Además sumas ${formatoSoles(f.extra)} extra porque es la deuda más cara (TCEA ${formatoTasa(f.d.tceaBp)}): así pagas menos intereses.`,
    );
  }
  return partesMotivo.join(" ");
}

function motivoNegociar(f: Fila): string {
  const minimo = formatoSoles(f.minimo);
  if (f.atrasada) {
    return `Ya llevas ${dias(f.d.diasAtraso)} de atraso y no alcanza para el mínimo de ${minimo}. Regulariza cuanto antes: habla con ${f.d.entidad} y negocia un plan de pago.`;
  }
  return `No alcanza para el mínimo de ${minimo}. Llama a ${f.d.entidad} para reprogramar ANTES de caer en atraso.`;
}

export function priorizarPagos(e: EntradaPrioridad): ResultadoPrioridad {
  exigirCentimos(e.disponible, "disponible");
  const disponible = Math.max(0, e.disponible);

  const filas: Fila[] = e.deudas
    .filter((d) => exigirCentimos(d.saldo, "saldo") > 0)
    .map((d) => {
      exigirCentimos(d.pagoMinimo, "pagoMinimo");
      exigirCentimos(d.tceaBp, "tceaBp");
      if (d.pagoMinimo < 0) throw new Error(`El pago mínimo no puede ser negativo (${d.id})`);
      const diasAtraso = Math.max(0, d.diasAtraso);
      const proximoPago = proximoPagoDesde(e.hoy, d.diaPago);
      const diasParaPago = proximoPago ? diasEntre(e.hoy, proximoPago) : null;
      return {
        d: { ...d, diasAtraso },
        minimo: Math.min(d.pagoMinimo, d.saldo),
        proximoPago,
        diasParaPago,
        calificacion: calificacionPorAtraso(diasAtraso),
        empeora: diasParaEmpeorar(diasAtraso),
        atrasada: diasAtraso > 0,
        urgente: diasParaPago !== null && diasParaPago <= DIAS_URGENTE,
        monto: 0,
        grupo: "negociar" as GrupoPago,
        extra: 0,
      };
    })
    .sort(comparar);

  // Pagos mínimos en orden de prioridad: se cubre cada uno si todavía cabe.
  let restante = disponible;
  let hayNegociar = false;
  for (const f of filas) {
    if (f.minimo <= restante) {
      restante -= f.minimo;
      f.monto = f.minimo;
      f.grupo = f.atrasada || f.urgente ? "pagar-ya" : "pagar-este-mes";
    } else {
      hayNegociar = true;
    }
  }

  // Avalancha con lo que sobra, solo si todos los mínimos quedaron cubiertos y no viene un día en rojo.
  const rojoEl = e.rojoEl ?? null;
  if (!hayNegociar && rojoEl === null) {
    for (const f of [...filas].sort(compararAvalancha)) {
      if (restante <= 0) break;
      const extra = Math.min(restante, f.d.saldo - f.monto);
      if (extra > 0) {
        f.extra = extra;
        f.monto += extra;
        restante -= extra;
      }
    }
  }

  const decisiones: DecisionPago[] = filas.map((f, i) => ({
    id: f.d.id,
    nombre: f.d.nombre,
    entidad: f.d.entidad,
    grupo: f.grupo,
    monto: f.monto,
    motivo: f.grupo === "negociar" ? motivoNegociar(f) : motivoCubierto(f),
    calificacion: f.calificacion,
    proximoPago: f.proximoPago,
    orden: i + 1,
  }));

  const comprometido = sumar(decisiones.map((d) => d.monto));
  const faltante = sumar(filas.filter((f) => f.grupo === "negociar").map((f) => f.minimo));
  return {
    decisiones,
    disponible,
    comprometido,
    sobrante: disponible - comprometido,
    faltante,
    alcanzaParaTodo: !hayNegociar,
    rojoEl,
  };
}
