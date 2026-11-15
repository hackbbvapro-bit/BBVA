/**
 * Guarda en la base lo que el asistente anotó («me acaban de pagar 1.000») y devuelve cómo deshacerlo.
 * La validación es la misma de los formularios: si algo no es válido, lanza ErrorDatos y no guarda nada.
 */
import { z } from "zod";
import type { Accion } from "../agente/registro";
import { nuevoId, type Repositorio } from "./repositorio";

/** Deshace exactamente lo anotado (se ejecuta sobre la base, como cualquier otro cambio). */
export type Deshacer = (repo: Repositorio) => Promise<void>;

export const NOTA_ASISTENTE = "Anotado desde el asistente";

const id = z.string().min(1).max(80);
/**
 * El recibo de una anotación: lo justo para deshacerla después. Son solo datos (ids y un monto), así que se
 * guarda junto a la conversación y «Deshacer» sigue funcionando al cambiar de pestaña o recargar la página.
 */
export const EsquemaRecibo = z.discriminatedUnion("tipo", [
  /** Se sumó `monto` a una cuenta; `creada` si la cuenta no existía y se creó para esto. */
  z.object({ tipo: z.literal("saldo"), cuenta: id, monto: z.number().int(), creada: z.boolean() }),
  z.object({ tipo: z.literal("cobro"), id }),
  z.object({ tipo: z.literal("fijo"), id }),
  z.object({ tipo: z.literal("deuda"), id }),
]);
export type Recibo = z.infer<typeof EsquemaRecibo>;

/** Guarda la acción y devuelve su recibo. */
export async function anotarConRecibo(repo: Repositorio, accion: Accion): Promise<Recibo> {
  switch (accion.tipo) {
    case "saldo": {
      const { cuentas } = await repo.leerTodo();
      const cuenta = cuentas[0];
      if (!cuenta) {
        const nueva = nuevoId("cuenta");
        await repo.guardarCuenta({ id: nueva, nombre: "Cuenta principal", saldo: accion.monto });
        return { tipo: "saldo", cuenta: nueva, monto: accion.monto, creada: true };
      }
      await repo.guardarCuenta({ ...cuenta, saldo: cuenta.saldo + accion.monto });
      return { tipo: "saldo", cuenta: cuenta.id, monto: accion.monto, creada: false };
    }
    case "cobro": {
      const nuevo = nuevoId("cobro");
      await repo.guardarCobro({ id: nuevo, quien: accion.quien, monto: accion.monto, fechaPrometida: accion.fecha, nota: NOTA_ASISTENTE, cobrado: false });
      return { tipo: "cobro", id: nuevo };
    }
    case "fijo": {
      const nuevo = nuevoId(accion.sentido === "ingreso" ? "ingreso" : "gasto");
      await repo.guardarFijo(accion.sentido, { id: nuevo, descripcion: accion.descripcion, monto: accion.monto, dia: accion.dia, categoria: accion.categoria });
      return { tipo: "fijo", id: nuevo };
    }
    case "deuda": {
      const nueva = nuevoId("deuda");
      await repo.guardarDeuda({
        id: nueva, entidad: accion.entidad, nombre: accion.nombre, tipo: accion.tipoDeuda, saldo: accion.saldo, tceaBp: accion.tceaBp,
        pagoMinimo: accion.pagoMensual, pagoHabitual: accion.pagoMensual, diaPago: accion.dia, diasAtraso: 0, pagada: false,
      });
      return { tipo: "deuda", id: nueva };
    }
  }
}

/** Deshace lo que dice el recibo. Si eso ya no existe (se borró a mano), no hace nada. */
export async function deshacerRecibo(repo: Repositorio, recibo: Recibo): Promise<void> {
  switch (recibo.tipo) {
    case "saldo": {
      const actual = (await repo.leerTodo()).cuentas.find(c => c.id === recibo.cuenta);
      if (!actual) return;
      // La cuenta creada para esto se quita solo si nadie más la tocó; si no, se resta lo anotado.
      if (recibo.creada && actual.saldo === recibo.monto) return repo.borrarCuenta(recibo.cuenta);
      return repo.guardarCuenta({ ...actual, saldo: actual.saldo - recibo.monto });
    }
    case "cobro":
      return repo.borrarCobro(recibo.id);
    case "fijo":
      return repo.borrarFijo(recibo.id);
    case "deuda":
      return repo.borrarDeuda(recibo.id);
  }
}

export async function anotarEnRepo(repo: Repositorio, accion: Accion): Promise<Deshacer> {
  const recibo = await anotarConRecibo(repo, accion);
  return r => deshacerRecibo(r, recibo);
}
