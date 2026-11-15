import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { crearRepositorioPGlite } from "./pglite";
import { recuperarDatosAnteriores } from "./anterior";
import { abrirBaseLocal, crearRepositorioIndexedDB } from "./indexeddb";
import { datosVacios } from "./semilla";

it("recupera un caso de una base PGlite real y lo conserva en IndexedDB", async () => {
  const anterior = new PGlite("idb://copiloto");
  try {
    const repo = await crearRepositorioPGlite(anterior);
    await repo.cargar(
      datosVacios({
        nombre: "Ana",
        tipo: "dependiente",
        saldo: 85050,
        ingresoAprox: 250000,
        hoy: "2026-11-14",
      }),
    );
    await repo.marcarAvisoLeido("ejemplo");
  } finally {
    await anterior.close();
  }
  const db = await abrirBaseLocal(crypto.randomUUID());
  try {
    const repo = await crearRepositorioIndexedDB(db, recuperarDatosAnteriores);
    const datos = await repo.leerTodo();
    expect(datos.perfil).toMatchObject({ id: "propio", nombre: "Ana" });
    expect(datos.cuentas[0].saldo).toBe(85050);
    expect(datos.avisosLeidos).toEqual(["ejemplo"]);
    expect((await indexedDB.databases()).some(b => b.name === "/pglite/copiloto")).toBe(true);
  } finally {
    db.close();
  }
}, 30000);
