import { describe, expect, it } from 'vitest';
import { COLUMNAS_CLIENTES, COLUMNAS_DEUDAS, COLUMNAS_TRANSACCIONES, clientesCsv, deudasCsv, soles, transaccionesCsv } from './exportar';
import { generarPoblacion } from './poblacion';

// Los datos generados no contienen comas ni comillas; el escape se comprueba aparte.
const filas = (csv: string) => csv.trimEnd().split('\n').map(fila => fila.split(','));

describe('exportación CSV', () => {
  const clientes = generarPoblacion(11, 10);

  it.each([[12345, '123.45'], [-5, '-0.05'], [0, '0.00'], [100, '1.00']] as const)
    ('convierte %i céntimos a %s soles', (centimos, esperado) => {
      expect(soles(centimos)).toBe(esperado);
    });

  it('rechaza montos que no vienen en céntimos enteros', () => {
    expect(() => soles(1.5)).toThrow('El monto debe venir en céntimos enteros');
  });

  it('exporta las cabeceras exactas y una fila por movimiento, cliente y deuda', () => {
    const transacciones = filas(transaccionesCsv(clientes));
    const personas = filas(clientesCsv(clientes));
    const deudas = filas(deudasCsv(clientes));
    expect(transacciones[0]).toEqual(COLUMNAS_TRANSACCIONES);
    expect(personas[0]).toEqual(COLUMNAS_CLIENTES);
    expect(deudas[0]).toEqual(COLUMNAS_DEUDAS);
    expect(personas).toHaveLength(clientes.length + 1);
    expect(deudas).toHaveLength(clientes.reduce((n, c) => n + c.deudas.length, 0) + 1);
    expect(deudas.length).toBeGreaterThan(1);
    expect(transacciones).toHaveLength(clientes.reduce((n, c) => n + c.historia.length + c.ocultos.length + c.futuro.length, 0) + 1);
    const particion = COLUMNAS_TRANSACCIONES.indexOf('particion');
    for (const [nombre, cantidad] of [
      ['historia', clientes.reduce((n, c) => n + c.historia.length, 0)],
      ['oculto', clientes.reduce((n, c) => n + c.ocultos.length, 0)],
      ['futuro', clientes.reduce((n, c) => n + c.futuro.length, 0)],
    ] as const) {
      expect(cantidad).toBeGreaterThan(0);
      expect(transacciones.slice(1).filter(fila => fila[particion] === nombre)).toHaveLength(cantidad);
    }
  });

  it('sustituye yape y plin por billetera digital en todas las filas', () => {
    const movimientos = clientes.flatMap(c => [...c.historia, ...c.ocultos, ...c.futuro]);
    expect(movimientos.some(m => m.canal === 'yape')).toBe(true);
    expect(movimientos.some(m => m.canal === 'plin')).toBe(true);
    const columna = COLUMNAS_TRANSACCIONES.indexOf('canal');
    const canales = filas(transaccionesCsv(clientes)).slice(1).map(fila => fila[columna]);
    expect(canales).not.toContain('yape');
    expect(canales).not.toContain('plin');
    expect(canales).toEqual(movimientos.map(m => m.canal === 'yape' || m.canal === 'plin' ? 'billetera_digital' : m.canal));
  });

  it('escribe todos los montos de los tres CSV con dos decimales', () => {
    const casos = [
      { csv: transaccionesCsv(clientes), columnas: ['monto'] },
      { csv: clientesCsv(clientes), columnas: ['ingreso_mensual_diseno', 'saldo_apertura', 'saldo_corte', 'deuda_total', 'faltante_maximo'] },
      { csv: deudasCsv(clientes), columnas: ['saldo', 'pago_minimo', 'pago_habitual'] },
    ];
    for (const caso of casos) {
      const [cabecera, ...datos] = filas(caso.csv);
      expect(datos.length).toBeGreaterThan(0);
      for (const columna of caso.columnas) {
        const indice = cabecera.indexOf(columna);
        expect(indice).toBeGreaterThanOrEqual(0);
        for (const fila of datos) expect(fila[indice]).toMatch(/^-?\d+\.\d{2}$/);
      }
    }
  });

  it.each([
    ['Compra, especial', '"Compra, especial"'],
    ['Compra "especial"', '"Compra ""especial"""'],
    ['Compra, "especial"', '"Compra, ""especial"""'],
  ])('entrecomilla y escapa la descripción %s', (descripcion, escapada) => {
    const cliente = { ...clientes[0], historia: [{ ...clientes[0].historia[0], descripcion }], ocultos: [], futuro: [] };
    const fila = transaccionesCsv([cliente]).trimEnd().split('\n')[1];
    expect(fila).toContain(`,${escapada},`);
  });
});
