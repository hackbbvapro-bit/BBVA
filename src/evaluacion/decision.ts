/**
 * ¿La recomendación mejora la decisión? Se toma la jugada que propone el motor y se aplica
 * sobre lo que pasó de verdad en los 30 días siguientes, no sobre la proyección del motor.
 *
 * Supuesto declarado: la persona cumple la jugada al pie de la letra. Es el techo de lo que
 * la jugada puede lograr, no una medida de cuánta gente la seguiría.
 */
import { detectarRecurrentes } from '@/motor';
import { diasEntre, sumarDias } from '@/motor/fechas';
import type { Ajuste, Centimos, Jugada } from '@/motor/tipos';
import { DIAS_FUTURO, saldosReales, tocaSaldo, type Cliente, type MovimientoEtiquetado } from './poblacion';

/** Un cobro real «es el mismo» que el previsto si llega con hasta una semana de diferencia. */
const TOLERANCIA_DIAS = 7;

function buscar(futuro: MovimientoEtiquetado[], c: Cliente, recurrenteId: string, fecha: string): number {
  const recurrente = detectarRecurrentes(c.historia, c.deudas).find(r => r.id === recurrenteId);
  if (!recurrente) return -1;
  let mejor = -1, distancia = TOLERANCIA_DIAS + 1;
  futuro.forEach((m, i) => {
    if (!tocaSaldo(m) || m.descripcion !== recurrente.descripcion || Math.sign(m.monto) !== Math.sign(recurrente.monto)) return;
    const d = Math.abs(diasEntre(fecha, m.fecha));
    if (d < distancia) { mejor = i; distancia = d; }
  });
  return mejor;
}

/**
 * Devuelve el futuro real con el ajuste hecho y si el ajuste encontró algo que cambiar.
 * `postergado` es lo que se sacó de la ventana medida pero se sigue debiendo (pago movido más allá de los 30 días).
 */
export function aplicarAjuste(c: Cliente, futuro: MovimientoEtiquetado[], ajuste: Ajuste, costo: Centimos): { futuro: MovimientoEtiquetado[]; aplicado: boolean; postergado?: Centimos } {
  const fin = sumarDias(c.corte, DIAS_FUTURO);
  if (ajuste.tipo === 'recortar') {
    let aplicado = false;
    const nuevo = futuro.map(m => {
      // Se recorta el gasto del día a día de esa categoría: ni cuotas fijas ni emergencias.
      if (m.categoria !== ajuste.categoria || m.monto >= 0 || m.recurrente || m.atipico || !tocaSaldo(m) || m.fecha > ajuste.hasta) return m;
      aplicado = true;
      return { ...m, monto: m.monto + Math.round(-m.monto * ajuste.bp / 10_000) };
    });
    return { futuro: nuevo.filter(m => m.monto !== 0), aplicado };
  }
  const indice = buscar(futuro, c, ajuste.recurrenteId, ajuste.tipo === 'mover' ? ajuste.desde : ajuste.fecha);
  if (indice < 0) return { futuro, aplicado: false };
  const original = futuro[indice];
  if (ajuste.tipo === 'cambiar_monto') {
    // Solo cuenta si de verdad se paga menos que lo que se iba a pagar.
    if (ajuste.monto <= original.monto) return { futuro, aplicado: false };
    return { futuro: futuro.map((m, i) => i === indice ? { ...m, monto: ajuste.monto } : m), aplicado: true };
  }
  const fecha = sumarDias(original.fecha, diasEntre(ajuste.desde, ajuste.hacia));
  const resto = futuro.filter((_, i) => i !== indice);
  // Si el pago se va más allá de los 30 días, sale de la ventana que se mide, pero NO desaparece:
  // se sigue debiendo (y su costo también), así que se devuelve aparte para no contarlo como resuelto.
  if (fecha > fin) return { futuro: resto, aplicado: true, postergado: Math.max(0, -original.monto) + costo };
  const movido = [...resto, { ...original, fecha }];
  if (costo > 0) movido.push({ ...original, id: `${original.id}-costo`, fecha, monto: -costo, descripcion: 'Costo de mover el pago', recurrente: false, serie: undefined });
  return { futuro: movido, aplicado: true };
}

export interface Resultado {
  /** La jugada encontró en el futuro real algo que cambiar. */
  aplicada: boolean;
  deficitAntes: boolean;
  deficitDespues: boolean;
  /** Cuánto llega a faltar en el peor día, antes y después de la jugada. */
  faltanteAntes: Centimos;
  faltanteDespues: Centimos;
  /** Costo declarado por el motor para la jugada. */
  costo: Centimos;
  /** Pagos empujados más allá de la ventana que se siguen debiendo (0 si ninguno). */
  postergado: Centimos;
}

const faltante = (saldos: Centimos[]) => Math.max(0, -Math.min(...saldos));

/** Aplica una o varias jugadas al futuro real del cliente y mide el antes y el después. */
export function medirJugadas(c: Cliente, jugadas: Jugada[]): Resultado {
  const antes = saldosReales(c);
  let futuro = c.futuro, aplicada = false, postergado = 0;
  for (const jugada of jugadas) {
    for (const ajuste of jugada.ajustes) {
      const r = aplicarAjuste(c, futuro, ajuste, ajuste.tipo === 'mover' ? jugada.costo : 0);
      futuro = r.futuro;
      aplicada = aplicada || r.aplicado;
      postergado += r.postergado ?? 0;
    }
  }
  const despues = saldosReales({ ...c, futuro });
  // Lo postergado se descuenta del saldo al cierre: si no alcanza para cubrirlo, el déficit solo se aplazó.
  const faltaAlCierre = Math.max(0, postergado - despues[despues.length - 1]);
  return { aplicada, deficitAntes: antes.some(s => s < 0), deficitDespues: despues.some(s => s < 0) || faltaAlCierre > 0,
    faltanteAntes: faltante(antes), faltanteDespues: Math.max(faltante(despues), faltaAlCierre),
    costo: jugadas.reduce((s, j) => s + j.costo, 0), postergado };
}
