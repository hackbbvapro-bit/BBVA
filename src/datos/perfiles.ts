import { crearAzar } from './azar';
import { diaSemana, ocurrenciasMensuales, rangoDias } from '../motor/fechas';
import { sumar } from '../motor/dinero';
import type { Categoria, Deuda, Movimiento, Perfil, TipoPerfil } from '../motor/tipos';

export const HOY_DEMO = '2026-11-13';
const INICIO = '2026-08-16';
// Saldos de apertura sintéticos, en céntimos; no son movimientos ni ingresos.
export const APERTURAS: Record<TipoPerfil, number> = { independiente: 82000, dependiente: 180000, mixto: 219560 };
function crearDeudas(tipo: TipoPerfil): Deuda[] {
  const tarjeta: Deuda = { id: `${tipo}-tarjeta`, nombre: 'Tarjeta Azul', tipo: 'tarjeta',
    saldo: 180000, tceaBp: 10000, pagoMinimo: 16000, pagoHabitual: 60000, diaPago: 23 };
  if (tipo === 'mixto') return [{ ...tarjeta, pagoHabitual: 30000 }];
  if (tipo === 'dependiente') return [{ ...tarjeta, pagoHabitual: 25000 },
    { id: 'prestamo', nombre: 'Préstamo', tipo: 'prestamo', saldo: 200000, tceaBp: 4500, pagoMinimo: 20000, pagoHabitual: 20000, diaPago: 20 }];
  return [tarjeta, { ...tarjeta, id: 'segunda', nombre: 'Tarjeta Verde', saldo: 90000, tceaBp: 5500, pagoMinimo: 8000, pagoHabitual: 15000, diaPago: 5 },
    { id: 'independiente-prestamo', nombre: 'Préstamo personal', tipo: 'prestamo', saldo: 450000, tceaBp: 4800, pagoMinimo: 27000, pagoHabitual: 27000, diaPago: 20 }];
}
type Regla = { dia: number; monto: number; descripcion: string; categoria: Categoria };
/**
 * Andrea, fisioterapeuta independiente: tres suscripciones que se pueden pausar, servicios de trabajo
 * que no (el software de agenda y recibos), un seguro de salud y tres deudas con tasas distintas.
 */
function reglasAndrea(): Regla[] {
  return [
    { dia: 23, monto: -85000, descripcion: 'Alquiler', categoria: 'alquiler' },
    { dia: 2, monto: -12000, descripcion: 'Seguro de salud', categoria: 'salud' },
    { dia: 4, monto: -4500, descripcion: 'Software de agenda y recibos', categoria: 'servicios' },
    { dia: 8, monto: -6500, descripcion: 'Luz', categoria: 'servicios' },
    { dia: 9, monto: -3500, descripcion: 'Agua', categoria: 'servicios' },
    { dia: 10, monto: -8900, descripcion: 'Internet y celular', categoria: 'servicios' },
    { dia: 16, monto: -3990, descripcion: 'Streaming de películas', categoria: 'suscripciones' },
    { dia: 17, monto: -9900, descripcion: 'Gimnasio', categoria: 'suscripciones' },
    { dia: 19, monto: -2290, descripcion: 'Música en línea', categoria: 'suscripciones' },
  ];
}
function mensuales(tipo: TipoPerfil, deudas: Deuda[]): Movimiento[] {
  const pagos = deudas.map(d => ({ dia: d.diaPago, monto: -d.pagoHabitual, descripcion: `Pago ${d.nombre}`, categoria: 'deuda' as const }));
  const reglas: Regla[] = tipo === 'independiente' ? [...reglasAndrea(), ...pagos] : [
    { dia: 23, monto: -50000, descripcion: 'Alquiler', categoria: 'alquiler' },
    { dia: 8, monto: -5000, descripcion: 'Luz', categoria: 'servicios' },
    { dia: 9, monto: -3000, descripcion: 'Agua', categoria: 'servicios' },
    { dia: 10, monto: -4000, descripcion: 'Internet', categoria: 'servicios' },
    { dia: 11, monto: -3000, descripcion: 'Streaming', categoria: 'suscripciones' },
    ...pagos,
  ];
  if (tipo !== 'independiente') reglas.push({ dia: 30, monto: tipo === 'dependiente' ? 180000 : 85000, descripcion: 'Sueldo', categoria: 'sueldo' });
  if (tipo === 'dependiente') reglas.push({ dia: 12, monto: -5000, descripcion: 'Gimnasio', categoria: 'suscripciones' });
  return reglas.flatMap((r, i) => ocurrenciasMensuales(r.dia, INICIO, HOY_DEMO).map(fecha => ({
    id: `${tipo}-mensual-${i}-${fecha}`, fecha, monto: r.monto, descripcion: r.descripcion, categoria: r.categoria, canal: 'cuenta' as const,
  })));
}
/** Día a día de Andrea: cobra sesiones de lunes a sábado, atiende a domicilio en taxi y gasta en delivery y salidas. */
function diariosAndrea(): Movimiento[] {
  const azar = crearAzar(17);
  return rangoDias(INICIO, 90).flatMap((fecha, i) => {
    const dia = diaSemana(fecha);
    const id = (que: string) => `independiente-${que}-${fecha}`;
    const movimientos: Movimiento[] = [
      { id: id('mercado'), fecha, monto: -azar.entero(1000, 2000), descripcion: 'Mercado', categoria: 'comida', canal: 'cuenta' },
    ];
    if (dia !== 0 && azar.probabilidad(0.85)) movimientos.push({ id: id('sesiones'), fecha, monto: azar.entero(15000, 24000),
      descripcion: 'Sesiones de fisioterapia', categoria: 'ingreso_variable', canal: azar.elegir(['cuenta', 'yape', 'plin'] as const) });
    if (dia !== 0 && azar.probabilidad(0.6)) movimientos.push({ id: id('taxi'), fecha, monto: -azar.entero(800, 1500),
      descripcion: 'Taxi a domicilio de pacientes', categoria: 'transporte', canal: 'cuenta' });
    if (azar.probabilidad(0.45)) movimientos.push({ id: id('delivery'), fecha, monto: -azar.entero(2500, 4500),
      descripcion: 'Delivery de comida', categoria: 'ocio', canal: 'cuenta' });
    if ([5, 6].includes(dia) && azar.probabilidad(0.7)) movimientos.push({ id: id('salidas'), fecha, monto: -azar.entero(6000, 12000),
      descripcion: 'Salidas a comer', categoria: 'ocio', canal: 'cuenta' });
    if (i % 13 === 0) movimientos.push({ id: id('insumos'), fecha, monto: -8000,
      descripcion: 'Insumos de fisioterapia', categoria: 'salud', canal: 'tarjeta' });
    return movimientos;
  });
}
function diarios(tipo: TipoPerfil): Movimiento[] {
  if (tipo === 'independiente') return diariosAndrea();
  const azar = crearAzar({ dependiente: 29, mixto: 43 }[tipo]);
  return rangoDias(INICIO, 90).flatMap((fecha, i) => {
    const movimientos: Movimiento[] = [
      { id: `${tipo}-comida-${fecha}`, fecha, monto: -azar.entero(1600, 2200), descripcion: 'Mercado', categoria: 'comida', canal: 'cuenta' },
      { id: `${tipo}-transporte-${fecha}`, fecha, monto: -azar.entero(400, 800), descripcion: 'Taxi por app', categoria: 'transporte', canal: 'efectivo' },
    ];
    if (tipo === 'mixto' && [0, 6].includes(diaSemana(fecha))) movimientos.push({ id: `${tipo}-venta-${fecha}`, fecha,
      monto: azar.entero(3500, 7000), descripcion: 'Venta de comida', categoria: 'ingreso_variable', canal: azar.elegir(['yape', 'plin'] as const) });
    if (i % 13 === 0) movimientos.push({ id: `${tipo}-compra-${fecha}`, fecha, monto: -1500,
      descripcion: 'Bodega', categoria: 'compras', canal: 'tarjeta' });
    return movimientos;
  });
}
export function generarPerfil(id: TipoPerfil): Perfil {
  const deudas = crearDeudas(id);
  const movimientos = [...mensuales(id, deudas), ...diarios(id)].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id));
  return { id, tipo: id, nombre: { independiente: 'Andrea', dependiente: 'Carlos', mixto: 'Lucía' }[id],
    descripcion: { independiente: 'Fisioterapeuta independiente: cobra por sesión con transferencia o billetera digital y emite recibos por honorarios. Sus ingresos cambian cada semana.',
      dependiente: 'Recibe un sueldo fijo a fin de mes y llega justo a la quincena.',
      mixto: 'Tiene un sueldo de medio tiempo y vende los fines de semana.' }[id],
    hoy: HOY_DEMO, saldoActual: sumar([APERTURAS[id], ...movimientos.filter(m => m.canal !== 'tarjeta').map(m => m.monto)]), movimientos, deudas };
}
export const PERFILES: Perfil[] = (['independiente', 'dependiente', 'mixto'] as const).map(generarPerfil);
