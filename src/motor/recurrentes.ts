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
function esMensual(grupo: Movimiento[], minimo = 3): boolean {
  if (grupo.length < minimo || new Set(grupo.map(m => m.fecha.slice(0, 7))).size !== grupo.length) return false;
  const dias = grupo.map(m => partes(m.fecha).dia);
  const mayor = Math.max(...dias);
  return grupo.every(m => {
    const { anio, mes, dia } = partes(m.fecha);
    return Math.min(mayor, ultimoDiaDelMes(anio, mes)) - dia <= 3;
  });
}
/** Separación mínima entre los dos días de cobro para hablar de quincena y no de un cobro repetido. */
const DIAS_ENTRE_QUINCENAS = 10;
/**
 * Dos cobros al mes con la misma descripción (la quincena: día 15 y fin de mes) no son una serie mensual,
 * sino dos. Se separan por día de cobro; cada mitad tiene que pasar después las mismas reglas que
 * cualquier pago mensual.
 */
function partirEnDos(grupo: Movimiento[]): [Movimiento[], Movimiento[]] | undefined {
  const porMes = new Map<string, Movimiento[]>();
  for (const m of grupo) porMes.set(m.fecha.slice(0, 7), [...(porMes.get(m.fecha.slice(0, 7)) ?? []), m]);
  const meses = [...porMes.values()];
  const completos = meses.filter(mes => mes.length === 2);
  if (meses.some(mes => mes.length > 2) || completos.length < 2) return;
  const [diaA, diaB] = [0, 1].map(i => Math.max(...completos.map(mes => partes(mes[i].fecha).dia)));
  if (diaB - diaA < DIAS_ENTRE_QUINCENAS) return;
  const mitades: [Movimiento[], Movimiento[]] = [[], []];
  for (const mes of meses) {
    if (mes.length === 2) { mitades[0].push(mes[0]); mitades[1].push(mes[1]); continue; }
    // Mes con un solo cobro (la historia empieza o termina a mitad de mes): va con el día que le queda más cerca.
    const { anio, mes: numero, dia } = partes(mes[0].fecha);
    const lejos = (objetivo: number) => Math.abs(Math.min(objetivo, ultimoDiaDelMes(anio, numero)) - dia);
    mitades[lejos(diaA) <= lejos(diaB) ? 0 : 1].push(mes[0]);
  }
  return mitades;
}
function detectar(grupo: Movimiento[], deudas: Deuda[], sufijo = '', minimo = 3): Recurrente | undefined {
  const monto = mediana(grupo.map(m => m.monto));
  if (!grupo.every(m => Math.abs(m.monto - monto) * 4 <= Math.abs(monto))) return;
  const mensual = esMensual(grupo, minimo);
  const semanal = grupo.length >= 6 && grupo.slice(1).every((m, i) => {
    const dias = diasEntre(grupo[i].fecha, m.fecha);
    return dias >= 6 && dias <= 8;
  });
  if (!mensual && !semanal) return;
  const primero = grupo[0];
  const deuda = primero.categoria === 'deuda'
    ? deudas.find(d => normalizar(`Pago ${d.nombre}`) === normalizar(primero.descripcion)) : undefined;
  return {
    id: `rec-${normalizar(primero.descripcion)}-${monto > 0 ? 'entrada' : 'salida'}${sufijo}`,
    descripcion: primero.descripcion, categoria: primero.categoria, canal: primero.canal,
    monto, frecuencia: mensual ? 'mensual' : 'semanal',
    ...(mensual ? { diaDelMes: Math.max(...grupo.map(m => partes(m.fecha).dia)) } : {}),
    ultimaFecha: grupo[grupo.length - 1].fecha, veces: grupo.length,
    ...(deuda ? { deudaId: deuda.id } : {}),
    movible: ['suscripciones', 'deuda'].includes(primero.categoria),
  };
}
interface Serie { recurrente: Recurrente; movimientos: Movimiento[] }
/**
 * Las series que se repiten dentro de un grupo: el grupo entero o, si se cobra dos veces al mes, sus dos mitades.
 * La quincena solo cuenta si LAS DOS mitades son regulares (día y monto); así un gasto que coincidió un par
 * de veces no pasa por fijo. A cambio, como la otra mitad sirve de respaldo, a una de las dos le bastan dos cobros
 * (en 90 días de historia uno de los dos días de pago suele aparecer solo dos veces).
 */
function series(grupo: Movimiento[], deudas: Deuda[]): Serie[] {
  const entero = detectar(grupo, deudas);
  if (entero) return [{ recurrente: entero, movimientos: grupo }];
  const mitades = partirEnDos(grupo);
  if (!mitades || Math.max(mitades[0].length, mitades[1].length) < 3) return [];
  const quincena = mitades.map(mitad => ({ movimientos: mitad,
    recurrente: detectar(mitad, deudas, `-dia-${Math.max(...mitad.map(m => partes(m.fecha).dia))}`, 2) }));
  return quincena.every(s => s.recurrente?.frecuencia === 'mensual') ? quincena as Serie[] : [];
}
export function detectarRecurrentes(movimientos: Movimiento[], deudas: Deuda[]): Recurrente[] {
  return grupos(movimientos).flatMap(g => series(g, deudas).map(s => s.recurrente));
}
export function idsRecurrentes(movimientos: Movimiento[], deudas: Deuda[]): Set<string> {
  return new Set(grupos(movimientos).flatMap(g => series(g, deudas)).flatMap(s => s.movimientos.map(m => m.id)));
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
