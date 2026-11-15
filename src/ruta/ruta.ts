/**
 * Motor de ruta: decide por dónde empieza cada persona. Son reglas de código, explicables y con pruebas;
 * la IA solo conversa sobre lo que sale de aquí. La meta y la elección son explícitas;
 * el saldo decide la recomendación, sin sustituir la elección.
 * No calcula ni inventa ningún «score»: habla de señales que la persona puede ver en sus propios datos.
 */
import { z } from "zod";
import { formatoCorto, formatoLargo, formatoSoles, redondear, semanalAMes, sumar } from "../motor";
import { nombreDia } from "../motor/fechas";
import type { Analisis, Centimos, Perfil, Recurrente } from "../motor";
import { CATALOGO, type EntradaCatalogo } from "../recomendaciones/catalogo";
import { crecimientoDelHueco } from "../explica/hueco";
import { costoEnPalabras } from "../explica/costo";
import type { Datos } from "../datos/tipos";

/** Texto fijo que acompaña toda orientación. Lo escribe el código, no la IA. */
export const AVISO_SIMULACION =
  "Panel simulado con datos inventados. La orientación no garantiza la aprobación de ningún producto: eso lo decide el banco con su propia evaluación crediticia.";

/** Lo mínimo que el motor no puede deducir del perfil. Viaja al servidor validado, nunca como texto libre. */
export const IDS_RUTA = ["estar_en_verde", "ahorrar", "salir_deudas", "hacer_crecer", "construir_historial"] as const;
export const EsquemaIdRuta = z.enum(IDS_RUTA);
export const EsquemaHechos = z.object({
  meta: EsquemaIdRuta.optional(),
  rutaElegida: EsquemaIdRuta.optional(),
  tieneDeudas: z.boolean().optional(),
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

export const alMes = (r: Recurrente): Centimos => (r.frecuencia === "mensual" ? r.monto : semanalAMes(r.monto));

/** De dónde sale cada lado del mes típico: lo fijo detectado y lo variable estimado. Todo en céntimos enteros, ≥ 0. */
export interface DesgloseMensual {
  ingresosFijos: Centimos;
  /** Ingreso variable prudente (semanal × 52 / 12, al sol). */
  ingresoVariable: Centimos;
  /** Gastos fijos, sin cuotas de deuda. */
  gastosFijos: Centimos;
  /** Gasto del día a día (diario × 30). */
  gastoVariable: Centimos;
}

/** Única fuente de «lo que entra y sale al mes»: la usan Mi ruta y Mi dinero para que nunca se contradigan. */
export function desgloseMensual(analisis: Analisis): DesgloseMensual {
  const fijos = analisis.recurrentes.filter(r => r.categoria !== "deuda").map(alMes);
  return {
    ingresosFijos: sumar(fijos.filter(m => m > 0)),
    ingresoVariable: Math.max(0, semanalAMes(analisis.ingresoVariable.semanalPrudente)),
    gastosFijos: -sumar(fijos.filter(m => m < 0)),
    gastoVariable: Math.max(0, redondear(-analisis.gastoVariable.diario * 30)),
  };
}

/** Mes típico de la persona: lo fijo detectado más lo variable estimado. Todo en céntimos enteros. */
/** Nombre del fijo que guarda la cuota declarada sin saldo (cuestionario corto): es una cuota, no un gasto. */
export const CUOTAS_POR_DETALLAR = "Cuotas de deudas por detallar";

/** Lo que la persona declaró pagar en cuotas sin detallar la deuda, al mes. */
export function cuotasPorDetallar(analisis: Analisis): Centimos {
  return sumar(analisis.recurrentes.filter(r => r.descripcion === CUOTAS_POR_DETALLAR).map(r => -alMes(r)));
}

export function flujoMensual(perfil: Perfil, analisis: Analisis): FlujoMensual {
  const d = desgloseMensual(analisis);
  const ingresos = d.ingresosFijos + d.ingresoVariable;
  const cuotasPendientes = cuotasPorDetallar(analisis);
  const gastos = d.gastosFijos + d.gastoVariable - cuotasPendientes;
  const cuotas = cuotasPendientes + sumar(perfil.deudas.map(d => Math.max(d.pagoHabitual, d.pagoMinimo)));
  return { ingresos, gastos, cuotas, libre: ingresos - gastos - cuotas };
}

/**
 * «Te entra / te sale al mes» de Mi dinero: las MISMAS cifras que usa Mi ruta (flujoMensual), con una nota que dice de
 * dónde sale cada una. Así ninguna pantalla muestra S/ 0 de ingresos mientras otra muestra lo que el motor estima.
 */
export function resumenDelMes(perfil: Perfil, analisis: Analisis) {
  const d = desgloseMensual(analisis);
  const f = flujoMensual(perfil, analisis);
  const notaEntra =
    d.ingresosFijos > 0 && d.ingresoVariable > 0
      ? `Fijos ${formatoSoles(d.ingresosFijos)} + variable estimado ${formatoSoles(d.ingresoVariable)}`
      : d.ingresoVariable > 0
        ? "Ingreso variable estimado, a la baja para no ilusionarte"
        : d.ingresosFijos > 0
          ? "Tus ingresos fijos"
          : "Agrega tus ingresos";
  const notaSale =
    f.gastos === 0 ? "Sin gastos registrados" : `Fijos ${formatoSoles(d.gastosFijos - cuotasPorDetallar(analisis))} + día a día ${formatoSoles(d.gastoVariable)}, sin cuotas de deudas`;
  return { entra: f.ingresos, sale: f.gastos, notaEntra, notaSale };
}

/**
 * Regla única mientras la proyección tenga un día en rojo. La repiten Mi ruta, Deudas («Qué pagar primero») y el
 * asistente: a ninguna deuda se le suma extra ni se le adelanta el pago, y nunca se paga menos del mínimo; el hueco se
 * tapa con la jugada más barata que lo resuelve (la misma de Inicio).
 */
export const REGLA_DEUDAS_EN_ROJO = (dia: string) =>
  `Hasta que pase el ${dia}, no adelantes pagos ni sumes extra a ninguna deuda, y nunca pagues menos del mínimo.`;

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

export type IdRuta = (typeof IDS_RUTA)[number];

/**
 * Identificador estable de cada paso. El texto de un paso cambia con las cifras (fechas, montos); el id no,
 * y por eso es lo único que se guarda cuando la persona marca un paso como hecho. Cada ruta tiene los suyos.
 */
export const IDS_PASO = [
  "ahorro_separar", "ahorro_completar", "deudas_anotar", "grande_objetivo", "invertir_freno",
  "verde_ponerse_al_dia", "verde_tapar_hueco", "verde_pagar_minimos", "verde_bajar_gasto", "verde_adelantar_deuda", "verde_empezar_colchon",
  "historial_anotar", "historial_liberar", "historial_producto_pequeno", "historial_usar_poco", "historial_pagos_puntuales",
  "crecer_cancelar_deuda", "crecer_anotar", "crecer_revisar_gastos", "crecer_mantener_colchon", "crecer_completar_colchon", "crecer_plazo_largo",
] as const;
export type IdPaso = (typeof IDS_PASO)[number];

/** Pasos que la persona marcó como hechos. Viaja al servidor validado: solo ids de la lista, nunca texto libre. */
export const EsquemaAvances = z.array(z.enum(IDS_PASO)).max(IDS_PASO.length);

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
  /** El id de cada paso, en el mismo orden que `pasos`. */
  idsPasos: IdPaso[];
  /** Alternativas genéricas del catálogo que aplican (sin entidades ni cifras de mercado). */
  alternativas: Alternativa[];
  flujo: FlujoMensual;
  colchon: Colchon;
  aviso: string;
}

export const TITULOS: Record<IdRuta, string> = {
  estar_en_verde: "Evitar quedarte en rojo",
  ahorrar: "Ahorrar y armar tu colchón",
  salir_deudas: "Salir de deudas",
  construir_historial: "Prepararte para algo grande",
  hacer_crecer: "Invertir lo que te sobra",
};

/** Qué logra cada ruta, en una línea y sin cifras: el subtítulo propio de cada opción en «Mi ruta». */
export const QUE_LOGRA: Record<IdRuta, string> = {
  estar_en_verde: "Tapar el hueco de tu saldo antes que cualquier otra cosa.",
  ahorrar: "Separar un ahorro que puedas sostener y armar tu colchón.",
  salir_deudas: "Ordenar tus deudas y pagarlas con el menor costo.",
  construir_historial: "Prepararte con calma para pedir algo grande.",
  hacer_crecer: "Hacer rendir lo que te sobra cuando el mes cierre en positivo.",
};

const alternativa = (id: EntradaCatalogo["id"], porQue: string): Alternativa => ({ entrada: CATALOGO.find(e => e.id === id)!, porQue });
const minuscula = (texto: string) => texto.charAt(0).toLowerCase() + texto.slice(1);
const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : `${n} ${varios}`);
const sinRegistro = (f: FlujoMensual) => f.ingresos === 0 && f.gastos === 0 && f.cuotas === 0;

type Cuerpo = Omit<Ruta, "id" | "titulo" | "flujo" | "colchon" | "aviso">;

/** Arma la lista de pasos con su id al lado, para que texto e id nunca se desordenen. */
function listaDePasos() {
  const pasos: string[] = [];
  const idsPasos: IdPaso[] = [];
  const paso = (id: IdPaso, texto: string) => {
    idsPasos.push(id);
    pasos.push(texto);
  };
  return { pasos, idsPasos, paso };
}

/** «Al mes te entran X y salen Y: te quedan Z libres.» */
export function fraseLibre(f: FlujoMensual): string {
  if (sinRegistro(f)) return "Todavía no registras ingresos ni gastos fijos, así que no puedo calcular cuánto te queda al mes.";
  const salen = f.gastos + f.cuotas;
  const cuotas = f.cuotas > 0 ? ` (${formatoSoles(f.cuotas)} son cuotas de deuda)` : "";
  const base = `Al mes te entran ${formatoSoles(f.ingresos)} y salen ${formatoSoles(salen)}${cuotas}:`;
  if (f.libre > 0) return `${base} te quedan ${formatoSoles(f.libre)} libres.`;
  if (f.libre === 0) return `${base} no te queda nada libre.`;
  return `${base} cada mes gastas ${formatoSoles(-f.libre)} más de lo que te entra.`;
}

/**
 * El flujo mensual negativo dicho como RITMO (no como otro faltante): «Cada mes gastas S/ X más de lo que te entra».
 * `null` si el mes no cierra en negativo o si todavía no hay nada registrado. X sale de flujoMensual().libre.
 */
export function fraseRitmo(f: FlujoMensual): string | null {
  if (f.libre >= 0 || sinRegistro(f)) return null;
  return `Cada mes gastas ${formatoSoles(-f.libre)} más de lo que te entra`;
}

/** Tarjeta de Inicio cuando NO hay déficit a 30 días pero el mes cierra en negativo; `null` si no aplica. */
export function fraseLlegasPero(f: FlujoMensual): string | null {
  const r = fraseRitmo(f);
  return r ? `Llegas a 30 días, pero c${r.slice(1)}` : null;
}

/** «sáb 5 dic»: día de la semana abreviado y fecha corta, ambos del motor de fechas. */
export function fechaConDia(fecha: string): string {
  return `${nombreDia(fecha).slice(0, 3)} ${formatoCorto(fecha)}`;
}

/** Opciones válidas. Con cinco candidatas se conserva la meta y la elección; se limita la lista a cuatro. */
export function idsOfrecidos(perfil: Perfil, analisis: Analisis, hechos: Hechos): IdRuta[] {
  const ids: IdRuta[] = ["ahorrar", "hacer_crecer", "construir_historial"];
  if (perfil.deudas.length > 0 || hechos.tieneDeudas) ids.push("salir_deudas");
  if (analisis.proyeccion.deficit || hechos.diasAtrasoMax > 0) ids.unshift("estar_en_verde");
  if (ids.length > 4) {
    const quitar = ["ahorrar", "construir_historial", "salir_deudas"].find(id => id !== hechos.meta && id !== hechos.rutaElegida)!;
    ids.splice(ids.indexOf(quitar as IdRuta), 1);
  }
  return ids;
}
/** Opciones que se muestran en «Mi ruta»: con el mes en negativo no se ofrece «Invertir lo que te sobra» (salvo que ya esté elegida). */
export function opcionesVisibles(opciones: Ruta[], elegida?: IdRuta): Ruta[] {
  return opciones.filter(o => !(o.id === "hacer_crecer" && o.flujo.libre < 0 && o.id !== elegida));
}
export function recomendada(perfil: Perfil, analisis: Analisis, hechos: Hechos): IdRuta {
  if (analisis.proyeccion.deficit || hechos.diasAtrasoMax > 0) return "estar_en_verde";
  const ids = idsOfrecidos(perfil, analisis, hechos);
  return hechos.meta && ids.includes(hechos.meta) ? hechos.meta : "ahorrar";
}

function rutaEnVerde(perfil: Perfil, analisis: Analisis, hechos: Hechos, flujo: FlujoMensual, c: Colchon): Cuerpo {
  const { deficit } = analisis.proyeccion;
  const atraso = hechos.diasAtrasoMax > 0;
  const deudas = perfil.deudas;
  const totalDeuda = sumar(deudas.map(d => d.saldo));
  const motivos: string[] = [];
  const { pasos, idsPasos, paso } = listaDePasos();
  const alternativas: Alternativa[] = [];

  if (deficit) motivos.push(`Tu proyección deja el saldo bajo cero el ${formatoLargo(deficit.fecha)}: ese día faltarían ${formatoSoles(deficit.faltante)}.${crecimientoDelHueco(deficit) ? ` ${crecimientoDelHueco(deficit)}` : ""}`);
  if (atraso) motivos.push(`Tienes una deuda con unos ${hechos.diasAtrasoMax} días de atraso.`);
  if (deudas.length > 0) motivos.push(`Debes ${formatoSoles(totalDeuda)} en ${plural(deudas.length, "una deuda", "deudas")}.`);
  motivos.push(fraseLibre(flujo));

  if (atraso) paso("verde_ponerse_al_dia", "Ponte al día con la deuda atrasada antes que nada. Si no llegas, pide un nuevo plan de pago a quien le debes antes de que el atraso crezca.");
  if (deficit) {
    // La misma que «la más barata» de Inicio: resuelve sola y su costo se conoce o se estima.
    const jugada = analisis.jugadas.find(j => j.resuelve && j.certezaCosto !== "desconocido");
    const dia = formatoLargo(deficit.fecha);
    if (jugada) paso("verde_tapar_hueco", `Tapa el hueco del ${dia}: ${minuscula(jugada.titulo)}, que ${costoEnPalabras(jugada)}.`);
    else if (analisis.jugadas.length > 0) paso("verde_tapar_hueco", `Tapa el hueco del ${dia}: ninguna jugada alcanza sola, así que combina dos de las que ves en Inicio.`);
    else paso("verde_tapar_hueco", `Tapa el hueco del ${dia}: aplaza un gasto que no sea urgente o adelanta un ingreso, porque hoy no hay un pago que se pueda mover.`);
    if (deudas.length > 0) paso("verde_pagar_minimos", REGLA_DEUDAS_EN_ROJO(dia));
    else if (flujo.libre <= 0 && !sinRegistro(flujo)) paso("verde_bajar_gasto", "Cada mes te sale más de lo que te entra: elige un gasto fijo que puedas bajar este mismo mes.");
  } else if (deudas.length > 0) {
    const primera = analisis.deudas?.primera ?? null;
    if (flujo.libre <= 0) paso("verde_bajar_gasto", "Hoy no te sobra para adelantar pagos: busca un gasto que puedas recortar y no tomes una deuda nueva para pagar la vieja.");
    else if (deudas.length === 1) paso("verde_adelantar_deuda", `Pon lo que te sobra (${formatoSoles(flujo.libre)} al mes) en adelantar ${deudas[0].nombre}: cada sol que adelantas deja de generar intereses.`);
    else if (primera && primera.tceaBp > 0) paso("verde_adelantar_deuda", `Paga el mínimo de todas y pon lo que te sobra (${formatoSoles(flujo.libre)} al mes) en ${primera.nombre}, la de tasa más alta.`);
    else paso("verde_adelantar_deuda", `Paga el mínimo de todas y anota la tasa (TCEA) de cada una en Deudas: lo que te sobra (${formatoSoles(flujo.libre)} al mes) va a la más cara.`);
  }
  if (c.gastoMensual > 0) paso("verde_empezar_colchon", `Cuando el mes cierre en positivo, empieza un colchón: un mes de tus gastos, contando las cuotas de tus deudas, son ${formatoSoles(c.gastoMensual)}.`);

  if (deficit) alternativas.push(alternativa("reprogramar", `Tu proyección deja el saldo bajo cero el ${formatoLargo(deficit.fecha)}: conviene preguntarlo antes de caer en atraso.`));
  else if (atraso) alternativas.push(alternativa("reprogramar", "Tienes una deuda con atraso: conversar un nuevo plan de pago a tiempo evita que crezca."));

  const resumen = deficit ? `Lo primero es que no te falte plata el ${formatoLargo(deficit.fecha)}.`
    : atraso ? "Lo primero es ponerte al día con lo atrasado."
    : flujo.libre <= 0 ? "Tus gastos y cuotas se llevan todo lo que te entra: primero hay que liberar algo cada mes."
    : "Vas al día: ahora toca bajar la deuda más rápido para pagar menos intereses.";
  return { resumen, motivos, pasos, idsPasos, alternativas };
}

function rutaHistorial(flujo: FlujoMensual): Cuerpo {
  const { pasos, idsPasos, paso } = listaDePasos();
  paso("grande_objetivo", "Define qué quieres comprar, cuánto cuesta y para cuándo, antes de evaluar un crédito.");
  if (sinRegistro(flujo)) paso("historial_anotar", "Anota tus ingresos y tus gastos fijos en Mi dinero: con eso afino esta ruta.");
  else if (flujo.libre <= 0) paso("historial_liberar", "Antes de pedir un producto, haz que te sobre algo cada mes: revisa qué gasto puedes bajar.");
  paso("historial_producto_pequeno", "Empieza con un producto de crédito pequeño, uno cuyo pago completo puedas cubrir todos los meses.");
  paso("historial_usar_poco", "Úsalo poco y paga el total antes de la fecha de vencimiento: así no pagas intereses.");
  paso("historial_pagos_puntuales", "Mantén los pagos puntuales durante varios meses y no pidas varios productos a la vez.");
  return {
    resumen: "Lo primero es que las entidades puedan ver que pagas a tiempo.",
    motivos: [
      "El banco mira tu historial antes de prestarte para una casa o un auto; sin historial te lo pueden negar o cobrar más caro.",
      fraseLibre(flujo),
    ],
    pasos,
    idsPasos,
    alternativas: [
      alternativa("tarjeta-con-garantia", "Todavía no tienes historial: es una forma común de empezar a construirlo."),
      alternativa("tarjeta-inicio", "Está pensada para quien aún no tuvo una tarjeta de crédito."),
    ],
  };
}

function rutaCrecer(perfil: Perfil, flujo: FlujoMensual, c: Colchon): Cuerpo {
  const totalDeuda = sumar(perfil.deudas.map(d => d.saldo));
  const completo = c.meta > 0 && c.falta === 0;
  const motivos = [fraseLibre(flujo)];
  if (c.gastoMensual > 0) motivos.push(`Tu saldo de hoy (${formatoSoles(perfil.saldoActual)}) cubre unos ${c.diasCubiertos} días de tus gastos.`);

  const { pasos, idsPasos, paso } = listaDePasos();
  if (totalDeuda > 0 && perfil.saldoActual - totalDeuda >= c.meta) paso("crecer_cancelar_deuda", `Cancela primero tu deuda (${formatoSoles(totalDeuda)}): con lo que tienes hoy te alcanza y te sigue quedando tu colchón.`);
  if (sinRegistro(flujo)) paso("crecer_anotar", "Anota tus ingresos y tus gastos fijos en Mi dinero: con eso calculo de cuánto debe ser tu colchón.");
  else if (flujo.libre <= 0) paso("crecer_revisar_gastos", "Hoy no te sobra plata al mes: antes de buscar dónde ponerla, revisa tus gastos.");
  if (completo) paso("crecer_mantener_colchon", `Tu colchón de tres meses de gastos (${formatoSoles(c.meta)}) ya está completo: mantenlo aparte y no lo toques salvo emergencia.`);
  else if (c.meta > 0) {
    const plazo = c.mesesParaCompletar === null ? "" : ` y, guardando lo que te sobra, llegarías en ${plural(c.mesesParaCompletar, "un mes", "meses")}`;
    paso("crecer_completar_colchon", `Completa tu colchón de tres meses de gastos (${formatoSoles(c.meta)}): te faltan ${formatoSoles(c.falta)}${plazo}.`);
  }
  paso("crecer_plazo_largo", "Lo que pase del colchón puede ir a un plazo más largo. Compara alternativas por plazo y por riesgo, y no pongas ahí plata que vayas a necesitar pronto.");

  const alternativas = [
    alternativa("cuenta-de-ahorro", "Para tener tu colchón aparte de la plata del día a día."),
    alternativa("deposito-a-plazo", "Para la plata que no vas a tocar durante un tiempo."),
  ];
  if (completo) alternativas.push(alternativa("fondo-mutuo", "Tu colchón ya está completo: lo que pase de ahí puede ir a más plazo, sabiendo que su valor sube y baja."));
  return {
    resumen: completo ? "Ya tienes tu colchón: ahora toca decidir con calma qué hacer con lo que te sobra." : "Lo primero es completar tu colchón de emergencia.",
    motivos, pasos, idsPasos, alternativas,
  };
}

/** La ruta de una persona. Pura: mismas entradas, misma ruta. El servidor la recalcula; nunca confía en la del navegador. */
export function trazarRuta(perfil: Perfil, analisis: Analisis, hechos: Hechos = SIN_HECHOS): Ruta {
  const flujo = flujoMensual(perfil, analisis);
  const c = colchon(perfil.saldoActual, flujo);
  const disponibles = idsOfrecidos(perfil, analisis, hechos);
  const preferida = hechos.rutaElegida ?? hechos.meta;
  const id = preferida && disponibles.includes(preferida) ? preferida : recomendada(perfil, analisis, hechos);
  let cuerpo = id === "estar_en_verde" || id === "salir_deudas" ? rutaEnVerde(perfil, analisis, hechos, flujo, c)
    : id === "construir_historial" ? rutaHistorial(flujo)
    : rutaCrecer(perfil, flujo, c);
  if (id === "ahorrar") cuerpo = {
    resumen: "Separa un ahorro que puedas sostener y arma tu colchón.",
    motivos: [fraseLibre(flujo), c.falta > 0 ? `Para tu colchón faltan ${formatoSoles(c.falta)}.` : "Tu colchón de tres meses ya está completo."],
    pasos: [flujo.libre < 0 ? `Hoy te faltan ${formatoSoles(-flujo.libre)} al mes; primero cierra ese hueco.` : `Separa hasta ${formatoSoles(flujo.libre)} al cobrar, sin usar lo de tus gastos.`, c.falta > 0 ? `Completa tu colchón: faltan ${formatoSoles(c.falta)} para cubrir tres meses de gastos.` : "Mantén tu colchón completo y destina lo que sobre a tus metas."],
    idsPasos: ["ahorro_separar", "ahorro_completar"],
    alternativas: [alternativa("cuenta-de-ahorro", "Para separar tu colchón del dinero diario.")],
  };
  if (id === "salir_deudas" && perfil.deudas.length === 0) {
    cuerpo.pasos.unshift(`Anota tus deudas en Deudas: tienes ${formatoSoles(flujo.cuotas)} al mes en cuotas registradas; falta detallar el saldo y la tasa.`);
    cuerpo.idsPasos.unshift("deudas_anotar");
  }
  if (id === "hacer_crecer" && flujo.libre < 0) {
    cuerpo.pasos.unshift(`Hoy te faltan ${formatoSoles(-flujo.libre)} al mes; primero cierra ese hueco antes de invertir.`);
    cuerpo.idsPasos.unshift("invertir_freno");
  }
  if (cuerpo.pasos.length === 0) { cuerpo.pasos.push("Revisa tus gastos y fechas en Mi dinero."); cuerpo.idsPasos.push("verde_bajar_gasto"); }
  // La primera razón siempre contiene una cifra calculada, también cuando faltan registros.
  cuerpo.motivos.unshift(flujo.libre < 0 ? `Hoy te faltan ${formatoSoles(-flujo.libre)} al mes.` : `Hoy te quedan ${formatoSoles(flujo.libre)} al mes.`);
  return { id, titulo: TITULOS[id], ...cuerpo, flujo, colchon: c, aviso: AVISO_SIMULACION };
}

export interface PasoDeAvance {
  id: IdPaso;
  texto: string;
  hecho: boolean;
}

/** Cómo va la persona en su ruta: qué pasos marcó, cuántos son y cuál sigue. */
export interface Avance {
  cumplidos: number;
  total: number;
  pasos: PasoDeAvance[];
  /** Texto del primer paso sin marcar; null si ya marcó todos. */
  siguiente: string | null;
}

/**
 * Cruza la ruta de hoy con lo que la persona marcó. Pura. Las marcas de pasos que ya no están en la ruta
 * (porque cambiaron sus datos o su ruta) simplemente no cuentan.
 */
export function avanceDe(ruta: Ruta, avances: readonly IdPaso[] = []): Avance {
  const marcados = new Set<IdPaso>(avances);
  const pasos = ruta.pasos.map((texto, i) => ({ id: ruta.idsPasos[i], texto, hecho: marcados.has(ruta.idsPasos[i]) }));
  return {
    cumplidos: pasos.filter(p => p.hecho).length,
    total: pasos.length,
    pasos,
    siguiente: pasos.find(p => !p.hecho)?.texto ?? null,
  };
}

/** «2 de 4 pasos hechos». */
export function contadorDeAvance(a: Avance): string {
  return `${a.cumplidos} de ${a.total} ${a.total === 1 ? "paso hecho" : "pasos hechos"}`;
}

/** Una frase completa sobre el avance, para el asistente con o sin IA. */
export function fraseAvance(a: Avance): string {
  if (a.total === 0) return "Tu ruta todavía no tiene pasos.";
  if (!a.siguiente) return `Ya marcaste como hechos todos los pasos de tu ruta (${contadorDeAvance(a)}). Si cambian tus datos, la ruta se vuelve a calcular.`;
  if (a.cumplidos === 0) return `Todavía no marcas ningún paso de tu ruta como hecho. Tu primer paso: ${minuscula(a.siguiente)}`;
  return `Llevas ${contadorDeAvance(a)} en tu ruta. Tu siguiente paso: ${minuscula(a.siguiente)}`;
}

/** Versión corta para decir en voz alta o abrir la conversación. Con avance, retoma donde quedó la persona. */
export function rutaHablada(ruta: Ruta, avance?: Avance): string {
  // La cifra va en su propia frase: «porque te faltan S/ 1,100» no explica por qué conviene, p. ej., comprar algo grande.
  const cifra = ruta.motivos[0];
  const completa = !!avance && avance.total > 0 && !avance.siguiente;
  const retoma = avance && avance.cumplidos > 0 && avance.siguiente;
  const paso = (retoma ? avance.siguiente : undefined) ?? ruta.pasos[0];
  // Si el paso ya dice la cifra («hoy te faltan S/ 300 al mes; primero…»), no la repetimos antes.
  const repite = !completa && !!paso && paso.toLowerCase().includes(cifra.replace(/\.$/, "").toLowerCase());
  const base = `Te sugiero ${minuscula(ruta.titulo)}.${repite ? "" : ` ${cifra}`}`;
  if (completa) return `${base} Ya completaste todos sus pasos. Puedes elegir otra ruta en Mi ruta.`;
  return `${base} ${retoma ? "Siguiente paso" : "Primer paso"}: ${minuscula(paso)} Puedes elegir otra ruta en Mi ruta.`;
}

export function saludoDeRuta(nombre: string, ruta: Ruta, propio: boolean, avance?: Avance): string {
  void propio;
  return `Hola, ${nombre.replace(/\.+$/, "")}. ${rutaHablada(ruta, avance)} ¿Qué quieres saber?`;
}

/** Respuesta completa sin IA: resumen, pasos, alternativas y el aviso. */
export function rutaExplicada(ruta: Ruta): string {
  const pasos = ruta.pasos.map((p, i) => `${i + 1}. ${p}`).join(" ");
  const alternativas = ruta.alternativas.length
    ? ` Alternativas para comparar: ${ruta.alternativas.map(a => minuscula(a.entrada.titulo)).join("; ")}.`
    : "";
  return `${ruta.titulo}. ${ruta.resumen} ${pasos}${alternativas} ${ruta.aviso}`;
}

/**
 * Respuesta corta sin IA (modo Directo): un solo paso, sin productos ni aviso.
 * `tema` elige el paso que habla de lo preguntado (p. ej. el colchón); si ninguno, el siguiente pendiente o el primero.
 */
export function rutaDirecta(ruta: Ruta, tema?: RegExp, avance?: Avance): string {
  const delTema = tema && ruta.pasos.find(p => tema.test(normalizarTexto(p)));
  if (delTema) return delTema;
  if (avance && avance.total > 0 && !avance.siguiente) return "Ya completaste todos los pasos de tu ruta. Puedes elegir otra en Mi ruta.";
  const retoma = avance && avance.cumplidos > 0 && avance.siguiente;
  const paso = (retoma ? avance.siguiente : undefined) ?? ruta.pasos[0];
  return paso ? `Para ${minuscula(ruta.titulo)}, ${retoma ? "tu siguiente paso es" : "empieza por esto"}: ${minuscula(paso)}` : rutaExplicada(ruta);
}

const normalizarTexto = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const PREGUNTAS: Record<IdRuta, string[]> = {
  ahorrar: ["¿Por dónde empiezo?", "¿De cuánto debe ser mi colchón?", "¿Cuánto me queda libre al mes?"],
  salir_deudas: ["¿Por dónde empiezo?", "¿Qué deuda pago primero?", "¿Cuánto me queda libre al mes?"],
  estar_en_verde: ["¿Por dónde empiezo?", "¿Qué deuda pago primero?", "¿Qué pasa si solo pago el mínimo?", "¿Me alcanza para un gasto de 200 soles?"],
  construir_historial: ["¿Por dónde empiezo?", "¿Cómo construyo mi historial?", "¿Qué es una tarjeta con garantía?", "¿Cuánto me queda libre al mes?"],
  hacer_crecer: ["¿Por dónde empiezo?", "¿De cuánto debe ser mi colchón?", "¿Dónde guardo lo que me sobra?", "¿Cuánto me queda libre al mes?"],
};

const SOBRE_DEUDAS = new Set(["¿Qué deuda pago primero?", "¿Qué pasa si solo pago el mínimo?"]);
const DE_RELEVO = ["¿Cuánto me queda libre al mes?", "¿De cuánto debe ser mi colchón?"];

/** Preguntas de arranque; sin cuotas de deuda no sugiere preguntas sobre deudas. */
export function preguntasSugeridas(ruta: Ruta): string[] {
  const base = PREGUNTAS[ruta.id];
  if (ruta.flujo.cuotas > 0 || ruta.id === "salir_deudas") return base;
  const sinDeudas = base.filter(p => !SOBRE_DEUDAS.has(p));
  const relevos = DE_RELEVO.filter(p => !sinDeudas.includes(p));
  return [...sinDeudas, ...relevos].slice(0, Math.max(3, sinDeudas.length));
}

export function opcionesDeRuta(perfil: Perfil, analisis: Analisis, hechos: Hechos = SIN_HECHOS): Ruta[] {
  return idsOfrecidos(perfil, analisis, hechos).map(id => trazarRuta(perfil, analisis, { ...hechos, rutaElegida: id }));
}
