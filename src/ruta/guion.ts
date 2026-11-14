/**
 * Guion de la entrada conversada: qué se pregunta, en qué orden y cómo se valida cada respuesta.
 * Es código puro (sin pantalla ni IA): las preguntas son fijas y las cifras se leen en céntimos enteros.
 * La pantalla (componentes/entrada.tsx) solo pinta lo que este guion decide.
 */
import { formatoSoles, type Centimos, type FechaISO } from "../motor";
import { leerSoles } from "../datos/formulario";
import { ErrorDatos } from "../datos/validar";
import type { TipoDeudaDebo } from "../datos/tipos";
import type { Atraso, Cobro, Respuestas } from "./entrada";

export type Paso =
  | "nombre" | "cobro" | "ingreso" | "saldo" | "fijos" | "diaADia" | "deudas"
  | "tipoDeuda" | "saldoDeuda" | "cuotaDeuda" | "atraso" | "tuvoCredito" | "permiso";

export type TieneDeudas = "no" | "al_dia" | "atraso";

/** Lo respondido hasta ahora. Un campo sin valor es una pregunta todavía no hecha. */
export interface Borrador {
  nombre?: string;
  cobro?: Cobro;
  ingreso?: Centimos;
  saldo?: Centimos;
  fijos?: Centimos;
  diaADia?: Centimos;
  deudas?: TieneDeudas;
  tipoDeuda?: TipoDeudaDebo;
  saldoDeuda?: Centimos;
  cuotaDeuda?: Centimos;
  atraso?: Exclude<Atraso, "al_dia">;
  tuvoCredito?: boolean;
}

export interface Opcion { valor: string; texto: string }
export interface Pregunta {
  paso: Paso;
  texto: string;
  ayuda?: string;
  clase: "texto" | "soles" | "opciones";
  opciones?: Opcion[];
  marcador?: string;
}

/** Tope de cordura para cualquier monto escrito: diez millones de soles. */
export const MONTO_MAXIMO: Centimos = 1_000_000_000;
export const LARGO_MAXIMO_DE_NOMBRE = 40;

const COBROS: Opcion[] = [
  { valor: "fin_de_mes", texto: "A fin de mes" },
  { valor: "quincena", texto: "En quincenas" },
  { valor: "semanal", texto: "Cada semana" },
];
const DEUDAS: Opcion[] = [
  { valor: "no", texto: "No tengo deudas" },
  { valor: "al_dia", texto: "Sí, y pago al día" },
  { valor: "atraso", texto: "Sí, y tengo pagos atrasados" },
];
const TIPOS: Opcion[] = [
  { valor: "tarjeta", texto: "Tarjeta de crédito" },
  { valor: "prestamo", texto: "Préstamo" },
  { valor: "personal", texto: "Le debo a una persona" },
];
const ATRASOS: Opcion[] = [
  { valor: "menos_de_un_mes", texto: "Menos de un mes" },
  { valor: "uno_a_dos_meses", texto: "Uno a dos meses" },
  { valor: "mas_de_dos_meses", texto: "Más de dos meses" },
];
const SI_NO: Opcion[] = [
  { valor: "si", texto: "Sí" },
  { valor: "no", texto: "No, nunca" },
];
/** El permiso para usar IA y voz se pide aparte, al final, y nunca viene marcado. */
export const PERMISOS: Opcion[] = [
  { valor: "si", texto: "Sí, activar IA y voz" },
  { valor: "no", texto: "No, solo en este equipo" },
];

/** Los pasos que tocan con lo respondido hasta ahora. Antes de saber si hay deudas es una estimación. */
export function pasosPrevistos(b: Borrador): Paso[] {
  const pasos: Paso[] = ["nombre", "cobro", "ingreso", "saldo", "fijos", "diaADia", "deudas"];
  if (b.deudas !== undefined && b.deudas !== "no") {
    pasos.push("tipoDeuda", "saldoDeuda", "cuotaDeuda");
    if (b.deudas === "atraso") pasos.push("atraso");
  }
  // Con una tarjeta o un préstamo vigente ya se sabe que tuvo crédito: no se pregunta.
  if (b.deudas === undefined || b.deudas === "no" || b.tipoDeuda === undefined || b.tipoDeuda === "personal") pasos.push("tuvoCredito");
  pasos.push("permiso");
  return pasos;
}

const RESPONDIDO: Record<Exclude<Paso, "permiso">, (b: Borrador) => boolean> = {
  nombre: b => b.nombre !== undefined,
  cobro: b => b.cobro !== undefined,
  ingreso: b => b.ingreso !== undefined,
  saldo: b => b.saldo !== undefined,
  fijos: b => b.fijos !== undefined,
  diaADia: b => b.diaADia !== undefined,
  deudas: b => b.deudas !== undefined,
  tipoDeuda: b => b.tipoDeuda !== undefined,
  saldoDeuda: b => b.saldoDeuda !== undefined,
  cuotaDeuda: b => b.cuotaDeuda !== undefined,
  atraso: b => b.atraso !== undefined,
  tuvoCredito: b => b.tuvoCredito !== undefined,
};

/** La siguiente pregunta. «permiso» es siempre la última y no se guarda en el borrador. */
export function proximoPaso(b: Borrador): Paso {
  return pasosPrevistos(b).find(p => p === "permiso" || !RESPONDIDO[p](b)) ?? "permiso";
}

/** Por dónde va: número de la pregunta actual (desde 1) y cuántas se prevén. */
export function avance(b: Borrador): { actual: number; total: number } {
  const pasos = pasosPrevistos(b);
  return { actual: pasos.indexOf(proximoPaso(b)) + 1, total: pasos.length };
}

export function pregunta(paso: Paso, b: Borrador): Pregunta {
  switch (paso) {
    case "nombre":
      return { paso, clase: "texto", texto: "Hola, soy tu copiloto. Te hago unas preguntas cortas para armar tu caso. ¿Cómo te llamo?", ayuda: "Usa un apodo, no tu nombre completo.", marcador: "Por ejemplo: Lucho" };
    case "cobro":
      return { paso, clase: "opciones", texto: `Mucho gusto, ${b.nombre ?? ""}. ¿Cuándo te entra la plata?`.replace(" .", "."), opciones: COBROS };
    case "ingreso":
      return { paso, clase: "soles", texto: "¿Cuánto te entra al mes, más o menos?", ayuda: "Suma todo lo de un mes. Usa una cifra aproximada o inventada.", marcador: "2500" };
    case "saldo":
      return { paso, clase: "soles", texto: "¿Cuánto tienes hoy, entre tu cuenta y tu efectivo?", ayuda: "Si no tienes nada, escribe 0.", marcador: "600" };
    case "fijos":
      return { paso, clase: "soles", texto: "¿Cuánto pagas al mes de alquiler y servicios?", ayuda: "Luz, agua, internet y celular. Si no pagas nada, escribe 0.", marcador: "900" };
    case "diaADia":
      return { paso, clase: "soles", texto: "¿Y cuánto se te va al mes en comida, pasajes y el día a día?", ayuda: "Un aproximado basta.", marcador: "800" };
    case "deudas":
      return { paso, clase: "opciones", texto: "¿Tienes deudas ahora mismo?", opciones: DEUDAS };
    case "tipoDeuda":
      return { paso, clase: "opciones", texto: "¿Cuál es tu deuda más grande?", ayuda: "Las demás las puedes agregar después, en Deudas.", opciones: TIPOS };
    case "saldoDeuda":
      return { paso, clase: "soles", texto: "¿Cuánto debes en total por esa deuda?", marcador: "3000" };
    case "cuotaDeuda":
      return { paso, clase: "soles", texto: "¿Cuánto pagas al mes por ella?", ayuda: "La cuota o el pago que te piden cada mes.", marcador: "250" };
    case "atraso":
      return { paso, clase: "opciones", texto: "¿Hace cuánto que no pagas esa deuda?", opciones: ATRASOS };
    case "tuvoCredito":
      return { paso, clase: "opciones", texto: "¿Alguna vez tuviste una tarjeta de crédito o un préstamo de un banco, una caja o una financiera?", opciones: SI_NO };
    case "permiso":
      return {
        paso, clase: "opciones", opciones: PERMISOS,
        texto: "Última: ¿quieres conversar con el asistente de IA y que te hable?",
        ayuda: "Si aceptas, este caso inventado se envía a servicios externos de IA y de voz para poder responderte. No pongas datos reales. Si no, te respondo con reglas, sin que nada salga de este equipo. Puedes cambiarlo después.",
      };
  }
}

function monto(valor: string, campo: string, minimo: "cero" | "positivo"): Centimos {
  const c = leerSoles(valor, campo);
  if (c < 0) throw new ErrorDatos(`Revisa ${campo}: no puede ser negativo.`);
  if (minimo === "positivo" && c === 0) throw new ErrorDatos(`Revisa ${campo}: tiene que ser mayor que cero.`);
  if (c > MONTO_MAXIMO) throw new ErrorDatos(`Revisa ${campo}: es un monto demasiado grande para esta simulación.`);
  return c;
}

function elegida<T extends string>(opciones: Opcion[], valor: string): { valor: T; texto: string } {
  const o = opciones.find(x => x.valor === valor);
  if (!o) throw new ErrorDatos("Elige una de las opciones.");
  return { valor: o.valor as T, texto: o.texto };
}

export interface Respondido { borrador: Borrador; dicho: string }

/** Valida una respuesta y la guarda. `dicho` es el texto que se muestra como respuesta de la persona. */
export function responder(b: Borrador, paso: Paso, valor: string): Respondido {
  const conMonto = (campo: keyof Borrador, texto: string, minimo: "cero" | "positivo"): Respondido => {
    const c = monto(valor, texto, minimo);
    return { borrador: { ...b, [campo]: c }, dicho: formatoSoles(c) };
  };
  switch (paso) {
    case "nombre": {
      const nombre = valor.trim().replace(/\s+/g, " ");
      if (!nombre) throw new ErrorDatos("Escribe un apodo para saber cómo llamarte.");
      if (nombre.length > LARGO_MAXIMO_DE_NOMBRE) throw new ErrorDatos("Usa un apodo más corto.");
      if (/\d/.test(nombre)) throw new ErrorDatos("Usa un apodo sin números: aquí no se piden documentos ni teléfonos.");
      return { borrador: { ...b, nombre }, dicho: nombre };
    }
    case "cobro": {
      const o = elegida<Cobro>(COBROS, valor);
      return { borrador: { ...b, cobro: o.valor }, dicho: o.texto };
    }
    case "ingreso":
      return conMonto("ingreso", "lo que te entra al mes", "positivo");
    case "saldo":
      return conMonto("saldo", "lo que tienes hoy", "cero");
    case "fijos":
      return conMonto("fijos", "el alquiler y los servicios", "cero");
    case "diaADia":
      return conMonto("diaADia", "el gasto del día a día", "cero");
    case "deudas": {
      const o = elegida<TieneDeudas>(DEUDAS, valor);
      return { borrador: { ...b, deudas: o.valor }, dicho: o.texto };
    }
    case "tipoDeuda": {
      const o = elegida<TipoDeudaDebo>(TIPOS, valor);
      return { borrador: { ...b, tipoDeuda: o.valor }, dicho: o.texto };
    }
    case "saldoDeuda":
      return conMonto("saldoDeuda", "lo que debes", "positivo");
    case "cuotaDeuda": {
      const r = conMonto("cuotaDeuda", "lo que pagas al mes", "positivo");
      if (b.saldoDeuda !== undefined && (r.borrador.cuotaDeuda ?? 0) > b.saldoDeuda) {
        throw new ErrorDatos("El pago del mes no puede ser mayor que todo lo que debes.");
      }
      return r;
    }
    case "atraso": {
      const o = elegida<Exclude<Atraso, "al_dia">>(ATRASOS, valor);
      return { borrador: { ...b, atraso: o.valor }, dicho: o.texto };
    }
    case "tuvoCredito": {
      const o = elegida<"si" | "no">(SI_NO, valor);
      return { borrador: { ...b, tuvoCredito: o.valor === "si" }, dicho: o.texto };
    }
    case "permiso": {
      const o = elegida<"si" | "no">(PERMISOS, valor);
      return { borrador: b, dicho: o.texto };
    }
  }
}

/** Las respuestas completas, listas para armar el caso. Falla si todavía falta alguna pregunta. */
export function aRespuestas(b: Borrador, hoy: FechaISO): Respuestas {
  if (proximoPaso(b) !== "permiso") throw new ErrorDatos("Todavía faltan preguntas por responder.");
  const hayDeuda = b.deudas !== "no";
  return {
    nombre: b.nombre!,
    cobro: b.cobro!,
    ingresoMensual: b.ingreso!,
    saldo: b.saldo!,
    fijosMensual: b.fijos!,
    diaADiaMensual: b.diaADia!,
    deuda: hayDeuda
      ? { tipo: b.tipoDeuda!, saldo: b.saldoDeuda!, cuota: b.cuotaDeuda!, atraso: b.deudas === "atraso" ? b.atraso! : "al_dia" }
      : null,
    // Con una tarjeta o un préstamo vigente no se pregunta: ya tuvo crédito.
    tuvoCredito: b.tuvoCredito ?? (hayDeuda && b.tipoDeuda !== "personal"),
    hoy,
  };
}
