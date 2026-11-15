import { sumar } from "@/motor/dinero";
import type { Cuenta } from "@/datos/tipos";

/** El filtro solo consulta saldos; nunca cambia las cuentas ni la entrada de la proyección. */
export function saldoDeCuentas(cuentas: readonly Cuenta[], id: string | null) {
  const cuenta = cuentas.find(c => c.id === id);
  return {
    seleccion: cuenta?.id ?? null,
    nombre: cuenta?.nombre ?? "Acumulado general",
    saldo: cuenta ? cuenta.saldo : sumar(cuentas.map(c => c.saldo)),
  };
}
