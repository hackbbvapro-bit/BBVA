/**
 * Límite de uso por visitante, en memoria: tantas peticiones por ventana de tiempo.
 * Es un freno contra el abuso de las claves, no un contador exacto: en el hosting cada
 * instancia del servidor lleva su propia cuenta.
 */
export interface Limite {
  /** true si la petición entra; false si ese visitante ya agotó su cupo en la ventana. */
  permite(clave: string, ahora?: number): boolean;
}

interface Ventana {
  inicio: number;
  usadas: number;
}

const MAXIMO_DE_CLAVES = 5000;

export function crearLimite(maximo: number, ventanaMs: number): Limite {
  if (!Number.isInteger(maximo) || maximo <= 0) throw new Error("El máximo debe ser un entero mayor que cero");
  if (!Number.isInteger(ventanaMs) || ventanaMs <= 0) throw new Error("La ventana debe ser un entero mayor que cero");
  const ventanas = new Map<string, Ventana>();

  function limpiar(ahora: number): void {
    for (const [clave, v] of ventanas) {
      if (ahora - v.inicio >= ventanaMs) ventanas.delete(clave);
    }
    if (ventanas.size >= MAXIMO_DE_CLAVES) ventanas.clear();
  }

  return {
    permite(clave, ahora = Date.now()) {
      const actual = ventanas.get(clave);
      if (!actual || ahora - actual.inicio >= ventanaMs) {
        if (ventanas.size >= MAXIMO_DE_CLAVES) limpiar(ahora);
        ventanas.set(clave, { inicio: ahora, usadas: 1 });
        return true;
      }
      if (actual.usadas >= maximo) return false;
      ventanas.set(clave, { inicio: actual.inicio, usadas: actual.usadas + 1 });
      return true;
    },
  };
}
