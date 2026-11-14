import { formatoSoles, formatoTasa, interes, interesMensual, sumar } from './dinero';
import { diasEntre, formatoLargo, rangoDias, sumarDias } from './fechas';
import { proyectar } from './proyeccion';
import { detectarRecurrentes, estimarGastoVariable } from './recurrentes';
import type { Ajuste, EventoProyectado, Jugada, Perfil, Proyeccion, Recurrente } from './tipos';

type Candidato = { evento: EventoProyectado; recurrente: Recurrente };
function evaluar(perfil: Perfil, ajustes: Ajuste[]) {
  const proyeccion = proyectar(perfil, { ajustes });
  return { ajustes, resuelve: proyeccion.deficit === null, saldoMinimoDespues: proyeccion.saldoMinimo };
}
function mover(perfil: Perfil, candidatos: Candidato[]): Jugada | undefined {
  const candidato = candidatos.filter(c => c.recurrente.movible).sort((a, b) => a.evento.monto - b.evento.monto)[0];
  if (!candidato) return;
  const { evento, recurrente } = candidato;
  const pruebas = rangoDias(sumarDias(evento.fecha, 1), 21).map(hacia => ({ hacia,
    ...evaluar(perfil, [{ tipo: 'mover', recurrenteId: recurrente.id, desde: evento.fecha, hacia }]),
  }));
  const mejor = pruebas.find(p => p.resuelve) ?? [...pruebas].sort((a, b) => b.saldoMinimoDespues - a.saldoMinimoDespues)[0];
  const deuda = perfil.deudas.find(d => d.id === recurrente.deudaId);
  const retraso = diasEntre(evento.fecha, mejor.hacia);
  const costo = deuda ? interes(-evento.monto, deuda.tceaBp, retraso) : 0;
  return { id: 'jugada-mover', tipo: 'mover_pago', titulo: 'Cambia la fecha de un pago',
    detalle: `Pide mover ${evento.descripcion} de ${formatoLargo(evento.fecha)} a ${formatoLargo(mejor.hacia)} y libera ${formatoSoles(-evento.monto)}.`,
    libera: -evento.monto, costo,
    costoDetalle: deuda ? `${formatoSoles(costo)}: estimado de intereses por ${retraso} días. El banco puede cobrar además un cargo por pago tardío; conviene pedir el cambio de fecha antes de atrasarte.`
      : `${formatoSoles(0)}, sin costo: solo cambias la fecha o la pausas un mes`,
    ajustes: mejor.ajustes, resuelve: mejor.resuelve, saldoMinimoDespues: mejor.saldoMinimoDespues };
}
function minimo(perfil: Perfil, candidatos: Candidato[]): Jugada | undefined {
  const opciones = candidatos.flatMap(c => {
    const deuda = perfil.deudas.find(d => d.id === c.recurrente.deudaId && d.tipo === 'tarjeta' && d.pagoHabitual > d.pagoMinimo);
    return deuda ? [{ ...c, deuda, libera: sumar([deuda.pagoHabitual, -deuda.pagoMinimo]) }] : [];
  }).sort((a, b) => b.libera - a.libera);
  const c = opciones[0];
  if (!c) return;
  const costo = interesMensual(c.libera, c.deuda.tceaBp);
  return { id: 'jugada-minimo', tipo: 'pagar_minimo', titulo: 'Paga solo el mínimo este mes',
    detalle: `Paga ${formatoSoles(c.deuda.pagoMinimo)} de ${c.deuda.nombre} el ${formatoLargo(c.evento.fecha)} y libera ${formatoSoles(c.libera)}.`,
    libera: c.libera, costo,
    costoDetalle: `${formatoSoles(costo)} de intereses estimados de un mes sobre lo que dejas de pagar, a la tasa anual (TCEA) de ${formatoTasa(c.deuda.tceaBp)} de tu tarjeta.`,
    ...evaluar(perfil, [{ tipo: 'cambiar_monto', recurrenteId: c.recurrente.id, fecha: c.evento.fecha, monto: -c.deuda.pagoMinimo }]) };
}
function recortar(perfil: Perfil, proyeccion: Proyeccion): Jugada | undefined {
  const categoria = estimarGastoVariable(perfil.movimientos, perfil.deudas, perfil.hoy).porCategoria
    .find(c => ['ocio', 'compras', 'comida', 'transporte', 'otros'].includes(c.categoria));
  if (!categoria) return;
  const hasta = proyeccion.deficit!.fechaFaltanteMaximo;
  const pruebas = [1000, 2000, 3000, 4000, 5000].map(bp => ({ bp,
    ...evaluar(perfil, [{ tipo: 'recortar', categoria: categoria.categoria, bp, hasta }]),
  }));
  const mejor = pruebas.find(p => p.resuelve) ?? pruebas[2];
  const despues = proyectar(perfil, { ajustes: mejor.ajustes });
  const gastoHasta = (p: Proyeccion) => sumar(p.dias.filter(d => d.fecha <= hasta)
    .flatMap(d => d.eventos.filter(e => e.origen === 'gasto_variable').map(e => e.monto)));
  const libera = sumar([gastoHasta(despues), -gastoHasta(proyeccion)]);
  return { id: 'jugada-recortar', tipo: 'recortar_gasto', titulo: `Gasta menos en ${categoria.categoria}`,
    detalle: `Recorta ${mejor.bp / 100} % hasta el ${formatoLargo(hasta)} y guarda ${formatoSoles(libera)}.`,
    libera, costo: 0, costoDetalle: `${formatoSoles(0)}: no cuesta dinero, pero sí esfuerzo`,
    ajustes: mejor.ajustes, resuelve: mejor.resuelve, saldoMinimoDespues: mejor.saldoMinimoDespues };
}
export function proponerJugadas(perfil: Perfil, proyeccion: Proyeccion): Jugada[] {
  if (!proyeccion.deficit) return [];
  const recurrentes = detectarRecurrentes(perfil.movimientos.filter(m => m.fecha <= perfil.hoy), perfil.deudas);
  const candidatos = proyeccion.dias.flatMap(d => d.eventos).flatMap(evento => {
    const recurrente = recurrentes.find(r => r.id === evento.recurrenteId);
    return recurrente && evento.monto < 0 && evento.fecha <= proyeccion.deficit!.fechaFaltanteMaximo ? [{ evento, recurrente }] : [];
  });
  return [mover(perfil, candidatos), minimo(perfil, candidatos), recortar(perfil, proyeccion)]
    .filter((j): j is Jugada => j !== undefined).sort((a, b) => Number(b.resuelve) - Number(a.resuelve) || a.costo - b.costo);
}
