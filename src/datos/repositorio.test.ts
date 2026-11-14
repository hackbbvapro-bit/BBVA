import { afterAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { crearRepositorioPGlite } from "./pglite";
import { crearRepositorioMemoria, type Repositorio } from "./repositorio";
import { MIGRACIONES, VERSION_ACTUAL, migrar } from "./esquema";
import { ID_PROPIO, datosDeRosa, datosVacios, hoyEnLima } from "./semilla";
import { aPerfil } from "./aPerfil";
import { analizar } from "../motor";
import { ErrorDatos } from "./validar";
import type { DeudaGuardada } from "./tipos";

const bases: PGlite[] = [];
const fabricas: [string, () => Promise<Repositorio>][] = [
  ["memoria", async () => crearRepositorioMemoria()],
  [
    "PGlite",
    async () => {
      const db = new PGlite();
      bases.push(db);
      return crearRepositorioPGlite(db);
    },
  ],
];
afterAll(() => Promise.all(bases.map(b => b.close())));

const deuda = (extra: Partial<DeudaGuardada> = {}): DeudaGuardada => ({
  id: "d-1", entidad: "Caja Ejemplo", nombre: "Préstamo Caja", tipo: "personal", saldo: 120000, tceaBp: 3500,
  pagoMinimo: 10000, pagoHabitual: 10000, diaPago: 28, diasAtraso: 0, pagada: false, ...extra,
});

describe.each(fabricas)("repositorio %s (mismo contrato)", (_, crear) => {
  it("arranca con la semilla de Rosa idéntica", async () => {
    const repo = await crear();
    const datos = await repo.leerTodo();
    const semilla = datosDeRosa();
    expect(datos.perfil).toEqual(semilla.perfil);
    expect(datos.cuentas).toEqual(semilla.cuentas);
    expect(datos.gastosFijos.map(f => f.descripcion).sort()).toEqual(["Agua", "Alquiler", "Internet", "Luz", "Streaming"]);
    expect(datos.ingresosFijos).toEqual([]);
    expect(datos.deudas.map(d => d.id).sort()).toEqual(["independiente-tarjeta", "segunda"]);
    expect(datos.movimientos).toHaveLength(semilla.movimientos.length);
    expect(datos.movimientos.length).toBeGreaterThan(200);
  });

  it("guarda, edita y borra una cuenta", async () => {
    const repo = await crear();
    await repo.guardarCuenta({ id: "c2", nombre: "Ahorros", saldo: 12345 });
    await repo.guardarCuenta({ id: "c2", nombre: "Ahorros BBVA", saldo: 20000 });
    expect((await repo.leerTodo()).cuentas.find(c => c.id === "c2")).toEqual({ id: "c2", nombre: "Ahorros BBVA", saldo: 20000 });
    await repo.borrarCuenta("c2");
    expect((await repo.leerTodo()).cuentas.some(c => c.id === "c2")).toBe(false);
  });

  it("un fijo cambia de sentido sin duplicarse", async () => {
    const repo = await crear();
    const f = { id: "f1", descripcion: "Gimnasio", monto: 5000, dia: 12, categoria: "suscripciones" as const };
    await repo.guardarFijo("gasto", f);
    await repo.guardarFijo("ingreso", f);
    const d = await repo.leerTodo();
    expect(d.ingresosFijos.filter(x => x.id === "f1")).toHaveLength(1);
    expect(d.gastosFijos.some(x => x.id === "f1")).toBe(false);
    await repo.borrarFijo("f1");
    expect((await repo.leerTodo()).ingresosFijos).toHaveLength(0);
  });

  it("bloquea nombres de fijo repetidos y gastos que se llaman como el pago de una deuda", async () => {
    const repo = await crear();
    const base = { monto: 5000, dia: 12, categoria: "suscripciones" as const };
    await expect(repo.guardarFijo("gasto", { id: "otro", descripcion: "  ALQUILER ", ...base })).rejects.toBeInstanceOf(ErrorDatos);
    await expect(repo.guardarFijo("gasto", { id: "otro", descripcion: "Pago Préstamo Caja", ...base })).resolves.toBeUndefined();
    await expect(repo.guardarDeuda(deuda())).rejects.toBeInstanceOf(ErrorDatos);
    await repo.guardarFijo("ingreso", { id: "i1", descripcion: "Alquiler", ...base });
    const alquiler = (await repo.leerTodo()).gastosFijos.find(f => f.descripcion === "Alquiler")!;
    await expect(repo.guardarFijo("gasto", { ...alquiler, monto: 99900 })).resolves.toBeUndefined();
    expect((await repo.leerTodo()).deudas.some(d => d.id === "d-1")).toBe(false);
  });

  it("deudas: tcea desconocida, marcar pagada y borrar", async () => {
    const repo = await crear();
    await repo.guardarDeuda(deuda({ tceaBp: null }));
    expect((await repo.leerTodo()).deudas.find(d => d.id === "d-1")?.tceaBp).toBeNull();
    await repo.guardarDeuda(deuda({ pagada: true }));
    expect((await repo.leerTodo()).deudas.find(d => d.id === "d-1")?.pagada).toBe(true);
    await repo.borrarDeuda("d-1");
    expect((await repo.leerTodo()).deudas.some(d => d.id === "d-1")).toBe(false);
  });

  it("cobros, documentos y avisos leídos (sin duplicar avisos)", async () => {
    const repo = await crear();
    await repo.guardarCobro({ id: "k1", quien: "Juan", monto: 5000, fechaPrometida: "2026-11-20", nota: "", cobrado: false });
    await repo.guardarDocumento({ id: "x1", tipo: "reporte_sbs", resumen: "5 deudas", datos: { deudas: [1, 2] }, fecha: "2026-11-13" });
    await repo.marcarAvisoLeido("deficit-2026-11-20");
    await repo.marcarAvisoLeido("deficit-2026-11-20");
    const d = await repo.leerTodo();
    expect(d.cobros).toEqual([{ id: "k1", quien: "Juan", monto: 5000, fechaPrometida: "2026-11-20", nota: "", cobrado: false }]);
    expect(d.documentos[0]).toMatchObject({ id: "x1", datos: { deudas: [1, 2] } });
    expect(d.avisosLeidos).toEqual(["deficit-2026-11-20"]);
    await repo.borrarCobro("k1");
    expect((await repo.leerTodo()).cobros).toEqual([]);
  });

  it("actualiza el perfil y conserva el id", async () => {
    const repo = await crear();
    const p = (await repo.leerTodo()).perfil;
    await repo.guardarPerfil({ ...p, nombre: "  Rosita ", diasCobro: [15, 30, 15] });
    expect((await repo.leerTodo()).perfil).toMatchObject({ id: p.id, nombre: "Rosita", diasCobro: [15, 30] });
  });

  it("rechaza datos inválidos con mensaje en español y sin guardar nada", async () => {
    const repo = await crear();
    const antes = await repo.leerTodo();
    const malos: Promise<void>[] = [
      repo.guardarCuenta({ id: "c", nombre: "  ", saldo: 0 }),
      repo.guardarCuenta({ id: "c", nombre: "Mala", saldo: 10.5 }),
      repo.guardarFijo("gasto", { id: "f", descripcion: "Luz", monto: 0, dia: 8, categoria: "servicios" }),
      repo.guardarFijo("gasto", { id: "f", descripcion: "Luz", monto: 100, dia: 32, categoria: "servicios" }),
      repo.guardarFijo("gasto", { id: "f", descripcion: "123", monto: 100, dia: 5, categoria: "servicios" }),
      repo.guardarDeuda(deuda({ pagoMinimo: 0 })),
      repo.guardarDeuda(deuda({ tipo: "otro" as never })),
      repo.guardarDeuda(deuda({ saldo: -1 })),
      repo.guardarCobro({ id: "k", quien: "Ana", monto: 100, fechaPrometida: "2026-02-30", nota: "", cobrado: false }),
    ];
    for (const intento of malos) await expect(intento).rejects.toBeInstanceOf(ErrorDatos);
    expect(await repo.leerTodo()).toEqual(antes);
  });

  it("el texto con comillas y símbolos se guarda tal cual (consultas parametrizadas)", async () => {
    const repo = await crear();
    const raro = "Juan'; DROP TABLE cobros; --";
    await repo.guardarCobro({ id: "k2", quien: raro, monto: 100, fechaPrometida: "2026-11-20", nota: "", cobrado: false });
    expect((await repo.leerTodo()).cobros.find(c => c.id === "k2")?.quien).toBe(raro);
  });

  it("restablecer vuelve a Rosa y borra lo agregado", async () => {
    const repo = await crear();
    await repo.guardarDeuda(deuda());
    await repo.guardarCobro({ id: "k1", quien: "Juan", monto: 5000, fechaPrometida: "2026-11-20", nota: "", cobrado: false });
    await repo.marcarAvisoLeido("a");
    await repo.restablecer();
    const d = await repo.leerTodo();
    expect(d.deudas).toHaveLength(2);
    expect(d.cobros).toEqual([]);
    expect(d.avisosLeidos).toEqual([]);
    expect(d.perfil).toEqual(datosDeRosa().perfil);
  });
});

describe("PGlite · esquema versionado y persistencia", () => {
  it("las migraciones se aplican una sola vez", async () => {
    const db = new PGlite();
    expect(await migrar(db)).toEqual(MIGRACIONES.map(m => m.version));
    expect(await migrar(db)).toEqual([]);
    const v = await db.query<{ version: number }>("SELECT max(version)::int AS version FROM migraciones");
    expect(v.rows[0].version).toBe(VERSION_ACTUAL);
    await db.close();
  });

  it("lo guardado sobrevive a cerrar y volver a abrir (mismo almacén)", async () => {
    const db = new PGlite();
    const repo = await crearRepositorioPGlite(db);
    await repo.guardarDeuda(deuda({ id: "persiste" }));
    const dump = await db.dumpDataDir("none");
    await db.close();
    const db2 = new PGlite({ loadDataDir: dump });
    const repo2 = await crearRepositorioPGlite(db2);
    const datos = await repo2.leerTodo();
    expect(datos.deudas.some(d => d.id === "persiste")).toBe(true);
    expect(datos.deudas).toHaveLength(3);
    await db2.close();
  });

  it("rechaza en la base valores que rompen las reglas (CHECK)", async () => {
    const db = new PGlite();
    await crearRepositorioPGlite(db);
    await expect(db.query("INSERT INTO cobros VALUES ('z','x',0,'2026-11-20','',false)")).rejects.toThrow();
    await db.close();
  });
});

describe.each(fabricas)("empezar con datos propios (%s)", (_n, crear) => {
  const ana = () => datosVacios({ nombre: "  Ana  ", tipo: "dependiente", saldo: 85050, ingresoAprox: 250000, hoy: "2026-11-14" });

  it("cargar reemplaza todo: queda una cuenta con su saldo y nada de Rosa", async () => {
    const repo = await crear();
    await repo.cargar(ana());
    const d = await repo.leerTodo();
    expect(d.perfil).toMatchObject({ id: ID_PROPIO, nombre: "Ana", tipo: "dependiente", ingresoAprox: 250000, hoy: "2026-11-14" });
    expect(d.cuentas).toEqual([{ id: "cuenta-principal", nombre: "Cuenta principal", saldo: 85050 }]);
    expect([d.deudas, d.ingresosFijos, d.gastosFijos, d.movimientos, d.cobros]).toEqual([[], [], [], [], []]);
  });

  it("cargar rechaza un perfil inválido y no toca lo guardado", async () => {
    const repo = await crear();
    const antes = await repo.leerTodo();
    await expect(repo.cargar({ ...ana(), perfil: { ...ana().perfil, nombre: "" } })).rejects.toBeInstanceOf(ErrorDatos);
    expect(await repo.leerTodo()).toEqual(antes);
  });

  it("restablecer vuelve a la demo de Rosa", async () => {
    const repo = await crear();
    await repo.cargar(ana());
    await repo.restablecer();
    expect((await repo.leerTodo()).perfil.nombre).toBe(datosDeRosa().perfil.nombre);
  });

  it("el motor analiza una cuenta recién creada sin historia", () => {
    const a = analizar(aPerfil(ana()));
    expect(a.hoy).toBe("2026-11-14");
  });
});

describe("hoy en Lima", () => {
  it("a las 03:00 UTC todavía es el día anterior en Lima", () => {
    expect(hoyEnLima(new Date("2026-11-15T03:00:00Z"))).toBe("2026-11-14");
    expect(hoyEnLima(new Date("2026-11-15T05:00:00Z"))).toBe("2026-11-15");
  });
});
