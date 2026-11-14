/**
 * Motor de ruta: decide por dónde empieza cada persona. Son reglas de código, explicables y con pruebas;
 * la IA solo conversa sobre lo que sale de aquí. Tres situaciones, tres rutas:
 *   - estar_en_verde:      hay un día en negativo, un atraso o deudas que pagar.
 *   - construir_historial: no debe nada y nunca tuvo un producto de crédito.
 *   - hacer_crecer:        está al día y le sobra: colchón primero, plazo después.
 * No calcula ni inventa ningún «score»: habla de señales que la persona puede ver en sus propios datos.
 */
import { z } from "zod";
import { formatoLargo, formatoSoles, redondear, sumar } from "../motor";
import type { Analisis, Centimos, Perfil, Recurrente } from "../motor";
import { CATALOGO, type EntradaCatalogo } from "../recomendaciones/catalogo";
import type { Datos } from "../datos/tipos";

/** Texto fijo que acompaña toda orientación. Lo escribe el código, no la IA. */
export const AVISO_SIMULACION =
  "Panel simulado con datos inventados. La orientación no garantiza la aprobación de ningún producto: eso lo decide cada entidad con su propia evaluación crediticia.";

/** Lo mínimo que el motor no puede deducir del perfil. Viaja al servidor validado, nunca como texto libre. */
export const EsquemaHechos = z.object({
  /** Si alguna vez tuvo una tarjeta de crédito o un préstamo de una entidad. */
  tuvoCredito: z.boolean(),
  /** Días de atraso de su deuda más atrasada (0 = al día). */
  diasAtrasoMax: z.number().int().min(0).max(3650),
});
export type Hechos = z.infer<typeof EsquemaHechos>;
export const SIN_HECHOS: Hechos = { tuvoCredito: false, diasAtrasoMax: 0 };

/** Hechos a partir de lo guardado. Una deuda con una entidad (aunque ya esté pagada) cuenta como haber tenido crédito. */
export function hechosDe(datos: Datos, tuvoCredito = false): Hechos {
  const vigentes = datos.deudas.filter(d => !d.pagada && d.saldo > 0);
  return {
    tuvoCredito: tuvoCredito || datos.deudas.some(d => d.tipo !== "personal"),
    diasAtrasoMax: vigentes.reduce((max, d) => Math.max(max, d.diasAtraso), 0),
  };
}

export interface FlujoMensual {
  /** Lo que entra en un mes típico. */
  ingresos: Centimos;
  /** Lo que sale en un mes típico, sin contar cuotas de deuda. */
  gastos: Centimos;
  /** Lo que se va en cuotas de deuda. */
  cuotas: Centimos;
  /** ingresos − gastos − cuotas. Negativo si sale más de lo que entra. */
  libre: Centimos;
}

const alMes = (r: Recurrente): Centimos => (r.frecuencia === "mensual" ? r.monto : redondear((r.monto * 52) / 12));

/** Mes típico de la persona: lo fijo detectado más lo variable estimado. Todo en céntimos enteros. */
export function flujoMensual(perfil: Perfil, analisis: Analisis): FlujoMensual {
  const fijos = analisis.recurrentes.filter(r => r.categoria !== "deuda").map(alMes);
  const ingresos = sumar(fijos.filter(m => m > 0)) + redondear((analisis.ingresoVariable.semanalPrudente * 52) / 12);
  const gastos = -sumar(fijos.filter(m => m < 0)) + redondear(-analisis.gastoVariable.diario * 30);
  const cuotas = sumar(perfil.deudas.map(d => Math.max(d.pagoHabitual, d.pagoMinimo)));
  return { ingresos, gastos, cuotas, libre: ingresos - gastos - cuotas };
}

/** Meses de gastos que conviene tener guardados: una referencia común de educación financiera, no una regla de nadie. */
export const MESES_DE_COLCHON = 3;

export interface Colchon {
  /** Gastos más cuotas de un mes. */
  gastoMensual: Centimos;
  /** Tres meses de gastos. */
  meta: Centimos;
  /** Lo que falta para llegar a la meta con el saldo de hoy. */
  falta: Centimos;
  /** Días de gastos que cubre el saldo de hoy. */
  diasCubiertos: number;
  /** Meses para completarlo guardando lo que queda libre; null si hoy no queda nada libre. */
  mesesParaCompletar: number | null;
}

export function colchon(saldo: Centimos, flujo: FlujoMensual): Colchon {
  const gastoMensual = flujo.gastos + flujo.cuotas;
  const meta = gastoMensual * MESES_DE_COLCHON;
  const disponible = Math.max(0, saldo);
  const falta = Math.max(0, meta - disponible);
  return {
    gastoMensual, meta, falta,
    diasCubiertos: gastoMensual > 0 ? Math.floor((disponible * 30) / gastoMensual) : 0,
    mesesParaCompletar: falta === 0 ? 0 : flujo.libre > 0 ? Math.ceil(falta / flujo.libre) : null,
  };
}

export type IdRuta = "estar_en_verde" | "construir_historial" | "hacer_crecer";

export interface Alternativa {
  entrada: EntradaCatalogo;
  porQue: string;
}

export interface Ruta {
  id: IdRuta;
  titulo: string;
  /** Una frase: qué es lo primero. */
  resumen: string;
  /** Por qué le tocó esta ruta, con sus cifras. */
  motivos: string[];
  /** Qué hacer, en orden. */
  pasos: string[];
  /** Alternativas genéricas del catálogo que aplican (sin entidades ni cifras de mercado). */
  alternativas: Alternativa[];
  flujo: FlujoMensual;
  colchon: Colchon;
  aviso: string;
}

export const TITULOS: Record<IdRuta, string> = {
  estar_en_verde: "Salir de deudas y estar en verde",
  construir_historial: "Construir tu historial de crédito",
  hacer_crecer: "Armar tu colchón y hacer crecer lo que te sobra",
};

const alternativa = (id: EntradaCatalogo["id"], porQue: string): Alternativa => ({ entrada: CATALOGO.find(e => e.id === id)!, porQue });
const minuscula = (texto: string) => texto.charAt(0).toLowerCase() + texto.slice(1);
const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : `${n} ${varios}`);
const sinRegistro = (f: FlujoMensual) => f.ingresos === 0 && f.gastos === 0 && f.cuotas === 0;

/** «Al mes te entran X y salen Y: te quedan Z libres.» */
export function fraseLibre(f: FlujoMensual): string {
  if (sinRegistro(f)) return "Todavía no registras ingresos ni gastos fijos, así que no puedo calcular cuánto te queda al mes.";
  const salen = f.gastos + f.cuotas;
  const cuotas = f.cuotas > 0 ? ` (${formatoSoles(f.cuotas)} son cuotas de deuda)` : "";
  const base = `Al mes te entran ${formatoSoles(f.ingresos)} y salen ${formatoSoles(salen)}${cuotas}:`;
  if (f.libre > 0) return `${base} te quedan ${formatoSoles(f.libre)} libres.`;
  if (f.libre === 0) return `${base} no te queda nada libre.`;
  return `${base} te faltan ${formatoSoles(-f.libre)} cada mes.`;
}

function clasificar(perfil: Perfil, analisis: Analisis, hechos: Hechos, flujo: FlujoMensual, c: Colchon): IdRuta {
  if (analisis.proyeccion.deficit || hechos.diasAtrasoMax > 0) return "estar_en_verde";
  if (perfil.deudas.length > 0) {
    const totalDeuda = sumar(perfil.deudas.map(d => d.saldo));
    // Única excepción: quien hoy podría cancelar toda su deuda y conservar su colchón ya está en la etapa siguiente.
    return flujo.libre > 0 && perfil.saldoActual - totalDeuda >= c.meta ? "hacer_crecer" : "estar_en_verde";
  }
  return hechos.tuvoCredito ? "hacer_crecer" : "construir_historial";
}

function rutaEnVerde(perfil: Perfil, analisis: Analisis, hechos: Hechos, flujo: FlujoMensual, c: Colchon): Omit<Ruta, "id" | "titulo" | "flujo" | "colchon" | "aviso"> {
  const { deficit } = analisis.proyeccion;
  const atraso = hechos.diasAtrasoMax > 0;
  const deudas = perfil.deudas;
  const totalDeuda = sumar(deudas.map(d => d.saldo));
  const motivos: string[] = [];
  const pasos: string[] = [];
  const alternativas: Alternativa[] = [];

  if (deficit) motivos.push(`Tu proyección deja el saldo bajo cero el ${formatoLargo(deficit.fecha)}: ese día faltarían ${formatoSoles(deficit.faltante)}.`);
  if (atraso) motivos.push(`Tienes una deuda con unos ${hechos.diasAtrasoMax} días de atraso.`);
  if (deudas.length > 0) motivos.push(`Debes ${formatoSoles(totalDeuda)} en ${plural(deudas.length, "una deuda", "deudas")}.`);
  motivos.push(fraseLibre(flujo));

  if (atraso) pasos.push("Ponte al día con la deuda atrasada antes que nada. Si no llegas, pide un nuevo plan de pago a quien le debes antes de que el atraso crezca.");
  if (deficit) {
    const jugada = analisis.jugadas.find(j => j.resuelve);
    const dia = formatoLargo(deficit.fecha);
    if (jugada) pasos.push(`Tapa el hueco del ${dia}: ${minuscula(jugada.titulo)}, que ${jugada.costo > 0 ? `cuesta ${formatoSoles(jugada.costo)}` : "no cuesta dinero"}.`);
    else if (analisis.jugadas.length > 0) pasos.push(`Tapa el hueco del ${dia}: ninguna jugada alcanza sola, así que combina dos de las que ves en Inicio.`);
    else pasos.push(`Tapa el hueco del ${dia}: aplaza un gasto que no sea urgente o adelanta un ingreso, porque hoy no hay un pago que se pueda mover.`);
    if (deudas.length > 0) pasos.push("Mientras haya un día en negativo, paga solo el mínimo de cada deuda y no adelantes pagos.");
    else if (flujo.libre <= 0 && !sinRegistro(flujo)) pasos.push("Cada mes te sale más de lo que te entra: elige un gasto fijo que puedas bajar este mismo mes.");
  } else if (deudas.length > 0) {
    const primera = analisis.deudas?.primera ?? null;
    if (flujo.libre <= 0) pasos.push("Hoy no te sobra para adelantar pagos: busca un gasto que puedas recortar y no tomes una deuda nueva para pagar la vieja.");
    else if (deudas.length === 1) pasos.push(`Pon lo que te sobra (${formatoSoles(flujo.libre)} al mes) en adelantar ${deudas[0].nombre}: cada sol que adelantas deja de generar intereses.`);
    else if (primera && primera.tceaBp > 0) pasos.push(`Paga el mínimo de todas y pon lo que te sobra (${formatoSoles(flujo.libre)} al mes) en ${primera.nombre}, la de tasa más alta.`);
    else pasos.push(`Paga el mínimo de todas y anota la tasa (TCEA) de cada una en Deudas: lo que te sobra (${formatoSoles(flujo.libre)} al mes) va a la más cara.`);
  }
  if (c.gastoMensual > 0) pasos.push(`Cuando el mes cierre en positivo, empieza un colchón: un mes de tus gastos son ${formatoSoles(c.gastoMensual)}.`);

  if (deficit) alternativas.push(alternativa("reprogramar", `Tu proyección deja el saldo bajo cero el ${formatoLargo(deficit.fecha)}: conviene preguntarlo antes de caer en atraso.`));
  else if (atraso) alternativas.push(alternativa("reprogramar", "Tienes una deuda con atraso: conversar un nuevo plan de pago a tiempo evita que crezca."));

  const resumen = deficit ? `Lo primero es que no te falte plata el ${formatoLargo(deficit.fecha)}.`
    : atraso ? "Lo primero es ponerte al día con lo atrasado."
    : flujo.libre <= 0 ? "Tus gastos y cuotas se llevan todo lo que te entra: primero hay que liberar algo cada mes."
    : "Vas al día: ahora toca bajar la deuda más rápido para pagar menos intereses.";
  return { resumen, motivos, pasos, alternativas };
}

function rutaHistorial(flujo: FlujoMensual): Omit<Ruta, "id" | "titulo" | "flujo" | "colchon" | "aviso"> {
  const pasos: string[] = [];
  if (sinRegistro(flujo)) pasos.push("Anota tus ingresos y tus gastos fijos en Mi dinero: con eso afino esta ruta.");
  else if (flujo.libre <= 0) pasos.push("Antes de pedir un producto, haz que te sobre algo cada mes: revisa qué gasto puedes bajar.");
  pasos.push(
    "Empieza con un producto de crédito pequeño, uno cuyo pago completo puedas cubrir todos los meses.",
    "Úsalo poco y paga el total antes de la fecha de vencimiento: así no pagas intereses.",
    "Mantén los pagos puntuales durante varios meses y no pidas varios productos a la vez.",
  );
  return {
    resumen: "Lo primero es que las entidades puedan ver que pagas a tiempo.",
    motivos: [
      "No tienes deudas y nunca tuviste una tarjeta ni un préstamo: las entidades todavía no tienen cómo saber que pagas a tiempo.",
      fraseLibre(flujo),
      "No se proyecta ningún día en negativo en los próximos 30 días.",
    ],
    pasos,
    alternativas: [
      alternativa("tarjeta-con-garantia", "Todavía no tienes historial: es una forma común de empezar a construirlo."),
      alternativa("tarjeta-inicio", "Está pensada para quien aún no tuvo una tarjeta de crédito."),
    ],
  };
}

function rutaCrecer(perfil: Perfil, flujo: FlujoMensual, c: Colchon): Omit<Ruta, "id" | "titulo" | "flujo" | "colchon" | "aviso"> {
  const totalDeuda = sumar(perfil.deudas.map(d => d.saldo));
  const completo = c.meta > 0 && c.falta === 0;
  const motivos = ["No se proyecta ningún día en negativo en los próximos 30 días.", fraseLibre(flujo)];
  if (c.gastoMensual > 0) motivos.push(`Tu saldo de hoy (${formatoSoles(perfil.saldoActual)}) cubre unos ${c.diasCubiertos} días de tus gastos.`);

  const pasos: string[] = [];
  if (totalDeuda > 0) pasos.push(`Cancela primero tu deuda (${formatoSoles(totalDeuda)}): con lo que tienes hoy te alcanza y te sigue quedando tu colchón.`);
  if (sinRegistro(flujo)) pasos.push("Anota tus ingresos y tus gastos fijos en Mi dinero: con eso calculo de cuánto debe ser tu colchón.");
  else if (flujo.libre <= 0) pasos.push("Hoy no te sobra plata al mes: antes de buscar dónde ponerla, revisa tus gastos.");
  if (completo) pasos.push(`Tu colchón de tres meses de gastos (${formatoSoles(c.meta)}) ya está completo: mantenlo aparte y no lo toques salvo emergencia.`);
  else if (c.meta > 0) {
    const plazo = c.mesesParaCompletar === null ? "" : ` y, guardando lo que te sobra, llegarías en ${plural(c.mesesParaCompletar, "un mes", "meses")}`;
    pasos.push(`Completa tu colchón de tres meses de gastos (${formatoSoles(c.meta)}): te faltan ${formatoSoles(c.falta)}${plazo}.`);
  }
  pasos.push("Lo que pase del colchón puede ir a un plazo más largo. Compara alternativas por plazo y por riesgo, y no pongas ahí plata que vayas a necesitar pronto.");

  const alternativas = [
    alternativa("cuenta-de-ahorro", "Para tener tu colchón aparte de la plata del día a día."),
    alternativa("deposito-a-plazo", "Para la plata que no vas a tocar durante un tiempo."),
  ];
  if (completo) alternativas.push(alternativa("fondo-mutuo", "Tu colchón ya está completo: lo que pase de ahí puede ir a más plazo, sabiendo que su valor sube y baja."));
  return {
    resumen: completo ? "Ya tienes tu colchón: ahora toca decidir con calma qué hacer con lo que te sobra." : "Lo primero es completar tu colchón de emergencia.",
    motivos, pasos, alternativas,
  };
}

/** La ruta de una persona. Pura: mismas entradas, misma ruta. El servidor la recalcula; nunca confía en la del navegador. */
export function trazarRuta(perfil: Perfil, analisis: Analisis, hechos: Hechos = SIN_HECHOS): Ruta {
  const flujo = flujoMensual(perfil, analisis);
  const c = colchon(perfil.saldoActual, flujo);
  const id = clasificar(perfil, analisis, hechos, flujo, c);
  const cuerpo = id === "estar_en_verde" ? rutaEnVerde(perfil, analisis, hechos, flujo, c)
    : id === "construir_historial" ? rutaHistorial(flujo)
    : rutaCrecer(perfil, flujo, c);
  return { id, titulo: TITULOS[id], ...cuerpo, flujo, colchon: c, aviso: AVISO_SIMULACION };
}

/** Versión corta para decir en voz alta o abrir la conversación. */
export function rutaHablada(ruta: Ruta): string {
  return `Tu ruta es: ${minuscula(ruta.titulo)}. ${ruta.resumen} Primer paso: ${minuscula(ruta.pasos[0])}`;
}

/** Lo primero que dice el asistente: saludo, ruta y primer paso. Texto armado por código, no por la IA. */
export function saludoDeRuta(nombre: string, ruta: Ruta, propio: boolean): string {
  const inicio = propio ? `Hola, ${nombre}. Con lo que me contaste armé tu caso.` : `Hola, ${nombre}.`;
  const fechas = propio ? " Puse fechas aproximadas a tus pagos: puedes corregirlas en Mi dinero y en Deudas." : "";
  return `${inicio} ${rutaHablada(ruta)}${fechas} ¿Qué quieres saber?`;
}

/** Respuesta completa sin IA: resumen, pasos, alternativas y el aviso. */
export function rutaExplicada(ruta: Ruta): string {
  const pasos = ruta.pasos.map((p, i) => `${i + 1}. ${p}`).join(" ");
  const alternativas = ruta.alternativas.length
    ? ` Alternativas para comparar: ${ruta.alternativas.map(a => minuscula(a.entrada.titulo)).join("; ")}.`
    : "";
  return `Tu ruta es: ${minuscula(ruta.titulo)}. ${ruta.resumen} ${pasos}${alternativas} ${ruta.aviso}`;
}

const PREGUNTAS: Record<IdRuta, string[]> = {
  estar_en_verde: ["¿Por dónde empiezo?", "¿Qué deuda pago primero?", "¿Qué pasa si solo pago el mínimo?", "¿Me alcanza para un gasto de 200 soles?"],
  construir_historial: ["¿Por dónde empiezo?", "¿Cómo construyo mi historial?", "¿Qué es una tarjeta con garantía?", "¿Cuánto me queda libre al mes?"],
  hacer_crecer: ["¿Por dónde empiezo?", "¿De cuánto debe ser mi colchón?", "¿Dónde guardo lo que me sobra?", "¿Cuánto me queda libre al mes?"],
};

export function preguntasSugeridas(ruta: Ruta): string[] {
  return PREGUNTAS[ruta.id];
}
