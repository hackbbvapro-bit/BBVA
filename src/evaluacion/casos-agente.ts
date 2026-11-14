/**
 * Los seis clientes sintéticos con los que se probó al asistente con IA (docs/EVALUACION.md, sección 14).
 * Dos formas de llegar a ellos, que una prueba mantiene iguales:
 *   - `elegirCasos()`: la selección por reglas sobre 150 candidatos (la usa la corrida de evaluación).
 *   - `clientesDelDataset()`: los mismos seis generados directo por su posición (la usa la pantalla
 *     «Datos de prueba» de la app, sin tener que generar ni analizar a los 150).
 */
import { analizar, detectarRecurrentes, idsRecurrentes, mediana } from "@/motor";
import type { Analisis, Movimiento, Perfil } from "@/motor";
import { generarPerfil, HOY_DEMO } from "@/datos/perfiles";
import { datosDeRosa } from "@/datos/semilla";
import type { Datos, Fijo } from "@/datos/tipos";
import { aPerfil, generarCliente, generarPoblacion, type Cliente } from "./poblacion";

/** Semilla propia: estos casos no son ni la población de ajuste ni la de examen. */
export const SEMILLA_AGENTE = 20261116;
const CANDIDATOS = 150;
/**
 * Todos estos clientes comparten el «hoy» del caso de ejemplo de la app: su historia son los 90 días anteriores
 * y su futuro los 30 siguientes. Así las fechas no cambian de un cliente a otro ni respecto a Rosa.
 */
export const CORTE_AGENTE = HOY_DEMO;

export interface CasoFijo {
  /** Posición en la población (cli-0004 es la posición 3). */
  indice: number;
  /** Nombre de pila inventado con el que el asistente le habla. */
  nombre: string;
  /** Por qué se eligió. */
  motivo: string;
}

export const CASOS_FIJOS: readonly CasoFijo[] = [
  { indice: 7, nombre: "Ana", motivo: "dependiente con déficit proyectado y deudas" },
  { indice: 3, nombre: "Luis", motivo: "dependiente sin déficit, con deudas" },
  { indice: 19, nombre: "Carmen", motivo: "independiente con déficit proyectado" },
  { indice: 13, nombre: "Jorge", motivo: "independiente sin déficit y sin deudas" },
  { indice: 1, nombre: "Marta", motivo: "mixto con déficit proyectado" },
  { indice: 15, nombre: "Diego", motivo: "historia con movimientos duplicados" },
];

export interface ClienteDelDataset extends CasoFijo {
  cliente: Cliente;
  /** true solo para Rosa: es el caso de ejemplo de la app, no uno de los clientes con los que se evaluó al asistente. */
  demo?: boolean;
}

/**
 * Rosa, el caso de ejemplo de la app, con la misma forma que los clientes del dataset para poder verla en
 * «Datos de prueba». Su historia son sus 90 días de movimientos; no tiene 30 días siguientes guardados ni
 * movimientos ocultos, porque sirve para la demo y no para medir. Lo «fijo» se marca por construcción:
 * son los pagos que su generador repite cada mes.
 */
export function casoDeRosa(): ClienteDelDataset {
  const rosa = generarPerfil("independiente");
  const historia = rosa.movimientos.map(m => {
    const fijo = m.id.includes("-mensual-");
    return { ...m, comercio: m.descripcion, recurrente: fijo, ...(fijo ? { serie: "mensual" as const } : {}), duplicado: false, atipico: false };
  });
  return {
    indice: -1, nombre: rosa.nombre, motivo: "el caso de ejemplo de la app", demo: true,
    cliente: {
      id: rosa.id, tipo: rosa.tipo, escenarios: [], corte: rosa.hoy, ingresoMensual: datosDeRosa().perfil.ingresoAprox,
      // Su saldo de apertura es el de hoy menos todo lo que se movió en su cuenta (lo pagado con tarjeta no la toca).
      saldoApertura: rosa.saldoActual - rosa.movimientos.filter(m => m.canal !== "tarjeta").reduce((suma, m) => suma + m.monto, 0),
      saldoCorte: rosa.saldoActual, historia, ocultos: [], futuro: [], deudas: rosa.deudas,
    },
  };
}

/** Los seis clientes del dataset, generados por su posición. Determinista: misma semilla, mismos datos. */
export function clientesDelDataset(): ClienteDelDataset[] {
  return CASOS_FIJOS.map(caso => ({ ...caso, cliente: generarCliente(SEMILLA_AGENTE, caso.indice, CORTE_AGENTE) }));
}

/**
 * Uno de estos clientes como caso de la app, para verlo en el copiloto con sus 90 días de historia reales.
 * Igual que con Rosa: lo que el motor reconoce como fijo cada mes (sueldo, alquiler, servicios, suscripciones) pasa a
 * las listas de «Mi dinero», con su día y su monto, y se puede editar; el resto de la historia queda como movimientos
 * del día a día (sin etiquetas de verdad ni comercio). Los pagos de sus deudas se quitan de la historia porque la app
 * los vuelve a armar desde cada deuda: así no se cuentan dos veces.
 * Como «pago habitual» de cada deuda va la mediana de lo que de verdad pagó en la historia (el pago de una tarjeta
 * cambia de un mes a otro): es el mismo monto que el motor detecta, y por eso la proyección sale idéntica.
 * Única diferencia: si a la historia le falta un pago (datos incompletos), la evaluación no reconoce esa cuota y no
 * la proyecta; la app sí, porque la deuda está declarada. En ese cliente la app muestra un faltante mayor.
 * No es un caso propio: el id del cliente lo deja como caso de ejemplo, con su fecha de corte como «hoy».
 */
export function aDatos({ cliente, nombre, demo }: ClienteDelDataset): Datos {
  // Rosa ya tiene su propia forma de cargarse en la app: la de siempre, para que sus cifras no cambien.
  if (demo) return datosDeRosa();
  const pagosDeDeuda = new Set(cliente.deudas.map(d => `Pago ${d.nombre}`));
  const pagoHabitual = (d: Cliente["deudas"][number]) => {
    const pagados = cliente.historia.filter(m => m.descripcion === `Pago ${d.nombre}`).map(m => -m.monto);
    return pagados.length ? Math.max(mediana(pagados), d.pagoMinimo) : d.pagoHabitual;
  };
  // Lo fijo de cada mes, tal como lo detecta el motor. Lo semanal se queda en la historia: «Mi dinero» solo guarda fijos mensuales.
  const mensuales = detectarRecurrentes(cliente.historia, cliente.deudas).filter(r => r.categoria !== "deuda" && r.frecuencia === "mensual");
  const enSerie = idsRecurrentes(cliente.historia, cliente.deudas);
  const esDeUnFijo = (m: Cliente["historia"][number]) =>
    enSerie.has(m.id) && mensuales.some(r => r.descripcion === m.descripcion && Math.sign(r.monto) === Math.sign(m.monto));
  const aFijo = (r: (typeof mensuales)[number]): Fijo => ({
    id: `fijo-${r.id}`, descripcion: r.descripcion, monto: Math.abs(r.monto), dia: r.diaDelMes!, categoria: r.categoria,
  });
  return {
    perfil: {
      id: cliente.id, nombre, tipo: cliente.tipo,
      descripcion: `Cliente sintético de prueba (${cliente.id}) con 90 días de movimientos inventados.`,
      ingresoAprox: cliente.ingresoMensual, diasCobro: [], hoy: cliente.corte,
    },
    cuentas: [{ id: "cuenta-principal", nombre: "Cuenta principal", saldo: cliente.saldoCorte }],
    ingresosFijos: mensuales.filter(r => r.monto > 0).map(aFijo),
    gastosFijos: mensuales.filter(r => r.monto < 0).map(aFijo),
    movimientos: cliente.historia
      .filter(m => !pagosDeDeuda.has(m.descripcion) && !esDeUnFijo(m))
      .map(({ id, fecha, monto, descripcion, categoria, canal }) => ({ id, fecha, monto, descripcion, categoria, canal })),
    deudas: cliente.deudas.map(d => ({
      id: d.id, entidad: "Otra entidad", nombre: d.nombre, tipo: d.tipo, saldo: d.saldo, tceaBp: d.tceaBp,
      pagoMinimo: d.pagoMinimo, pagoHabitual: pagoHabitual(d), diaPago: d.diaPago, diasAtraso: 0, pagada: false,
    })),
    cobros: [], documentos: [], avisosLeidos: [],
  };
}

export interface Caso {
  cliente: Cliente;
  perfil: Perfil;
  analisis: Analisis;
  motivo: string;
}

type Candidato = Omit<Caso, "motivo">;

const REGLAS: readonly ((c: Candidato) => boolean)[] = [
  c => c.cliente.tipo === "dependiente" && !!c.analisis.proyeccion.deficit && c.cliente.deudas.length > 0,
  c => c.cliente.tipo === "dependiente" && !c.analisis.proyeccion.deficit && c.cliente.deudas.length > 0,
  c => c.cliente.tipo === "independiente" && !!c.analisis.proyeccion.deficit,
  c => c.cliente.tipo === "independiente" && !c.analisis.proyeccion.deficit && c.cliente.deudas.length === 0,
  c => c.cliente.tipo === "mixto" && !!c.analisis.proyeccion.deficit,
  c => c.cliente.escenarios.some(e => e === "movimiento_repetido" || e === "suscripcion_duplicada"),
];

/** Seis casos variados, elegidos por reglas fijas: de 150 candidatos, el primero que cumple cada una. */
export function elegirCasos(): Caso[] {
  const todos: Candidato[] = generarPoblacion(SEMILLA_AGENTE, CANDIDATOS, CORTE_AGENTE).map(cliente => {
    const perfil = aPerfil(cliente);
    return { cliente, perfil, analisis: analizar(perfil) };
  });
  const usados = new Set<string>();
  return REGLAS.map((cumple, i) => {
    const { nombre, motivo } = CASOS_FIJOS[i];
    const elegido = todos.find(c => !usados.has(c.cliente.id) && cumple(c));
    if (!elegido) throw new Error(`Ningún candidato cumple: ${motivo}`);
    usados.add(elegido.cliente.id);
    // Al asistente le llega un nombre de pila inventado y solo los campos que usa el motor (sin etiquetas de verdad).
    // La descripción es neutra: no le cuenta por qué se eligió el caso.
    const movimientos: Movimiento[] = elegido.perfil.movimientos.map(({ id, fecha, monto, descripcion, categoria, canal }) => ({ id, fecha, monto, descripcion, categoria, canal }));
    const perfil: Perfil = { ...elegido.perfil, nombre, descripcion: "Cliente sintético de prueba con 90 días de movimientos inventados.", movimientos };
    return { cliente: elegido.cliente, perfil, analisis: analizar(perfil), motivo };
  });
}
