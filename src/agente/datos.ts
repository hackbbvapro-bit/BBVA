/**
 * Lo que el agente puede «ver». Cada función devuelve datos del motor con los montos, tasas y
 * fechas YA escritos como texto, para que el modelo los copie tal cual y no tenga que calcular nada.
 */
import { mejorJugada, proximosPagos } from "../explica/explica";
import { formatoLargo, formatoSoles, formatoTasa, redondear, simularGasto } from "../motor";
import type { Analisis, Centimos, EventoProyectado, Perfil, PlanDeudas } from "../motor";
import { fraseLibre, MESES_DE_COLCHON, type Ruta } from "../ruta/ruta";

const MAXIMO_SOLES = 1_000_000;

function valor(monto: Centimos): string {
  return formatoSoles(Math.abs(monto));
}

function evento(e: EventoProyectado) {
  return { fecha: formatoLargo(e.fecha), descripcion: e.descripcion, monto: valor(e.monto) };
}

function etiqueta(categoria: string): string {
  return categoria.replaceAll("_", " ");
}

function deficit(analisis: Analisis) {
  const d = analisis.proyeccion.deficit;
  if (!d) return null;
  return {
    primer_dia_en_negativo: formatoLargo(d.fecha),
    dias_que_faltan: d.diasRestantes,
    cuanto_falta_ese_dia: formatoSoles(d.faltante),
    faltante_maximo: formatoSoles(d.faltanteMaximo),
    dia_del_faltante_maximo: formatoLargo(d.fechaFaltanteMaximo),
    causas: d.causas.map(evento),
    proximo_ingreso: d.proximoIngreso ? evento(d.proximoIngreso) : null,
  };
}

export function datosResumen(perfil: Perfil, analisis: Analisis) {
  const p = analisis.proyeccion;
  return {
    persona: perfil.nombre,
    situacion: perfil.descripcion,
    hoy: formatoLargo(analisis.hoy),
    saldo_hoy: formatoSoles(perfil.saldoActual),
    proyeccion_hasta: formatoLargo(p.hasta),
    saldo_mas_bajo: formatoSoles(p.saldoMinimo),
    dia_del_saldo_mas_bajo: formatoLargo(p.fechaSaldoMinimo),
    saldo_al_final: formatoSoles(p.saldoFinal),
    deficit: deficit(analisis),
    ingreso_variable_semanal_prudente: formatoSoles(analisis.ingresoVariable.semanalPrudente),
    ingreso_variable_semanal_tipico: formatoSoles(analisis.ingresoVariable.semanalTipico),
    gasto_diario_tipico: valor(analisis.gastoVariable.diario),
    gasto_mensual_por_categoria: analisis.gastoVariable.porCategoria.map(c => ({
      categoria: etiqueta(c.categoria),
      al_mes: formatoSoles(c.mensual),
    })),
  };
}

export function datosJugadas(analisis: Analisis) {
  if (!analisis.proyeccion.deficit) {
    return { hay_deficit: false, nota: "No se proyecta ningún día en negativo, así que no hace falta ninguna jugada." };
  }
  return {
    hay_deficit: true,
    la_mas_barata_que_resuelve_sola: mejorJugada(analisis)?.titulo ?? null,
    jugadas: analisis.jugadas.map(j => ({
      titulo: j.titulo,
      que_hacer: j.detalle,
      libera: formatoSoles(j.libera),
      cuesta: j.costo > 0 ? formatoSoles(j.costo) : "no cuesta dinero",
      por_que_cuesta_eso: j.costoDetalle,
      resuelve_sola_el_deficit: j.resuelve,
      saldo_mas_bajo_si_se_aplica: formatoSoles(j.saldoMinimoDespues),
    })),
  };
}

function plan(p: PlanDeudas) {
  if (p.noTermina) return { termina: false, nota: "Con ese pago mensual la deuda no llega a bajar." };
  return { termina: true, meses: p.meses, intereses_totales: formatoSoles(p.interesTotal), total_pagado: formatoSoles(p.totalPagado) };
}

export function datosDeudas(perfil: Perfil, analisis: Analisis) {
  const comparacion = analisis.deudas;
  if (!comparacion) return { tiene_deudas: false };
  const enOrden = comparacion.avalancha.orden
    .map(id => perfil.deudas.find(d => d.id === id))
    .filter(d => d !== undefined);
  return {
    tiene_deudas: true,
    pagar_primero: comparacion.primera?.nombre ?? null,
    motivo: "Es la de TCEA más alta: cada sol que se le adelanta es el que más intereses ahorra.",
    pago_mensual_considerado: formatoSoles(comparacion.presupuestoMensual),
    deudas_de_mayor_a_menor_tcea: enOrden.map(d => ({
      nombre: d.nombre,
      tipo: d.tipo === "tarjeta" ? "tarjeta de crédito" : "préstamo",
      se_debe: formatoSoles(d.saldo),
      tcea: formatoTasa(d.tceaBp),
      pago_minimo_o_cuota: formatoSoles(d.pagoMinimo),
      suele_pagar: formatoSoles(d.pagoHabitual),
      dia_de_pago_del_mes: d.diaPago,
    })),
    plan_empezando_por_la_mas_cara: plan(comparacion.avalancha),
    plan_pagando_solo_minimos: plan(comparacion.minimos),
    ahorro_en_intereses_frente_a_solo_minimos: comparacion.ahorroVsMinimos > 0 ? formatoSoles(comparacion.ahorroVsMinimos) : null,
  };
}

export function datosProximosPagos(analisis: Analisis, dias = 7) {
  const pagos = proximosPagos(analisis, dias);
  return { dias, pagos: pagos.map(evento), nota: pagos.length === 0 ? "No hay pagos fijos en esos días." : undefined };
}

function veredicto(alcanza: boolean, yaHabiaDeficit: boolean, primerDia: string | null, maximo: string, minimo: string, diaMinimo: string): string {
  if (alcanza) return `Sí alcanza. Después del gasto, el día más ajustado sería el ${diaMinimo}, con ${minimo}.`;
  if (yaHabiaDeficit) return `Ya había un día en negativo antes de este gasto. Con el gasto, el punto más bajo sería ${minimo} el ${diaMinimo}.`;
  return `No alcanza: el ${primerDia} la cuenta quedaría en negativo. Lo máximo que se puede gastar ese día sin quedar en negativo es ${maximo}.`;
}

/** «¿Me alcanza para gastar X tal día?» El monto llega en soles y aquí se pasa una sola vez a céntimos enteros. */
export function datosSimulacion(analisis: Analisis, montoSoles: number, fecha: string) {
  if (!Number.isFinite(montoSoles) || montoSoles <= 0 || montoSoles > MAXIMO_SOLES) {
    return { error: "El monto debe ser un número de soles mayor que cero." };
  }
  try {
    // El saldo de hoy ya está cerrado: gastar hoy baja igual todos los días proyectados, que empiezan mañana.
    const fechaMotor = fecha === analisis.hoy ? analisis.proyeccion.desde : fecha;
    const s = simularGasto(analisis.proyeccion, fechaMotor, redondear(montoSoles * 100));
    const minimo = formatoSoles(s.saldoMinimoDespues);
    const diaMinimo = formatoLargo(s.fechaSaldoMinimoDespues);
    const primerDia = s.primerDiaBajoCero ? formatoLargo(s.primerDiaBajoCero) : null;
    const maximo = formatoSoles(s.maximoSinDeficit);
    return {
      gasto: formatoSoles(s.monto),
      dia_del_gasto: formatoLargo(fecha),
      alcanza: s.alcanza,
      veredicto: veredicto(s.alcanza, s.yaHabiaDeficit, primerDia, maximo, minimo, diaMinimo),
      saldo_mas_bajo_sin_el_gasto: formatoSoles(s.saldoMinimoAntes),
      saldo_mas_bajo_con_el_gasto: minimo,
      dia_del_saldo_mas_bajo_con_el_gasto: diaMinimo,
      primer_dia_en_negativo_con_el_gasto: primerDia,
      maximo_que_se_puede_gastar_ese_dia: maximo,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo simular ese gasto." };
  }
}

/** La ruta que el motor trazó para esta persona: pasos y alternativas generales, sin marcas ni tasas. */
export function datosRuta(ruta: Ruta) {
  const { flujo, colchon } = ruta;
  return {
    ruta: ruta.titulo,
    resumen: ruta.resumen,
    por_que_esta_ruta: ruta.motivos,
    pasos: ruta.pasos,
    alternativas_para_comparar: ruta.alternativas.map(a => ({
      nombre: a.entrada.titulo,
      para_quien: a.entrada.paraQuien,
      condicion: a.entrada.condicion,
      por_que_aparece: a.porQue,
    })),
    flujo_mensual: {
      entra: formatoSoles(flujo.ingresos),
      gastos_fijos_y_del_dia_a_dia: formatoSoles(flujo.gastos),
      cuotas_de_deuda: formatoSoles(flujo.cuotas),
      queda_libre: formatoSoles(flujo.libre),
      en_una_frase: fraseLibre(flujo),
    },
    colchon_para_imprevistos: {
      meses_de_gastos_que_cubre_la_meta: MESES_DE_COLCHON,
      meta: formatoSoles(colchon.meta),
      falta: formatoSoles(colchon.falta),
      dias_de_gastos_que_cubre_hoy: colchon.diasCubiertos,
      meses_para_completarlo: colchon.mesesParaCompletar ?? "no se puede calcular: hoy no queda nada libre al mes",
    },
    aviso: ruta.aviso,
  };
}
