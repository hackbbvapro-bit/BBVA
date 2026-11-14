import { exigirCentimos, porcentaje, redondear, sumar } from './dinero';
import { diasEntre, ocurrenciasCada, ocurrenciasMensuales, rangoDias, sumarDias } from './fechas';
import { detectarRecurrentes, estimarGastoVariable, estimarIngresoVariable } from './recurrentes';
import type { Ajuste, Deficit, DiaProyectado, EventoProyectado, Perfil, Proyeccion } from './tipos';
export interface OpcionesProyeccion { dias?: number; ajustes?: Ajuste[] }

function eventosBase(perfil: Perfil, desde: string, hasta: string): EventoProyectado[] {
  return detectarRecurrentes(perfil.movimientos.filter(m => m.fecha <= perfil.hoy), perfil.deudas).flatMap(r => {
    const fechas = r.frecuencia === 'mensual' ? ocurrenciasMensuales(r.diaDelMes!, desde, hasta)
      : ocurrenciasCada(7, r.ultimaFecha, desde, hasta);
    return fechas.map(fecha => ({ fecha, monto: r.monto, descripcion: r.descripcion,
      categoria: r.categoria, origen: 'recurrente' as const, recurrenteId: r.id }));
  });
}
function ajustar(eventos: EventoProyectado[], ajustes: Ajuste[]): EventoProyectado[] {
  return ajustes.reduce((actuales, a) => actuales.map(e => {
    if (a.tipo === 'recortar' || e.recurrenteId !== a.recurrenteId) return e;
    if (a.tipo === 'mover' && e.fecha === a.desde) return { ...e, fecha: a.hacia };
    if (a.tipo === 'cambiar_monto' && e.fecha === a.fecha) return { ...e, monto: exigirCentimos(a.monto) };
    return e;
  }), eventos);
}
function deficit(dias: DiaProyectado[], hoy: string, minimo: DiaProyectado): Deficit | null {
  const primero = dias.find(d => d.saldo < 0);
  if (!primero) return null;
  const eventos = dias.flatMap(d => d.eventos);
  const salidas = eventos.filter(e => e.origen === 'recurrente' && e.monto < 0 && e.fecha <= primero.fecha)
    .sort((a, b) => a.monto - b.monto);
  const cercanas = salidas.filter(e => e.fecha >= sumarDias(primero.fecha, -2));
  const ingreso = eventos.find(e => e.origen === 'recurrente' && e.monto > 0 && e.fecha > primero.fecha);
  return { fecha: primero.fecha, faltante: -primero.saldo, faltanteMaximo: -minimo.saldo,
    fechaFaltanteMaximo: minimo.fecha, diasRestantes: diasEntre(hoy, primero.fecha),
    causas: cercanas.length ? cercanas : salidas.slice(0, 1), ...(ingreso ? { proximoIngreso: ingreso } : {}) };
}
export function proyectar(perfil: Perfil, opciones: OpcionesProyeccion = {}): Proyeccion {
  const cantidad = opciones.dias ?? 30;
  if (!Number.isInteger(cantidad) || cantidad < 1) throw new Error('Los días deben ser un entero positivo');
  const desde = sumarDias(perfil.hoy, 1), hasta = sumarDias(perfil.hoy, cantidad);
  const ajustes = opciones.ajustes ?? [];
  const eventos = ajustar(eventosBase(perfil, desde, hasta), ajustes);
  const ingreso = Math.floor(estimarIngresoVariable(perfil.movimientos, perfil.deudas, perfil.hoy).semanalPrudente / 7);
  const gasto = estimarGastoVariable(perfil.movimientos, perfil.deudas, perfil.hoy);
  let saldo = exigirCentimos(perfil.saldoActual);
  const dias = rangoDias(desde, cantidad).map(fecha => {
    const delDia = eventos.filter(e => e.fecha === fecha);
    if (ingreso > 0) delDia.push({ fecha, monto: ingreso, descripcion: 'Ingresos del día (estimado prudente)', categoria: 'ingreso_variable', origen: 'ingreso_variable' });
    const recorte = sumar(ajustes.filter(a => a.tipo === 'recortar' && fecha <= a.hasta).map(a => {
      if (a.tipo !== 'recortar') return 0;
      if (a.bp < 0 || a.bp > 10000) throw new Error('El recorte debe estar entre 0 y 100 %');
      return porcentaje(redondear((gasto.porCategoria.find(c => c.categoria === a.categoria)?.mensual ?? 0) / 30), a.bp);
    }));
    const monto = Math.min(0, sumar([gasto.diario, recorte]));
    if (monto < 0) delDia.push({ fecha, monto, descripcion: 'Gastos del día a día (estimado)', categoria: 'otros', origen: 'gasto_variable' });
    saldo = exigirCentimos(sumar([saldo, ...delDia.map(e => e.monto)]));
    return { fecha, saldo, eventos: delDia };
  });
  const minimo = dias.reduce((a, b) => a.saldo <= b.saldo ? a : b);
  return { perfilId: perfil.id, desde, hasta, saldoInicial: perfil.saldoActual, dias,
    saldoMinimo: minimo.saldo, fechaSaldoMinimo: minimo.fecha, saldoFinal: saldo,
    deficit: deficit(dias, perfil.hoy, minimo) };
}
