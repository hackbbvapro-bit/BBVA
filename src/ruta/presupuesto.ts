import { formatoLargo } from "../motor/fechas";
import { formatoSoles, sumar } from "../motor/dinero";
import type { Analisis, Centimos, Perfil } from "../motor/tipos";
import { CATALOGO, type EntradaCatalogo } from "../recomendaciones/catalogo";
import { alMes, type Ruta } from "./ruta";

/**
 * «Tu presupuesto este mes»: qué hacer con lo que queda libre (o de dónde sacar lo que falta), según la ruta de cada
 * persona. Todo sale de los datos y de reglas fijas; la IA no calcula nada. Céntimos enteros de punta a punta.
 */

export interface Partida {
  id: "suscripciones" | "solo-minimos" | "aun-falta" | "hueco" | "colchon" | "deuda" | "uso-credito" | "plazo-largo";
  titulo: string;
  monto: Centimos;
  detalle: string;
}

export interface PlanDelMes {
  /** Lo mismo que ruta.flujo.libre: positivo sobra, negativo falta. */
  libre: Centimos;
  alcanza: boolean;
  titulo: string;
  /**
   * Si alcanza: en qué se reparte lo libre (suman exactamente `libre`).
   * Si no alcanza: palancas para liberar plata cada mes, calculadas con tus datos (no tienen que sumar el hueco).
   */
  partidas: Partida[];
  nota: string;
}

/** Suscripciones al mes, en positivo. */
function suscripcionesAlMes(analisis: Analisis): { monto: Centimos; nombres: string[] } {
  const subs = analisis.recurrentes.filter(r => r.categoria === "suscripciones" && r.monto < 0);
  return { monto: -sumar(subs.map(alMes)), nombres: subs.map(r => r.descripcion) };
}

/** Lo que se libera pagando solo el mínimo en las tarjetas en vez de lo de siempre. */
function holguraDeTarjetas(perfil: Perfil): Centimos {
  return sumar(perfil.deudas.filter(d => d.tipo === "tarjeta").map(d => Math.max(0, d.pagoHabitual - d.pagoMinimo)));
}

function planSinHolgura(perfil: Perfil, analisis: Analisis, libre: Centimos): PlanDelMes {
  const falta = -libre;
  const partidas: Partida[] = [];
  const subs = suscripcionesAlMes(analisis);
  if (subs.monto > 0) {
    partidas.push({
      id: "suscripciones",
      titulo: "Pausar suscripciones",
      monto: subs.monto,
      detalle: `${subs.nombres.join(", ")}. Se pueden retomar cuando el mes cierre en positivo.`,
    });
  }
  const tarjetas = holguraDeTarjetas(perfil);
  if (tarjetas > 0) {
    partidas.push({
      id: "solo-minimos",
      titulo: "Pagar solo el mínimo de tus tarjetas",
      monto: tarjetas,
      detalle: "Te da aire este mes, pero la deuda baja más lento y pagas más intereses. Úsalo solo como puente.",
    });
  }
  const juntas = sumar(partidas.map(p => p.monto));
  if (juntas < falta) {
    partidas.push({
      id: "aun-falta",
      titulo: "Lo que aún faltaría",
      monto: falta - juntas,
      detalle: "Para esto conviene hablar con tu entidad sobre reprogramar una deuda antes de caer en atraso.",
    });
  }
  const nota = falta === 0
    ? "No te sobra nada al mes: cualquier imprevisto te deja en rojo."
    : juntas >= falta
      ? `Con ${partidas.length === 1 ? "esta palanca" : "estas palancas juntas"} cierras el hueco y te quedarían ${formatoSoles(juntas - falta)} al mes.`
      : `Aun usando todo, faltarían ${formatoSoles(falta - juntas)} al mes.`;
  return { libre, alcanza: false, titulo: falta === 0 ? "Este mes no te sobra nada" : `Cada mes te faltan ${formatoSoles(falta)}`, partidas, nota };
}

/** Reparte `libre` en partidas que suman exactamente `libre`. */
function repartir(perfil: Perfil, analisis: Analisis, ruta: Ruta, libre: Centimos): { partidas: Partida[]; nota: string } {
  const { deficit } = analisis.proyeccion;
  const c = ruta.colchon;
  if (ruta.id === "estar_en_verde" || ruta.id === "salir_deudas") {
    if (deficit) {
      const hueco = Math.min(libre, deficit.faltanteMaximo);
      const partidas: Partida[] = [{
        id: "hueco",
        titulo: `Guardar para el ${formatoLargo(deficit.fecha)}`,
        monto: hueco,
        detalle: "Es lo que te faltaría ese día. Sepáralo apenas cobres.",
      }];
      if (libre > hueco) partidas.push({ id: "colchon", titulo: "Empezar tu colchón", monto: libre - hueco, detalle: "Lo que sobra después de tapar el hueco, aparte del dinero del día a día." });
      return { partidas, nota: "Mientras haya un día en rojo, nada extra va a las deudas: primero el hueco." };
    }
    const primera = analisis.deudas?.primera ?? perfil.deudas[0] ?? null;
    if (primera) {
      return {
        partidas: [{ id: "deuda", titulo: `Adelantar ${primera.nombre}`, monto: libre, detalle: "Es tu deuda más cara: cada sol que adelantas deja de generar intereses." }],
        nota: "Paga el mínimo de las demás y pon todo lo libre en la más cara.",
      };
    }
    return { partidas: [{ id: "colchon", titulo: "Empezar tu colchón", monto: libre, detalle: "Aparte del dinero del día a día." }], nota: "Primero un colchón; después, lo demás." };
  }
  if (ruta.id === "construir_historial") {
    // Regla del copiloto (no de una entidad): usar como máximo la mitad de lo libre, para pagar siempre el total.
    const uso = Math.floor(libre / 2);
    return {
      partidas: [
        { id: "uso-credito", titulo: "Tope para usar tu primer crédito", monto: uso, detalle: "Úsalo hasta ahí y paga el total antes del vencimiento: así no pagas intereses." },
        { id: "colchon", titulo: "A tu colchón", monto: libre - uso, detalle: "Para que un imprevisto no te obligue a usar el crédito." },
      ],
      nota: "Regla del copiloto: usa como máximo la mitad de lo que te sobra, para que siempre puedas pagar el total.",
    };
  }
  if (ruta.id === "ahorrar") return {
    partidas: [{ id: "colchon", titulo: "Ahorro y colchón", monto: libre, detalle: c.falta > 0 ? `Para tu colchón faltan ${formatoSoles(c.falta)}; conserva el ahorro disponible para tus metas.` : "Tu colchón ya está completo; este ahorro queda para tus metas." }],
    nota: "Separa el ahorro al cobrar y mantenlo disponible.",
  };
  // hacer_crecer
  if (c.falta > 0) {
    const alColchon = Math.min(libre, c.falta);
    const partidas: Partida[] = [{
      id: "colchon",
      titulo: "Completar tu colchón",
      monto: alColchon,
      detalle: c.mesesParaCompletar ? `Te faltan ${formatoSoles(c.falta)}: a este ritmo llegas en ${c.mesesParaCompletar === 1 ? "un mes" : `${c.mesesParaCompletar} meses`}.` : `Te faltan ${formatoSoles(c.falta)}.`,
    }];
    if (libre > alColchon) partidas.push({ id: "plazo-largo", titulo: "A plazo más largo", monto: libre - alColchon, detalle: "Lo que pasa del colchón: plata que no vas a necesitar pronto." });
    return { partidas, nota: "Primero el colchón completo; después, plazo largo." };
  }
  return {
    partidas: [{ id: "plazo-largo", titulo: "A plazo más largo", monto: libre, detalle: "Tu colchón ya está completo: compara alternativas por plazo y por riesgo." }],
    nota: "No toques el colchón salvo emergencia.",
  };
}

export function planDelMes(perfil: Perfil, analisis: Analisis, ruta: Ruta): PlanDelMes {
  const libre = ruta.flujo.libre;
  if (libre <= 0) return planSinHolgura(perfil, analisis, libre);
  const { partidas, nota } = repartir(perfil, analisis, ruta, libre);
  return { libre, alcanza: true, titulo: `Cada mes te quedan ${formatoSoles(libre)}`, partidas, nota };
}

/** Un tipo de producto para la ruta de la persona: ahora o más adelante, con qué preguntar en el banco. */
export interface ProductoDeRuta {
  entrada: EntradaCatalogo;
  porQue: string;
  cuando: "ahora" | "despues";
  /** Qué preguntar en el banco antes de contratar. Genérico: sin tasas ni entidades. */
  preguntas: readonly string[];
}

export const PREGUNTAS: Record<EntradaCatalogo["id"], readonly string[]> = {
  "tarjeta-con-garantia": [
    "¿Cuánto depósito piden y cuándo me lo devuelven?",
    "¿Cuál es la TCEA y si cobran membresía?",
    "¿En cuánto tiempo puedo pasar a una tarjeta sin garantía?",
  ],
  "tarjeta-inicio": [
    "¿Qué requisitos piden si es mi primera tarjeta?",
    "¿Cuál es la TCEA y qué comisiones cobra?",
    "¿Puedo empezar con una línea baja?",
  ],
  reprogramar: [
    "¿Qué opciones tengo: reprogramar, refinanciar o comprar la deuda?",
    "¿Cuánto pagaría en total con cada una, intereses incluidos?",
    "¿Cómo queda mi calificación en la central de riesgos?",
  ],
  "cuenta-de-ahorro": [
    "¿Cobra mantenimiento o comisión por retiro?",
    "¿Qué rendimiento paga (TREA)?",
    "¿Puedo tenerla separada de mi cuenta del día a día?",
  ],
  "deposito-a-plazo": [
    "¿Qué rendimiento paga (TREA) según el plazo?",
    "¿Qué pasa si necesito retirar antes?",
    "¿Cuál es el monto mínimo?",
  ],
  "fondo-mutuo": [
    "¿Qué nivel de riesgo tiene y en qué invierte?",
    "¿Qué comisiones cobra al entrar, al salir y por administración?",
    "¿Cuánto tiempo conviene quedarse como mínimo?",
  ],
};

const entrada = (id: EntradaCatalogo["id"]) => CATALOGO.find(e => e.id === id)!;

/**
 * Los productos que se muestran en «Mi ruta»: las alternativas que ya decidió el motor (ruta.alternativas, «ahora»)
 * más las que vienen después en la misma ruta («más adelante»). Tipos genéricos: sin entidades, tasas ni rendimientos.
 */
export function productosDeLaRuta(ruta: Ruta): ProductoDeRuta[] {
  const ahora: ProductoDeRuta[] = ruta.alternativas.map(a => ({ entrada: a.entrada, porQue: a.porQue, cuando: "ahora", preguntas: PREGUNTAS[a.entrada.id] }));
  const tiene = (id: EntradaCatalogo["id"]) => ruta.alternativas.some(a => a.entrada.id === id);
  const despues: ProductoDeRuta[] = [];
  const luego = (id: EntradaCatalogo["id"], porQue: string) => {
    if (!tiene(id)) despues.push({ entrada: entrada(id), porQue, cuando: "despues", preguntas: PREGUNTAS[id] });
  };
  if (ruta.id === "estar_en_verde") luego("cuenta-de-ahorro", "Cuando el mes cierre en positivo, para guardar tu colchón aparte.");
  if (ruta.id === "construir_historial") luego("cuenta-de-ahorro", "Para tu colchón, mientras construyes historial.");
  if (ruta.id === "hacer_crecer") luego("fondo-mutuo", "Solo cuando completes tu colchón: su valor sube y baja.");
  return [...ahora, ...despues];
}
