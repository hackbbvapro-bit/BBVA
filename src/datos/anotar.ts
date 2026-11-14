/**
 * Guarda en la base lo que el asistente anotó («me acaban de pagar 1.000») y devuelve cómo deshacerlo.
 * La validación es la misma de los formularios: si algo no es válido, lanza ErrorDatos y no guarda nada.
 */
import type { Accion } from "../agente/registro";
import { nuevoId, type Repositorio } from "./repositorio";

/** Deshace exactamente lo anotado (se ejecuta sobre la base, como cualquier otro cambio). */
export type Deshacer = (repo: Repositorio) => Promise<void>;

export const NOTA_ASISTENTE = "Anotado desde el asistente";

export async function anotarEnRepo(repo: Repositorio, accion: Accion): Promise<Deshacer> {
  switch (accion.tipo) {
    case "saldo": {
      const { cuentas } = await repo.leerTodo();
      const cuenta = cuentas[0];
      if (!cuenta) {
        const id = nuevoId("cuenta");
        await repo.guardarCuenta({ id, nombre: "Cuenta principal", saldo: accion.monto });
        return r => r.borrarCuenta(id);
      }
      await repo.guardarCuenta({ ...cuenta, saldo: cuenta.saldo + accion.monto });
      return async r => {
        const actual = (await r.leerTodo()).cuentas.find(c => c.id === cuenta.id);
        if (actual) await r.guardarCuenta({ ...actual, saldo: actual.saldo - accion.monto });
      };
    }
    case "cobro": {
      const id = nuevoId("cobro");
      await repo.guardarCobro({ id, quien: accion.quien, monto: accion.monto, fechaPrometida: accion.fecha, nota: NOTA_ASISTENTE, cobrado: false });
      return r => r.borrarCobro(id);
    }
    case "fijo": {
      const id = nuevoId(accion.sentido === "ingreso" ? "ingreso" : "gasto");
      await repo.guardarFijo(accion.sentido, { id, descripcion: accion.descripcion, monto: accion.monto, dia: accion.dia, categoria: accion.categoria });
      return r => r.borrarFijo(id);
    }
    case "deuda": {
      const id = nuevoId("deuda");
      await repo.guardarDeuda({
        id, entidad: accion.entidad, nombre: accion.nombre, tipo: accion.tipoDeuda, saldo: accion.saldo, tceaBp: accion.tceaBp,
        pagoMinimo: accion.pagoMensual, pagoHabitual: accion.pagoMensual, diaPago: accion.dia, diasAtraso: 0, pagada: false,
      });
      return r => r.borrarDeuda(id);
    }
  }
}
