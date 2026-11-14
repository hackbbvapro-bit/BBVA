/**
 * Corrida de práctica: sirve para elegir entre variantes del motor SIN mirar la población de examen.
 * Evalúa sobre la población A (la misma semilla que la corrida oficial usa solo para calibrar) y calibra
 * con una tercera semilla. Nada de lo que sale de aquí se reporta como resultado.
 *
 *   AJUSTE=nombre npm run evaluar   →  docs/evaluacion/ajuste/nombre.json
 *
 * Sin la variable AJUSTE no hace nada, para que `npm run evaluar` siga siendo solo la corrida oficial.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { CLIENTES, SEMILLA_AJUSTE } from './corrida.evaluacion';
import { evaluar } from './evaluar';

export const SEMILLA_CALIBRA_PRACTICA = 20261113;
const nombre = process.env.AJUSTE;

it.skipIf(!nombre)('mide una variante del motor en la población de práctica', () => {
  const resultados = evaluar({ semillaAjuste: SEMILLA_CALIBRA_PRACTICA, semillaEvaluacion: SEMILLA_AJUSTE, clientes: CLIENTES });
  const carpeta = resolve(process.cwd(), 'docs/evaluacion/ajuste');
  mkdirSync(carpeta, { recursive: true });
  writeFileSync(resolve(carpeta, `${nombre}.json`), JSON.stringify(resultados, null, 2) + '\n');
  expect(resultados.poblacion.clientes).toBe(CLIENTES);
}, 600_000);
