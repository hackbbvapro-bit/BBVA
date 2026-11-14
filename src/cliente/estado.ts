/** Qué piezas externas están activas en el servidor (sin mostrar ninguna clave). */
export interface EstadoServicios { ia: boolean; voz: boolean; push: boolean }

const APAGADO: EstadoServicios = { ia: false, voz: false, push: false };

export async function consultarEstado(): Promise<EstadoServicios> {
  try {
    const respuesta = await fetch("/api/estado", { cache: "no-store" });
    if (!respuesta.ok) return APAGADO;
    const dato = (await respuesta.json()) as Partial<Record<keyof EstadoServicios, unknown>>;
    return { ia: dato.ia === true, voz: dato.voz === true, push: dato.push === true };
  } catch {
    return APAGADO;
  }
}
