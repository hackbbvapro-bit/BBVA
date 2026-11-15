/**
 * Guion de la entrada conversada: qué se pregunta, en qué orden y cómo se valida cada respuesta.
 * Es código puro (sin pantalla ni IA): las preguntas son fijas y las cifras se leen en céntimos enteros.
 * La pantalla (componentes/entrada.tsx) solo pinta lo que este guion decide.
 */
import { formatoSoles, type Centimos, type FechaISO } from "../motor";
import { leerSolesAproximado } from "../datos/formulario";
import { ErrorDatos } from "../datos/validar";
import { mensualDe, type Meta, type Cobro, type Respuestas, type Trabajo } from "./entrada";

export type Paso = "nombre" | "trabajo" | "cobro" | "diaPago" | "ingreso" | "flojo" | "saldo" | "gastos" | "deudas" | "cuotaDeuda" | "meta";
export type TieneDeudas = "no" | "al_dia";
export interface Borrador {
  nombre?: string;
  trabajo?: Trabajo;
  cobro?: Cobro;
  diaPago?: number;
  ingreso?: Centimos;
  flojo?: Centimos;
  saldo?: Centimos;
  gastos?: Centimos;
  deudas?: TieneDeudas;
  cuotaDeuda?: Centimos;
  meta?: Meta;
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
const COBROS: Opcion[] = [
  { valor: "diario", texto: "Todos los días" },
  { valor: "semanal", texto: "Cada semana" },
  { valor: "quincena", texto: "Cada quincena" },
  { valor: "fin_de_mes", texto: "A fin de mes" },
  { valor: "variable", texto: "Cuando termino un trabajo" },
];
const DEUDAS: Opcion[] = [
  { valor: "no", texto: "No tengo deudas" },
  { valor: "al_dia", texto: "Sí tengo deudas" },
];
const RANGOS: Opcion[] = [
  { valor: "entre 0 y 500", texto: "Hasta S/ 500" },
  { valor: "entre 500 y 1000", texto: "S/ 500–1,000" },
  { valor: "entre 1000 y 2000", texto: "S/ 1,000–2,000" },
  { valor: "entre 2000 y 4000", texto: "S/ 2,000–4,000" },
];
const metas = (b: Borrador): Opcion[] => [
  { valor: "ahorrar", texto: "Ahorrar" },
  ...(b.deudas === "al_dia" ? [{ valor: "salir_deudas", texto: "Salir de deudas" }] : []),
  { valor: "hacer_crecer", texto: "Invertir lo que me sobra" },
  { valor: "construir_historial", texto: "Comprar algo grande (casa, auto, estudios)" },
];
export function pasosPrevistos(b: Borrador): Paso[] {
  return ["nombre", "trabajo", "cobro",
    ...(b.trabajo === "dependiente" && b.cobro === "fin_de_mes" ? ["diaPago" as const] : []),
    "ingreso", ...(b.trabajo === "independiente" ? ["flojo" as const] : []),
    "saldo", "gastos", "deudas", ...(b.deudas === "al_dia" ? ["cuotaDeuda" as const] : []), "meta"];
}
export function proximoPaso(b: Borrador): Paso | null {
  return pasosPrevistos(b).find(p => b[p] === undefined) ?? null;
}
export function avance(b: Borrador): { actual: number; total: number } {
  const pasos = pasosPrevistos(b);
  const paso = proximoPaso(b);
  return { actual: paso ? pasos.indexOf(paso) + 1 : pasos.length, total: pasos.length };
}
export function pregunta(paso: Paso, b: Borrador): Pregunta {
  switch (paso) {
    case "nombre": return { paso, clase: "texto", texto: "¿Cómo te llamo en esta simulación?", ayuda: "Usa un apodo inventado, no datos personales." };
    case "trabajo": return { paso, clase: "opciones", texto: `Mucho gusto, ${(b.nombre ?? "").replace(/\.+$/, "")}. ¿Trabajas como dependiente o independiente?`, opciones: TRABAJOS };
    case "cobro": return { paso, clase: "opciones", texto: "¿Cada cuánto recibes dinero?", opciones: COBROS };
    case "diaPago": return { paso, clase: "dia", texto: "¿Qué día del mes te depositan?", ayuda: "Del 1 al 31; usa 31 para el último día del mes." };
    case "ingreso": return { paso, clase: "soles", texto: b.cobro === "semanal" || b.cobro === "diario" ? "¿Cuánto juntas en una semana normal?" : b.cobro === "quincena" ? "¿Cuánto recibes cada quincena?" : b.cobro === "variable" ? "En un mes normal, ¿cuánto te llega en total?" : "¿Cuánto recibes al mes?", ayuda: "Usa un monto o rango inventado.", opciones: RANGOS };
    case "flojo": return { paso, clase: "soles", texto: "En un mes flojo, ¿cuánto recibes como mínimo?", opciones: RANGOS };
    case "saldo": return { paso, clase: "soles", texto: "¿Cuánto tienes hoy, entre tu cuenta y tu efectivo?", opciones: RANGOS };
    case "gastos": return { paso, clase: "soles", texto: "¿Cuánto gastas al mes en total? Alquiler, servicios, comida, pasajes… no tiene que ser exacto; lo detallas después en Mi dinero.", opciones: [...RANGOS, { valor: "despues", texto: "Lo detallo después" }] };
    case "deudas": return { paso, clase: "opciones", texto: "¿Tienes deudas?", opciones: DEUDAS };
    case "cuotaDeuda": return { paso, clase: "soles", texto: "¿Cuánto pagas en total de cuotas al mes?", opciones: [...RANGOS, { valor: "despues", texto: "Lo anoto después en Deudas" }] };
    case "meta": return { paso, clase: "opciones", texto: "¿Qué quieres lograr primero?", opciones: metas(b) };
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

export interface Respondido { borrador: Borrador; dicho: string; ayuda?: string }
export function responder(b: Borrador, paso: Paso, valor: string): Respondido {
  if (paso === "nombre") {
    const nombre = valor.trim().replace(/\s+/g, " ");
    if (!nombre || nombre.length > LARGO_MAXIMO_DE_NOMBRE || /\d/.test(nombre)) throw new ErrorDatos("Usa un apodo inventado, corto y sin números.");
    return { borrador: { ...b, nombre }, dicho: nombre };
  }
  const p = pregunta(paso, b);
  if (p.clase === "opciones") {
    const o = elegida(p.opciones!, valor);
    return { borrador: { ...b, [paso]: o.valor }, dicho: o.texto };
  }
  if (paso === "diaPago") {
    const dia = Number(valor.trim());
    if (!/^\d{1,2}$/.test(valor.trim()) || dia < 1 || dia > 31) throw new ErrorDatos("Escribe un día del 1 al 31.");
    return { borrador: { ...b, diaPago: dia }, dicho: `El ${dia}` };
  }
  if (valor === "despues" && (paso === "gastos" || paso === "cuotaDeuda")) return { borrador: { ...b, [paso]: 0 }, dicho: p.opciones!.at(-1)!.texto };
  if (/^(?:pago toda la deuda|no s[eé]|no tengo|depende)$/i.test(valor.trim())) return { borrador: b, dicho: valor, ayuda: "Un aproximado basta; puedes elegir una opción." };
  let l: Leido;
  try {
    l = monto(valor, "el monto", paso === "ingreso" ? "positivo" : "cero", paso === "gastos" || paso === "cuotaDeuda" ? "mayor" : "menor");
  } catch (e) {
    if (!/\d/.test(valor) && !/cero/i.test(valor)) return { borrador: b, dicho: valor, ayuda: "Un aproximado basta; puedes elegir una opción." };
    throw e;
  }
  if (paso === "flojo" && b.ingreso !== undefined && l.usado > mensualDe(b.ingreso, b.cobro!)) throw new ErrorDatos("Un mes flojo no puede dejarte más que un mes normal.");
  return { borrador: { ...b, [paso]: l.usado }, dicho: dichoDe(l) };
}
export function aRespuestas(b: Borrador, hoy: FechaISO): Respuestas {
  if (proximoPaso(b) !== null) throw new ErrorDatos("Todavía faltan preguntas por responder.");
  return {
    nombre: b.nombre!, trabajo: b.trabajo, cobro: b.cobro!, diaPago: b.diaPago,
    ingresoMensual: mensualDe(b.ingreso!, b.cobro!),
    ...((b.cobro === "semanal" || b.cobro === "diario") && { ingresoSemanal: b.ingreso }),
    ingresoFlojo: b.flojo, saldo: b.saldo!, gastosMensual: b.gastos!,
    deuda: b.deudas === "al_dia" ? { cuota: b.cuotaDeuda! } : null,
    meta: b.meta, hoy,
  };
}
