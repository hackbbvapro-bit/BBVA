/**
 * Escenarios «esperado» y «conservador» del saldo a N días (Fase 3, tarea C).
 *
 * Analogía: el conservador es planificar el mes con la peor quincena normal; el esperado, con la quincena de
 * siempre. Los dos son el MISMO motor determinista; solo cambia qué semana de ingresos variables se proyecta:
 *  - conservador: percentil 25 de las semanas observadas (lo que ya usa la app y el aviso de déficit);
 *  - esperado: la mediana de esas mismas semanas.
 * Pagos fijos, deudas y gasto del día a día son idénticos en ambos. Sin aprendizaje automático y sin IA: todo
 * monto sale del historial en céntimos enteros.
 *
 * El aviso de día en rojo SIEMPRE sale del conservador: el esperado es informativo y no cambia ninguna alerta.
 * Esta función no se muestra en la pantalla principal en esta fase (ver docs/evaluacion/CRITERIOS-FASE3.md).
 */
import { proyectar } from './proyeccion';
import type { Deficit, Perfil, Proyeccion } from './tipos';

export interface Escenarios {
  conservador: Proyeccion;
  esperado: Proyeccion;
  /** El aviso que manda: el del escenario conservador, idéntico al de `proyectar(perfil)`. */
  aviso: Deficit | null;
}

export function escenarios(perfil: Perfil, dias = 30): Escenarios {
  const conservador = proyectar(perfil, { dias });
  const esperado = proyectar(perfil, { dias, ingreso: 'tipico' });
  return { conservador, esperado, aviso: conservador.deficit };
}
