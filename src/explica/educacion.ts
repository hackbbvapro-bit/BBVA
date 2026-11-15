/**
 * Educación financiera fija: lo que el copiloto explica sobre tarjetas y deudas.
 * Aquí no hay cifras de mercado: solo reglas generales. Las cifras de cada persona salen del motor
 * (src/motor/minimo.ts). La única cifra normativa, «más de 120 días = Pérdida», está verificada
 * (SBS, boletín 2350); los demás tramos de días no se citan como hecho.
 */

/** Qué pasa si paga solo el mínimo: lo bueno primero, luego el costo, luego cuándo sí conviene. */
export const SI_PAGAS_EL_MINIMO = [
  "Te mantiene al día: no hay atraso, no corre interés moratorio y tu calificación sigue limpia.",
  "No es una salida: buena parte del mínimo se va en intereses y la deuda dura mucho más.",
  "Si este mes es lo único que puedes, págalo igual: es mucho mejor que no pagar.",
] as const;

/**
 * Qué pasa si no paga nada. No se mencionan penalidades ni comisiones por atraso: la Ley 31143
 * las restringiría [SIN VERIFICAR el alcance exacto], así que se habla solo de interés moratorio.
 */
export const SI_NO_PAGAS = [
  "El atraso se reporta a la central de riesgos de la SBS y tu calificación empeora con los días; pasados los 120 días es «Pérdida».",
  "La entidad cobra interés moratorio por los días de atraso, además del interés normal.",
  "Empiezan las llamadas de cobranza y un crédito futuro se vuelve más difícil o más caro.",
  "La entidad puede bloquear la tarjeta para compras nuevas.",
] as const;

/**
 * Si pregunta por mover la fecha de pago de una tarjeta. Verificado en hojas resumen y ayuda de entidades
 * peruanas (nov-2026): donde se permite, el cambio de ciclo depende de la entidad y rige desde el ciclo
 * siguiente, así que no sirve para el pago de este mes. Por eso el copiloto no lo propone como jugada.
 */
export const CAMBIAR_FECHA_DE_PAGO =
  "Cambiar la fecha de pago de una tarjeta depende de BBVA y, donde se puede, rige desde el ciclo siguiente: no sirve para el pago de este mes. Si este mes no te alcanza, paga al menos el mínimo a tiempo o consúltalo en BBVA (web oficial o agencia) ANTES de la fecha para pedir una reprogramación.";

/** Cómo salir, en orden. */
export const PARA_SALIR = [
  "Paga más que el mínimo en cuanto puedas, empezando por la deuda de TCEA más alta.",
  "No hagas compras nuevas con esa tarjeta mientras la pagas.",
  "Si ni el mínimo te alcanza, consúltalo en BBVA (web oficial o agencia) ANTES de la fecha de pago y pide una reprogramación.",
] as const;

export interface Termino {
  termino: string;
  que_es: string;
}

/** Palabras de banco explicadas en simple. */
export const GLOSARIO: readonly Termino[] = [
  { termino: "Pago mínimo", que_es: "Lo menos que puedes pagar para no caer en atraso. Buena parte se va en intereses, así que la deuda baja muy lento." },
  { termino: "Pago total del mes", que_es: "Lo que gastaste en el último ciclo. Si lo pagas completo a tiempo, por lo general esas compras no generan intereses; las cuotas y las disposiciones de efectivo sí." },
  { termino: "TCEA", que_es: "Tasa de costo efectivo anual: lo que te cuesta la deuda en un año, con intereses y cargos incluidos. Sirve para comparar: la más alta es la más cara." },
  { termino: "Disposición de efectivo", que_es: "Sacar plata de la tarjeta. Suele tener una tasa más alta que las compras y cobra intereses desde el primer día." },
  { termino: "Reprogramar", que_es: "Pedir a la entidad nuevas fechas o cuotas. La entidad decide si acepta, y alargar el plazo puede subir el interés total." },
  { termino: "Compra de deuda", que_es: "Que BBVA pague tu deuda y le debas a BBVA. Solo conviene si su TCEA es más baja y no te cobran más en cargos." },
] as const;

/** Advertencia de cómo se calculan las cifras del mínimo. */
export const NOTA_MINIMO =
  "Cálculo del motor con tu saldo y tu tasa, suponiendo un mínimo fijo y sin compras nuevas. En la práctica el mínimo suele bajar con el saldo, así que pagando solo el mínimo la deuda dura todavía más.";
