/**
 * Exporta la población sintética a CSV. El dinero sale en soles con dos decimales, armado
 * desde céntimos enteros (sin pasar por decimales de coma flotante).
 * No hay columna de hora: el generador trabaja por día y no se inventa una.
 */
import type { Centimos } from '@/motor/tipos';
import type { Cliente, MovimientoEtiquetado } from './poblacion';
import { avisoDe } from './pronostico';
import { saldosReales } from './poblacion';

export function soles(c: Centimos): string {
  if (!Number.isSafeInteger(c)) throw new Error('El monto debe venir en céntimos enteros');
  const abs = Math.abs(c);
  return `${c < 0 ? '-' : ''}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

const celda = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s; };
const csv = (cabecera: string[], filas: (string | number)[][]) => [cabecera, ...filas].map(f => f.map(celda).join(',')).join('\n') + '\n';
const siNo = (v: boolean) => v ? 1 : 0;
/** Las billeteras digitales se exportan sin nombre de marca. */
const canal = (c: MovimientoEtiquetado['canal']) => c === 'yape' || c === 'plin' ? 'billetera_digital' : c;

export const COLUMNAS_TRANSACCIONES = ['customer_id', 'transaction_id', 'fecha', 'monto', 'moneda', 'tipo', 'categoria', 'descripcion', 'comercio',
  'canal', 'particion', 'es_recurrente', 'serie', 'es_duplicado', 'tipo_duplicado', 'es_atipico'];

export function transaccionesCsv(clientes: Cliente[]): string {
  const filas = clientes.flatMap(c => ([['historia', c.historia], ['oculto', c.ocultos], ['futuro', c.futuro]] as const).flatMap(([particion, lista]) =>
    lista.map(m => [c.id, m.id, m.fecha, soles(m.monto), 'PEN', m.monto > 0 ? 'ingreso' : 'gasto', m.categoria, m.descripcion, m.comercio, canal(m.canal),
      particion, siNo(m.recurrente), m.serie ?? '', siNo(m.duplicado), m.tipoDuplicado ?? '', siNo(m.atipico)])));
  return csv(COLUMNAS_TRANSACCIONES, filas);
}

export const COLUMNAS_CLIENTES = ['customer_id', 'tipo_perfil', 'fecha_corte', 'ingreso_mensual_diseno', 'saldo_apertura', 'saldo_corte', 'escenarios',
  'n_deudas', 'deuda_total', 'mov_historia', 'mov_ocultos', 'mov_futuro', 'deficit_real_30d', 'dia_deficit', 'faltante_maximo'];

export function clientesCsv(clientes: Cliente[]): string {
  return csv(COLUMNAS_CLIENTES, clientes.map(c => {
    const saldos = saldosReales(c), aviso = avisoDe(saldos);
    return [c.id, c.tipo, c.corte, soles(c.ingresoMensual), soles(c.saldoApertura), soles(c.saldoCorte), c.escenarios.join('|'), c.deudas.length,
      soles(c.deudas.reduce((s, d) => s + d.saldo, 0)), c.historia.length, c.ocultos.length, c.futuro.length, siNo(aviso.hay), aviso.dia ?? '',
      soles(Math.max(0, -Math.min(...saldos)))];
  }));
}

export const COLUMNAS_DEUDAS = ['customer_id', 'deuda_id', 'nombre', 'tipo', 'saldo', 'tcea_pct', 'pago_minimo', 'pago_habitual', 'dia_pago'];

export function deudasCsv(clientes: Cliente[]): string {
  return csv(COLUMNAS_DEUDAS, clientes.flatMap(c => c.deudas.map(d =>
    [c.id, d.id, d.nombre, d.tipo, soles(d.saldo), soles(d.tceaBp), soles(d.pagoMinimo), soles(d.pagoHabitual), d.diaPago])));
}
