/**
 * Guion de la entrada conversada: qué se pregunta, en qué orden y cómo se valida cada respuesta.
 * Es código puro (sin pantalla ni IA): las preguntas son fijas y las cifras se leen en céntimos enteros.
 * La pantalla (componentes/entrada.tsx) solo pinta lo que este guion decide.
 */
import { formatoSoles, type Centimos, type FechaISO } from "../motor";
import { leerSolesAproximado } from "../datos/formulario";
import { ErrorDatos } from "../datos/validar";
import type { TipoDeudaDebo } from "../datos/tipos";
import type { Atraso, Cobro, Respuestas, Trabajo } from "./entrada";

export type Paso =
  | "nombre" | "trabajo" | "cobro" | "diaPago" | "ingreso" | "flojo" | "extra" | "gratificacion" | "gastosTrabajo" | "seguro"
  | "saldo" | "fijos" | "diaADia" | "familia" | "estudios" | "deudas" | "tipoDeuda" | "saldoDeuda" | "cuotaDeuda" | "atraso" | "tuvoCredito" | "permiso";

export type TieneDeudas = "no" | "al_dia" | "atraso";

/** Lo respondido hasta ahora. Un campo sin valor es una pregunta todavía no hecha. */
export interface Borrador {
  nombre?: string;
  trabajo?: Trabajo;
  cobro?: Cobro;
  diaPago?: number;
  ingreso?: Centimos;
  flojo?: Centimos;
  gratificacion?: boolean;
  /** Dependiente: ingreso extra seguro cada mes, aparte del sueldo. */
  extra?: Centimos;
  /** Independiente: lo que gasta al mes para poder trabajar (materiales, mercadería, movilidad). */
  gastosTrabajo?: Centimos;
  /** Independiente: seguro de salud o pensión que paga por su cuenta. */
  seguro?: Centimos;
  saldo?: Centimos;
  fijos?: Centimos;
  diaADia?: Centimos;
  /** Apoyo fijo a la familia cada mes. */
  familia?: Centimos;
  /** Dependiente: estudios o cursos que paga cada mes. */
  estudios?: Centimos;
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
  clase: "texto" | "soles" | "dia" | "opciones";
  opciones?: Opcion[];
  marcador?: string;
}

/** Tope de cordura para cualquier monto escrito: diez millones de soles. */
export const MONTO_MAXIMO: Centimos = 1_000_000_000;
export const LARGO_MAXIMO_DE_NOMBRE = 40;

export const TRABAJOS: Opcion[] = [
  { valor: "dependiente", texto: "Dependiente: tengo sueldo en planilla" },
  { valor: "independiente", texto: "Independiente: trabajo por mi cuenta" },
];
/** Antes de saber cómo trabaja (casos y pruebas antiguas): las tres de siempre. */
const COBROS: Opcion[] = [
  { valor: "fin_de_mes", texto: "A fin de mes" },
  { valor: "quincena", texto: "En quincenas" },
  { valor: "semanal", texto: "Cada semana" },
];
/** Un sueldo en planilla se paga al mes o por quincenas. */
const COBROS_DEPENDIENTE: Opcion[] = [
  { valor: "fin_de_mes", texto: "Una vez al mes" },
  { valor: "quincena", texto: "En quincenas" },
];
/** Por su cuenta, la plata entra a otro ritmo, a veces sin fecha fija. */
const COBROS_INDEPENDIENTE: Opcion[] = [
  { valor: "semanal", texto: "Cada semana" },
  { valor: "quincena", texto: "Cada quincena" },
  { valor: "fin_de_mes", texto: "Una vez al mes" },
  { valor: "variable", texto: "Cuando termino un trabajo" },
];
const cobrosDe = (b: Borrador) => (b.trabajo === "dependiente" ? COBROS_DEPENDIENTE : b.trabajo === "independiente" ? COBROS_INDEPENDIENTE : COBROS);
const SI_NO_GRATI: Opcion[] = [
  { valor: "si", texto: "Sí" },
  { valor: "no", texto: "No" },
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
  const pasos: Paso[] = ["nombre", "trabajo", "cobro"];
  // Desde aquí las preguntas dependen de cómo trabaja: no se le pregunta lo mismo a quien tiene sueldo que a quien no.
  if (b.trabajo === "dependiente") {
    if (b.cobro === undefined || b.cobro === "fin_de_mes") pasos.push("diaPago");
    pasos.push("ingreso", "extra", "gratificacion", "saldo", "fijos", "diaADia", "familia", "estudios");
  } else if (b.trabajo === "independiente") {
    pasos.push("ingreso", "flojo", "gastosTrabajo", "seguro", "saldo", "fijos", "diaADia", "familia");
  } else {
    pasos.push("ingreso", "saldo", "fijos", "diaADia");
  }
  pasos.push("deudas");
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
  trabajo: b => b.trabajo !== undefined,
  cobro: b => b.cobro !== undefined,
  diaPago: b => b.diaPago !== undefined,
  ingreso: b => b.ingreso !== undefined,
  flojo: b => b.flojo !== undefined,
  extra: b => b.extra !== undefined,
  gratificacion: b => b.gratificacion !== undefined,
  gastosTrabajo: b => b.gastosTrabajo !== undefined,
  seguro: b => b.seguro !== undefined,
  saldo: b => b.saldo !== undefined,
  fijos: b => b.fijos !== undefined,
  diaADia: b => b.diaADia !== undefined,
  familia: b => b.familia !== undefined,
  estudios: b => b.estudios !== undefined,
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
    case "trabajo":
      return {
        paso, clase: "opciones", opciones: TRABAJOS,
        texto: `Mucho gusto, ${b.nombre ?? ""}. ¿Trabajas como dependiente o independiente?`.replace(" .", "."),
        ayuda: "Dependiente: una empresa te paga un sueldo. Independiente: cachuelos, negocio propio o recibos por honorarios.",
      };
    case "cobro":
      if (b.trabajo === "dependiente") return { paso, clase: "opciones", texto: "¿Cada cuánto te pagan el sueldo?", opciones: COBROS_DEPENDIENTE };
      if (b.trabajo === "independiente") return { paso, clase: "opciones", texto: "¿Cada cuánto te entra la plata?", opciones: COBROS_INDEPENDIENTE };
      return { paso, clase: "opciones", texto: "¿Cuándo te entra la plata?", opciones: COBROS };
    case "diaPago":
      return { paso, clase: "dia", texto: "¿Qué día del mes te depositan?", ayuda: "Un número del 1 al 31. Si cae a fin de mes, escribe 30.", marcador: "30" };
    case "ingreso":
      if (b.trabajo === "dependiente") {
        return { paso, clase: "soles", texto: "¿Cuánto te depositan de sueldo al mes?", ayuda: "Lo que te llega a la cuenta, ya con descuentos (AFP u ONP). Aproximado o inventado; puedes escribirlo con números o letras.", marcador: "Ej.: 2500" };
      }
      if (b.trabajo === "independiente") {
        return {
          paso, clase: "soles",
          texto: "Como trabajas por tu cuenta, lo que te entra cambia mes a mes. ¿Cuánto te llega en un mes, más o menos?",
          ayuda: "No tiene que ser exacto. Escribe «2500», «unos dos mil quinientos» o un rango como «entre 1500 y 3000». Aproximado o inventado.",
          marcador: "Ej.: entre 1500 y 3000",
        };
      }
      return { paso, clase: "soles", texto: "¿Cuánto te entra al mes, más o menos?", ayuda: "Suma todo lo de un mes. Usa una cifra aproximada o inventada.", marcador: "2500" };
    case "flojo":
      return {
        paso, clase: "soles", texto: "¿Y en un mes flojo, cuánto te llega como mínimo?",
        ayuda: "Piensa en el peor de los últimos meses; un aproximado basta. Te proyecto con ese monto, por prudencia: si te va mejor, te sobra.",
        marcador: "Ej.: 1500",
      };
    case "extra":
      return {
        paso, clase: "soles", texto: "Aparte del sueldo, ¿te entra algo extra fijo cada mes?",
        ayuda: "Solo si llega seguro todos los meses (un alquiler que cobras, un trabajo fijo de fin de semana). Si no, escribe 0.",
        marcador: "Ej.: 0 o 300",
      };
    case "gastosTrabajo":
      return {
        paso, clase: "soles", texto: "¿Cuánto gastas al mes para poder trabajar?",
        ayuda: "Materiales, mercadería, movilidad, herramientas o el plan del celular del negocio. Si no gastas nada, escribe 0.",
        marcador: "Ej.: 300",
      };
    case "seguro":
      return {
        paso, clase: "soles", texto: "¿Pagas por tu cuenta un seguro de salud o tu pensión?",
        ayuda: "Por ejemplo un seguro de salud o un aporte a tu jubilación. Si no pagas, escribe 0.",
        marcador: "Ej.: 0 o 80",
      };
    case "familia":
      return {
        paso, clase: "soles", texto: "¿Apoyas a tu familia con un monto cada mes?",
        ayuda: "Lo que das a tus padres, hijos u otros familiares de forma fija. Si no, escribe 0.",
        marcador: "Ej.: 0 o 200",
      };
    case "estudios":
      return {
        paso, clase: "soles", texto: "¿Pagas estudios o cursos cada mes, tuyos o de tus hijos?",
        ayuda: "Pensión del colegio, universidad, instituto o un curso. Si no, escribe 0.",
        marcador: "Ej.: 0 o 350",
      };
    case "gratificacion":
      return { paso, clase: "opciones", texto: "¿Te pagan gratificación en julio y diciembre?", ayuda: "Lo uso para orientarte; no lo sumo a tu proyección.", opciones: SI_NO_GRATI };
    case "saldo":
      return { paso, clase: "soles", texto: "¿Cuánto tienes hoy, entre tu cuenta y tu efectivo?", ayuda: "Un aproximado basta. Si no tienes nada, escribe 0.", marcador: "Ej.: 600" };
    case "fijos":
      return { paso, clase: "soles", texto: "¿Cuánto pagas al mes de alquiler y servicios?", ayuda: "Luz, agua, internet y celular. Un aproximado basta; si no pagas nada, escribe 0.", marcador: "Ej.: 900" };
    case "diaADia":
      return { paso, clase: "soles", texto: "¿Y cuánto se te va al mes en comida, pasajes y el día a día?", ayuda: "Un aproximado o un rango («entre 600 y 900») basta.", marcador: "Ej.: 800" };
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

/**
 * Con un rango, qué extremo se usa: lo que entra o lo que se tiene, el menor; lo que sale, el mayor.
 * Así la proyección se equivoca hacia el lado seguro: si le va mejor, le sobra.
 */
type Prudencia = "menor" | "mayor";

interface Leido { usado: Centimos; min: Centimos; max: Centimos }

function monto(valor: string, campo: string, minimo: "cero" | "positivo", prudencia: Prudencia): Leido {
  const { min, max } = leerSolesAproximado(valor, campo);
  if (min < 0) throw new ErrorDatos(`Revisa ${campo}: no puede ser negativo.`);
  if (max > MONTO_MAXIMO) throw new ErrorDatos(`Revisa ${campo}: es un monto demasiado grande para esta simulación.`);
  const usado = prudencia === "menor" ? min : max;
  if (minimo === "positivo" && usado === 0) throw new ErrorDatos(`Revisa ${campo}: tiene que ser mayor que cero.`);
  return { usado, min, max };
}

/** Lo que se muestra como respuesta: el monto, o el rango y el extremo que se usa. */
function dichoDe(l: Leido): string {
  if (l.min === l.max) return formatoSoles(l.usado);
  return `Entre ${formatoSoles(l.min)} y ${formatoSoles(l.max)} · uso ${formatoSoles(l.usado)}, por prudencia`;
}

function elegida<T extends string>(opciones: Opcion[], valor: string): { valor: T; texto: string } {
  const o = opciones.find(x => x.valor === valor);
  if (!o) throw new ErrorDatos("Elige una de las opciones.");
  return { valor: o.valor as T, texto: o.texto };
}

export interface Respondido { borrador: Borrador; dicho: string }

/** Valida una respuesta y la guarda. `dicho` es el texto que se muestra como respuesta de la persona. */
export function responder(b: Borrador, paso: Paso, valor: string): Respondido {
  const conMonto = (campo: keyof Borrador, texto: string, minimo: "cero" | "positivo", prudencia: Prudencia): Respondido => {
    const l = monto(valor, texto, minimo, prudencia);
    return { borrador: { ...b, [campo]: l.usado }, dicho: dichoDe(l) };
  };
  switch (paso) {
    case "nombre": {
      const nombre = valor.trim().replace(/\s+/g, " ");
      if (!nombre) throw new ErrorDatos("Escribe un apodo para saber cómo llamarte.");
      if (nombre.length > LARGO_MAXIMO_DE_NOMBRE) throw new ErrorDatos("Usa un apodo más corto.");
      if (/\d/.test(nombre)) throw new ErrorDatos("Usa un apodo sin números: aquí no se piden documentos ni teléfonos.");
      return { borrador: { ...b, nombre }, dicho: nombre };
    }
    case "trabajo": {
      const o = elegida<Trabajo>(TRABAJOS, valor);
      return { borrador: { ...b, trabajo: o.valor }, dicho: o.valor === "dependiente" ? "Dependiente" : "Independiente" };
    }
    case "cobro": {
      const o = elegida<Cobro>(cobrosDe(b), valor);
      return { borrador: { ...b, cobro: o.valor }, dicho: o.texto };
    }
    case "diaPago": {
      const limpio = valor.trim();
      const dia = Number(limpio);
      if (!/^\d{1,2}$/.test(limpio) || dia < 1 || dia > 31) throw new ErrorDatos("Escribe un día del 1 al 31.");
      return { borrador: { ...b, diaPago: dia }, dicho: `El ${dia}` };
    }
    case "ingreso": {
      if (b.trabajo === "independiente") {
        // Un rango ya dice el mes bueno y el flojo: no se vuelve a preguntar.
        const l = monto(valor, "lo que te entra al mes", "positivo", "mayor");
        if (l.min === l.max) return { borrador: { ...b, ingreso: l.max }, dicho: formatoSoles(l.max) };
        return {
          borrador: { ...b, ingreso: l.max, flojo: l.min },
          dicho: `Entre ${formatoSoles(l.min)} y ${formatoSoles(l.max)} · proyecto con ${formatoSoles(l.min)}, por prudencia`,
        };
      }
      return conMonto("ingreso", b.trabajo === "dependiente" ? "tu sueldo" : "lo que te entra al mes", "positivo", "menor");
    }
    case "flojo": {
      const r = conMonto("flojo", "lo que te entra en un mes flojo", "cero", "menor");
      if (b.ingreso !== undefined && (r.borrador.flojo ?? 0) > b.ingreso) {
        throw new ErrorDatos("Un mes flojo no puede dejarte más que un mes normal.");
      }
      return r;
    }
    case "gratificacion": {
      const o = elegida<"si" | "no">(SI_NO_GRATI, valor);
      return { borrador: { ...b, gratificacion: o.valor === "si" }, dicho: o.texto };
    }
    case "extra":
      return conMonto("extra", "el ingreso extra", "cero", "menor");
    case "gastosTrabajo":
      return conMonto("gastosTrabajo", "lo que gastas para trabajar", "cero", "mayor");
    case "seguro":
      return conMonto("seguro", "el seguro o la pensión", "cero", "mayor");
    case "saldo":
      return conMonto("saldo", "lo que tienes hoy", "cero", "menor");
    case "fijos":
      return conMonto("fijos", "el alquiler y los servicios", "cero", "mayor");
    case "diaADia":
      return conMonto("diaADia", "el gasto del día a día", "cero", "mayor");
    case "familia":
      return conMonto("familia", "el apoyo a tu familia", "cero", "mayor");
    case "estudios":
      return conMonto("estudios", "los estudios", "cero", "mayor");
    case "deudas": {
      const o = elegida<TieneDeudas>(DEUDAS, valor);
      return { borrador: { ...b, deudas: o.valor }, dicho: o.texto };
    }
    case "tipoDeuda": {
      const o = elegida<TipoDeudaDebo>(TIPOS, valor);
      return { borrador: { ...b, tipoDeuda: o.valor }, dicho: o.texto };
    }
    case "saldoDeuda":
      return conMonto("saldoDeuda", "lo que debes", "positivo", "mayor");
    case "cuotaDeuda": {
      const r = conMonto("cuotaDeuda", "lo que pagas al mes", "positivo", "mayor");
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
    ...(b.trabajo !== undefined && { trabajo: b.trabajo }),
    cobro: b.cobro!,
    ...(b.trabajo === "dependiente" && b.cobro === "fin_de_mes" && b.diaPago !== undefined && { diaPago: b.diaPago }),
    ingresoMensual: b.ingreso!,
    ...(b.trabajo === "independiente" && b.flojo !== undefined && { ingresoFlojo: b.flojo }),
    ...(b.trabajo === "dependiente" && b.gratificacion !== undefined && { gratificacion: b.gratificacion }),
    ...(b.trabajo === "dependiente" && b.extra !== undefined && { ingresoExtra: b.extra }),
    ...(b.trabajo === "independiente" && b.gastosTrabajo !== undefined && { gastosTrabajo: b.gastosTrabajo }),
    ...(b.trabajo === "independiente" && b.seguro !== undefined && { seguro: b.seguro }),
    saldo: b.saldo!,
    fijosMensual: b.fijos!,
    diaADiaMensual: b.diaADia!,
    ...(b.trabajo !== undefined && b.familia !== undefined && { apoyoFamilia: b.familia }),
    ...(b.trabajo === "dependiente" && b.estudios !== undefined && { estudios: b.estudios }),
    deuda: hayDeuda
      ? { tipo: b.tipoDeuda!, saldo: b.saldoDeuda!, cuota: b.cuotaDeuda!, atraso: b.deudas === "atraso" ? b.atraso! : "al_dia" }
      : null,
    // Con una tarjeta o un préstamo vigente no se pregunta: ya tuvo crédito.
    tuvoCredito: b.tuvoCredito ?? (hayDeuda && b.tipoDeuda !== "personal"),
    hoy,
  };
}
