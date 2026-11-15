import { describe, expect, it } from 'vitest';
import { detectarRecurrentes } from '@/motor';
import { aplicarAjuste, medirJugadas } from './decision';
import type { Cliente, MovimientoEtiquetado } from './poblacion';
import type { Jugada } from '@/motor/tipos';

function movimiento(id: string, cambios: Partial<MovimientoEtiquetado> = {}): MovimientoEtiquetado {
  return { id, fecha: '2026-04-05', monto: -1001, descripcion: 'Compra', comercio: 'Comercio',
    categoria: 'comida', canal: 'cuenta', recurrente: false, duplicado: false, atipico: false, ...cambios };
}

function clienteConPago(): Cliente {
  const pago = { descripcion: 'Suscripción', categoria: 'suscripciones' as const, monto: -3000,
    recurrente: true, serie: 'mensual' as const };
  return { id: 'cliente', tipo: 'dependiente', escenarios: [], corte: '2026-03-31',
    ingresoMensual: 100_000, saldoApertura: 1000, saldoCorte: 1000, ocultos: [], deudas: [],
    historia: ['2026-01-05', '2026-02-05', '2026-03-05'].map((fecha, i) => movimiento(`historia-${i}`, { ...pago, fecha })),
    futuro: [movimiento('pago', pago)] };
}

function recurrenteId(cliente: Cliente): string {
  const recurrentes = detectarRecurrentes(cliente.historia, cliente.deudas);
  expect(recurrentes).toHaveLength(1);
  return recurrentes[0].id;
}

describe('ajustes de decisiones', () => {
  it('recorta solo gastos elegibles de la categoría hasta la fecha inclusiva en céntimos enteros', () => {
    const cliente = clienteConPago();
    const futuro = [
      movimiento('antes'), movimiento('limite', { fecha: '2026-04-10' }),
      movimiento('otra-categoria', { categoria: 'ocio' }), movimiento('ingreso', { monto: 1001 }),
      movimiento('recurrente', { recurrente: true, serie: 'mensual' }), movimiento('atipico', { atipico: true }),
      movimiento('tarjeta', { canal: 'tarjeta' }),
      movimiento('fantasma', { duplicado: true, tipoDuplicado: 'registro_repetido' }),
      movimiento('despues', { fecha: '2026-04-11' }),
    ];
    const copia = structuredClone(futuro);
    const resultado = aplicarAjuste(cliente, futuro, { tipo: 'recortar', categoria: 'comida', bp: 2500, hasta: '2026-04-10' }, 0);
    expect(resultado.aplicado).toBe(true);
    expect(resultado.futuro).toEqual([{ ...futuro[0], monto: -751 }, { ...futuro[1], monto: -751 }, ...futuro.slice(2)]);
    for (const m of resultado.futuro) expect(Number.isSafeInteger(m.monto)).toBe(true);
    expect(futuro).toEqual(copia);
  });

  it.each([-3000, -4000])('no cambia el monto si el nuevo pago de %i céntimos no es menor', monto => {
    const cliente = clienteConPago();
    expect(aplicarAjuste(cliente, cliente.futuro, {
      tipo: 'cambiar_monto', recurrenteId: recurrenteId(cliente), fecha: '2026-04-05', monto,
    }, 0)).toEqual({ futuro: cliente.futuro, aplicado: false });
  });

  it('sí aplica un pago menor encontrado en el futuro', () => {
    const cliente = clienteConPago();
    expect(aplicarAjuste(cliente, cliente.futuro, {
      tipo: 'cambiar_monto', recurrenteId: recurrenteId(cliente), fecha: '2026-04-05', monto: -2000,
    }, 0)).toEqual({ futuro: [{ ...cliente.futuro[0], monto: -2000 }], aplicado: true });
  });

  it.each([0, 125])('mueve la fecha y añade el costo de %i céntimos cuando corresponde', costo => {
    const cliente = clienteConPago();
    const resultado = aplicarAjuste(cliente, cliente.futuro, {
      tipo: 'mover', recurrenteId: recurrenteId(cliente), desde: '2026-04-05', hacia: '2026-04-12',
    }, costo);
    expect(resultado.aplicado).toBe(true);
    expect(resultado.futuro).toHaveLength(costo > 0 ? 2 : 1);
    expect(resultado.futuro[0]).toEqual({ ...cliente.futuro[0], fecha: '2026-04-12' });
    if (costo > 0) expect(resultado.futuro[1]).toMatchObject({ id: 'pago-costo', fecha: '2026-04-12',
      monto: -125, descripcion: 'Costo de mover el pago', recurrente: false });
    for (const m of resultado.futuro) expect(Number.isSafeInteger(m.monto)).toBe(true);
    expect(cliente.futuro[0].fecha).toBe('2026-04-05');
  });

  it('sin jugadas conserva el faltante y no declara ningún ajuste aplicado', () => {
    const resultado = medirJugadas(clienteConPago(), []);
    expect(resultado).toEqual({ aplicada: false, deficitAntes: true, deficitDespues: true,
      faltanteAntes: 2000, faltanteDespues: 2000, costo: 0, postergado: 0 });
    expect(resultado.faltanteAntes).toBe(resultado.faltanteDespues);
  });

  it.each([0, 125])('un pago movido más allá de los 30 días no desaparece: queda postergado con su costo de %i', costo => {
    const cliente = clienteConPago();
    const resultado = aplicarAjuste(cliente, cliente.futuro, {
      tipo: 'mover', recurrenteId: recurrenteId(cliente), desde: '2026-04-05', hacia: '2026-05-10',
    }, costo);
    expect(resultado).toEqual({ futuro: [], aplicado: true, postergado: 3000 + costo });
  });

  /** Jugada sintética que empuja el pago del 5 de abril al 10 de mayo, fuera de los 30 días medidos. */
  const empujaFuera = (cliente: Cliente): Jugada => ({
    id: 'mover', tipo: 'pagar_minimo', titulo: 'Mover el pago', detalle: '', libera: 3000, costo: 0, certezaCosto: 'desconocido',
    costoDetalle: '', resuelve: false, efecto: 'posterga', saldoMinimoDespues: 1000,
    ajustes: [{ tipo: 'mover', recurrenteId: recurrenteId(cliente), desde: '2026-04-05', hacia: '2026-05-10' }],
  });

  it('empujar el pago fuera de la ventana no cuenta como déficit evitado', () => {
    const cliente = clienteConPago();
    // Saldo de S/ 10.00 al cierre contra S/ 30.00 que se siguen debiendo: faltan S/ 20.00, igual que antes.
    expect(medirJugadas(cliente, [empujaFuera(cliente)])).toEqual({ aplicada: true, deficitAntes: true, deficitDespues: true,
      faltanteAntes: 2000, faltanteDespues: 2000, costo: 0, postergado: 3000 });
  });

  it('si el saldo al cierre cubre lo postergado, no se inventa un déficit', () => {
    const cliente = { ...clienteConPago(), saldoCorte: 5000 };
    // S/ 50.00 al cierre alcanzan para los S/ 30.00 pendientes.
    expect(medirJugadas(cliente, [empujaFuera(cliente)])).toMatchObject({ deficitDespues: false, faltanteDespues: 0, postergado: 3000 });
  });
});
