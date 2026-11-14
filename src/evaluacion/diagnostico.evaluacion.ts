/**
 * Diagnóstico de los déficits que el motor NO avisa en clientes con sueldo quincenal.
 * Se hace en la población de práctica (nunca en la de examen) para no elegir mirando la nota.
 *   DIAGNOSTICO=1 npm run evaluar  →  docs/evaluacion/ajuste/sin-aviso-quincena.txt
 * Sin la variable DIAGNOSTICO no se ejecuta.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { proyectar } from '@/motor';
import { aPerfil, generarPoblacion, saldosReales, tocaSaldo } from './poblacion';

const SEMILLA_PRACTICA = 20261114;
const CLIENTES = 1000;
const suma = (montos: number[]) => montos.reduce((a, b) => a + b, 0);

it.skipIf(!process.env.DIAGNOSTICO)('explica los déficits sin aviso entre quienes cobran por quincena', () => {
  const lineas: string[] = [];
  const cuenta = { clientes: 0, vp: 0, fp: 0, fn: 0, vn: 0 };
  for (const c of generarPoblacion(SEMILLA_PRACTICA, CLIENTES)) {
    if (!c.historia.some(m => m.serie === 'quincenal')) continue;
    const previsto = proyectar(aPerfil(c));
    const real = saldosReales(c);
    const hayDeficit = real.some(s => s < 0);
    const hayAviso = previsto.deficit !== null;
    cuenta.clientes++;
    cuenta[hayDeficit ? (hayAviso ? 'vp' : 'fn') : (hayAviso ? 'fp' : 'vn')]++;
    if (!hayDeficit || hayAviso) continue;

    const eventos = previsto.dias.flatMap(d => d.eventos);
    const futuro = c.futuro.filter(tocaSaldo);
    const minimo = Math.min(...real);
    lineas.push('', `== ${c.id} ${c.tipo} [${c.escenarios.join(', ')}] corte ${c.corte}, saldo ${c.saldoCorte} céntimos`);
    lineas.push(`real: primer déficit el día ${real.findIndex(s => s < 0) + 1}, mínimo ${minimo} el día ${real.indexOf(minimo) + 1}`);
    lineas.push(`previsto: mínimo ${previsto.saldoMinimo} (${previsto.fechaSaldoMinimo}), final ${previsto.saldoFinal}`);
    lineas.push(`sueldo previsto: ${eventos.filter(e => e.descripcion === 'Sueldo').map(e => `${e.fecha}=${e.monto}`).join(' ')}`);
    lineas.push(`sueldo real:     ${futuro.filter(m => m.descripcion === 'Sueldo').map(m => `${m.fecha}=${m.monto}`).join(' ')}`);
    lineas.push(`pagos fijos previstos ${suma(eventos.filter(e => e.origen === 'recurrente' && e.monto < 0).map(e => e.monto))}, reales ${suma(futuro.filter(m => m.recurrente && m.monto < 0).map(m => m.monto))}`);
    const previstos = new Set(eventos.filter(e => e.origen === 'recurrente').map(e => e.descripcion));
    lineas.push(`pagos fijos reales que el motor no previó: ${futuro.filter(m => m.recurrente && m.monto < 0 && !previstos.has(m.descripcion)).map(m => `${m.fecha} ${m.descripcion} ${m.monto}`).join(' | ') || 'ninguno'}`);
    lineas.push(`gasto del día a día previsto ${suma(eventos.filter(e => e.origen === 'gasto_variable').map(e => e.monto))}, real ${suma(futuro.filter(m => !m.recurrente && m.monto < 0).map(m => m.monto))}`);
    lineas.push(`mayores gastos reales no fijos: ${futuro.filter(m => !m.recurrente && m.monto < 0).sort((a, b) => a.monto - b.monto).slice(0, 3).map(m => `${m.fecha} ${m.descripcion} ${m.monto}${m.atipico ? ' (atípico)' : ''}`).join(' | ')}`);
  }
  const carpeta = resolve(process.cwd(), 'docs/evaluacion/ajuste');
  mkdirSync(carpeta, { recursive: true });
  writeFileSync(resolve(carpeta, 'sin-aviso-quincena.txt'), [
    `Población de práctica, semilla ${SEMILLA_PRACTICA}. Clientes con sueldo quincenal: ${cuenta.clientes}.`,
    `Avisos acertados ${cuenta.vp}, falsas alarmas ${cuenta.fp}, déficits sin aviso ${cuenta.fn}, silencios correctos ${cuenta.vn}.`,
    'Montos en céntimos.', ...lineas, '',
  ].join('\n'));
  expect(cuenta.clientes).toBeGreaterThan(0);
}, 600_000);
