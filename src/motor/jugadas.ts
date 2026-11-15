import { formatoSoles, formatoTasa, interesMensual, sumar } from './dinero';
import { formatoLargo } from './fechas';
import { proyectar } from './proyeccion';
import { detectarRecurrentes, estimarGastoVariable, variables } from './recurrentes';
import type { Ajuste, Categoria, EventoProyectado, Jugada, Perfil, Proyeccion, Recurrente } from './tipos';

/**
 * Jugadas que una persona puede hacer HOY por su cuenta, sin pedir nada al banco:
 * - pausar o cancelar suscripciones que se cobran antes del bache (se hace desde la app de cada servicio);
 * - pagar solo el mínimo de una tarjeta este mes (es su derecho; cuesta intereses);
 * - recortar gasto de ocio o compras, nunca comida básica, salud ni transporte de trabajo.
 * Ya no se propone «cambiar la fecha de pago»: donde existe, el cambio de ciclo rige desde el ciclo
 * siguiente y depende de la entidad, así que no sirve para el bache de este mes.
 */
type Candidato = { evento: EventoProyectado; recurrente: Recurrente };
/** Categorías que se pueden recortar sin tocar lo básico. */
const RECORTABLES: Categoria[] = ['ocio', 'compras'];

function evaluar(perfil: Perfil, ajustes: Ajuste[]) {
  const proyeccion = proyectar(perfil, { ajustes });
  return { ajustes, resuelve: proyeccion.deficit === null, saldoMinimoDespues: proyeccion.saldoMinimo };
}
/** «a», «a y b», «a, b y c». */
function lista(partes: string[]): string {
  return partes.length <= 1 ? (partes[0] ?? '') : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}
function minuscula(texto: string): string {
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}
function pausar(perfil: Perfil, candidatos: Candidato[]): Jugada | undefined {
  const suscripciones = candidatos.filter(c => c.recurrente.categoria === 'suscripciones');
  if (suscripciones.length === 0) return;
  const libera = sumar(suscripciones.map(c => -c.evento.monto));
  const nombres = lista(suscripciones.map(c => `${minuscula(c.evento.descripcion)} (${formatoSoles(-c.evento.monto)}, ${formatoLargo(c.evento.fecha)})`));
  return { id: 'jugada-pausar', tipo: 'pausar_suscripciones', titulo: 'Pausa tus suscripciones este mes',
    detalle: `Pausa o cancela ${nombres} antes de que se cobren y liberas ${formatoSoles(libera)}.`,
    libera, costo: 0,
    costoDetalle: `${formatoSoles(0)}: no genera intereses. Revisa antes si alguna cobra por cancelar o congelar.`,
    ...evaluar(perfil, suscripciones.map(c => ({ tipo: 'cambiar_monto' as const, recurrenteId: c.recurrente.id, fecha: c.evento.fecha, monto: 0 }))) };
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
/** Las dos descripciones en las que más se gastó de esa categoría, para nombrar el recorte con palabras de la persona. */
function enQueSeGasta(perfil: Perfil, categoria: Categoria): string[] {
  const porDescripcion = new Map<string, number>();
  for (const m of variables(perfil.movimientos, perfil.deudas, perfil.hoy)) {
    if (m.categoria !== categoria || m.monto >= 0) continue;
    porDescripcion.set(m.descripcion, (porDescripcion.get(m.descripcion) ?? 0) - m.monto);
  }
  return [...porDescripcion.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 2).map(([d]) => minuscula(d));
}
function recortar(perfil: Perfil, proyeccion: Proyeccion): Jugada | undefined {
  const categoria = estimarGastoVariable(perfil.movimientos, perfil.deudas, perfil.hoy).porCategoria
    .find(c => RECORTABLES.includes(c.categoria));
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
  const nombres = enQueSeGasta(perfil, categoria.categoria);
  const que = nombres.length > 0 ? lista(nombres) : categoria.categoria;
  return { id: 'jugada-recortar', tipo: 'recortar_gasto', titulo: `Recorta ${que}`,
    detalle: `Gasta ${mejor.bp / 100} % menos en ${que} hasta el ${formatoLargo(hasta)} y guardas ${formatoSoles(libera)}. No toca tu comida básica ni tus gastos de trabajo.`,
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
  return [pausar(perfil, candidatos), minimo(perfil, candidatos), recortar(perfil, proyeccion)]
    .filter((j): j is Jugada => j !== undefined).sort((a, b) => Number(b.resuelve) - Number(a.resuelve) || a.costo - b.costo);
}
