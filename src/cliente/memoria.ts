/**
 * Memoria del asistente en este equipo: la conversación completa y los pasos de la ruta que la persona marcó
 * como hechos. Se guarda por caso (el ejemplo y el caso propio no se mezclan), solo en este navegador:
 * guardar no envía nada a ningún servidor. Se borra con «Borrar conversación» o al reemplazar el caso propio.
 */
import { EsquemaAccion, type Accion } from "../agente/registro";
import { EsquemaRecibo, type Recibo } from "../datos/anotar";
import { IDS_PASO, type IdPaso } from "../ruta/ruta";

/** Algo que el asistente anotó en el panel con una respuesta, con su recibo para poder deshacerlo más tarde. */
export interface NotaGuardada {
  accion: Accion;
  recibo: Recibo;
  /** La persona ya lo deshizo con el botón. */
  deshecho?: boolean;
}

export interface MensajeGuardado {
  rol: "usuario" | "asistente";
  texto: string;
  /** La respuesta la dio el motor, sin IA. */
  respaldo?: boolean;
  /** Lo anotado con esta respuesta: así «Deshacer» sigue disponible al volver a la conversación. */
  anotado?: NotaGuardada[];
}

/** Tope de anotaciones guardadas por respuesta. */
const MAX_NOTAS = 10;

/** Solo pasan las notas bien formadas: lo guardado puede estar roto o venir de una versión anterior. */
function notasValidas(crudo: unknown): NotaGuardada[] {
  if (!Array.isArray(crudo)) return [];
  const validas: NotaGuardada[] = [];
  for (const item of crudo.slice(0, MAX_NOTAS)) {
    if (typeof item !== "object" || item === null) continue;
    const { accion, recibo, deshecho } = item as Record<string, unknown>;
    const a = EsquemaAccion.safeParse(accion);
    const r = EsquemaRecibo.safeParse(recibo);
    if (a.success && r.success) validas.push(deshecho === true ? { accion: a.data, recibo: r.data, deshecho: true } : { accion: a.data, recibo: r.data });
  }
  return validas;
}

/** Tope de mensajes guardados: al pasarlo se sueltan los más antiguos. */
export const MAX_HISTORIAL = 400;
/** Tope por mensaje, para que un texto enorme no llene el almacenamiento. */
export const MAX_TEXTO_GUARDADO = 12_000;

const claveHistorial = (perfilId: string) => `copiloto-historial:${perfilId}`;
const claveAvances = (perfilId: string) => `copiloto-avances:${perfilId}`;

function limpiar(mensajes: readonly MensajeGuardado[]): MensajeGuardado[] {
  const limpios: MensajeGuardado[] = [];
  for (const m of mensajes) {
    // Una burbuja vacía es una respuesta que no llegó: no es parte de la conversación.
    if (!m.texto.trim()) continue;
    const texto = m.texto.slice(0, MAX_TEXTO_GUARDADO);
    const limpio: MensajeGuardado = m.respaldo ? { rol: m.rol, texto, respaldo: true } : { rol: m.rol, texto };
    const anotado = m.rol === "asistente" ? notasValidas(m.anotado) : [];
    if (anotado.length) limpio.anotado = anotado;
    limpios.push(limpio);
  }
  return limpios.slice(-MAX_HISTORIAL);
}

/** Conversación guardada de un caso. Si no hay nada, o lo guardado está roto, devuelve una lista vacía. */
export function leerHistorial(perfilId: string): MensajeGuardado[] {
  try {
    const crudo = window.localStorage.getItem(claveHistorial(perfilId));
    if (!crudo) return [];
    const lista: unknown = JSON.parse(crudo);
    if (!Array.isArray(lista)) return [];
    const validos: MensajeGuardado[] = [];
    for (const item of lista) {
      if (typeof item !== "object" || item === null) continue;
      const { rol, texto, respaldo, anotado } = item as Record<string, unknown>;
      if ((rol !== "usuario" && rol !== "asistente") || typeof texto !== "string") continue;
      validos.push({ rol, texto, respaldo: respaldo === true, anotado: notasValidas(anotado) });
    }
    return limpiar(validos);
  } catch {
    return [];
  }
}

/** Guarda la conversación completa del caso. Devuelve si quedó guardada (el almacenamiento puede fallar o estar lleno). */
export function guardarHistorial(perfilId: string, mensajes: readonly MensajeGuardado[]): boolean {
  const limpios = limpiar(mensajes);
  try {
    if (limpios.length === 0) window.localStorage.removeItem(claveHistorial(perfilId));
    else window.localStorage.setItem(claveHistorial(perfilId), JSON.stringify(limpios));
    return true;
  } catch {
    return false;
  }
}

export function borrarHistorial(perfilId: string): void {
  try {
    window.localStorage.removeItem(claveHistorial(perfilId));
  } catch {
    // Nada que borrar.
  }
}

const esIdPaso = (v: unknown): v is IdPaso => typeof v === "string" && (IDS_PASO as readonly string[]).includes(v);

/** Pasos de la ruta marcados como hechos. Solo identificadores conocidos, sin repetir. */
export function leerAvances(perfilId: string): IdPaso[] {
  try {
    const crudo = window.localStorage.getItem(claveAvances(perfilId));
    if (!crudo) return [];
    const lista: unknown = JSON.parse(crudo);
    if (!Array.isArray(lista)) return [];
    return [...new Set(lista.filter(esIdPaso))];
  } catch {
    return [];
  }
}

export function guardarAvances(perfilId: string, ids: readonly IdPaso[]): boolean {
  try {
    const unicos = [...new Set(ids.filter(esIdPaso))];
    if (unicos.length === 0) window.localStorage.removeItem(claveAvances(perfilId));
    else window.localStorage.setItem(claveAvances(perfilId), JSON.stringify(unicos));
    return true;
  } catch {
    return false;
  }
}

export function borrarAvances(perfilId: string): void {
  try {
    window.localStorage.removeItem(claveAvances(perfilId));
  } catch {
    // Nada que borrar.
  }
}
