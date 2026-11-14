import { estadoServicios } from "@/servidor/entorno";
import { okJson } from "@/servidor/http";

/** Dice qué piezas externas están configuradas (sí o no). Nunca devuelve una clave. */
export function GET(): Response {
  return okJson(estadoServicios());
}
