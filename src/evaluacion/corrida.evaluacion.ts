/**
 * Corrida oficial de la evaluación: `npm run evaluar`.
 * Escribe docs/evaluacion/resultados.json y la muestra del dataset en datos/sinteticos/.
 * Con EVALUACION_COMPLETA=1 escribe además todas las transacciones (archivo grande, fuera de git).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { evaluar } from './evaluar';
import { clientesCsv, deudasCsv, transaccionesCsv } from './exportar';
import { generarPoblacion } from './poblacion';

export const SEMILLA_AJUSTE = 20261114;
export const SEMILLA_EVALUACION = 20261115;
export const CLIENTES = 1000;
export const CLIENTES_EN_MUESTRA = 30;

it('evalúa el copiloto y deja los resultados en el repositorio', () => {
  const resultados = evaluar({ semillaAjuste: SEMILLA_AJUSTE, semillaEvaluacion: SEMILLA_EVALUACION, clientes: CLIENTES });
  const poblacion = generarPoblacion(SEMILLA_EVALUACION, CLIENTES);
  const raiz = process.cwd();
  mkdirSync(resolve(raiz, 'docs/evaluacion'), { recursive: true });
  mkdirSync(resolve(raiz, 'datos/sinteticos'), { recursive: true });
  writeFileSync(resolve(raiz, 'docs/evaluacion/resultados.json'), JSON.stringify(resultados, null, 2) + '\n');
  writeFileSync(resolve(raiz, 'datos/sinteticos/clientes.csv'), clientesCsv(poblacion));
  writeFileSync(resolve(raiz, 'datos/sinteticos/deudas.csv'), deudasCsv(poblacion));
  writeFileSync(resolve(raiz, 'datos/sinteticos/transacciones-muestra.csv'), transaccionesCsv(poblacion.slice(0, CLIENTES_EN_MUESTRA)));
  if (process.env.EVALUACION_COMPLETA === '1') writeFileSync(resolve(raiz, 'datos/sinteticos/transacciones-completo.csv'), transaccionesCsv(poblacion));
  expect(resultados.poblacion.clientes).toBe(CLIENTES);
}, 600_000);
