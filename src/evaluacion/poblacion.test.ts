import { describe, expect, it } from 'vitest';
import { analizar } from '@/motor';
import { sumarDias } from '@/motor/fechas';
import {
  DIAS_FUTURO, DIAS_HISTORIA, ESCENARIOS, aPaso, aPerfil, esReal, generarCliente, generarPoblacion,
  saldosReales, tocaSaldo,
} from './poblacion';

const SEMILLA = 20261114;
const poblacion = generarPoblacion(SEMILLA, 300);

describe('población sintética', () => {
  it('es determinista: la misma semilla da exactamente los mismos clientes', () => {
    expect(generarPoblacion(SEMILLA, 20)).toEqual(poblacion.slice(0, 20));
  });

  it('añadir clientes no cambia a los anteriores y otra semilla da otra población', () => {
    expect(generarCliente(SEMILLA, 7)).toEqual(poblacion[7]);
    expect(generarCliente(SEMILLA + 1, 7)).not.toEqual(poblacion[7]);
  });

  it('no hay fuga: la historia termina en el corte y el futuro empieza al día siguiente', () => {
    for (const c of poblacion) {
      const inicio = sumarDias(c.corte, -(DIAS_HISTORIA - 1));
      const fin = sumarDias(c.corte, DIAS_FUTURO);
      for (const m of [...c.historia, ...c.ocultos]) {
        expect(m.fecha >= inicio && m.fecha <= c.corte).toBe(true);
      }
      for (const m of c.futuro) expect(m.fecha > c.corte && m.fecha <= fin).toBe(true);
      const perfil = aPerfil(c);
      expect(perfil.movimientos).toBe(c.historia);
      expect(JSON.stringify(perfil)).not.toContain(c.futuro[0]?.id ?? 'sin-futuro');
    }
  });

  it('todo el dinero va en céntimos enteros y ningún movimiento vale cero', () => {
    for (const c of poblacion) {
      for (const n of [c.saldoApertura, c.saldoCorte, c.ingresoMensual]) expect(Number.isSafeInteger(n)).toBe(true);
      for (const m of [...c.historia, ...c.ocultos, ...c.futuro]) {
        expect(Number.isSafeInteger(m.monto)).toBe(true);
        expect(m.monto).not.toBe(0);
      }
      for (const d of c.deudas) {
        expect(Number.isSafeInteger(d.saldo) && Number.isSafeInteger(d.pagoMinimo)).toBe(true);
        expect(d.pagoHabitual).toBeGreaterThanOrEqual(d.pagoMinimo);
      }
    }
  });

  it('el saldo del corte sale de la apertura más los movimientos reales, sin fantasmas y con los ocultos', () => {
    for (const c of poblacion) {
      const flujo = [...c.historia, ...c.ocultos].filter(tocaSaldo).reduce((s, m) => s + m.monto, 0);
      expect(c.saldoCorte).toBe(c.saldoApertura + flujo);
    }
  });

  it('en la historia nadie quedó en negativo (supuesto de diseño del saldo de apertura)', () => {
    for (const c of poblacion) {
      const porFecha = new Map<string, number>();
      for (const m of [...c.historia, ...c.ocultos].filter(tocaSaldo)) porFecha.set(m.fecha, (porFecha.get(m.fecha) ?? 0) + m.monto);
      let saldo = c.saldoApertura;
      for (const fecha of [...porFecha.keys()].sort()) {
        saldo += porFecha.get(fecha)!;
        expect(saldo).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('los identificadores son únicos y ficticios', () => {
    const ids = new Set<string>();
    for (const c of poblacion) {
      expect(c.id).toMatch(/^cli-\d{4}$/);
      for (const m of [...c.historia, ...c.ocultos, ...c.futuro]) {
        expect(m.id.startsWith(`${c.id}-t`)).toBe(true);
        expect(ids.has(m.id)).toBe(false);
        ids.add(m.id);
      }
    }
  });

  it('cada escenario difícil aparece y trae su etiqueta de verdad', () => {
    for (const e of ESCENARIOS) expect(poblacion.some(c => c.escenarios.includes(e))).toBe(true);
    for (const c of poblacion) {
      const todos = [...c.historia, ...c.ocultos, ...c.futuro];
      const dobles = todos.filter(m => m.tipoDuplicado === 'cobro_doble');
      const repetidos = todos.filter(m => m.tipoDuplicado === 'registro_repetido');
      expect(dobles.length > 0).toBe(c.escenarios.includes('suscripcion_duplicada'));
      expect(repetidos.length > 0).toBe(c.escenarios.includes('movimiento_repetido'));
      expect(todos.some(m => m.atipico)).toBe(c.escenarios.includes('gasto_atipico'));
      expect(c.ocultos.length > 0).toBe(c.escenarios.includes('datos_incompletos'));
      // Los datos estropeados solo existen en la historia: el futuro es la verdad limpia.
      expect(c.futuro.every(m => !m.duplicado)).toBe(true);
      for (const m of todos) expect(m.duplicado).toBe(m.tipoDuplicado !== undefined);
    }
  });

  it('un registro repetido copia a un movimiento visible y no mueve el saldo', () => {
    for (const c of poblacion) {
      for (const copia of c.historia.filter(m => !esReal(m))) {
        expect(tocaSaldo(copia)).toBe(false);
        expect(c.historia.some(m => m.id !== copia.id && esReal(m) && m.fecha === copia.fecha
          && m.monto === copia.monto && m.descripcion === copia.descripcion)).toBe(true);
      }
    }
  });

  it('un cobro doble copia un cargo fijo real y sí saca dinero', () => {
    for (const c of poblacion) {
      for (const doble of [...c.historia, ...c.ocultos].filter(m => m.tipoDuplicado === 'cobro_doble')) {
        expect(doble.monto).toBeLessThan(0);
        expect(esReal(doble)).toBe(true);
        expect([...c.historia, ...c.ocultos].some(m => m.recurrente && m.descripcion === doble.descripcion && m.monto === doble.monto)).toBe(true);
      }
    }
  });

  it('las series recurrentes llevan su tipo y la mezcla de perfiles se parece a la diseñada', () => {
    for (const c of poblacion) {
      for (const m of [...c.historia, ...c.ocultos, ...c.futuro]) expect(m.recurrente).toBe(m.serie !== undefined);
    }
    const parte = (tipo: string) => poblacion.filter(c => c.tipo === tipo).length / poblacion.length;
    expect(parte('dependiente')).toBeGreaterThan(0.3);
    expect(parte('dependiente')).toBeLessThan(0.5);
    expect(parte('independiente')).toBeGreaterThan(0.25);
    expect(parte('mixto')).toBeGreaterThan(0.15);
  });

  it('los cortes cubren fines de mes, febrero y cambio de año sin romper las fechas', () => {
    const meses = new Set(poblacion.map(c => c.corte.slice(5, 7)));
    expect(meses.size).toBe(12);
    for (const c of poblacion) {
      for (const m of [...c.historia, ...c.futuro]) expect(m.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(c.historia.map(m => m.fecha)).toEqual([...c.historia.map(m => m.fecha)].sort());
    }
  });

  it('el saldo real de los 30 días siguientes sale solo del futuro', () => {
    for (const c of poblacion.slice(0, 60)) {
      const saldos = saldosReales(c);
      expect(saldos).toHaveLength(DIAS_FUTURO);
      expect(saldos[DIAS_FUTURO - 1]).toBe(c.saldoCorte + c.futuro.filter(tocaSaldo).reduce((s, m) => s + m.monto, 0));
    }
  });

  it('el motor analiza a cualquier cliente sin romperse', () => {
    for (const c of poblacion) {
      const a = analizar(aPerfil(c));
      expect(a.proyeccion.dias).toHaveLength(DIAS_FUTURO);
      expect(Number.isSafeInteger(a.proyeccion.saldoMinimo)).toBe(true);
    }
  }, 30_000); // 300 clientes: en una laptop lenta pasa de los 5 s del límite por defecto
});

describe('aPaso', () => {
  it('redondea a múltiplos del paso y nunca devuelve menos de un paso', () => {
    expect(aPaso(1234.4, 10)).toBe(1230);
    expect(aPaso(1235, 10)).toBe(1240);
    expect(aPaso(49.9, 100)).toBe(100);
    expect(aPaso(0, 50)).toBe(50);
    expect(aPaso(250_049.99, 100)).toBe(250_000);
  });
});
