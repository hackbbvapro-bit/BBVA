import { mediana, percentil, redondear, sumar, exigirCentimos } from './dinero';
import { diasEntre, partes, sumarDias, ultimoDiaDelMes } from './fechas';
import type { Movimiento, Deuda, Recurrente, FechaISO, IngresoVariable, GastoVariable, Categoria } from './tipos';

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z\s]/g, '').trim().replace(/\s+/g, '-');
}
function grupos(movimientos: Movimiento[]): Movimiento[][] {
  const mapa = new Map<string, Movimiento[]>();
  for (const m of movimientos) {
    exigirCentimos(m.monto);
    if (m.canal === 'tarjeta' || m.monto === 0) continue;
    const clave = `${normalizar(m.descripcion)}-${Math.sign(m.monto)}`;
    mapa.set(clave, [...(mapa.get(clave) ?? []), m]);
  }
  return [...mapa.values()].map(g => g.sort((a, b) => a.fecha.localeCompare(b.fecha)));
}
function esMensual(grupo: Movimiento[]): boolean {
  if (grupo.length < 3 || new Set(grupo.map(m => m.fecha.slice(0, 7))).size !== grupo.length) return false;
  const dias = grupo.map(m => partes(m.fecha).dia);
  const mayor = Math.max(...dias);
  return grupo.every(m => {
    const { anio, mes, dia } = partes(m.fecha);
    return Math.min(mayor, ultimoDiaDelMes(anio, mes)) - dia <= 3;
  });
}
function detectar(grupo: Movimiento[], deudas: Deuda[]): Recurrente | undefined {
  const monto = mediana(grupo.map(m => m.monto));
  if (!grupo.every(m => Math.abs(m.monto - monto) * 4 <= Math.abs(monto))) return;
  const mensual = esMensual(grupo);
  const semanal = grupo.length >= 6 && grupo.slice(1).every((m, i) => {
    const dias = diasEntre(grupo[i].fecha, m.fecha);
    return dias >= 6 && dias <= 8;
  });
  if (!mensual && !semanal) return;
  const primero = grupo[0];
  const deuda = primero.categoria === 'deuda'
    ? deudas.find(d => normalizar(`Pago ${d.nombre}`) === normalizar(primero.descripcion)) : undefined;
  return {
    id: `rec-${normalizar(primero.descripcion)}-${monto > 0 ? 'entrada' : 'salida'}`,
    descripcion: primero.descripcion, categoria: primero.categoria, canal: primero.canal,
    monto, frecuencia: mensual ? 'mensual' : 'semanal',
    ...(mensual ? { diaDelMes: Math.max(...grupo.map(m => partes(m.fecha).dia)) } : {}),
    ultimaFecha: grupo[grupo.length - 1].fecha, veces: grupo.length,
    ...(deuda ? { deudaId: deuda.id } : {}),
    movible: ['suscripciones', 'deuda'].includes(primero.categoria),
  };
}
export function detectarRecurrentes(movimientos: Movimiento[], deudas: Deuda[]): Recurrente[] {
  return grupos(movimientos).flatMap(g => { const r = detectar(g, deudas); return r ? [r] : []; });
}
export function idsRecurrentes(movimientos: Movimiento[], deudas: Deuda[]): Set<string> {
  return new Set(grupos(movimientos).filter(g => detectar(g, deudas)).flatMap(g => g.map(m => m.id)));
}
function variables(movimientos: Movimiento[], deudas: Deuda[], hoy: FechaISO): Movimiento[] {
  const historia = movimientos.filter(m => m.fecha <= hoy);
  const ids = idsRecurrentes(historia, deudas);
  return historia.filter(m => m.fecha >= sumarDias(hoy, -83) && m.canal !== 'tarjeta' && !ids.has(m.id));
}
export function estimarIngresoVariable(movimientos: Movimiento[], deudas: Deuda[], hoy: FechaISO): IngresoVariable {
  const fechas = movimientos.filter(m => m.fecha <= hoy).map(m => m.fecha).sort();
  // Solo semanas completas; una historia menor a siete días no permite estimar una semana.
  const semanas = fechas.length ? Math.min(12, Math.floor((diasEntre(fechas[0], hoy) + 1) / 7)) : 0;
  const entradas = variables(movimientos, deudas, hoy).filter(m => m.monto > 0);
  const totales = Array.from({ length: semanas }, (_, i) => sumar(entradas
    .filter(m => Math.floor(diasEntre(m.fecha, hoy) / 7) === i).map(m => m.monto)));
  return { semanalPrudente: percentil(totales, 25), semanalTipico: mediana(totales), semanasObservadas: semanas };
}
export function estimarGastoVariable(movimientos: Movimiento[], deudas: Deuda[], hoy: FechaISO): GastoVariable {
  const salidas = variables(movimientos, deudas, hoy).filter(m => m.monto < 0);
  const categorias = [...new Set(salidas.map(m => m.categoria))] as Categoria[];
  return {
    diario: redondear(sumar(salidas.map(m => m.monto)) / 84),
    porCategoria: categorias.map(categoria => ({ categoria,
      mensual: redondear(-sumar(salidas.filter(m => m.categoria === categoria).map(m => m.monto)) * 30 / 84),
    })).filter(c => c.mensual > 0).sort((a, b) => b.mensual - a.mensual),
  };
}
