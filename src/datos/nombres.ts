import type { Datos, Sentido } from "./tipos";

/** Igual que el motor: sin tildes, en minúscula y solo letras. Dos fijos con las mismas letras se funden en uno. */
export function claveDeNombre(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z\s]/g, "").trim().replace(/\s+/g, "-");
}

/**
 * ¿Ya hay un fijo del mismo sentido con este nombre (o, en gastos, un pago de deuda que se llama igual)?
 * El motor los agruparía en uno solo y la cifra saldría mal, así que el formulario lo impide.
 */
export function nombreFijoRepetido(datos: Datos, sentido: Sentido, nombre: string, idActual?: string): boolean {
  const clave = claveDeNombre(nombre);
  if (!clave) return false;
  const lista = sentido === "ingreso" ? datos.ingresosFijos : datos.gastosFijos;
  if (lista.some(f => f.id !== idActual && claveDeNombre(f.descripcion) === clave)) return true;
  return sentido === "gasto" && datos.deudas.some(d => !d.pagada && d.saldo > 0 && claveDeNombre(`Pago ${d.nombre}`) === clave);
}

/** ¿Hay un gasto fijo que se llama como el pago de esta deuda («Pago <deuda>»)? Guardarla los fundiría en el motor. */
export function hayGastoLlamadoComoPagoDe(datos: Datos, nombreDeuda: string): boolean {
  const clave = claveDeNombre(`Pago ${nombreDeuda}`);
  return clave !== "" && datos.gastosFijos.some(f => claveDeNombre(f.descripcion) === clave);
}
