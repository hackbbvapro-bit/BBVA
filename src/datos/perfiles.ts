import { crearAzar } from './azar';
import { diaSemana, ocurrenciasMensuales, rangoDias } from '../motor/fechas';
import { sumar } from '../motor/dinero';
import type { Categoria, Deuda, Movimiento, Perfil, TipoPerfil } from '../motor/tipos';

export const HOY_DEMO = '2026-11-13';
const INICIO = '2026-08-16';
// Saldos de apertura sintéticos, en céntimos; no son movimientos ni ingresos.
const APERTURAS: Record<TipoPerfil, number> = { independiente: 97605, dependiente: 180000, mixto: 219560 };
function crearDeudas(tipo: TipoPerfil): Deuda[] {
  const tarjeta: Deuda = { id: `${tipo}-tarjeta`, nombre: 'Tarjeta Azul', tipo: 'tarjeta',
    saldo: 180000, tceaBp: 10000, pagoMinimo: 16000, pagoHabitual: 60000, diaPago: 23 };
  if (tipo === 'mixto') return [{ ...tarjeta, pagoHabitual: 30000 }];
  if (tipo === 'dependiente') return [{ ...tarjeta, pagoHabitual: 25000 },
    { id: 'prestamo', nombre: 'Préstamo', tipo: 'prestamo', saldo: 200000, tceaBp: 4500, pagoMinimo: 20000, pagoHabitual: 20000, diaPago: 20 }];
  return [tarjeta, { ...tarjeta, id: 'segunda', nombre: 'Tarjeta Verde', saldo: 90000, tceaBp: 5500, pagoMinimo: 8000, pagoHabitual: 15000, diaPago: 5 }];
}
function mensuales(tipo: TipoPerfil, deudas: Deuda[]): Movimiento[] {
  const reglas: { dia: number; monto: number; descripcion: string; categoria: Categoria }[] = [
    { dia: 23, monto: tipo === 'independiente' ? -65000 : -50000, descripcion: 'Alquiler', categoria: 'alquiler' },
    { dia: 8, monto: -5000, descripcion: 'Luz', categoria: 'servicios' },
    { dia: 9, monto: -3000, descripcion: 'Agua', categoria: 'servicios' },
    { dia: 10, monto: -4000, descripcion: 'Internet', categoria: 'servicios' },
    { dia: 11, monto: -3000, descripcion: 'Streaming', categoria: 'suscripciones' },
    ...deudas.map(d => ({ dia: d.diaPago, monto: -d.pagoHabitual, descripcion: `Pago ${d.nombre}`, categoria: 'deuda' as const })),
  ];
  if (tipo !== 'independiente') reglas.push({ dia: 30, monto: tipo === 'dependiente' ? 180000 : 85000, descripcion: 'Sueldo', categoria: 'sueldo' });
  if (tipo === 'dependiente') reglas.push({ dia: 12, monto: -5000, descripcion: 'Gimnasio', categoria: 'suscripciones' });
  return reglas.flatMap((r, i) => ocurrenciasMensuales(r.dia, INICIO, HOY_DEMO).map(fecha => ({
    id: `${tipo}-mensual-${i}-${fecha}`, fecha, monto: r.monto, descripcion: r.descripcion, categoria: r.categoria, canal: 'cuenta' as const,
  })));
}
function diarios(tipo: TipoPerfil): Movimiento[] {
  const azar = crearAzar({ independiente: 17, dependiente: 29, mixto: 43 }[tipo]);
  return rangoDias(INICIO, 90).flatMap((fecha, i) => {
    const movimientos: Movimiento[] = [
      { id: `${tipo}-comida-${fecha}`, fecha, monto: -azar.entero(1600, 2200), descripcion: 'Mercado', categoria: 'comida', canal: 'cuenta' },
      { id: `${tipo}-transporte-${fecha}`, fecha, monto: -azar.entero(400, 800), descripcion: 'Taxi por app', categoria: 'transporte', canal: 'efectivo' },
    ];
    const vende = tipo === 'independiente' ? azar.probabilidad(0.85) : tipo === 'mixto' && [0, 6].includes(diaSemana(fecha));
    if (vende) movimientos.push({ id: `${tipo}-venta-${fecha}`, fecha,
      monto: tipo === 'independiente' ? azar.entero(8500, 11500) + (Math.floor(i / 7) % 3) * 400 : azar.entero(3500, 7000),
      descripcion: 'Venta de comida', categoria: 'ingreso_variable', canal: azar.elegir(['yape', 'plin'] as const) });
    if (i % 13 === 0) movimientos.push({ id: `${tipo}-compra-${fecha}`, fecha, monto: -1500,
      descripcion: 'Bodega', categoria: 'compras', canal: 'tarjeta' });
    return movimientos;
  });
}
export function generarPerfil(id: TipoPerfil): Perfil {
  const deudas = crearDeudas(id);
  const apertura: Movimiento[] = id === 'independiente' ? [{ id: 'independiente-compra-inicial', fecha: INICIO,
    monto: -200000, descripcion: 'Mercado', categoria: 'compras', canal: 'cuenta' }] : [];
  const movimientos = [...apertura, ...mensuales(id, deudas), ...diarios(id)].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id));
  return { id, tipo: id, nombre: { independiente: 'Rosa', dependiente: 'Carlos', mixto: 'Lucía' }[id],
    descripcion: { independiente: 'Vende comida y cobra con billeteras digitales. Sus ingresos cambian cada semana.',
      dependiente: 'Recibe un sueldo fijo a fin de mes y llega justo a la quincena.',
      mixto: 'Tiene un sueldo de medio tiempo y vende los fines de semana.' }[id],
    hoy: HOY_DEMO, saldoActual: sumar([APERTURAS[id], ...movimientos.filter(m => m.canal !== 'tarjeta').map(m => m.monto)]), movimientos, deudas };
}
export const PERFILES: Perfil[] = (['independiente', 'dependiente', 'mixto'] as const).map(generarPerfil);
