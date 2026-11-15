/**
 * «Deshacer» sobrevive a cambiar de pestaña o recargar: lo anotado se guarda con la conversación junto a su
 * recibo, y al volver la tarjeta reaparece y el recibo todavía sirve para quitarlo del panel.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { notasParaGuardar, restaurar } from "../componentes/chat";
import type { Nota } from "../componentes/anotado";
import { anotarConRecibo, deshacerRecibo } from "../datos/anotar";
import { crearRepositorioMemoria, validado } from "../datos/repositorio";
import { datosDeEjemplo } from "../datos/semilla";
import type { Accion } from "../agente/registro";
import { guardarHistorial, leerHistorial } from "./memoria";

function almacen(inicial: Record<string, string> = {}) {
  const datos = new Map(Object.entries(inicial));
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
  };
}
const usar = (localStorage: unknown) => vi.stubGlobal("window", { localStorage });
afterEach(() => vi.unstubAllGlobals());

const gasto: Accion = { tipo: "saldo", monto: -8_000, descripcion: "Gasto: Mercado" };

describe("las notas del asistente se guardan con la conversación", () => {
  it("tras «recargar», la tarjeta vuelve y su recibo deshace lo anotado", async () => {
    usar(almacen());
    const repo = validado(crearRepositorioMemoria(datosDeEjemplo()));
    const antes = (await repo.leerTodo()).cuentas[0].saldo;
    const recibo = await anotarConRecibo(repo, gasto);
    const notas: Record<string, Nota> = { n1: { estado: "listo", accion: gasto, recibo } };

    guardarHistorial("andrea", [
      { rol: "usuario", texto: "gasté 80 en el mercado" },
      { rol: "asistente", texto: "Anotado.", anotado: notasParaGuardar(["n1"], notas) },
    ]);

    // Otra sesión: solo queda lo guardado en el equipo.
    const vuelta = restaurar(leerHistorial("andrea"));
    const ids = vuelta.mensajes[1].notas ?? [];
    expect(ids).toHaveLength(1);
    const nota = vuelta.notas[ids[0]];
    expect(nota).toMatchObject({ estado: "listo", accion: gasto });
    if (nota.estado !== "listo") throw new Error("la nota debía volver lista para deshacer");
    await deshacerRecibo(repo, nota.recibo);
    expect((await repo.leerTodo()).cuentas[0].saldo).toBe(antes);
  });

  it("lo ya deshecho vuelve como deshecho; lo que no llegó a guardarse no se guarda", () => {
    usar(almacen());
    const recibo = { tipo: "saldo" as const, cuenta: "cuenta-principal", monto: -8_000, creada: false };
    const notas: Record<string, Nota> = {
      a: { estado: "deshecho", accion: gasto, recibo },
      b: { estado: "guardando", accion: gasto },
      c: { estado: "error", accion: gasto, mensaje: "x" },
    };
    guardarHistorial("andrea", [
      { rol: "usuario", texto: "hola" },
      { rol: "asistente", texto: "Anotado.", anotado: notasParaGuardar(["a", "b", "c", "no-existe"], notas) },
    ]);
    const vuelta = restaurar(leerHistorial("andrea"));
    expect(Object.values(vuelta.notas)).toEqual([{ estado: "deshecho", accion: gasto, recibo }]);
  });

  it("una nota rota o inventada en el almacenamiento se descarta sin romper la conversación", () => {
    usar(almacen({
      "copiloto-historial:andrea": JSON.stringify([
        { rol: "usuario", texto: "hola" },
        { rol: "asistente", texto: "Anotado.", anotado: [{ accion: { tipo: "saldo", monto: "mucho" }, recibo: {} }, "basura"] },
      ]),
    }));
    const leido = leerHistorial("andrea");
    expect(leido).toEqual([{ rol: "usuario", texto: "hola" }, { rol: "asistente", texto: "Anotado." }]);
    expect(restaurar(leido).notas).toEqual({});
  });

  it("una conversación guardada antes de este cambio (sin notas) se lee igual", () => {
    usar(almacen({ "copiloto-historial:andrea": JSON.stringify([{ rol: "usuario", texto: "hola" }, { rol: "asistente", texto: "Hola." }]) }));
    expect(restaurar(leerHistorial("andrea"))).toEqual({
      mensajes: [{ rol: "usuario", texto: "hola" }, { rol: "asistente", texto: "Hola." }],
      notas: {},
    });
  });
});

describe("deshacerRecibo", () => {
  it("la cuenta creada para la anotación se quita; si luego se tocó, solo se resta lo anotado", async () => {
    const repo = validado(crearRepositorioMemoria({ ...datosDeEjemplo(), cuentas: [] }));
    const ingreso: Accion = { tipo: "saldo", monto: 20_000, descripcion: "Ingreso extra" };
    const recibo = await anotarConRecibo(repo, ingreso);
    await anotarConRecibo(repo, { tipo: "saldo", monto: 5_000, descripcion: "Ingreso extra" });
    await deshacerRecibo(repo, recibo);
    expect((await repo.leerTodo()).cuentas).toMatchObject([{ saldo: 5_000 }]);
  });

  it("si lo anotado ya no existe, deshacer no falla", async () => {
    const repo = validado(crearRepositorioMemoria(datosDeEjemplo()));
    await expect(deshacerRecibo(repo, { tipo: "saldo", cuenta: "no-existe", monto: 100, creada: false })).resolves.toBeUndefined();
    await expect(deshacerRecibo(repo, { tipo: "deuda", id: "no-existe" })).resolves.toBeUndefined();
  });
});
