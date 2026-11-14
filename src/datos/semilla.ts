import { detectarRecurrentes, estimarIngresoVariable, idsRecurrentes } from "../motor/recurrentes";
import { partes } from "../motor/fechas";
import { generarPerfil } from "./perfiles";
import type { Datos, DeudaGuardada, Fijo } from "./tipos";

/**
 * Datos de arranque: Rosa, la persona sintética de la demo. Se parte de `generarPerfil` para que
 * las cifras sean exactamente las de siempre; lo fijo y las deudas pasan a ser filas editables
 * y la historia variable queda como movimientos.
 */
export function datosDeRosa(): Datos {
  const rosa = generarPerfil("independiente");
  const recurrentes = detectarRecurrentes(rosa.movimientos, rosa.deudas);
  const fijosIds = idsRecurrentes(rosa.movimientos, rosa.deudas);
  const aFijo = (r: (typeof recurrentes)[number]): Fijo => ({
    id: `semilla-${r.id}`, descripcion: r.descripcion, monto: Math.abs(r.monto), dia: r.diaDelMes ?? partes(r.ultimaFecha).dia, categoria: r.categoria,
  });
  const fijos = recurrentes.filter(r => r.categoria !== "deuda" && r.frecuencia === "mensual");
  const deudas: DeudaGuardada[] = rosa.deudas.map(d => ({
    id: d.id, entidad: "Otra entidad", nombre: d.nombre, tipo: d.tipo, saldo: d.saldo, tceaBp: d.tceaBp,
    pagoMinimo: d.pagoMinimo, pagoHabitual: d.pagoHabitual, diaPago: d.diaPago, diasAtraso: 0, pagada: false,
  }));
  // Ingreso del mes aproximado (a decenas de soles) desde su semana típica; solo informativo.
  const ingresoAprox = Math.round(((estimarIngresoVariable(rosa.movimientos, rosa.deudas, rosa.hoy).semanalTipico * 52) / 12) / 1000) * 1000;
  return {
    perfil: {
      id: rosa.id, nombre: rosa.nombre, tipo: rosa.tipo, descripcion: rosa.descripcion,
      ingresoAprox, diasCobro: [], hoy: rosa.hoy,
    },
    cuentas: [{ id: "cuenta-principal", nombre: "Cuenta principal", saldo: rosa.saldoActual }],
    ingresosFijos: fijos.filter(r => r.monto > 0).map(aFijo),
    gastosFijos: fijos.filter(r => r.monto < 0).map(aFijo),
    movimientos: rosa.movimientos.filter(m => !fijosIds.has(m.id)),
    deudas, cobros: [], documentos: [], avisosLeidos: [],
  };
}
