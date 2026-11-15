/**
 * Criterio del equipo para orientar sobre productos de BBVA: cuándo un producto tiene sentido y cuándo no, y qué
 * situación de la persona lo vuelve pertinente («señales»). NO son datos de BBVA: las cifras siguen saliendo solo de
 * productos.json, copiado de la web oficial. Este archivo no contiene montos, tasas ni fechas: solo reglas de prudencia.
 *
 * Origen: guía editorial del equipo (productos-bbva.pdf, 2026-11-14), revisada contra el catálogo oficial. Las reglas de
 * prudencia que usa: sin señal no hay recomendación; con un día en rojo no se ofrecen seguros, membresías, inversiones ni
 * crédito de consumo nuevo; todo crédito está sujeto a evaluación del banco; se compara por TCEA o TREA, no por la cuota.
 */
import type { Familia, ProductoBbva } from "./catalogo";

/** Situaciones que vuelven pertinente un producto. Las calcula el motor salvo las «dichas», que solo la persona sabe. */
export const SENALES = [
  "deficit_proyectado", "deuda_cara", "sin_historial", "atraso", "sin_colchon", "excedente_estable", "ingreso_variable",
  "sin_planilla", "cobra_sueldo_bbva", "meta_vivienda", "meta_vehiculo", "meta_estudios",
] as const;
export type Senal = (typeof SENALES)[number];

/** Lo que el motor no puede deducir de los movimientos: solo cuenta si la persona lo dijo en la conversación. */
export const SENALES_DICHAS = ["cobra_sueldo_bbva", "meta_vivienda", "meta_vehiculo", "meta_estudios"] as const;
export type SenalDicha = (typeof SENALES_DICHAS)[number];
export const esDicha = (s: Senal): s is SenalDicha => (SENALES_DICHAS as readonly Senal[]).includes(s);

export const SIGNIFICADO: Record<Senal, string> = {
  deficit_proyectado: "su saldo proyectado cae bajo cero en los próximos días",
  deuda_cara: "tiene deuda de tarjeta de crédito, que suele ser la más cara",
  sin_historial: "nunca tuvo tarjeta ni préstamo, así que no tiene historial crediticio",
  atraso: "tiene una deuda con días de atraso",
  sin_colchon: "su saldo no cubre ni un mes de sus gastos",
  excedente_estable: "le sobra plata cada mes, ya tiene su colchón de tres meses y no tiene deuda cara ni déficit",
  ingreso_variable: "sus ingresos no son fijos (independiente o mixto)",
  sin_planilla: "trabaja como independiente: no cobra un sueldo de planilla",
  cobra_sueldo_bbva: "dijo que cobra su sueldo en BBVA",
  meta_vivienda: "dijo que quiere comprar vivienda",
  meta_vehiculo: "dijo que quiere comprar un auto",
  meta_estudios: "dijo que quiere financiar estudios",
};

export interface Criterio {
  /** Señales que vuelven pertinente el producto. Vacío = no se propone por iniciativa propia. */
  senales: readonly Senal[];
  cuando_si: string;
  cuando_no: string;
  /** Solo se explica si la persona lo pide; nunca se propone. */
  solo_informar?: true;
  /** Señales que hacen que el producto no aplique a esta persona, por más que otras encajen. */
  no_aplica_si?: readonly Senal[];
}

const pagaTotal = "Si pagas el total de tu estado de cuenta cada mes, antes del vencimiento.";
const tarjetaGenerica: Criterio = {
  senales: [],
  cuando_si: pagaTotal,
  cuando_no: "Si piensas pagar solo el mínimo o en cuotas, o tienes un día en rojo: los intereses de tarjeta son de los más caros.",
};
const premium = (extra: string): Criterio => ({
  senales: [],
  cuando_si: `Si tienes ingresos altos, ${extra} y pagas el total cada mes.`,
  cuando_no: "Si tienes un día en rojo o deudas: la membresía y los intereses se comen los beneficios.",
});
const compraDeDeuda: Criterio = {
  senales: ["deuda_cara"],
  cuando_si: "Si tienes deuda de tarjeta en otro banco con una TCEA más alta: compara las dos TCEA antes de decidir.",
  cuando_no: "Si vas a seguir usando la tarjeta que liberas: terminarías con dos deudas en vez de una.",
};
const hipotecario: Criterio = {
  senales: ["meta_vivienda"],
  cuando_si: "Si tienes la meta de comprar vivienda y ya tienes tu colchón: compara ofertas por TCEA, no por la cuota.",
  cuando_no: "Con un día en rojo o sin colchón. El asistente explica requisitos, no simula cuotas de hipoteca.",
};
const bonoEstado = (paraQuien: string): Criterio => ({
  senales: ["meta_vivienda"],
  cuando_si: paraQuien,
  cuando_no: "Si tú o tu familia ya recibieron antes apoyo habitacional del Estado, o con un día en rojo.",
});
const rentaCorta: Criterio = {
  senales: ["excedente_estable"],
  cuando_si: "Para plata que te sobra y que quizá necesites pronto.",
  cuando_no: "Como tu único colchón, o con un día en rojo: un fondo puede bajar de valor y no lo cubre el Fondo de Seguro de Depósitos.",
};
const cash: Criterio = {
  senales: ["excedente_estable"],
  cuando_si: "Para tener liquidez, sabiendo que un fondo mutuo no lo cubre el Fondo de Seguro de Depósitos.",
  cuando_no: "Con un día en rojo o sin colchón.",
};

const POR_ID: Record<string, Criterio> = {
  "cuenta-digital": {
    senales: ["sin_colchon", "ingreso_variable"],
    cuando_si: "Para separar tu colchón de la plata del día a día sin pagar mantenimiento.",
    cuando_no: "Si buscas que tu plata gane intereses: sirve para guardar y mover, no para rendir.",
  },
  "cuenta-sueldo": {
    senales: ["cobra_sueldo_bbva"],
    cuando_si: "Si tu empleador te paga el sueldo por BBVA: abre la puerta al adelanto de sueldo y a tasas preferentes en préstamos.",
    cuando_no: "Si eres independiente o tu sueldo llega por otro banco.",
    no_aplica_si: ["sin_planilla"],
  },
  "cuenta-independencia": {
    senales: ["ingreso_variable", "sin_colchon"],
    cuando_si: "Si tus ingresos son irregulares y haces muchas operaciones al mes.",
    cuando_no: "Si tu saldo suele bajar del mínimo que pide la web para no cobrar mantenimiento.",
  },
  "cuenta-ganadora": {
    senales: ["excedente_estable"],
    cuando_si: "Si mantienes un saldo alto y estable todo el mes.",
    cuando_no: "Si tu saldo puede bajar del mínimo que pide la web: pagarías mantenimiento. Un sorteo no es un rendimiento asegurado.",
  },
  "cuenta-vip": {
    senales: ["excedente_estable"],
    cuando_si: "Solo con saldos altos y estables: la web pide un monto mínimo de apertura.",
    cuando_no: "Para la mayoría de personas: una cuenta sin monto mínimo cumple lo mismo.",
  },
  "cuenta-cts": {
    senales: [],
    cuando_si: "Para explicar cómo funciona tu CTS si la persona pregunta.",
    cuando_no: "El asistente no recomienda dónde depositar la CTS: esa elección es de la persona.",
    solo_informar: true,
  },
  "visa-cero": {
    senales: [],
    cuando_si: `${pagaTotal} No paga membresía.`,
    cuando_no: "Si vas a pagar en cuotas o solo el mínimo: mira su TCEA en las cifras oficiales, es muy alta y la deuda crece rápido.",
  },
  "visa-platinum": {
    senales: [],
    cuando_si: "Si gastas lo suficiente para que la membresía salga gratis y pagas el total cada mes.",
    cuando_no: "Si solo pagas el mínimo: los intereses y la membresía se comen los puntos.",
  },
  "visa-signature": premium("viajas"),
  "mastercard-black": premium("viajas"),
  "visa-infinite": {
    senales: [],
    cuando_si: "Solo para explicarla si la piden: pide ingresos muy altos.",
    cuando_no: "No se propone por iniciativa propia.",
    solo_informar: true,
  },
  "tarjeta-start": {
    senales: ["sin_historial", "atraso"],
    cuando_si: "Para construir o reconstruir tu historial: tu propio depósito respalda la línea.",
    cuando_no: "Si el depósito sale de tu colchón o tienes un día en rojo.",
  },
  "compra-de-deuda": compraDeDeuda,
  "prestamo-compra-de-deuda": compraDeDeuda,
  "prestamo-al-toque": {
    senales: ["deuda_cara"],
    cuando_si: "Para juntar deudas de tarjeta más caras en una sola cuota, si esa cuota entra en tu mes: compara por TCEA.",
    cuando_no: "Para tapar un déficit que se repite cada mes: solo lo agranda.",
  },
  "prestamo-libre-disponibilidad-basico": {
    senales: [],
    cuando_si: "Solo para explicarlo si lo piden.",
    cuando_no: "No incluye seguro de desgravamen: no se propone por iniciativa propia.",
    solo_informar: true,
  },
  "adelanto-de-sueldo": {
    senales: ["deficit_proyectado", "cobra_sueldo_bbva"],
    cuando_si: "Para un hueco puntual de pocos días, si cobras tu sueldo en BBVA: compara su comisión con las jugadas del motor.",
    cuando_no: "Si el déficit se repite cada mes: el adelanto solo lo corre al mes siguiente. No aplica a independientes.",
    no_aplica_si: ["sin_planilla"],
  },
  "prestamo-garantia-liquida": {
    senales: ["sin_historial"],
    cuando_si: "Para construir historial sin romper tus ahorros.",
    cuando_no: "Si esa plata es tu único colchón.",
  },
  "credito-estudios": {
    senales: ["meta_estudios"],
    cuando_si: "Si tienes la meta de estudiar y la cuota entra en tu mes.",
    cuando_no: "Con un día en rojo.",
  },
  "credito-hipotecario-bbva": hipotecario,
  "construyo": hipotecario,
  "hipotecario-verde": hipotecario,
  "mivivienda-bbva": bonoEstado("Para una primera vivienda de valor medio, con el bono del Estado."),
  "mivivienda-verde-bbva": bonoEstado("Para una primera vivienda sostenible de valor medio, con el bono del Estado."),
  "techo-propio-bbva": bonoEstado("Para familias de ingresos bajos que califican al bono del Estado."),
  "credito-vehicular": {
    senales: ["meta_vehiculo"],
    cuando_si: "Si tienes la meta de comprar un auto y la cuota entra en tu mes.",
    cuando_no: "Con un día en rojo.",
  },
  "deposito-a-plazo": {
    senales: ["excedente_estable"],
    cuando_si: "Si ya tienes tu colchón y te sobra plata que no vas a tocar durante el plazo.",
    cuando_no: "Con un día en rojo o sin colchón: sacarla antes de tiempo puede costarte.",
  },
  "bbva-renta-corto-plazo-soles-fmiv": rentaCorta,
  "bbva-renta-corto-plazo-dolares-fmiv": rentaCorta,
  "bbva-cash-soles-fmiv": cash,
  "bbva-cash-dolares-fmiv": cash,
  "smart-deposit-prime-estructurado": {
    senales: [],
    cuando_si: "Solo para explicarlo si lo piden.",
    cuando_no: "No se propone por iniciativa propia: su rentabilidad variable no está garantizada.",
    solo_informar: true,
  },
  "bbva-bolsa": {
    senales: [],
    cuando_si: "Solo para explicarlo si lo piden.",
    cuando_no: "No se propone por iniciativa propia: invertir en bolsa puede hacerte perder parte de lo invertido.",
    solo_informar: true,
  },
};

const FONDO: Criterio = {
  senales: ["excedente_estable"],
  cuando_si: "Solo con tu colchón completo, sin deudas caras y después del test de perfil de inversionista del banco.",
  cuando_no: "Con un día en rojo, sin colchón o con deuda cara. El asistente no elige el fondo por ti.",
};
const SEGURO: Criterio = {
  senales: [],
  cuando_si: "Solo para explicar sus coberturas cuando la persona lo pide.",
  cuando_no: "Nunca con un día en rojo. El asistente no ofrece seguros por iniciativa propia.",
  solo_informar: true,
};

/** El criterio de un producto: el suyo propio, o el de su familia; null si el equipo no tiene criterio para él. */
export function criterioDe(p: ProductoBbva): Criterio | null {
  if (POR_ID[p.id]) return POR_ID[p.id];
  if (p.familia === "seguros") return SEGURO;
  if (p.familia === "inversiones" && p.subfamilia.startsWith("fondo-")) return FONDO;
  if (p.familia === "tarjetas_credito" && p.subfamilia === "credito") return tarjetaGenerica;
  return null;
}

/** Ids con criterio propio, para comprobar en las pruebas que todos existen en el catálogo. */
export const IDS_CON_CRITERIO = Object.keys(POR_ID);

/** Con un día en rojo solo se habla de liquidez: nada de seguros, membresías, inversiones ni crédito de consumo nuevo. */
const PERMITIDOS_CON_DEFICIT = new Set(["adelanto-de-sueldo", "compra-de-deuda", "prestamo-compra-de-deuda"]);
const FAMILIAS_EN_PAUSA: ReadonlySet<Familia> = new Set(["seguros", "inversiones", "tarjetas_credito", "prestamos", "vivienda_y_auto"]);

export function enPausaConDeficit(p: ProductoBbva): boolean {
  return FAMILIAS_EN_PAUSA.has(p.familia) && !PERMITIDOS_CON_DEFICIT.has(p.id);
}

/** Avisos que acompañan a cada ficha según su tipo. Sin cifras: el tope del fondo de depósitos cambia cada trimestre. */
export function avisosDe(p: ProductoBbva): string[] {
  const avisos: string[] = [];
  const esCredito = (p.familia === "tarjetas_credito" && p.subfamilia.startsWith("credito"))
    || p.familia === "prestamos" || p.familia === "vivienda_y_auto";
  if (esCredito) avisos.push("Sujeto a evaluación crediticia del banco: nadie puede prometer la aprobación. Compara por TCEA, no solo por la cuota.");
  if (p.familia === "inversiones" && p.subfamilia.startsWith("fondo-")) {
    avisos.push("Un fondo mutuo puede subir o bajar de valor y no lo cubre el Fondo de Seguro de Depósitos. El perfil de inversionista lo define el test del banco.");
  }
  const esDeposito = (p.familia === "cuentas" && p.subfamilia.startsWith("Cuentas"))
    || (p.familia === "inversiones" && p.subfamilia === "deposito");
  if (esDeposito) {
    avisos.push("Los depósitos están cubiertos por el Fondo de Seguro de Depósitos hasta un tope que se reajusta cada trimestre (consulta fsd.org.pe). Compara por TREA.");
  }
  return avisos;
}

export interface Encaje {
  cuando_si?: string;
  cuando_no?: string;
  solo_informar?: true;
  /** Señales de la persona que vuelven pertinente este producto (calculadas por el motor o dichas por ella). */
  encaja_con_tu_situacion?: string[];
  /** Señales que solo la persona puede confirmar y que este producto necesita (p. ej. cobrar el sueldo en BBVA). */
  falta_confirmar?: string[];
  /** Freno de prudencia: con un día en rojo este producto no se ofrece. */
  freno?: string;
  /** Por qué este producto no aplica a la persona (p. ej. pide sueldo de planilla y es independiente). */
  no_aplica?: string[];
}

export const FRENO_DEFICIT =
  "Hoy su proyección tiene un día en rojo: no le ofrezcas este producto. Primero hay que tapar ese hueco con las jugadas del motor; de BBVA, solo el adelanto de sueldo (si cobra en BBVA) o la compra de deuda, comparando su costo.";

/** Cruza un producto con las señales de la persona. Puro: no decide nada que no esté escrito en el criterio. */
export function encajeDe(p: ProductoBbva, senales: ReadonlySet<Senal>): Encaje {
  const c = criterioDe(p);
  const freno = senales.has("deficit_proyectado") && enPausaConDeficit(p) ? { freno: FRENO_DEFICIT } : {};
  if (!c) return freno;
  const noAplica = (c.no_aplica_si ?? []).filter(s => senales.has(s));
  const encaja = c.solo_informar || noAplica.length ? [] : c.senales.filter(s => senales.has(s));
  const falta = encaja.length > 0 ? c.senales.filter(s => esDicha(s) && !senales.has(s)) : [];
  return {
    cuando_si: c.cuando_si,
    cuando_no: c.cuando_no,
    ...(c.solo_informar ? { solo_informar: true as const } : {}),
    ...(encaja.length ? { encaja_con_tu_situacion: encaja.map(s => SIGNIFICADO[s]) } : {}),
    ...(falta.length ? { falta_confirmar: falta.map(s => SIGNIFICADO[s].replace(/^dijo que /, "")) } : {}),
    ...(noAplica.length ? { no_aplica: noAplica.map(s => SIGNIFICADO[s]) } : {}),
    ...freno,
  };
}

/** Una señal detectada en la situación de la persona, con el porqué escrito por el código (sin inventar cifras). */
export interface SenalDetectada {
  senal: Senal;
  por_que: string;
}

/** Reglas que acompañan cualquier respuesta del catálogo cuando hay situación de la persona. */
export const REGLAS_ORIENTACION = [
  "Recomienda solo productos con «encaja_con_tu_situacion»; los demás, descríbelos si los piden, sin empujarlos.",
  "Si un producto trae «freno», dilo antes que nada y no lo ofrezcas.",
  "Si trae «falta_confirmar», pregúntalo antes de darlo por pertinente; si trae «no_aplica», dile por qué no es para su caso.",
  "Lee siempre «cuando_no» junto a «cuando_si»; los «avisos» van tal cual.",
  "Compara créditos por TCEA y ahorros por TREA, nunca solo por la cuota.",
] as const;

export const MAX_PARA_TU_SITUACION = 6;

/** Productos que el criterio propone para estas señales: con encaje, sin freno y no «solo informar», los de más encajes primero. */
export function paraTuSituacion(productos: readonly ProductoBbva[], senales: ReadonlySet<Senal>) {
  return productos
    .map(p => ({ p, e: encajeDe(p, senales) }))
    .filter(({ e }) => (e.encaja_con_tu_situacion?.length ?? 0) > 0 && !e.freno && !e.solo_informar)
    .sort((a, b) => (b.e.encaja_con_tu_situacion?.length ?? 0) - (a.e.encaja_con_tu_situacion?.length ?? 0))
    .slice(0, MAX_PARA_TU_SITUACION)
    .map(({ p, e }) => ({
      nombre: p.nombre,
      por_que: e.encaja_con_tu_situacion,
      ...(e.falta_confirmar ? { falta_confirmar: e.falta_confirmar } : {}),
    }));
}
