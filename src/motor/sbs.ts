/**
 * Calificación del deudor según los días de atraso (créditos de consumo, SBS Perú).
 *
 * Regla de honestidad: solo se presenta como oficial lo que tiene fuente.
 * - Dudoso (61-120 días) y Pérdida (más de 120 días) los respalda el boletín SBS:
 *   https://www.sbs.gob.pe/boletin/detalleboletin/idbulletin/2350
 * - Normal (hasta 8 días), CPP (9-30) y Deficiente (31-60) son [SIN VERIFICAR]:
 *   las guías consultadas difieren y no hay una fuente oficial confirmada.
 *   Se usan como referencia para ordenar prioridades, nunca como dato oficial.
 */

export type Calificacion = "normal" | "cpp" | "deficiente" | "dudoso" | "perdida";

export const ETIQUETA_CALIFICACION: Record<Calificacion, string> = {
  normal: "Normal",
  cpp: "Con problemas potenciales (CPP)",
  deficiente: "Deficiente",
  dudoso: "Dudoso",
  perdida: "Pérdida",
};

export interface RangoAtraso {
  /** Primer día de atraso del tramo (inclusive). */
  desde: number;
  /** Último día de atraso del tramo (inclusive). null = sin tope. */
  hasta: number | null;
  /** true solo si el rango está respaldado por una fuente oficial. */
  verificado: boolean;
  fuente: string;
}

const FUENTE_BOLETIN = "SBS, boletín https://www.sbs.gob.pe/boletin/detalleboletin/idbulletin/2350";
const SIN_VERIFICAR = "[SIN VERIFICAR] Referencia de guías que difieren entre sí; falta confirmar con la SBS.";

/** Orden de menor a mayor gravedad. */
const ORDEN: readonly Calificacion[] = ["normal", "cpp", "deficiente", "dudoso", "perdida"];

export const RANGOS_ATRASO: Record<Calificacion, RangoAtraso> = {
  // [SIN VERIFICAR] Normal: 0-8 días
  normal: { desde: 0, hasta: 8, verificado: false, fuente: SIN_VERIFICAR },
  // [SIN VERIFICAR] CPP: 9-30 días
  cpp: { desde: 9, hasta: 30, verificado: false, fuente: SIN_VERIFICAR },
  // [SIN VERIFICAR] Deficiente: 31-60 días
  deficiente: { desde: 31, hasta: 60, verificado: false, fuente: SIN_VERIFICAR },
  // Verificado (boletín SBS): Dudoso 61-120 días
  dudoso: { desde: 61, hasta: 120, verificado: true, fuente: FUENTE_BOLETIN },
  // Verificado (boletín SBS): Pérdida más de 120 días
  perdida: { desde: 121, hasta: null, verificado: true, fuente: FUENTE_BOLETIN },
};

function exigirDias(diasAtraso: number): number {
  if (!Number.isSafeInteger(diasAtraso)) {
    throw new Error(`Los días de atraso deben ser un entero, llegó: ${diasAtraso}`);
  }
  return Math.max(0, diasAtraso);
}

export function calificacionPorAtraso(diasAtraso: number): Calificacion {
  const dias = exigirDias(diasAtraso);
  for (const c of ORDEN) {
    const { hasta } = RANGOS_ATRASO[c];
    if (hasta === null || dias <= hasta) return c;
  }
  return "perdida";
}

/** La calificación que sigue (peor) a la dada; null si ya es Pérdida. */
export function siguienteCalificacion(c: Calificacion): Calificacion | null {
  return ORDEN[ORDEN.indexOf(c) + 1] ?? null;
}

/**
 * Días que faltan para cruzar al siguiente tramo (más grave).
 * Ej.: con 5 días de atraso faltan 4 para llegar a 9 (CPP). null si ya es Pérdida.
 */
export function diasParaEmpeorar(diasAtraso: number): number | null {
  const dias = exigirDias(diasAtraso);
  const { hasta } = RANGOS_ATRASO[calificacionPorAtraso(dias)];
  return hasta === null ? null : hasta + 1 - dias;
}
