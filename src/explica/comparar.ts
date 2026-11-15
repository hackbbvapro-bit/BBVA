import { efectoSobreDeficit, formatoLargo, formatoSoles, sumar, type Centimos, type FechaISO, type Jugada, type Proyeccion } from "../motor";
import { costoEnPalabras } from "./costo";

/** Qué le pasa al día en rojo con la opción simulada. */
export type Conclusion = "evitado" | "reducido" | "aplazado" | "incierto" | "sin_cambio";

/** Un lado de la comparación: el día más bajo del mes, con su signo (negativo = falta dinero). */
export interface LadoComparacion {
  saldo: Centimos;
  fecha: FechaISO;
  /** «Te faltan» si está bajo cero; «Te quedan» si no. */
  etiqueta: string;
  /** El monto sin signo, ya en soles. */
  monto: string;
}

export interface Comparacion {
  antes: LadoComparacion;
  despues: LadoComparacion;
  /** Después menos antes, en céntimos: positivo mejora, negativo empeora, cero no cambia. */
  cambio: Centimos;
  cambioTexto: string;
  conclusion: Conclusion;
  /** La conclusión en una frase corta. */
  titulo: string;
  /** Lo que hay que saber además (costo, pago que se sigue debiendo). Vacío si no hay nada que agregar. */
  nota: string;
}

function lado(p: Proyeccion): LadoComparacion {
  const enRojo = p.saldoMinimo < 0;
  return {
    saldo: p.saldoMinimo,
    fecha: p.fechaSaldoMinimo,
    etiqueta: enRojo ? "Te faltan" : "Te quedan",
    monto: formatoSoles(Math.abs(p.saldoMinimo)),
  };
}

/** El cambio con su signo delante: «+S/ 161.80», «−S/ 20.00» o «S/ 0.00». */
export function cambioConSigno(cambio: Centimos): string {
  if (cambio === 0) return formatoSoles(0);
  return `${cambio > 0 ? "+" : "−"}${formatoSoles(Math.abs(cambio))}`;
}

/**
 * Antes y después de simular una opción, para la tarjeta de comparación. No calcula nada nuevo: toma el día más bajo de
 * cada proyección del motor, los resta en céntimos y elige la conclusión con `efectoSobreDeficit` (la misma regla que
 * marca cada opción). Si el costo depende de la entidad, la conclusión es «incierto» aunque los números mejoren.
 */
export function compararEscenario(
  antes: Proyeccion,
  despues: Proyeccion,
  jugada: Pick<Jugada, "costo" | "certezaCosto">,
): Comparacion {
  const cambio = sumar([despues.saldoMinimo, -antes.saldoMinimo]);
  const efecto = efectoSobreDeficit(antes, despues);
  const nuevosPendientes = despues.fueraDeVentana.filter(e => e.monto < 0 && !antes.fueraDeVentana.some(a => a.fecha === e.fecha && a.descripcion === e.descripcion));

  let conclusion: Conclusion;
  if (efecto === "posterga") conclusion = "aplazado";
  else if (jugada.certezaCosto === "desconocido") conclusion = "incierto";
  else if (efecto === "elimina") conclusion = "evitado";
  else if (efecto === "reduce") conclusion = "reducido";
  else conclusion = "sin_cambio";

  const titulo = {
    evitado: "Evitas el día en rojo",
    reducido: "Achica el hueco, pero no lo elimina",
    aplazado: "Solo lo aplaza a una fecha posterior",
    incierto: "Incierto: depende de que la entidad lo acepte",
    sin_cambio: cambio === 0 ? "No cambia tu día más bajo" : "No mejora tu día en rojo",
  }[conclusion];

  const notas: string[] = [];
  if (nuevosPendientes.length > 0) {
    const p = nuevosPendientes[0];
    notas.push(`${p.descripcion} (${formatoSoles(-p.monto)}) se sigue debiendo el ${formatoLargo(p.fecha)}.`);
  }
  if (conclusion !== "incierto" && (jugada.costo > 0 || jugada.certezaCosto !== "conocido")) {
    const costo = costoEnPalabras(jugada);
    notas.push(`${costo.charAt(0).toUpperCase()}${costo.slice(1)}.`);
  }

  return { antes: lado(antes), despues: lado(despues), cambio, cambioTexto: cambioConSigno(cambio), conclusion, titulo, nota: notas.join(" ") };
}
