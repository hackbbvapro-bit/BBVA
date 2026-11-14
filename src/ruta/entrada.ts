/**
 * Arma un caso de simulación a partir de las respuestas de la entrada conversada.
 * Es código puro: las cifras que la persona escribe se reparten en céntimos enteros, sin perder ni un céntimo.
 * Las fechas son aproximadas a propósito (la entrada pregunta «cuándo te entra la plata», no el día exacto);
 * después se corrigen en Mi dinero y en Deudas.
 */
import type { Centimos, FechaISO } from "../motor";
import { datosVacios } from "../datos/semilla";
import type { Datos, DeudaGuardada, Fijo, TipoDeudaDebo } from "../datos/tipos";

export type Cobro = "fin_de_mes" | "quincena" | "semanal";
export type Atraso = "al_dia" | "menos_de_un_mes" | "uno_a_dos_meses" | "mas_de_dos_meses";

export interface RespuestaDeuda {
  tipo: TipoDeudaDebo;
  /** Cuánto debe en total. */
  saldo: Centimos;
  /** Cuánto paga al mes. */
  cuota: Centimos;
  atraso: Atraso;
}

export interface Respuestas {
  nombre: string;
  cobro: Cobro;
  ingresoMensual: Centimos;
  saldo: Centimos;
  /** Alquiler y servicios. */
  fijosMensual: Centimos;
  /** Comida, pasajes y gastos del día a día. */
  diaADiaMensual: Centimos;
  deuda: RespuestaDeuda | null;
  /** Si alguna vez tuvo una tarjeta de crédito o un préstamo de una entidad. */
  tuvoCredito: boolean;
  hoy: FechaISO;
}

/** Días aproximados de atraso según la opción elegida. Son el punto medio del tramo, no una medida. */
export const DIAS_DE_ATRASO: Record<Atraso, number> = { al_dia: 0, menos_de_un_mes: 20, uno_a_dos_meses: 45, mas_de_dos_meses: 90 };

const DIAS_DE_COBRO: Record<Cobro, number[]> = { fin_de_mes: [30], quincena: [15, 30], semanal: [7, 14, 21, 28] };
const NOMBRES_DE_INGRESO: Record<Cobro, string[]> = {
  fin_de_mes: ["Ingreso del mes"],
  quincena: ["Ingreso de la primera quincena", "Ingreso de la segunda quincena"],
  semanal: ["Ingreso de la primera semana", "Ingreso de la segunda semana", "Ingreso de la tercera semana", "Ingreso de la cuarta semana"],
};
const TEXTO_DE_COBRO: Record<Cobro, string> = { fin_de_mes: "cobra a fin de mes", quincena: "cobra por quincenas", semanal: "cobra cada semana" };

// Los nombres se distinguen por letras, no por números: el motor ignora los dígitos al agrupar cobros que se repiten.
const DIAS_DE_GASTO = [5, 12, 19, 26];
const NOMBRES_DE_GASTO = ["Día a día, primera semana", "Día a día, segunda semana", "Día a día, tercera semana", "Día a día, cuarta semana"];
const NOMBRE_DE_DEUDA: Record<TipoDeudaDebo, string> = { tarjeta: "Mi tarjeta", prestamo: "Mi préstamo", personal: "Mi deuda personal" };

/** Parte un monto en n trozos enteros que suman exactamente el total (el resto va a los primeros). */
export function repartir(total: Centimos, n: number): Centimos[] {
  const base = Math.floor(total / n);
  const resto = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < resto ? 1 : 0));
}

function fijos(prefijo: string, nombres: string[], dias: number[], total: Centimos, categoria: Fijo["categoria"]): Fijo[] {
  return repartir(total, dias.length)
    .map((monto, i): Fijo => ({ id: `${prefijo}-${i + 1}`, descripcion: nombres[i], monto, dia: dias[i], categoria }))
    .filter(f => f.monto > 0);
}

function deudaGuardada(d: RespuestaDeuda): DeudaGuardada {
  return {
    id: "deuda-entrada",
    entidad: d.tipo === "personal" ? "Una persona" : "Otra entidad",
    nombre: NOMBRE_DE_DEUDA[d.tipo],
    tipo: d.tipo,
    saldo: d.saldo,
    tceaBp: null,
    pagoMinimo: d.cuota,
    pagoHabitual: d.cuota,
    diaPago: 15,
    diasAtraso: DIAS_DE_ATRASO[d.atraso],
    pagada: false,
  };
}

/** El caso completo, listo para cargar en el repositorio. */
export function armarCaso(r: Respuestas): Datos {
  const datos = datosVacios({
    nombre: r.nombre.trim().slice(0, 40),
    tipo: r.cobro === "semanal" ? "independiente" : "dependiente",
    saldo: r.saldo,
    ingresoAprox: r.ingresoMensual,
    hoy: r.hoy,
  });
  datos.perfil.descripcion = `Caso de simulación armado en la entrada: ${TEXTO_DE_COBRO[r.cobro]}.`;
  datos.perfil.diasCobro = DIAS_DE_COBRO[r.cobro];
  datos.ingresosFijos = fijos("ingreso", NOMBRES_DE_INGRESO[r.cobro], DIAS_DE_COBRO[r.cobro], r.ingresoMensual, "sueldo");
  datos.gastosFijos = [
    ...fijos("gasto-alquiler", ["Alquiler y servicios"], [5], r.fijosMensual, "alquiler"),
    ...fijos("gasto-dia", NOMBRES_DE_GASTO, DIAS_DE_GASTO, r.diaADiaMensual, "comida"),
  ];
  datos.deudas = r.deuda && r.deuda.saldo > 0 ? [deudaGuardada(r.deuda)] : [];
  return datos;
}

/** Si la persona tuvo crédito formal: lo dijo, o tiene hoy una tarjeta o un préstamo. */
export function tuvoCreditoSegun(r: Respuestas): boolean {
  return r.tuvoCredito || (r.deuda !== null && r.deuda.tipo !== "personal");
}
