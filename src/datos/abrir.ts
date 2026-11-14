import { crearRepositorioPGlite } from "./pglite";
import { crearRepositorioMemoria, type Repositorio } from "./repositorio";

export interface Almacen {
  repo: Repositorio;
  /** false = los cambios se pierden al cerrar la pestaña. */
  persistente: boolean;
  /** Por qué no es persistente, en lenguaje llano. */
  aviso?: string;
}

const NOMBRE_BLOQUEO = "copiloto-datos";

/** Solo una pestaña a la vez escribe en la base local; dos instancias de PGlite sobre el mismo almacén la corromperían. */
function tomarBloqueo(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.locks) return Promise.resolve(true);
  return new Promise(resolve => {
    void navigator.locks.request(NOMBRE_BLOQUEO, { ifAvailable: true }, lock => {
      resolve(lock !== null);
      return lock ? new Promise<void>(() => undefined) : undefined;
    });
  });
}

const enMemoria = (aviso: string): Almacen => ({ repo: crearRepositorioMemoria(), persistente: false, aviso });

async function abrir(): Promise<Almacen> {
  if (!(await tomarBloqueo())) {
    return enMemoria("Tienes el copiloto abierto en otra pestaña. Aquí puedes mirar, pero lo que cambies no se guardará.");
  }
  try {
    const { PGlite } = await import("@electric-sql/pglite");
    return { repo: await crearRepositorioPGlite(new PGlite("idb://copiloto")), persistente: true };
  } catch {
    return enMemoria("Este navegador no nos deja guardar tus datos. Puedes usar el copiloto, pero lo que cambies se perderá al cerrar.");
  }
}

let abierto: Promise<Almacen> | null = null;

/** Abre la base una sola vez por página (React puede montar dos veces en desarrollo). Solo en el navegador. */
export function abrirAlmacen(): Promise<Almacen> {
  abierto ??= abrir();
  return abierto;
}
