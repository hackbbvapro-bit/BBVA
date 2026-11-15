export type Estilo = "directo" | "explicado";
export function validarEstilo(valor: unknown): Estilo { return valor === "explicado" ? "explicado" : "directo"; }
