/**
 * Señales de la situación de la persona, deducidas por código de su perfil y del análisis del motor. Son las mismas
 * cuentas que ya usa la ruta (flujo del mes y colchón): aquí solo se traducen a señales para cruzarlas con el criterio
 * de cada producto. Las «dichas» (sueldo en BBVA, metas) no se deducen: solo cuentan si la persona las dijo.
 */
import { formatoLargo, formatoSoles } from "../motor";
import type { Analisis, Perfil } from "../motor";
import { SIN_HECHOS, colchon, flujoMensual, type Hechos } from "../ruta/ruta";
import { SIGNIFICADO, type SenalDetectada, type SenalDicha } from "./orientacion";

export function senalesDe(
  perfil: Perfil,
  analisis: Analisis,
  hechos: Hechos = SIN_HECHOS,
  dichas: readonly SenalDicha[] = [],
): SenalDetectada[] {
  const flujo = flujoMensual(perfil, analisis);
  const c = colchon(perfil.saldoActual, flujo);
  const deficit = analisis.proyeccion.deficit;
  const tarjetas = perfil.deudas.filter(d => d.tipo === "tarjeta" && d.saldo > 0);
  const atraso = hechos.diasAtrasoMax > 0;
  const salida: SenalDetectada[] = [];

  if (deficit) {
    salida.push({
      senal: "deficit_proyectado",
      por_que: `Su saldo proyectado cae bajo cero el ${formatoLargo(deficit.fecha)}: faltan ${formatoSoles(deficit.faltante)}.`,
    });
  }
  if (tarjetas.length > 0) {
    salida.push({ senal: "deuda_cara", por_que: `Debe en tarjeta de crédito: ${tarjetas.map(d => d.nombre).join(", ")}.` });
  }
  if (atraso) {
    salida.push({ senal: "atraso", por_que: `Tiene una deuda con ${hechos.diasAtrasoMax} días de atraso.` });
  }
  if (!hechos.tuvoCredito && perfil.deudas.length === 0) {
    salida.push({ senal: "sin_historial", por_que: "No registra tarjetas ni préstamos: todavía no tiene historial crediticio." });
  }
  if (c.gastoMensual > 0 && c.diasCubiertos < 30) {
    salida.push({ senal: "sin_colchon", por_que: `Su saldo de hoy cubre ${c.diasCubiertos} días de gastos, menos de un mes.` });
  }
  if (!deficit && !atraso && tarjetas.length === 0 && flujo.libre > 0 && c.meta > 0 && c.falta === 0) {
    salida.push({
      senal: "excedente_estable",
      por_que: `Le quedan libres ${formatoSoles(flujo.libre)} al mes y su saldo ya cubre tres meses de gastos.`,
    });
  }
  if (perfil.tipo !== "dependiente") {
    salida.push({ senal: "ingreso_variable", por_que: "Sus ingresos no son fijos: trabaja como independiente o tiene ingresos mixtos." });
  }
  if (perfil.tipo === "independiente") {
    salida.push({ senal: "sin_planilla", por_que: "Trabaja como independiente: no cobra un sueldo de planilla." });
  }
  for (const s of new Set(dichas)) {
    salida.push({ senal: s, por_que: `La persona ${SIGNIFICADO[s]}.` });
  }
  return salida;
}
