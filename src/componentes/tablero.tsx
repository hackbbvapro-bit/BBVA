import { formatoLargo, formatoSoles, sumar, type Analisis, type Perfil } from "@/motor";
import { CAUSA_DIA_A_DIA, costoCorto, crecimientoDelHueco, enLista, mejorJugada } from "@/explica/explica";

/**
 * La franja de alerta de Inicio, en palabras. El monto es el del primer día en rojo; si después el hueco crece,
 * lo dice (nunca lo subestima). El verbo concuerda con las causas y no promete «estás a tiempo».
 */
export function alertaPrincipal(analisis: Analisis) {
  const d = analisis.proyeccion.deficit;
  if (!d) return undefined;
  const causas = enLista(d.causas.map(c => c.descripcion.toLowerCase()));
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
  const conMinimo = perfil.deudas.filter(d => d.pagoMinimo > 0);
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
      etiqueta: "Pagos mínimos del mes",
      valor: formatoSoles(sumar(conMinimo.map(d => d.pagoMinimo))),
      nota: conMinimo.length === 0 ? "Sin pagos mínimos este mes" : `Lo mínimo para no atrasarte en ${deudas(conMinimo.length)}`,
      destino: "deudas",
      accion: "Ir a Deudas",
    },
    cuarta,
  ];
}
