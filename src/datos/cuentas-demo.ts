import type { Cuenta, Datos } from "./tipos";

/** Reparto de ejemplo, en céntimos: conserva el saldo total y las cifras de la demo. */
export function cuentasDeEjemplo(saldoTotal: number): Cuenta[] {
  const ahorro = Math.min(15000, Math.max(0, saldoTotal));
  return [
    { id: "cuenta-principal", nombre: "Cuenta sueldo", saldo: saldoTotal - ahorro },
    { id: "cuenta-ahorros-demo", nombre: "Cuenta de ahorros", saldo: ahorro },
  ];
}

/** Actualiza únicamente la cuenta original de Rosa. Conserva los casos propios y las cuentas personalizadas. */
export function completarCuentasDemo(datos: Datos): Datos {
  if (datos.perfil.id !== "independiente") return datos;
  const original = datos.cuentas[0];
  if (
    datos.cuentas.length === 1 &&
    original.id === "cuenta-principal" &&
    original.nombre === "Cuenta principal"
  ) {
    return { ...datos, cuentas: cuentasDeEjemplo(original.saldo) };
  }
  let cambio = false;
  const cuentas = datos.cuentas.map(c => {
    const nombre =
      c.id === "cuenta-principal" && c.nombre === "Día a día"
        ? "Cuenta sueldo"
        : c.id === "cuenta-ahorros-demo" && c.nombre === "Mis ahorros"
          ? "Cuenta de ahorros"
          : c.nombre;
    if (nombre === c.nombre) return c;
    cambio = true;
    return { ...c, nombre };
  });
  return cambio ? { ...datos, cuentas } : datos;
}
