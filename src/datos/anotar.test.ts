import { describe, expect, it } from "vitest";
import { NOTA_ASISTENTE, anotarEnRepo } from "./anotar";
import { crearRepositorioMemoria, validado } from "./repositorio";
import { datosDeEjemplo } from "./semilla";
import { ErrorDatos } from "./validar";

const repoDeEjemplo = () => validado(crearRepositorioMemoria(datosDeEjemplo()));

describe("anotarEnRepo: lo que anota el asistente queda en el panel y se puede deshacer", () => {
  it("un ingreso de hoy suma a la primera cuenta; deshacer lo resta", async () => {
    const repo = repoDeEjemplo();
    const antes = (await repo.leerTodo()).cuentas[0].saldo;
    const deshacer = await anotarEnRepo(repo, { tipo: "saldo", monto: 100_000, descripcion: "Ingreso extra" });
    expect((await repo.leerTodo()).cuentas[0].saldo).toBe(antes + 100_000);
    await deshacer(repo);
    expect((await repo.leerTodo()).cuentas[0].saldo).toBe(antes);
  });

  it("deshacer respeta otros cambios hechos después en la misma cuenta", async () => {
    const repo = repoDeEjemplo();
    const antes = (await repo.leerTodo()).cuentas[0].saldo;
    const deshacer = await anotarEnRepo(repo, { tipo: "saldo", monto: -8_000, descripcion: "Gasto: Mercado" });
    await anotarEnRepo(repo, { tipo: "saldo", monto: 5_000, descripcion: "Ingreso extra" });
    await deshacer(repo);
    expect((await repo.leerTodo()).cuentas[0].saldo).toBe(antes + 5_000);
  });

  it("sin cuentas crea «Cuenta principal», y deshacer la quita", async () => {
    const repo = validado(crearRepositorioMemoria({ ...datosDeEjemplo(), cuentas: [] }));
    const deshacer = await anotarEnRepo(repo, { tipo: "saldo", monto: 20_000, descripcion: "Ingreso extra" });
    expect((await repo.leerTodo()).cuentas).toMatchObject([{ nombre: "Cuenta principal", saldo: 20_000 }]);
    await deshacer(repo);
    expect((await repo.leerTodo()).cuentas).toEqual([]);
  });

  it("un pago por llegar se guarda como cobro pendiente con su nota", async () => {
    const repo = repoDeEjemplo();
    const n = (await repo.leerTodo()).cobros.length;
    const deshacer = await anotarEnRepo(repo, { tipo: "cobro", quien: "Limpiar", monto: 10_000, fecha: "2026-11-20" });
    const cobros = (await repo.leerTodo()).cobros;
    expect(cobros).toHaveLength(n + 1);
    expect(cobros.at(-1)).toMatchObject({ quien: "Limpiar", monto: 10_000, fechaPrometida: "2026-11-20", nota: NOTA_ASISTENTE, cobrado: false });
    await deshacer(repo);
    expect((await repo.leerTodo()).cobros).toHaveLength(n);
  });

  it("un gasto fijo y una deuda se guardan y se deshacen", async () => {
    const repo = repoDeEjemplo();
    const base = await repo.leerTodo();
    const sinLuz = await anotarEnRepo(repo, { tipo: "fijo", sentido: "gasto", descripcion: "Luz del cuarto", monto: 5_000, dia: 15, categoria: "servicios" });
    const sinMoto = await anotarEnRepo(repo, {
      tipo: "deuda", entidad: "Caja", nombre: "Préstamo moto", tipoDeuda: "prestamo", saldo: 300_000, pagoMensual: 25_000, dia: 18, tceaBp: null,
    });
    const con = await repo.leerTodo();
    expect(con.gastosFijos).toHaveLength(base.gastosFijos.length + 1);
    expect(con.deudas.at(-1)).toMatchObject({ nombre: "Préstamo moto", pagoMinimo: 25_000, pagoHabitual: 25_000, diaPago: 18, pagada: false });
    await sinLuz(repo);
    await sinMoto(repo);
    const despues = await repo.leerTodo();
    expect(despues.gastosFijos).toHaveLength(base.gastosFijos.length);
    expect(despues.deudas).toHaveLength(base.deudas.length);
  });

  it("si choca con lo que ya existe, avisa con un error claro y no guarda", async () => {
    const repo = repoDeEjemplo();
    const base = await repo.leerTodo();
    const existente = base.gastosFijos[0];
    await expect(
      anotarEnRepo(repo, { tipo: "fijo", sentido: "gasto", descripcion: existente.descripcion, monto: 5_000, dia: 15, categoria: "servicios" }),
    ).rejects.toBeInstanceOf(ErrorDatos);
    expect((await repo.leerTodo()).gastosFijos).toHaveLength(base.gastosFijos.length);
  });
});
