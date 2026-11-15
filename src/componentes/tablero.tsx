import { formatoLargo, formatoSoles, gastosFijosDelMes, sumar, type Analisis, type Perfil } from "@/motor";
import { CAUSA_DIA_A_DIA, costoCorto, crecimientoDelHueco, enLista, mejorJugada } from "@/explica/explica";
import { fechaConDia, fraseRitmo, type FlujoMensual } from "@/ruta/ruta";

/**
 * La franja de alerta de Inicio, en palabras. El monto es el del primer día en rojo; si después el hueco crece,
 * lo dice (nunca lo subestima). El verbo concuerda con las causas y no promete «estás a tiempo».
 */
export function alertaPrincipal(analisis: Analisis) {
  const d = analisis.proyeccion.deficit;
  if (!d) return undefined;
  // Cada causa con su monto del motor: «alquiler (S/ 850.00)».
  const causas = enLista(d.causas.map(c => `${c.descripcion.toLowerCase()} (${formatoSoles(-c.monto)})`));
  const queSale = d.causas.length === 0 ? `Para ese día ${CAUSA_DIA_A_DIA}.` : d.causas.length > 1 ? `Ese día se juntan ${causas}.` : `Ese día sale ${causas}.`;
  const plazo = d.diasRestantes <= 0 ? "Es hoy: actúa ya." : d.diasRestantes === 1 ? "Queda 1 día para evitarlo." : `Quedan ${d.diasRestantes} días para evitarlo.`;
  return {
    fecha: formatoLargo(d.fecha),
    monto: formatoSoles(d.faltante),
    detalle: [queSale, crecimientoDelHueco(d), plazo].filter(Boolean).join(" "),
  };
}

/** A qué sección lleva cada indicador al tocarlo. */
export type DestinoCifra = "dinero" | "deudas" | "como-evitarlo" | "proyeccion";
export type CifraInicio = {
  etiqueta: string;
  valor: string;
  /** Qué significa la cifra, en una línea. */
  nota: string;
  destino: DestinoCifra;
  /** Texto para lectores de pantalla: a dónde lleva. */
  accion: string;
  /** Desglose (descripción, monto), de mayor a menor. */
  lineas?: [string, string][];
};

const deudas = (n: number) => `${n} ${n === 1 ? "deuda" : "deudas"}`;

/**
 * Los cuatro indicadores de Inicio. Cada cifra sale del perfil o del motor (nunca de la IA), dice
 * qué significa y lleva a la sección donde se puede actuar sobre ella.
 */
export function cifras(perfil: Perfil, analisis: Analisis): CifraInicio[] {
  const p = analisis.proyeccion;
  const barata = mejorJugada(analisis);
  const n = perfil.deudas.length;
  const fijos = gastosFijosDelMes(analisis.recurrentes, perfil.deudas);
  const hayOpciones = p.deficit !== null && analisis.jugadas.length > 0;
  const cuarta: CifraInicio = p.deficit && barata
    ? {
        etiqueta: "Salida más barata",
        valor: costoCorto(barata),
        nota: `${barata.titulo} · libera ${formatoSoles(barata.libera)}`,
        destino: "como-evitarlo",
        accion: "Ver las opciones para evitar el déficit",
      }
    : {
        etiqueta: "Al final del mes",
        valor: formatoSoles(p.saldoFinal),
        nota: p.deficit ? "Ninguna opción sola cubre el bache" : "Si todo sigue como va",
        destino: hayOpciones ? "como-evitarlo" : "proyeccion",
        accion: hayOpciones ? "Ver las opciones para evitar el déficit" : "Ver la proyección de 30 días",
      };
  return [
    {
      etiqueta: "Dinero hoy",
      valor: formatoSoles(perfil.saldoActual),
      nota: "En tus cuentas y billeteras",
      destino: "dinero",
      accion: "Ir a Mi dinero",
    },
    {
      etiqueta: "Deuda total",
      valor: formatoSoles(sumar(perfil.deudas.map(d => d.saldo))),
      nota: n === 0 ? "No tienes deudas registradas" : `Lo que debes en ${deudas(n)}`,
      destino: "deudas",
      accion: "Ir a Deudas",
    },
    {
      // Alquiler, servicios, suscripciones y el mínimo o la cuota de cada deuda: lo que sale sí o sí.
      etiqueta: "Gastos fijos del mes",
      valor: formatoSoles(fijos.total),
      nota: fijos.lineas.length === 0 ? "No tienes pagos fijos registrados" : "Lo que sale sí o sí cada mes",
      lineas: fijos.lineas.map(l => [l.descripcion, formatoSoles(l.monto)]),
      destino: "proyeccion",
      accion: "Ver la proyección de 30 días",
    },
    cuarta,
  ];
}

/** La tarjeta de estado de Inicio: cómo queda el saldo en 30 días. Todo monto sale del motor. */
export type EstadoSaldo = {
  tono: "rojo" | "ambar" | "verde";
  etiqueta: string;
  valor: string;
  nota: string;
  /** Lo que sale el día del faltante (descripción, monto). */
  lineas?: [string, string][];
  /** Una frase más, debajo del desglose. */
  extra?: string;
  /** Texto del botón que lleva a las opciones; solo si hay opciones. */
  accion?: string;
  testId?: string;
};

export function estadoSaldo(analisis: Analisis, flujo: FlujoMensual): EstadoSaldo {
  const d = analisis.proyeccion.deficit;
  const ritmo = fraseRitmo(flujo);
  if (d) {
    return {
      tono: "rojo",
      etiqueta: "Te faltará dinero",
      valor: formatoSoles(d.faltante),
      nota: `El ${fechaConDia(d.fecha)}`,
      lineas: d.causas.map(c => [c.descripcion.replace(/^pago\s+/i, ""), formatoSoles(Math.abs(c.monto))]),
      extra: ritmo ? `${ritmo}.` : undefined,
      accion: analisis.jugadas.length > 0 ? "Ver qué cambia" : undefined,
    };
  }
  if (ritmo) {
    return {
      tono: "ambar",
      etiqueta: "Llegas, pero justo",
      valor: formatoSoles(-flujo.libre),
      nota: "Es lo que gastas de más cada mes: a 30 días llegas, pero así no se sostiene",
      testId: "tarjeta-ritmo",
    };
  }
  return { tono: "verde", etiqueta: "Próximos 30 días", valor: "Sin faltantes", nota: "Tu saldo cubriría los pagos previstos" };
}
