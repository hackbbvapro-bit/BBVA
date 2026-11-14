import { describe, expect, it } from 'vitest';
import { detectarRecurrentes, idsRecurrentes, estimarIngresoVariable, estimarGastoVariable } from './recurrentes';
import { rangoDias, sumarDias } from './fechas';
import type { Movimiento, Deuda } from './tipos';
const deuda: Deuda = { id: 'azul', nombre: 'Azul', tipo: 'tarjeta', saldo: 10000, tceaBp: 5000, pagoMinimo: 100, pagoHabitual: 300, diaPago: 23 };
function movimiento(fecha: string, descripcion = 'Alquiler', monto = -1000, categoria: Movimiento['categoria'] = 'alquiler'): Movimiento {
  return { id: `${descripcion}-${fecha}`, fecha, descripcion, monto, categoria, canal: 'cuenta' };
}
const meses = ['2026-08-23', '2026-09-23', '2026-10-23'];
describe('recurrentes', () => {
  it('detecta alquiler, deuda enlazada y suscripción; ignora tarjeta y compras sueltas', () => {
    const movimientos = meses.flatMap(f => [movimiento(f), movimiento(f, 'Pago Azul', -300, 'deuda'), movimiento(f, 'Streaming', -100, 'suscripciones'),
      { ...movimiento(f, 'Tarjeta'), canal: 'tarjeta' as const }]);
    movimientos.push(movimiento('2026-10-01', 'Compra', -200, 'compras'));
    const r = detectarRecurrentes(movimientos, [deuda]);
    // Medianas de tres montos iguales: -1000, -300 y -100.
    expect(r.map(x => x.monto)).toEqual([-1000, -300, -100]);
    expect(r.map(x => x.movible)).toEqual([false, true, true]);
    expect(r[1].deudaId).toBe('azul');
    expect(idsRecurrentes(movimientos, [deuda])).toEqual(new Set(movimientos.filter(m => m.canal !== 'tarjeta' && m.descripcion !== 'Compra').map(m => m.id)));
  });
  it('conserva día 31, normaliza tildes/dígitos y reconoce febrero', () => {
    const r = detectarRecurrentes(['2027-01-31', '2027-02-28', '2027-03-31'].map((f, i) => movimiento(f, `Alquilér ${i}!`)), []);
    expect(r[0].diaDelMes).toBe(31);
    expect(detectarRecurrentes(['2026-08-31', '2026-09-30', '2026-10-31'].map(f => movimiento(f)), [])[0].diaDelMes).toBe(31);
  });
  it('reconoce la quincena como dos series mensuales: día 15 y fin de mes', () => {
    const sueldo = (f: string, monto = 150000) => movimiento(f, 'Sueldo', monto, 'sueldo');
    const cobros = ['2026-08-15', '2026-08-31', '2026-09-15', '2026-09-30', '2026-10-15', '2026-10-31'].map(f => sueldo(f));
    const r = detectarRecurrentes(cobros, []);
    expect(r.map(x => x.id)).toEqual(['rec-sueldo-entrada-dia-15', 'rec-sueldo-entrada-dia-31']);
    expect(r.map(x => [x.frecuencia, x.diaDelMes, x.veces, x.monto])).toEqual([['mensual', 15, 3, 150000], ['mensual', 31, 3, 150000]]);
    expect(idsRecurrentes(cobros, [])).toEqual(new Set(cobros.map(m => m.id)));
    // Cada mitad lleva su propio monto (mediana de sus cobros): 1000 el 15 y 3000 a fin de mes.
    const desiguales = cobros.map(m => sueldo(m.fecha, m.fecha.endsWith('-15') ? 1000 : 3000));
    expect(detectarRecurrentes(desiguales, []).map(x => x.monto)).toEqual([1000, 3000]);
  });
  it('la quincena de fin de mes cae el último día en febrero (bisiesto o no) y cruza el año', () => {
    const dias = (fechas: string[]) => detectarRecurrentes(fechas.map(f => movimiento(f, 'Sueldo', 1000, 'sueldo')), []).map(x => x.diaDelMes);
    expect(dias(['2027-12-15', '2027-12-31', '2028-01-15', '2028-01-31', '2028-02-15', '2028-02-29'])).toEqual([15, 31]);
    expect(dias(['2027-01-15', '2027-01-31', '2027-02-15', '2027-02-28', '2027-03-15', '2027-03-31'])).toEqual([15, 31]);
  });
  it('con historia corta acepta dos cobros en una mitad si la otra tiene tres y las dos son regulares', () => {
    // La historia empieza el 16 de agosto: el día 15 solo aparece dos veces; el 31 de agosto va con los fines de mes.
    const corta = ['2026-08-31', '2026-09-15', '2026-09-30', '2026-10-15', '2026-10-31'].map(f => movimiento(f, 'Sueldo', 1000, 'sueldo'));
    expect(detectarRecurrentes(corta, []).map(x => [x.diaDelMes, x.veces])).toEqual([[15, 2], [31, 3]]);
    // Dos y dos no bastan.
    expect(detectarRecurrentes(corta.slice(1), [])).toEqual([]);
  });
  it('no inventa quincenas: mitad irregular, cobros pegados o tres cobros en un mes', () => {
    const grupo = (fechas: string[]) => fechas.map(f => movimiento(f, 'Taxi', -1000, 'transporte'));
    // El segundo cobro del mes baila entre el 20 y el 31: ninguna de las dos mitades se da por fija.
    const irregular = grupo(['2026-08-15', '2026-08-20', '2026-09-15', '2026-09-28', '2026-10-15', '2026-10-31']);
    expect(detectarRecurrentes(irregular, [])).toEqual([]);
    expect(idsRecurrentes(irregular, [])).toEqual(new Set());
    // Dos cobros a 5 días (menos de 10) no son quincena.
    expect(detectarRecurrentes(grupo(['2026-08-20', '2026-08-25', '2026-09-20', '2026-09-25', '2026-10-20', '2026-10-25']), [])).toEqual([]);
    expect(detectarRecurrentes(grupo(['2026-08-01', '2026-08-15', '2026-08-31', '2026-09-15', '2026-09-30', '2026-10-15', '2026-10-31']), [])).toEqual([]);
  });
  it('detecta semanal y rechaza montos o días fuera de tolerancia y duplicados mensuales', () => {
    const semanal = Array.from({ length: 6 }, (_, i) => movimiento(sumarDias('2026-09-01', i * 7)));
    expect(detectarRecurrentes(semanal, [])[0].frecuencia).toBe('semanal');
    expect(detectarRecurrentes(meses.map((f, i) => movimiento(f, 'Alquiler', i === 2 ? -2000 : -1000)), [])).toEqual([]);
    expect(detectarRecurrentes([...meses, '2026-08-24'].map(f => movimiento(f)), [])).toEqual([]);
    expect(detectarRecurrentes(['2026-08-01', '2026-09-10', '2026-10-23'].map(f => movimiento(f)), [])).toEqual([]);
  });
  it('incluye semanas vacías y excluye recurrentes, tarjeta y días fuera de ventana', () => {
    const historia = rangoDias('2026-08-22', 84).map(f => movimiento(f, 'Comida', -100, 'comida'));
    historia.push(movimiento('2026-08-21', 'Venta antigua', 99999, 'ingreso_variable'));
    for (let i = 0; i < 8; i++) historia.push(movimiento(sumarDias('2026-09-20', i * 7), `Venta ${i}`, (i + 1) * 700, 'ingreso_variable'));
    // Totales ordenados: 0,0,0,0,700,1400,2100,2800,3500,4200,4900,5600.
    expect(estimarIngresoVariable(historia, [], '2026-11-13')).toEqual({ semanalPrudente: 0, semanalTipico: 1750, semanasObservadas: 12 });
    // -8400 / 84 = -100; 8400 × 30 / 84 = 3000.
    expect(estimarGastoVariable(historia, [], '2026-11-13')).toEqual({ diario: -100, porCategoria: [{ categoria: 'comida', mensual: 3000 }] });
  });
  it('ordena categorías, excluye tarjeta y cuenta ceros en el percentil', () => {
    const historia = rangoDias('2026-08-22', 84).flatMap(fecha => [
      movimiento(fecha, 'Comida', -100, 'comida'), movimiento(fecha, 'Taxi', -50, 'transporte'),
      { ...movimiento(fecha, 'Compra', -99999, 'compras'), canal: 'tarjeta' as const },
    ]);
    // Comida 84*100*30/84=3000; transporte 84*50*30/84=1500; diario=-150.
    expect(estimarGastoVariable(historia, [], '2026-11-13')).toEqual({ diario: -150,
      porCategoria: [{ categoria: 'comida', mensual: 3000 }, { categoria: 'transporte', mensual: 1500 }] });
    const ingresos = rangoDias('2026-08-22', 84).map(fecha => movimiento(fecha, 'Venta', 100, 'ingreso_variable'));
    // Doce semanas de 7*100=700: percentil y mediana son 700.
    expect(estimarIngresoVariable(ingresos, [], '2026-11-13')).toEqual({ semanalPrudente: 700, semanalTipico: 700, semanasObservadas: 12 });
  });
  it('historia corta y vacía', () => {
    expect(estimarIngresoVariable([], [], '2026-11-13').semanasObservadas).toBe(0);
    expect(estimarIngresoVariable([movimiento('2026-11-07', 'Venta', 700)], [], '2026-11-13')).toEqual({ semanalPrudente: 700, semanalTipico: 700, semanasObservadas: 1 }); // 700 en una semana.
    expect(estimarGastoVariable([], [], '2026-11-13')).toEqual({ diario: 0, porCategoria: [] });
  });
});
