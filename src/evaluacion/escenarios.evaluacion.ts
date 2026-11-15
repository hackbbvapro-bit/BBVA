/**
 * Evaluación aparte de los escenarios esperado y conservador (Fase 3, tarea C).
 *
 *   ESCENARIOS=1 npm run evaluar   →  docs/evaluacion/escenarios.json
 *
 * Criterios fijados antes de medir (CRITERIOS-FASE3.md):
 *  1) el conservador queda por debajo (o igual) del saldo real a 30 días en al menos el 80 % de los clientes;
 *  2) el esperado tiene menor sesgo absoluto a 30 días que el conservador;
 *  3) ninguno cambia el aviso de déficit del motor actual.
 * Se mide en la población de práctica A y en la oficial B; la cohorte final C no se toca.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { proyectar } from '@/motor';
import { escenarios } from '@/motor/escenarios';
import { CLIENTES, SEMILLA_AJUSTE, SEMILLA_EVALUACION } from './corrida.evaluacion';
import { aPerfil, generarPoblacion, saldosReales } from './poblacion';
import { HORIZONTES } from './pronostico';

const r1 = (x: number) => Math.round(x * 10) / 10;
const r4 = (x: number) => Math.round(x * 10000) / 10000;

export function medirEscenarios(semilla: number, clientes: number) {
  const filas = generarPoblacion(semilla, clientes).map(c => {
    const perfil = aPerfil(c);
    const e = escenarios(perfil);
    const motor = proyectar(perfil);
    return {
      real: saldosReales(c),
      conservador: e.conservador.dias.map(d => d.saldo),
      esperado: e.esperado.dias.map(d => d.saldo),
      avisoIgual: JSON.stringify(e.aviso) === JSON.stringify(motor.deficit),
      rojoConservador: e.conservador.deficit !== null,
      rojoEsperado: e.esperado.deficit !== null,
    };
  });
  const n = filas.length;
  const media = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;
  // Errores en soles (céntimos / 100), solo para el informe; los saldos se calculan en céntimos enteros.
  const porHorizonte = (clave: 'conservador' | 'esperado') => Object.fromEntries(HORIZONTES.map(h => {
    const dif = filas.map(f => (f[clave][h - 1] - f.real[h - 1]) / 100);
    return [`d${h}`, { errorMedioAbsoluto: r1(media(dif.map(Math.abs))), sesgoMedio: r1(media(dif)),
      porDebajoDelReal: r4(filas.filter(f => f[clave][h - 1] <= f.real[h - 1]).length / n) }];
  }));
  const conservador = porHorizonte('conservador');
  const esperado = porHorizonte('esperado');
  const criterios = {
    c1ConservadorPorDebajo80: conservador.d30.porDebajoDelReal >= 0.8,
    c2EsperadoMenorSesgo: Math.abs(esperado.d30.sesgoMedio) < Math.abs(conservador.d30.sesgoMedio),
    c3AvisoSinCambios: filas.every(f => f.avisoIgual),
  };
  return {
    semilla, clientes: n, conservador, esperado,
    avisos: { iguales: filas.filter(f => f.avisoIgual).length,
      rojoConservador: filas.filter(f => f.rojoConservador).length, rojoEsperado: filas.filter(f => f.rojoEsperado).length },
    criterios, cumple: Object.values(criterios).every(Boolean),
  };
}

it.skipIf(!process.env.ESCENARIOS)('mide los escenarios esperado y conservador en A y B', () => {
  const resultado = { practicaA: medirEscenarios(SEMILLA_AJUSTE, CLIENTES), oficialB: medirEscenarios(SEMILLA_EVALUACION, CLIENTES) };
  mkdirSync(resolve(process.cwd(), 'docs/evaluacion'), { recursive: true });
  writeFileSync(resolve(process.cwd(), 'docs/evaluacion/escenarios.json'), JSON.stringify(resultado, null, 2) + '\n');
  expect(resultado.practicaA.clientes).toBe(CLIENTES);
}, 600_000);
