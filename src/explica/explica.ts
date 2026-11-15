/**
 * Convierte los cálculos del motor en frases. Aquí no se calcula dinero: solo se
 * eligen y se redactan cifras que ya vienen calculadas (y probadas) en `Analisis`.
 * Lo usan la pantalla, las notificaciones, la voz y el respaldo cuando no hay IA.
 */
import {
  formatoLargo, formatoSoles, formatoTasa, simularGasto, sumarDias,
} from "../motor";
import type { Analisis, EventoProyectado, FechaISO, Jugada, Perfil } from "../motor";
import { buscarMonto } from "../motor/numeros";
import { CAMBIAR_FECHA_DE_PAGO } from "./educacion";
import { fraseAvance, fraseLibre, rutaExplicada, type Avance, type Ruta } from "../ruta/ruta";

export type NivelAviso = "urgente" | "atencion" | "bien";

export interface Aviso {
  id: string;
  nivel: NivelAviso;
  titulo: string;
  cuerpo: string;
  /** Día al que se refiere el aviso, si aplica. */
  fecha?: FechaISO;
}

/** "a", "a y b", "a, b y c" */
export function enLista(elementos: readonly string[]): string {
  const unicos = [...new Set(elementos)];
  if (unicos.length <= 1) return unicos[0] ?? "";
  return `${unicos.slice(0, -1).join(", ")} y ${unicos[unicos.length - 1]}`;
}

function enDias(dias: number): string {
  if (dias <= 0) return "Hoy";
  return dias === 1 ? "Mañana" : `En ${dias} días`;
}

function minusculaInicial(texto: string): string {
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

/** Salidas fijas (alquiler, servicios, pagos de deuda) de los próximos `dias` días, por fecha. */
export function proximosPagos(analisis: Analisis, dias = 7): EventoProyectado[] {
  const limite = sumarDias(analisis.hoy, dias);
  return analisis.proyeccion.dias
    .filter(d => d.fecha <= limite)
    .flatMap(d => d.eventos.filter(e => e.origen === "recurrente" && e.monto < 0));
}

/** La jugada que resuelve sola el déficit con menor costo (el motor ya las entrega ordenadas). */
export function mejorJugada(analisis: Analisis): Jugada | undefined {
  return analisis.jugadas.find(j => j.resuelve);
}

/** Causa del déficit cuando no hay ningún pago fijo cerca: lo que sale en el día a día supera lo que entra. */
export const CAUSA_DIA_A_DIA = "tus gastos del día a día superan lo que entra";

function avisoDeficit(analisis: Analisis): Aviso | undefined {
  const deficit = analisis.proyeccion.deficit;
  if (!deficit) return undefined;
  const causas = enLista(deficit.causas.map(c => c.descripcion));
  const verbo = deficit.causas.length > 1 ? "se juntan" : "sale";
  const jugada = mejorJugada(analisis);
  const salida = jugada
    ? ` La salida más barata: ${minusculaInicial(jugada.titulo)}; ${jugada.costo > 0 ? `cuesta ${formatoSoles(jugada.costo)}` : "no cuesta dinero"}.`
    : analisis.jugadas.length > 0 ? " Ninguna jugada alcanza sola: hay que combinar dos." : "";
  // El título dice el primer día en rojo; si después el hueco crece, se avisa hasta dónde llega.
  const fondo = deficit.faltanteMaximo > deficit.faltante
    ? ` Si no haces nada, el hueco crece hasta ${formatoSoles(deficit.faltanteMaximo)} el ${formatoLargo(deficit.fechaFaltanteMaximo)}.`
    : "";
  return {
    id: "deficit", nivel: "urgente", fecha: deficit.fecha,
    titulo: `${enDias(deficit.diasRestantes)} te faltarán ${formatoSoles(deficit.faltante)}`,
    // Sin un pago fijo cerca del día en rojo, la causa es el día a día: se dice así en vez de dejar un hueco.
    cuerpo: causas
      ? `El ${formatoLargo(deficit.fecha)} ${verbo} ${causas} y la cuenta queda en rojo.${fondo}${salida}`
      : `El ${formatoLargo(deficit.fecha)} la cuenta queda en rojo: ${CAUSA_DIA_A_DIA}.${fondo}${salida}`,
  };
}

function avisoHolgura(analisis: Analisis): Aviso {
  const { saldoMinimo, fechaSaldoMinimo } = analisis.proyeccion;
  return {
    id: "holgura", nivel: "bien", fecha: fechaSaldoMinimo,
    titulo: "Llegas bien a los próximos 30 días",
    cuerpo: `Tu día más ajustado será el ${formatoLargo(fechaSaldoMinimo)}: te quedarán ${formatoSoles(saldoMinimo)} en la cuenta.`,
  };
}

function avisoPago(analisis: Analisis): Aviso | undefined {
  const deficit = analisis.proyeccion.deficit;
  const pago = proximosPagos(analisis, 7).find(p => !deficit || p.fecha < deficit.fecha);
  if (!pago) return undefined;
  return {
    id: "pago", nivel: "atencion", fecha: pago.fecha,
    titulo: `Se viene ${pago.descripcion}: ${formatoSoles(-pago.monto)}`,
    cuerpo: `Sale el ${formatoLargo(pago.fecha)}. Ya está contado en tu proyección.`,
  };
}

function avisoDeuda(perfil: Perfil, analisis: Analisis): Aviso | undefined {
  const deudas = analisis.deudas;
  if (!deudas?.primera) return undefined;
  const { primera, avalancha, minimos, ahorroVsMinimos } = deudas;
  const tasa = `${formatoTasa(primera.tceaBp)} al año (TCEA)`;
  const plan = avalancha.noTermina
    ? "Con lo que pagas hoy esa deuda no baja: hay que subir el pago mensual."
    : minimos.noTermina
      ? `Pagando solo el mínimo nunca baja. Con lo que ya pagas cada mes terminas en ${avalancha.meses} meses.`
      : `Con lo que ya pagas cada mes terminas en ${avalancha.meses} meses y te ahorras ${formatoSoles(ahorroVsMinimos)} en intereses frente a pagar solo el mínimo (${minimos.meses} meses).`;
  const varias = perfil.deudas.length > 1;
  // Sin TCEA anotada (el motor la toma como 0 %): no se afirma un costo ni un ahorro que no conocemos.
  if (primera.tceaBp === 0) {
    return {
      id: "deuda", nivel: "atencion",
      titulo: `Anota la TCEA de ${primera.nombre}`,
      cuerpo: "Sin la tasa no sé cuánto te cuesta ni en qué orden conviene pagar. Sale en tu estado de cuenta; si esa deuda no cobra intereses, déjala en 0.",
    };
  }
  return {
    id: "deuda", nivel: "atencion",
    titulo: varias ? `Paga primero ${primera.nombre}` : `No te quedes en el mínimo de ${primera.nombre}`,
    cuerpo: `${varias ? "Es tu deuda más cara" : "Te cuesta"}: ${tasa}. ${plan}`,
  };
}

/** Avisos del perfil, del más urgente al menos. Siempre devuelve al menos uno. */
export function avisos(perfil: Perfil, analisis: Analisis): Aviso[] {
  return [avisoDeficit(analisis) ?? avisoHolgura(analisis), avisoPago(analisis), avisoDeuda(perfil, analisis)]
    .filter((a): a is Aviso => a !== undefined);
}

/** Resumen corto pensado para escucharse. */
export function resumenHablado(perfil: Perfil, analisis: Analisis): string {
  const [principal, ...resto] = avisos(perfil, analisis);
  const deuda = resto.find(a => a.id === "deuda");
  return [
    `${perfil.nombre}, hoy tienes ${formatoSoles(perfil.saldoActual)} en tu cuenta.`,
    `${principal.titulo}. ${principal.cuerpo}`,
    deuda ? `Sobre tus deudas: ${minusculaInicial(deuda.titulo)}.` : "",
  ].filter(Boolean).join(" ");
}

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function explicarJugada(jugada: Jugada): string {
  const efecto = jugada.resuelve ? "Con eso ya no quedas en rojo." : "Sola no alcanza para salir del rojo.";
  return `${jugada.detalle} Costo: ${jugada.costoDetalle}. ${efecto}`;
}

function responderGasto(texto: string, perfil: Perfil, analisis: Analisis): string | undefined {
  if (!/alcanza|comprar|gastar|puedo/.test(texto)) return undefined;
  // El monto lo lee el código, en cifras o en palabras («cincuenta», «mil quinientos», «S/ 80.50»).
  const hallado = buscarMonto(texto);
  if (!hallado) return undefined;
  const monto = hallado.monto;
  const r = simularGasto(analisis.proyeccion, sumarDias(perfil.hoy, 1), monto);
  if (r.alcanza) {
    return `Sí te alcanza. Si gastas ${formatoSoles(monto)} mañana, tu día más ajustado sería el ${formatoLargo(r.fechaSaldoMinimoDespues)}, con ${formatoSoles(r.saldoMinimoDespues)} en la cuenta.`;
  }
  if (r.yaHabiaDeficit) {
    return `Ahora no te conviene: aun sin ese gasto te faltaría plata el ${formatoLargo(analisis.proyeccion.deficit?.fecha ?? r.fechaSaldoMinimoDespues)}. Primero resuelve eso.`;
  }
  return `No sin apretarte: con ${formatoSoles(monto)} quedarías en rojo el ${formatoLargo(r.primerDiaBajoCero ?? r.fechaSaldoMinimoDespues)}. Lo máximo que puedes gastar mañana sin quedar en rojo es ${formatoSoles(r.maximoSinDeficit)}.`;
}

function responderJugada(texto: string, analisis: Analisis): string | undefined {
  const reglas: [RegExp, Jugada["tipo"]][] = [
    [/minimo/, "pagar_minimo"], [/suscrip|paus/, "pausar_suscripciones"], [/recort|gast|ahorr/, "recortar_gasto"],
  ];
  const tipo = reglas.find(([patron]) => patron.test(texto))?.[1];
  if (!tipo) return undefined;
  const jugada = analisis.jugadas.find(j => j.tipo === tipo);
  if (jugada) return explicarJugada(jugada);
  if (tipo !== "recortar_gasto") return undefined;
  const mayor = analisis.gastoVariable.porCategoria[0];
  return mayor ? `Tu mayor gasto del día a día es ${mayor.categoria}: ${formatoSoles(mayor.mensual)} al mes.` : undefined;
}

/** Preguntas sobre la ruta: por dónde empezar, historial, colchón, cuánto queda libre. */
function responderRuta(texto: string, ruta: Ruta): string | undefined {
  if (/libre|queda al mes/.test(texto)) return fraseLibre(ruta.flujo);
  if (/historial|invert|crecer|ruta|empiez|empez|por donde|colchon|garantia/.test(texto)) return rutaExplicada(ruta);
  if (ruta.id === "construir_historial" && /tarjeta|credito|prestamo/.test(texto)) return rutaExplicada(ruta);
  return undefined;
}

/**
 * Respuesta armada solo con cálculos del motor, para cuando la IA no está disponible.
 * Con `ruta`, también responde por dónde empezar y qué alternativas comparar; sin ella, se comporta igual que antes.
 */
/** «¿Puedo mover / cambiar / postergar la fecha de pago?» (no «¿cuál es mi fecha de pago?»). */
const PREGUNTA_FECHA_DE_PAGO = /\b(mover|muevo|cambiar|cambio|aplazar|aplazo|postergar|postergo|retrasar|retraso|correr|corro)\b.{0,30}\bfecha/;
const PREGUNTA_DE_AVANCE =
  /\bcomo voy\b|\bmi avance\b|como va mi ruta|siguiente paso|\bque sigue\b|que paso (sigue|me toca|doy)|me falta hacer|\bya hice\b|\bya marque\b/;
export function responderSinIA(pregunta: string, perfil: Perfil, analisis: Analisis, ruta?: Ruta, avance?: Avance): string {
  const texto = normalizar(pregunta);
  // «¿Cómo voy?», «¿qué me falta?», «siguiente paso»: lo que la persona marcó en «Mi ruta».
  // Frases concretas: «avance de efectivo», «¿qué pasó con mi sueldo?» o «¿cuánto me falta para pagar?» no cuentan.
  if (avance && PREGUNTA_DE_AVANCE.test(texto)) return fraseAvance(avance);
  const gasto = responderGasto(texto, perfil, analisis);
  if (gasto) return gasto;
  if (PREGUNTA_FECHA_DE_PAGO.test(texto)) {
    const mejor = mejorJugada(analisis);
    return mejor ? `${CAMBIAR_FECHA_DE_PAGO} Lo que sí puedes hacer hoy: ${explicarJugada(mejor)}` : CAMBIAR_FECHA_DE_PAGO;
  }
  const jugada = responderJugada(texto, analisis);
  if (jugada) return jugada;
  const deRuta = ruta && responderRuta(texto, ruta);
  if (deRuta) return deRuta;
  if (/deuda|tarjeta|primero|tcea|interes|prestamo/.test(texto)) {
    const deuda = avisos(perfil, analisis).find(a => a.id === "deuda");
    if (!deuda) return "No tienes deudas registradas.";
    const deficit = analisis.proyeccion.deficit;
    const ojo = deficit
      ? ` Ojo: el ${formatoLargo(deficit.fecha)} te faltarán ${formatoSoles(deficit.faltante)}. Hasta cubrir eso, paga solo los mínimos y no adelantes pagos.`
      : "";
    return `${deuda.titulo}. ${deuda.cuerpo}${ojo}`;
  }
  if (ruta && /conviene|recomiend|que hago|producto|opcion|sobra|guardo/.test(texto)) return rutaExplicada(ruta);
  return resumenHablado(perfil, analisis);
}

function solesHablados(_: string, signo: string | undefined, enteros: string, centimos: string | undefined): string {
  const numero = enteros.replace(/,/g, "");
  const unidad = numero === "1" ? "sol" : "soles";
  const resto = centimos && centimos !== "00" ? ` con ${Number(centimos)} céntimos` : "";
  return `${signo ? "menos " : ""}${numero} ${unidad}${resto}`;
}

/** Prepara un texto para leerse en voz alta: montos, porcentajes y siglas dichos como se hablan. */
export function paraVoz(texto: string): string {
  return texto
    .replace(/(-)?S\/\s?(\d[\d,]*)(?:\.(\d{2}))?/g, solesHablados)
    .replace(/(\d+)\.(\d+)\s?%/g, (_, ent: string, dec: string) =>
      Number(dec) === 0 ? `${ent} por ciento` : `${ent} coma ${dec} por ciento`)
    .replace(/(\d+)\s?%/g, "$1 por ciento")
    .replace(/\s*\(TCEA\)/g, "")
    .replace(/\bTCEA\b/g, "tasa de costo anual")
    .replace(/[*#_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
