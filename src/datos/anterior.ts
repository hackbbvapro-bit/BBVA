import { datosDeRosa } from "./semilla";
import type { Datos } from "./tipos";

/** Se consulta solo si todavía no hay una foto en la base ligera. La base anterior se conserva. */
export async function recuperarDatosAnteriores(): Promise<Datos> {
  if (typeof indexedDB.databases === "function") {
    const bases = await indexedDB.databases();
    if (!bases.some(b => b.name === "/pglite/copiloto")) return datosDeRosa();
  }
  // Navegadores sin listado de bases: abrir la anterior evita perder un caso existente.
  const [{ PGlite }, { crearRepositorioPGlite }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("./pglite"),
  ]);
  const db = new PGlite("idb://copiloto");
  try {
    return await (await crearRepositorioPGlite(db)).leerTodo();
  } finally {
    await db.close();
  }
}
