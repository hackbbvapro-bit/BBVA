import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cuentasDeEjemplo } from "./cuentas-demo";
import { abrirBaseLocal, crearRepositorioIndexedDB } from "./indexeddb";
import { datosDeEjemplo, datosVacios } from "./semilla";

const bases: IDBDatabase[] = [];
async function abrir(nombre = crypto.randomUUID()) {
  const db = await abrirBaseLocal(nombre);
  bases.push(db);
  return db;
}
afterEach(() => bases.splice(0).forEach(db => db.close()));

describe("arranque ligero con IndexedDB", () => {
  it("añade la segunda cuenta a una demo ya guardada y conserva la actualización al reabrir", async () => {
    const nombre = crypto.randomUUID();
    const db = await abrir(nombre);
    const anterior = {
      ...datosDeEjemplo(),
      cuentas: [{ id: "cuenta-principal", nombre: "Cuenta principal", saldo: 46140 }],
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("estado", "readwrite");
      tx.objectStore("estado").put(anterior, "actual");
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
    const repo = await crearRepositorioIndexedDB(db);
    expect((await repo.leerTodo()).cuentas).toEqual(cuentasDeEjemplo(46140));
    await repo.guardarCuenta({ id: "cuenta-ahorros-demo", nombre: "Mi meta", saldo: 17000 });
    db.close();
    const repo2 = await crearRepositorioIndexedDB(await abrir(nombre));
    expect((await repo2.leerTodo()).cuentas).toContainEqual({
      id: "cuenta-ahorros-demo",
      nombre: "Mi meta",
      saldo: 17000,
    });
  });

  it("conserva los cambios al cerrar y volver a abrir sin ejecutar otra vez la migración", async () => {
    const nombre = crypto.randomUUID();
    const db = await abrir(nombre);
    const inicial = vi.fn(async () => datosDeEjemplo());
    const repo = await crearRepositorioIndexedDB(db, inicial);
    await repo.guardarCuenta({ id: "ahorro", nombre: "Ahorro", saldo: 12345 });
    db.close();
    const repo2 = await crearRepositorioIndexedDB(await abrir(nombre), inicial);
    expect((await repo2.leerTodo()).cuentas).toContainEqual({ id: "ahorro", nombre: "Ahorro", saldo: 12345 });
    expect(inicial).toHaveBeenCalledTimes(1);
  });

  it("migra el caso propio completo antes de confirmar la nueva base", async () => {
    const datos = datosVacios({
      nombre: "Ana",
      tipo: "dependiente",
      saldo: 50000,
      ingresoAprox: 300000,
      hoy: "2026-11-14",
    });
    datos.avisosLeidos = ["aviso-1"];
    datos.documentos = [
      { id: "doc-1", tipo: "reporte_sbs", resumen: "Ejemplo", datos: { ejemplo: true }, fecha: "2026-11-14" },
    ];
    const db = await abrir();
    await crearRepositorioIndexedDB(db, async () => datos);
    const repo = await crearRepositorioIndexedDB(db, async () => {
      throw new Error("No debe migrar otra vez");
    });
    expect(await repo.leerTodo()).toEqual(datos);
  });

  it("si la recuperación falla, deja la base sin inicializar para poder reintentar", async () => {
    const db = await abrir();
    await expect(
      crearRepositorioIndexedDB(db, async () => {
        throw new Error("Fallo anterior");
      }),
    ).rejects.toThrow("Fallo anterior");
    const inicial = vi.fn(async () => datosDeEjemplo());
    const repo = await crearRepositorioIndexedDB(db, inicial);
    expect(await repo.leerTodo()).toEqual(datosDeEjemplo());
    expect(inicial).toHaveBeenCalledTimes(1);
  });

  it("serializa cambios simultáneos sin perder cuentas ni avisos", async () => {
    const repo = await crearRepositorioIndexedDB(await abrir());
    await Promise.all([
      repo.guardarCuenta({ id: "a", nombre: "A", saldo: 100 }),
      repo.guardarCuenta({ id: "b", nombre: "B", saldo: 200 }),
      repo.marcarAvisoLeido("aviso"),
      repo.marcarAvisoLeido("aviso"),
    ]);
    const datos = await repo.leerTodo();
    expect(datos.cuentas.map(c => c.id)).toEqual(expect.arrayContaining(["a", "b"]));
    expect(datos.avisosLeidos).toEqual(["aviso"]);
  });

  it("un fallo al persistir no altera lo confirmado ni impide reintentar", async () => {
    const db = await abrir();
    const repo = await crearRepositorioIndexedDB(db);
    const antes = await repo.leerTodo();
    const transaction = db.transaction.bind(db);
    vi.spyOn(db, "transaction").mockImplementationOnce(() => {
      throw new Error("Almacenamiento lleno");
    });
    await expect(repo.guardarCuenta({ id: "a", nombre: "A", saldo: 100 })).rejects.toThrow(
      "Almacenamiento lleno",
    );
    expect(await repo.leerTodo()).toEqual(antes);
    db.transaction = transaction;
    await repo.guardarCuenta({ id: "b", nombre: "B", saldo: 200 });
    expect((await repo.leerTodo()).cuentas.some(c => c.id === "b")).toBe(true);
  });
});
