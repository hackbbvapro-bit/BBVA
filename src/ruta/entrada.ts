/**
 * Arma un caso de simulación a partir de las respuestas de la entrada conversada.
 * Es código puro: las cifras que la persona escribe se reparten en céntimos enteros, sin perder ni un céntimo.
 * Las fechas son aproximadas a propósito (la entrada pregunta «cuándo te entra la plata», no el día exacto);
 * después se corrigen en Mi dinero y en Deudas.
 */
import { formatoSoles, type Centimos, type FechaISO, type Movimiento } from "../motor";
import { sumarDias } from "../motor/fechas";
import { datosVacios } from "../datos/semilla";
import type { Datos, DeudaGuardada, Fijo, TipoDeudaDebo } from "../datos/tipos";

export type Cobro = "fin_de_mes" | "quincena" | "semanal" | "variable" | "diario";
/** Cómo trabaja: en planilla con sueldo (dependiente) o por su cuenta (independiente). */
export type Trabajo = "dependiente" | "independiente";
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
  /** Si falta (casos antiguos), se deduce de cómo cobra: cada semana es independiente. */
  trabajo?: Trabajo;
  cobro: Cobro;
  /** Dependiente que cobra a fin de mes: el día del mes en que le depositan (1 a 31). */
  diaPago?: number;
  /** Dependiente: sueldo neto. Independiente: lo que le entra en un mes normal. */
  ingresoMensual: Centimos;
  /** Independiente: lo que le entra en un mes flojo. La proyección usa este monto, por prudencia. */
  ingresoFlojo?: Centimos;
  /** Dependiente: si recibe gratificación en julio y diciembre. Solo da contexto; no entra en la proyección. */
  gratificacion?: boolean;
  /** Dependiente: ingreso extra que llega seguro cada mes, aparte del sueldo. */
  ingresoExtra?: Centimos;
  /** Independiente: lo que gasta al mes para poder trabajar (materiales, mercadería, movilidad). */
  gastosTrabajo?: Centimos;
  /** Independiente: seguro de salud o pensión que paga por su cuenta. */
  seguro?: Centimos;
  /** Apoyo fijo a la familia cada mes. */
  apoyoFamilia?: Centimos;
  /** Dependiente: estudios o cursos que paga cada mes. */
  estudios?: Centimos;
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

const DIAS_DE_COBRO: Record<Cobro, number[]> = { fin_de_mes: [30], quincena: [15, 30], semanal: [7, 14, 21, 28], variable: [7, 14, 21, 28], diario: [] };
const NOMBRES_DE_INGRESO: Record<Cobro, string[]> = {
  fin_de_mes: ["Ingreso del mes"],
  quincena: ["Ingreso de la primera quincena", "Ingreso de la segunda quincena"],
  semanal: ["Ingreso de la primera semana", "Ingreso de la segunda semana", "Ingreso de la tercera semana", "Ingreso de la cuarta semana"],
  variable: ["Ingreso de trabajos, primera semana", "Ingreso de trabajos, segunda semana", "Ingreso de trabajos, tercera semana", "Ingreso de trabajos, cuarta semana"],
  diario: [],
};
const TEXTO_DE_COBRO: Record<Cobro, string> = {
  fin_de_mes: "cobra a fin de mes", quincena: "cobra por quincenas", semanal: "cobra cada semana", variable: "cobra cuando termina un trabajo",
  diario: "le entra plata todos los días",
};

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

export function trabajoSegun(r: Respuestas): Trabajo {
  return r.trabajo ?? (r.cobro === "semanal" || r.cobro === "variable" || r.cobro === "diario" ? "independiente" : "dependiente");
}

/** Días del mes en que entra la plata. Un dependiente que cobra a fin de mes puede decir su día exacto. */
export function diasDeCobro(r: Respuestas): number[] {
  if (r.cobro === "fin_de_mes" && r.diaPago !== undefined) return [r.diaPago];
  return DIAS_DE_COBRO[r.cobro];
}

/**
 * Cuánto se proyecta como ingreso del mes. Para un independiente, el mes flojo (si lo dijo y es menor):
 * el copiloto anticipa con lo peor razonable, y si le va mejor, le sobra. Para un dependiente, su sueldo neto.
 */
export function ingresoProyectado(r: Respuestas): Centimos {
  if (trabajoSegun(r) === "independiente" && r.ingresoFlojo !== undefined) return Math.min(r.ingresoFlojo, r.ingresoMensual);
  return r.ingresoMensual;
}

function descripcion(r: Respuestas): string {
  const trabajo = trabajoSegun(r);
  const partes = [`Caso de simulación armado en la entrada: trabaja como ${trabajo} y ${TEXTO_DE_COBRO[r.cobro]}.`];
  if (trabajo === "dependiente") {
    if (r.cobro === "fin_de_mes" && r.diaPago !== undefined) partes.push(`Le depositan el sueldo el día ${r.diaPago}.`);
    if (r.gratificacion !== undefined) partes.push(r.gratificacion ? "Recibe gratificación en julio y diciembre." : "No recibe gratificación.");
  } else if (r.ingresoFlojo !== undefined) {
    partes.push(
      `Ingreso variable: en un mes normal le entran ${formatoSoles(r.ingresoMensual)} y en uno flojo ${formatoSoles(Math.min(r.ingresoFlojo, r.ingresoMensual))}; la proyección usa el mes flojo, por prudencia.`,
    );
  }
  const extras: string[] = [];
  if (r.ingresoExtra) extras.push(`un ingreso extra de ${formatoSoles(r.ingresoExtra)} al mes`);
  if (r.gastosTrabajo) extras.push(`${formatoSoles(r.gastosTrabajo)} al mes en gastos del trabajo`);
  if (r.seguro) extras.push(`${formatoSoles(r.seguro)} al mes de seguro o pensión`);
  if (r.apoyoFamilia) extras.push(`${formatoSoles(r.apoyoFamilia)} al mes de apoyo a su familia`);
  if (r.estudios) extras.push(`${formatoSoles(r.estudios)} al mes en estudios`);
  if (extras.length > 0) partes.push(`Además declara ${extras.join(", ")}.`);
  return partes.join(" ");
}

/** Semanas de historia que se arman para quien cobra al día: las que mira el motor. */
export const SEMANAS_DE_HISTORIA = 12;
/**
 * Supuesto declarado: una de cada cuatro semanas es floja (3 de 12). Con eso el estimado prudente del motor
 * (el percentil 25 de las semanas) cae en la semana floja y el típico (la mediana) en la normal.
 * La semana 0 es la más reciente.
 */
const SEMANAS_FLOJAS = new Set([1, 5, 9]);

/** Lo que entra en una semana si en un mes entra `mensual` (52 semanas, 12 meses), en céntimos enteros. */
export function semanalDe(mensual: Centimos): Centimos {
  return Math.round((mensual * 12) / 52);
}

/**
 * Historia de ingresos de quien vende o cobra al día: 12 semanas, un ingreso por día, armadas solo con las dos cifras
 * que dio (mes normal y mes flojo). No es su historia real: es la forma de llevar al motor un ingreso que entra
 * todos los días y que a veces baja. Con ella el motor proyecta el ingreso día por día, con la semana floja.
 */
export function historiaDiaria(r: Respuestas): Movimiento[] {
  const normal = semanalDe(r.ingresoMensual);
  const flojo = semanalDe(Math.min(r.ingresoFlojo ?? r.ingresoMensual, r.ingresoMensual));
  const movimientos: Movimiento[] = [];
  for (let semana = 0; semana < SEMANAS_DE_HISTORIA; semana++) {
    repartir(SEMANAS_FLOJAS.has(semana) ? flojo : normal, 7).forEach((monto, dia) => {
      if (monto <= 0) return;
      const fecha = sumarDias(r.hoy, -(semana * 7 + dia));
      movimientos.push({ id: `ingreso-diario-${fecha}`, fecha, monto, descripcion: "Ventas del día", categoria: "ingreso_variable", canal: "cuenta" });
    });
  }
  return movimientos.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** El caso completo, listo para cargar en el repositorio. */
export function armarCaso(r: Respuestas): Datos {
  const dias = diasDeCobro(r);
  const datos = datosVacios({
    nombre: r.nombre.trim().slice(0, 40),
    tipo: trabajoSegun(r),
    saldo: r.saldo,
    ingresoAprox: r.ingresoMensual,
    hoy: r.hoy,
  });
  datos.perfil.descripcion = descripcion(r);
  datos.perfil.diasCobro = dias;
  // Quien cobra al día no tiene un ingreso fijo con fecha: va como historia diaria y el motor lo estima con prudencia.
  datos.ingresosFijos = r.cobro === "diario" ? [] : fijos("ingreso", NOMBRES_DE_INGRESO[r.cobro], dias, ingresoProyectado(r), "sueldo");
  datos.movimientos = r.cobro === "diario" ? historiaDiaria(r) : [];
  datos.gastosFijos = [
    ...fijos("gasto-alquiler", ["Alquiler y servicios"], [5], r.fijosMensual, "alquiler"),
    ...fijos("gasto-dia", NOMBRES_DE_GASTO, DIAS_DE_GASTO, r.diaADiaMensual, "comida"),
    ...fijos("gasto-trabajo", ["Gastos del trabajo, primera quincena", "Gastos del trabajo, segunda quincena"], [3, 18], r.gastosTrabajo ?? 0, "otros"),
    ...fijos("gasto-seguro", ["Seguro de salud o pensión"], [10], r.seguro ?? 0, "salud"),
    ...fijos("gasto-familia", ["Apoyo a la familia"], [1], r.apoyoFamilia ?? 0, "familia"),
    ...fijos("gasto-estudios", ["Estudios y cursos"], [10], r.estudios ?? 0, "educacion"),
  ];
  datos.ingresosFijos.push(...fijos("ingreso-extra", ["Ingreso extra"], [20], r.ingresoExtra ?? 0, "ingreso_variable"));
  datos.deudas = r.deuda && r.deuda.saldo > 0 ? [deudaGuardada(r.deuda)] : [];
  return datos;
}

/** Si la persona tuvo crédito formal: lo dijo, o tiene hoy una tarjeta o un préstamo. */
export function tuvoCreditoSegun(r: Respuestas): boolean {
  return r.tuvoCredito || (r.deuda !== null && r.deuda.tipo !== "personal");
}
