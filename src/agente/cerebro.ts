/**
 * Elige con qué modelo y cuánto esfuerzo responde el asistente, según lo que pregunta la persona.
 * Lo decide el código en microsegundos (no otra llamada a la IA, que sumaría espera y costo):
 * - rápido: anotar, consultar un dato, un «¿me alcanza?». El modelo base con poco esfuerzo.
 * - pensado: pide consejo o un porqué. El modelo base pensando más.
 * - profundo: armar un plan, comparar escenarios, varias metas y montos a la vez. El modelo más capaz.
 */
import { modeloAnthropic, modeloProfundo } from "../servidor/entorno";

export type Nivel = "rapido" | "pensado" | "profundo";
export type Esfuerzo = "low" | "medium" | "high";

export interface Cerebro {
  nivel: Nivel;
  modelo: string;
  esfuerzo: Esfuerzo;
  /** Tope de tokens de la respuesta (incluye lo que el modelo piensa). */
  maximoTokens: number;
}

const sinTildes = (texto: string) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[¿?¡!.,;:()«»"]/g, " ").replace(/\s+/g, " ");

/** Pedidos que de verdad necesitan razonar varios pasos: un plan, comparar, priorizar, metas a meses. */
const PROFUNDO =
  /(^| )((arma|armame|haz|hazme|dame|necesito|quiero|traza|trazame) (un |mi )?plan|plan (para|de ahorro|de pagos)|planifica\w*|planea\w*|estrategia|compara\w*|analiza\w*|escenario\w*|a largo plazo|paso a paso|prioriz\w*|refinanci\w*|consolid\w*|salir de (mis |las |todas mis )?deudas|ahorrar para|meta de ahorro|en \d+ (meses|anos)|en (un|dos|tres|seis) (meses|anos)|proximo ano|que me conviene mas|cual me conviene|vale la pena|organiza\w*)( |$)/;
/** Pide consejo o el porqué: conviene pensar un poco más, sin cambiar de modelo. */
const PENSADO =
  /(^| )(por que|que hago|que puedo hacer|que me recomiendas|recomienda\w*|conviene|deberia|explica\w*|ayudame|como hago|como puedo|como le hago|que opinas|me sugieres)( |$)/;

/** Puntaje de complejidad de la última pregunta: 0 es un dato o un registro; 3 o más, un análisis. */
export function complejidad(pregunta: string): number {
  const t = sinTildes(pregunta).trim();
  let puntos = 0;
  // Un pedido de plan, comparación o estrategia ya basta para el modelo más capaz.
  if (PROFUNDO.test(` ${t} `)) puntos += 3;
  if (PENSADO.test(` ${t} `)) puntos += 1;
  if (t.length > 400) puntos += 2;
  else if (t.length > 180) puntos += 1;
  if ((t.match(/\d+/g) ?? []).length >= 3) puntos += 1;
  if ((pregunta.match(/\?/g) ?? []).length >= 2) puntos += 1;
  return puntos;
}

export function nivelDe(pregunta: string): Nivel {
  const puntos = complejidad(pregunta);
  if (puntos >= 3) return "profundo";
  if (puntos >= 1) return "pensado";
  return "rapido";
}

export function elegirCerebro(pregunta: string): Cerebro {
  const nivel = nivelDe(pregunta);
  if (nivel === "profundo") return { nivel, modelo: modeloProfundo(), esfuerzo: "medium", maximoTokens: 6000 };
  if (nivel === "pensado") return { nivel, modelo: modeloAnthropic(), esfuerzo: "medium", maximoTokens: 4096 };
  return { nivel, modelo: modeloAnthropic(), esfuerzo: "low", maximoTokens: 2048 };
}

/** Si el modelo profundo falla antes de decir nada, se responde con el base pensando más. */
export function cerebroDeRespaldo(cerebro: Cerebro): Cerebro | undefined {
  const base = modeloAnthropic();
  if (cerebro.modelo === base) return undefined;
  return { nivel: "pensado", modelo: base, esfuerzo: "medium", maximoTokens: 4096 };
}

/** «claude-opus-5-5» → «Opus 5.5». Para mostrar en pantalla qué modelo respondió. */
export function nombreModelo(id: string): string {
  const m = /^claude-([a-z]+)-(\d+)(?:-(\d+))?/.exec(id);
  if (!m) return id;
  return `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]}${m[3] ? `.${m[3]}` : ""}`;
}

const NIVELES: Record<Nivel, string> = { rapido: "respuesta rápida", pensado: "pensó más", profundo: "análisis profundo" };

export function etiquetaCerebro(cerebro: Cerebro): string {
  return `${nombreModelo(cerebro.modelo)} · ${NIVELES[cerebro.nivel]}`;
}
