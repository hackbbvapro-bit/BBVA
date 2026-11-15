export type Estilo = "directo" | "explicado";
export function validarEstilo(valor: unknown): Estilo { return valor === "explicado" ? "explicado" : "directo"; }

const PIDE_MAS = /^\s*(expl[ií]ca(me)?|cu[eé]ntame|dime) m[aá]s\b/i;

/**
 * Qué responde el motor sin IA (lo usan el servidor y el cliente). «Explícame más» no es una pregunta
 * nueva: amplía la anterior de la persona en modo Explicado.
 */
export function preguntaSinIA(mensajes: readonly { rol: string; texto: string }[], estilo: Estilo): { pregunta: string; estilo: Estilo } {
  const suyas = mensajes.filter(m => m.rol === "usuario").map(m => m.texto.trim()).filter(t => t.length > 0);
  const pregunta = suyas.at(-1) ?? "";
  if (!PIDE_MAS.test(pregunta)) return { pregunta, estilo };
  return { pregunta: suyas.at(-2) ?? pregunta, estilo: "explicado" };
}
