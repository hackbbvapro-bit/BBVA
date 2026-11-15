/**
 * Lo que el agente puede «ver». Cada función devuelve datos del motor con los montos, tasas y
 * fechas YA escritos como texto, para que el modelo los copie tal cual y no tenga que calcular nada.
 */
import { costoEnPalabras, mejorJugada, proximosPagos } from "../explica/explica";
import { formatoLargo, formatoSoles, formatoTasa, leccionesMinimo, redondear, simularGasto, type LeccionMinimo } from "../motor";
import { GLOSARIO, NOTA_MINIMO, PARA_SALIR, SI_NO_PAGAS, SI_PAGAS_EL_MINIMO } from "../explica/educacion";
import { conCobros, type CobroPendiente } from "../motor/cobros";
import type { Analisis, Centimos, EventoProyectado, Perfil, PlanDeudas } from "../motor";
import { contadorDeAvance, fraseLibre, MESES_DE_COLCHON, type Avance, type Ruta } from "../ruta/ruta";
import { PREGUNTAS } from "../ruta/presupuesto";

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

/** Lo que le deben a la persona y cómo quedaría su mes si se lo pagan a tiempo. null si no hay nada pendiente. */
function pendientes(analisis: Analisis, cobros: readonly CobroPendiente[]) {
  const sinCobrar = cobros.filter(c => !c.cobrado);
  if (sinCobrar.length === 0) return null;
  const e = conCobros(analisis.proyeccion, sinCobrar);
  return {
    cobros_pendientes: sinCobrar.map(c => ({ quien: c.quien, monto: formatoSoles(c.monto), fecha_prometida: formatoLargo(c.fechaPrometida) })),
    si_te_pagan_lo_pendiente: {
      nota: "Escenario optimista: el plan prudente no cuenta este dinero hasta que llegue.",
      saldo_mas_bajo: formatoSoles(e.saldoMinimo),
      dia_del_saldo_mas_bajo: formatoLargo(e.fechaSaldoMinimo),
      quedas_en_rojo_desde: e.primerDiaNegativo ? formatoLargo(e.primerDiaNegativo) : null,
      te_faltaria: formatoSoles(e.faltanteMaximo),
    },
  };
}

export function datosResumen(perfil: Perfil, analisis: Analisis, cobros: readonly CobroPendiente[] = []) {
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
    ...pendientes(analisis, cobros),
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
      cuesta: costoEnPalabras(j),
      // conocido = cifra exacta; estimado = dilo como aproximado; desconocido = no des monto ni digas gratis.
      certeza_del_costo: j.certezaCosto,
      por_que_cuesta_eso: j.costoDetalle,
      resuelve_sola_el_deficit: j.resuelve,
      // elimina | reduce | posterga (el pago se sigue debiendo) | no_mejora
      efecto_sobre_el_deficit: j.efecto,
      saldo_mas_bajo_si_se_aplica: formatoSoles(j.saldoMinimoDespues),
    })),
  };
}

function plan(p: PlanDeudas) {
  if (p.noTermina) return { termina: false, nota: "Con ese pago mensual la deuda no llega a bajar." };
  return { termina: true, meses: p.meses, intereses_totales: formatoSoles(p.interesTotal), total_pagado: formatoSoles(p.totalPagado) };
}

/** Las cifras del mínimo de una tarjeta, ya en texto, y lo que significan. */
function leccion(l: LeccionMinimo) {
  return {
    tarjeta: l.nombre,
    pago_minimo: formatoSoles(l.pagoMinimo),
    del_minimo_se_va_en_intereses_el_primer_mes: formatoSoles(l.interesPrimerMes),
    del_minimo_baja_la_deuda_el_primer_mes: formatoSoles(l.abonoPrimerMes),
    pagando_solo_el_minimo: plan(l.soloMinimo),
    pagando_lo_que_suele_pagar: l.conLoQuePaga ? { suele_pagar: formatoSoles(l.pagoHabitual), ...plan(l.conLoQuePaga) } : null,
  };
}

/** Lo que el agente explica sobre el pago mínimo: cifras del motor por tarjeta + reglas fijas. */
export function educacionDeudas(perfil: Perfil) {
  return {
    pago_minimo_por_tarjeta: leccionesMinimo(perfil.deudas).map(leccion),
    si_pagas_solo_el_minimo: SI_PAGAS_EL_MINIMO,
    si_no_pagas_nada: SI_NO_PAGAS,
    para_salir: PARA_SALIR,
    glosario: GLOSARIO,
    nota_de_calculo: NOTA_MINIMO,
  };
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
    de_donde_sale_el_ahorro: "De pagar cada mes lo considerado en vez de solo los mínimos, empezando por la más cara. No sale solo del orden.",
    educacion: educacionDeudas(perfil),
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
export function datosRuta(ruta: Ruta, avance?: Avance) {
  const { flujo, colchon } = ruta;
  return {
    ruta: ruta.titulo,
    resumen: ruta.resumen,
    por_que_esta_ruta: ruta.motivos,
    pasos: avance ? avance.pasos.map(p => ({ paso: p.texto, marcado_como_hecho: p.hecho })) : ruta.pasos,
    ...(avance && {
      avance: contadorDeAvance(avance),
      siguiente_paso: avance.siguiente ?? "ya marcó todos los pasos",
    }),
    alternativas_para_comparar: ruta.alternativas.map(a => ({
      nombre: a.entrada.titulo,
      para_quien: a.entrada.paraQuien,
      condicion: a.entrada.condicion,
      por_que_aparece: a.porQue,
      que_preguntar_en_su_banco: PREGUNTAS[a.entrada.id],
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
