import { formatoLargo, formatoSoles, type Deficit } from "../motor";

/**
 * El primer día en rojo no siempre es el peor: si después el hueco crece, se dice hasta dónde llega.
 * La usan el aviso, la franja de Inicio y Mi ruta, para que ninguna pantalla subestime el hueco. Vacía si no crece.
 */
export function crecimientoDelHueco(deficit: Deficit): string {
  return deficit.faltanteMaximo > deficit.faltante
    ? `Si no haces nada, el hueco crece hasta ${formatoSoles(deficit.faltanteMaximo)} el ${formatoLargo(deficit.fechaFaltanteMaximo)}.`
    : "";
}
