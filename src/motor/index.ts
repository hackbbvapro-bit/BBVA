import type { Analisis, Perfil } from './tipos';
import { detectarRecurrentes, estimarGastoVariable, estimarIngresoVariable } from './recurrentes';
import { proyectar } from './proyeccion';
import { proponerJugadas } from './jugadas';
import { compararEstrategias } from './deudas';
export * from './tipos';
export * from './dinero';
export * from './fechas';
export * from './recurrentes';
export * from './proyeccion';
export * from './jugadas';
export * from './deudas';
export * from './simular';
export * from './cobros';

export function analizar(perfil: Perfil): Analisis {
  const proyeccion = proyectar(perfil);
  return { perfilId: perfil.id, hoy: perfil.hoy,
    recurrentes: detectarRecurrentes(perfil.movimientos, perfil.deudas),
    ingresoVariable: estimarIngresoVariable(perfil.movimientos, perfil.deudas, perfil.hoy),
    gastoVariable: estimarGastoVariable(perfil.movimientos, perfil.deudas, perfil.hoy),
    proyeccion, jugadas: proponerJugadas(perfil, proyeccion), deudas: compararEstrategias(perfil.deudas) };
}
