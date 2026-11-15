import { IDS_RUTA, type IdRuta } from "@/ruta/ruta";

/**
 * Lo que la persona contó en la entrada y no está en sus datos: si alguna vez tuvo crédito y si aceptó
 * usar IA y voz con su caso. Se guarda solo en este navegador y se borra al cambiar de caso.
 */
export interface Situacion {
  tuvoCredito: boolean;
  /** Dijo en la entrada que no tiene deudas: la guía de primeros pasos no le pide agregarlas. */
  sinDeudas: boolean;
  /** Aceptó expresamente que su caso inventado viaje a servicios externos de IA y de voz. */
  externo: boolean;
  /** Lo que dijo querer lograr primero en la entrada. */
  meta?: IdRuta;
  /** Ruta que eligió después en Mi ruta. Manda sobre la meta; sin ninguna de las dos, la recomendada. */
  rutaElegida?: IdRuta;
}

const esIdRuta = (v: unknown): v is IdRuta => typeof v === "string" && (IDS_RUTA as readonly string[]).includes(v);

const CLAVE = "copiloto-situacion";
export const SIN_SITUACION: Situacion = { tuvoCredito: false, sinDeudas: false, externo: false };

/** Sin permiso guardado (o si el almacenamiento falla) la respuesta es siempre la cerrada. */
export function leerSituacion(): Situacion {
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return SIN_SITUACION;
    const v = JSON.parse(crudo) as Partial<Situacion> | null;
    return {
      tuvoCredito: v?.tuvoCredito === true, sinDeudas: v?.sinDeudas === true, externo: v?.externo === true,
      ...(esIdRuta(v?.meta) && { meta: v.meta }),
      ...(esIdRuta(v?.rutaElegida) && { rutaElegida: v.rutaElegida }),
    };
  } catch {
    return SIN_SITUACION;
  }
}

export function guardarSituacion(s: Situacion): void {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify({ tuvoCredito: s.tuvoCredito, sinDeudas: s.sinDeudas, externo: s.externo, meta: s.meta, rutaElegida: s.rutaElegida }));
  } catch {
    // Sin almacenamiento, el permiso dura solo esta visita.
  }
}

export function borrarSituacion(): void {
  try {
    window.localStorage.removeItem(CLAVE);
  } catch {
    // Nada que borrar.
  }
}
