import { describe, expect, it } from 'vitest';
import { analizar } from './index';
import type { Perfil } from './tipos';
describe('analizar', () => {
  it('integra un perfil pequeño sin movimientos ni deudas', () => {
    const p: Perfil = { id: 'vacio', tipo: 'mixto', nombre: 'Lucía', descripcion: '', hoy: '2026-11-13', saldoActual: 1234, movimientos: [], deudas: [] };
    const a = analizar(p);
    // 1234 de apertura + 0 eventos = 1234 durante los 30 días.
    expect(a.proyeccion.saldoFinal).toBe(1234);
    expect(a).toMatchObject({ perfilId: 'vacio', hoy: p.hoy, recurrentes: [], jugadas: [], deudas: null,
      ingresoVariable: { semanalPrudente: 0, semanalTipico: 0, semanasObservadas: 0 }, gastoVariable: { diario: 0, porCategoria: [] } });
  });
});
