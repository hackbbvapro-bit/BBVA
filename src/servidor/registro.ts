/**
 * Registro mínimo del servidor. Solo anota QUÉ pieza falló y de qué tipo fue el fallo
 * (nombre del error y código de estado). Nunca el mensaje completo, el cuerpo ni una clave.
 */
export function registrarFallo(pieza: string, error: unknown): void {
  const nombre = error instanceof Error ? error.name : "ErrorDesconocido";
  const estado = typeof error === "object" && error !== null ? (error as { status?: unknown; statusCode?: unknown }) : {};
  const codigo = typeof estado.status === "number" ? estado.status : typeof estado.statusCode === "number" ? estado.statusCode : "-";
  process.stderr.write(`[copiloto] fallo en ${pieza}: ${nombre} (estado ${codigo})\n`);
}
