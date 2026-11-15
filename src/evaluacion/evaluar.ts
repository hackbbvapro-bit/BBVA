/**
 * Evaluación completa del copiloto sobre una población sintética con verdad conocida.
 * Dos poblaciones con semillas distintas: «ajuste» (solo para calibrar bandas y probabilidades)
 * y «evaluación» (todo lo que se reporta). Ningún número del informe sale de la población de ajuste.
 *
 * Es una función pura: misma entrada, mismo resultado. No lleva fecha ni hora.
 */
import { analizar, idsRecurrentes, proyectar } from '@/motor';
import type { Analisis, Centimos, Jugada, TipoJugada, TipoPerfil } from '@/motor/tipos';
import { medirJugadas, type Resultado } from './decision';
import { duplicadosIngenuo, duplicadosPrudente, gastosAtipicos } from './detectores';
import { brier, clasificar, cuantil, media, probabilidadesDecrecientes, redondear0, redondear4, resumirErrores, type ResumenError, type Tasas } from './metricas';
import { DIAS_FUTURO, DIAS_HISTORIA, ESCENARIOS, aPerfil, generarPoblacion, tocaSaldo, type Cliente, type MovimientoEtiquetado } from './poblacion';
import { HORIZONTES, METODOS, evaluarCliente, type Caso, type Metodo } from './pronostico';

export const TIPOS: TipoPerfil[] = ['dependiente', 'independiente', 'mixto'];
export const TRAMOS_INGRESO = ['hasta_2000', 'de_2000_a_3500', 'mas_de_3500'] as const;
const tramoIngreso = (c: Cliente) => c.ingresoMensual <= 200_000 ? TRAMOS_INGRESO[0] : c.ingresoMensual <= 350_000 ? TRAMOS_INGRESO[1] : TRAMOS_INGRESO[2];

type ClaveHorizonte = 'd7' | 'd14' | 'd30';
const claveDe = (h: number) => `d${h}` as ClaveHorizonte;
const parte = (a: number, b: number) => b > 0 ? redondear4(a / b) : null;

// ── Pronóstico y aviso ───────────────────────────────────────────────────────

export interface ErrorHorizonte extends ResumenError {
  /** Mediana de |error| / gasto mensual del cliente: permite comparar a quien mueve poco con quien mueve mucho. */
  relativo: number | null;
}
export interface Desglose {
  n: number;
  /** Parte de estos clientes que de verdad quedó en negativo en los 30 días siguientes. */
  deficitReal: number | null;
  metodos: Record<Metodo, { error: Record<ClaveHorizonte, ErrorHorizonte>; aviso: Tasas }>;
}

function desglosar(casos: Caso[]): Desglose {
  const metodos = Object.fromEntries(METODOS.map(metodo => {
    const error = Object.fromEntries(HORIZONTES.map(h => {
      const pares = casos.map(k => ({ predicho: k.previsto[metodo][h - 1], real: k.real[h - 1], escala: k.escala }));
      return [claveDe(h), { ...resumirErrores(pares), relativo: redondear4(cuantil(pares.map(p => Math.abs(p.predicho - p.real) / p.escala), 0.5)) }];
    })) as Record<ClaveHorizonte, ErrorHorizonte>;
    return [metodo, { error, aviso: clasificar(casos.map(k => ({ predicho: k.aviso[metodo].hay, real: k.avisoReal.hay }))) }];
  })) as Desglose['metodos'];
  return { n: casos.length, deficitReal: parte(casos.filter(k => k.avisoReal.hay).length, casos.length), metodos };
}

function porGrupo(casos: Caso[], claves: readonly string[], gruposDe: (k: Caso) => string[]): Record<string, Desglose> {
  return Object.fromEntries(claves.map(clave => [clave, desglosar(casos.filter(k => gruposDe(k).includes(clave)))]));
}

export interface FechaAviso {
  /** Avisos acertados: había déficit y el método avisó. */
  n: number;
  /** Mediana de la distancia en días entre el día avisado y el día real. */
  medianaDias: number | null;
  /** Parte de los avisos acertados que llegó antes o el mismo día del déficit real. */
  aTiempo: number | null;
  /** Parte que acertó el día con hasta 3 días de diferencia. */
  cerca: number | null;
}
function fechaAviso(casos: Caso[], metodo: Metodo): FechaAviso {
  const diferencias = casos.filter(k => k.aviso[metodo].hay && k.avisoReal.hay).map(k => k.aviso[metodo].dia! - k.avisoReal.dia!);
  return { n: diferencias.length, medianaDias: redondear0(cuantil(diferencias.map(Math.abs), 0.5)),
    aTiempo: parte(diferencias.filter(d => d <= 0).length, diferencias.length), cerca: parte(diferencias.filter(d => Math.abs(d) <= 3).length, diferencias.length) };
}

// ── ¿De dónde sale el error? Entradas y salidas, fijas y variables ──────────

const PARTES = ['entradasFijas', 'entradasVariables', 'salidasFijas', 'salidasVariables'] as const;
type Parte = typeof PARTES[number];

/**
 * Parte el error del motor a 30 días en cuatro bolsas. Cada cifra es «previsto − real» en promedio por
 * cliente, en céntimos: negativo en entradas = el motor esperaba menos dinero del que entró;
 * negativo en salidas = el motor esperaba más gasto del que hubo (las salidas son negativas).
 */
function descomponer(casos: Caso[]) {
  const filas = casos.map(k => {
    const eventos = proyectar(aPerfil(k.cliente)).dias.flatMap(d => d.eventos);
    const reales = k.cliente.futuro.filter(tocaSaldo);
    const suma = (lista: { monto: number }[]) => lista.reduce((s, m) => s + m.monto, 0);
    const previsto: Record<Parte, number> = {
      entradasFijas: suma(eventos.filter(e => e.monto > 0 && e.origen === 'recurrente')), entradasVariables: suma(eventos.filter(e => e.monto > 0 && e.origen !== 'recurrente')),
      salidasFijas: suma(eventos.filter(e => e.monto < 0 && e.origen === 'recurrente')), salidasVariables: suma(eventos.filter(e => e.monto < 0 && e.origen !== 'recurrente')) };
    const real: Record<Parte, number> = {
      entradasFijas: suma(reales.filter(m => m.monto > 0 && m.recurrente)), entradasVariables: suma(reales.filter(m => m.monto > 0 && !m.recurrente)),
      salidasFijas: suma(reales.filter(m => m.monto < 0 && m.recurrente)), salidasVariables: suma(reales.filter(m => m.monto < 0 && !m.recurrente)) };
    return { tipo: k.cliente.tipo, previsto, real };
  });
  const resumen = (lista: typeof filas) => ({ n: lista.length, ...Object.fromEntries(PARTES.map(p => [p, {
    previsto: redondear0(media(lista.map(f => f.previsto[p]))), real: redondear0(media(lista.map(f => f.real[p]))),
    diferencia: redondear0(media(lista.map(f => f.previsto[p] - f.real[p]))) }])) as Record<Parte, { previsto: number | null; real: number | null; diferencia: number | null }> });
  return { global: resumen(filas), porTipo: Object.fromEntries(TIPOS.map(t => [t, resumen(filas.filter(f => f.tipo === t))])) };
}

// ── Calibración: cuánta confianza merece la proyección ──────────────────────

/** Cortes del margen = saldo mínimo proyectado / gasto mensual. Fijados antes de mirar los resultados. */
export const CORTES_MARGEN = [-0.5, -0.1, 0, 0.1, 0.3, 0.6];
const tramoMargen = (margen: number) => { const i = CORTES_MARGEN.findIndex(c => margen < c); return i < 0 ? CORTES_MARGEN.length : i; };
const margenDe = (k: Caso) => Math.min(...k.previsto.motor) / k.escala;

export interface Calibracion {
  /** Banda que debería contener el saldo real 8 de cada 10 veces. Se ajusta por tipo de perfil y horizonte. */
  banda: { tipo: TipoPerfil; horizonte: number; nAjuste: number; q10: number | null; q90: number | null;
    nEvaluacion: number; cobertura: number | null; /** Ancho mediano de la banda, en céntimos. */ ancho: number | null }[];
  coberturaGlobal: Record<ClaveHorizonte, number | null>;
  /** Probabilidad de déficit según el margen proyectado. */
  probabilidad: { desde: number | null; hasta: number | null; nAjuste: number; probabilidad: number; nEvaluacion: number; tasaReal: number | null }[];
  /** Menor es mejor. «base» = decir a todos la tasa media; «binario» = el aviso sí/no del motor tomado como 100 % / 0 %. */
  brier: { calibrado: number | null; base: number | null; binario: number | null };
}

function calibrar(ajuste: Caso[], evaluacion: Caso[]): Calibracion {
  const normalizado = (k: Caso, h: number) => (k.previsto.motor[h - 1] - k.real[h - 1]) / k.escala;
  const dentro: Record<number, boolean[]> = Object.fromEntries(HORIZONTES.map(h => [h, []]));
  const banda: Calibracion['banda'] = [];
  for (const tipo of TIPOS) for (const h of HORIZONTES) {
    const deAjuste = ajuste.filter(k => k.cliente.tipo === tipo), deEvaluacion = evaluacion.filter(k => k.cliente.tipo === tipo);
    const errores = deAjuste.map(k => normalizado(k, h));
    const q10 = cuantil(errores, 0.1), q90 = cuantil(errores, 0.9);
    const aciertos = q10 === null || q90 === null ? [] : deEvaluacion.map(k => {
      const real = k.real[h - 1], previsto = k.previsto.motor[h - 1];
      return real >= previsto - q90 * k.escala && real <= previsto - q10 * k.escala;
    });
    dentro[h].push(...aciertos);
    banda.push({ tipo, horizonte: h, nAjuste: deAjuste.length, q10: redondear4(q10), q90: redondear4(q90), nEvaluacion: deEvaluacion.length,
      cobertura: parte(aciertos.filter(Boolean).length, aciertos.length),
      ancho: q10 === null || q90 === null ? null : redondear0(cuantil(deEvaluacion.map(k => (q90 - q10) * k.escala), 0.5)) });
  }
  const tramos = Array.from({ length: CORTES_MARGEN.length + 1 }, (_, i) => i);
  const enTramo = (casos: Caso[], i: number) => casos.filter(k => tramoMargen(margenDe(k)) === i);
  // Más margen nunca puede significar más riesgo: los tramos que lo contradicen se juntan.
  const probabilidades = probabilidadesDecrecientes(tramos.map(i => { const c = enTramo(ajuste, i); return { casos: c.filter(k => k.avisoReal.hay).length, total: c.length }; }));
  const tasaBase = ajuste.length ? ajuste.filter(k => k.avisoReal.hay).length / ajuste.length : 0;
  return {
    banda,
    coberturaGlobal: Object.fromEntries(HORIZONTES.map(h => [claveDe(h), parte(dentro[h].filter(Boolean).length, dentro[h].length)])) as Calibracion['coberturaGlobal'],
    probabilidad: tramos.map(i => { const c = enTramo(evaluacion, i); return { desde: i === 0 ? null : CORTES_MARGEN[i - 1], hasta: CORTES_MARGEN[i] ?? null,
      nAjuste: enTramo(ajuste, i).length, probabilidad: redondear4(probabilidades[i])!, nEvaluacion: c.length, tasaReal: parte(c.filter(k => k.avisoReal.hay).length, c.length) }; }),
    brier: {
      calibrado: brier(evaluacion.map(k => ({ probabilidad: probabilidades[tramoMargen(margenDe(k))], real: k.avisoReal.hay }))),
      base: brier(evaluacion.map(k => ({ probabilidad: tasaBase, real: k.avisoReal.hay }))),
      binario: brier(evaluacion.map(k => ({ probabilidad: k.aviso.motor.hay ? 1 : 0, real: k.avisoReal.hay }))),
    },
  };
}

// ── Recurrentes y detectores, contra las etiquetas ───────────────────────────

const cuenta = (lista: string[], maximo = 8) => {
  const veces = new Map<string, number>();
  for (const v of lista) veces.set(v, (veces.get(v) ?? 0) + 1);
  return [...veces.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, maximo).map(([nombre, n]) => ({ nombre, n }));
};
/** Agrupa «Pago Tarjeta Oro», «Pago Préstamo Personal»… para que la lista no se disperse. */
const etiqueta = (m: MovimientoEtiquetado) => m.descripcion.startsWith('Pago Tarjeta') ? 'Pago de tarjeta' : m.descripcion.startsWith('Pago Préstamo') ? 'Pago de préstamo' : m.descripcion;

function medirRecurrentes(clientes: Cliente[]) {
  const filas = clientes.flatMap(c => {
    const ids = idsRecurrentes(c.historia, c.deudas);
    // Los duplicados se miden aparte: aquí solo movimientos limpios.
    return c.historia.filter(m => !m.duplicado).map(m => ({ m, predicho: ids.has(m.id), real: m.recurrente, incompleto: c.escenarios.includes('datos_incompletos') }));
  });
  const recall = (lista: typeof filas) => ({ n: lista.length, detectados: lista.filter(f => f.predicho).length, recall: parte(lista.filter(f => f.predicho).length, lista.length) });
  const reales = filas.filter(f => f.real);
  return {
    global: clasificar(filas),
    sinTarjeta: clasificar(filas.filter(f => f.m.canal !== 'tarjeta')),
    tarjeta: clasificar(filas.filter(f => f.m.canal === 'tarjeta')),
    historiaCompleta: clasificar(filas.filter(f => !f.incompleto)),
    historiaConHuecos: clasificar(filas.filter(f => f.incompleto)),
    porSerie: Object.fromEntries((['mensual', 'quincenal', 'semanal'] as const).map(s => [s, recall(reales.filter(f => f.m.serie === s))])),
    noDetectados: cuenta(reales.filter(f => !f.predicho).map(f => etiqueta(f.m))),
    falsasAlarmas: cuenta(filas.filter(f => f.predicho && !f.real).map(f => etiqueta(f.m))),
  };
}

function medirDetectores(clientes: Cliente[]) {
  const filas = clientes.flatMap(c => {
    const ingenuo = duplicadosIngenuo(c.historia), prudente = duplicadosPrudente(c.historia), atipicos = gastosAtipicos(c.historia, c.deudas);
    return c.historia.map(m => ({ m, ingenuo: ingenuo.has(m.id), prudente: prudente.has(m.id), atipico: atipicos.has(m.id) }));
  });
  const duplicados = (regla: 'ingenuo' | 'prudente') => {
    const de = (tipo: MovimientoEtiquetado['tipoDuplicado']) => { const l = filas.filter(f => f.m.tipoDuplicado === tipo); return { n: l.length, detectados: l.filter(f => f[regla]).length, recall: parte(l.filter(f => f[regla]).length, l.length) }; };
    return { ...clasificar(filas.map(f => ({ predicho: f[regla], real: f.m.duplicado }))), registroRepetido: de('registro_repetido'), cobroDoble: de('cobro_doble'),
      falsasAlarmas: cuenta(filas.filter(f => f[regla] && !f.m.duplicado).map(f => etiqueta(f.m)), 5),
      noDetectados: cuenta(filas.filter(f => !f[regla] && f.m.duplicado).map(f => etiqueta(f.m)), 5) };
  };
  const salidas = filas.filter(f => f.m.monto < 0);
  return {
    duplicados: { ingenuo: duplicados('ingenuo'), prudente: duplicados('prudente') },
    atipicos: { ...clasificar(salidas.map(f => ({ predicho: f.atipico, real: f.m.atipico }))),
      falsasAlarmas: cuenta(salidas.filter(f => f.atipico && !f.m.atipico).map(f => etiqueta(f.m)), 5) },
  };
}

// ── ¿La jugada mejora la decisión? ───────────────────────────────────────────

const ORDEN_JUGADAS: TipoJugada[] = ['pagar_minimo', 'pausar_suscripciones', 'recortar_gasto'];
interface Decidido { caso: Caso; analisis: Analisis; primera?: Jugada; unaJugada?: Resultado; todas?: Resultado }

function resumenJugada(lista: Resultado[]) {
  const reducciones = lista.filter(r => r.faltanteAntes > 0).map(r => 1 - r.faltanteDespues / r.faltanteAntes);
  return { n: lista.length, aplicada: parte(lista.filter(r => r.aplicada).length, lista.length),
    /** Parte de los déficits reales que desaparecen si la persona sigue la jugada. */
    evitados: parte(lista.filter(r => r.deficitAntes && !r.deficitDespues).length, lista.filter(r => r.deficitAntes).length),
    /** Mediana de cuánto baja el faltante del peor día (1 = desaparece, 0 = no cambia). */
    reduccionMediana: redondear4(cuantil(reducciones, 0.5)),
    faltanteMedioAntes: redondear0(media(lista.map(r => r.faltanteAntes))), faltanteMedioDespues: redondear0(media(lista.map(r => r.faltanteDespues))) };
}

function medirDecision(casos: Caso[]) {
  const decididos: Decidido[] = casos.map(caso => {
    const analisis = analizar(aPerfil(caso.cliente));
    const jugadas = analisis.proyeccion.deficit ? analisis.jugadas : [];
    if (!jugadas.length) return { caso, analisis };
    const enOrden = [...jugadas].sort((a, b) => ORDEN_JUGADAS.indexOf(a.tipo) - ORDEN_JUGADAS.indexOf(b.tipo));
    return { caso, analisis, primera: jugadas[0], unaJugada: medirJugadas(caso.cliente, [jugadas[0]]), todas: medirJugadas(caso.cliente, enOrden) };
  });
  const avisados = decididos.filter(d => d.analisis.proyeccion.deficit);
  const aciertos = avisados.filter(d => d.caso.avisoReal.hay), falsas = avisados.filter(d => !d.caso.avisoReal.hay);
  const sinAviso = decididos.filter(d => !d.analisis.proyeccion.deficit && d.caso.avisoReal.hay);
  const con = <T extends 'unaJugada' | 'todas'>(lista: Decidido[], cual: T) => lista.filter(d => d[cual]).map(d => d[cual]!);
  const deficit = (cual: 'unaJugada' | 'todas' | null) => parte(decididos.filter(d => cual && d[cual] ? d[cual]!.deficitDespues : d.caso.avisoReal.hay).length, decididos.length);
  const faltante = (cual: 'unaJugada' | 'todas' | null) => redondear0(media(decididos.map(d => cual && d[cual] ? d[cual]!.faltanteDespues : d.caso.faltanteReal)));
  const promesa = (resuelve: boolean) => { const l = aciertos.filter(d => d.primera?.resuelve === resuelve); return { n: l.length, evitados: parte(l.filter(d => !d.unaJugada!.deficitDespues).length, l.length) }; };
  return {
    clientes: decididos.length, avisados: avisados.length, avisadosSinJugada: avisados.filter(d => !d.primera).length,
    /** Parte de toda la población que queda en negativo: sin copiloto, siguiendo la primera jugada o todas a la vez. */
    tasaDeficit: { sinCopiloto: deficit(null), primeraJugada: deficit('unaJugada'), todasLasJugadas: deficit('todas') },
    /** Faltante medio del peor día, contando a toda la población (quien no tiene déficit suma cero). */
    faltanteMedio: { sinCopiloto: faltante(null), primeraJugada: faltante('unaJugada'), todasLasJugadas: faltante('todas') },
    avisosAcertados: { n: aciertos.length, primeraJugada: resumenJugada(con(aciertos, 'unaJugada')), todasLasJugadas: resumenJugada(con(aciertos, 'todas')),
      costoMedio: redondear0(media(con(aciertos, 'unaJugada').map(r => r.costo))),
      /** El motor dijo «esta jugada resuelve el déficit»: ¿lo resolvió de verdad? */
      cuandoPrometeResolver: promesa(true), cuandoNoPromete: promesa(false),
      porTipoDeJugada: Object.fromEntries(ORDEN_JUGADAS.map(t => [t, resumenJugada(aciertos.filter(d => d.primera?.tipo === t).map(d => d.unaJugada!))])),
      porTipoDePerfil: Object.fromEntries(TIPOS.map(t => [t, resumenJugada(con(aciertos.filter(d => d.caso.cliente.tipo === t), 'unaJugada'))])) },
    falsasAlarmas: { n: falsas.length, conCosto: parte(con(falsas, 'unaJugada').filter(r => r.costo > 0).length, con(falsas, 'unaJugada').length),
      costoMedio: redondear0(media(con(falsas, 'unaJugada').map(r => r.costo))),
      /** Falsas alarmas en las que seguir la jugada creó un déficit que no existía. */
      deficitCreado: con(falsas, 'unaJugada').filter(r => r.deficitDespues).length },
    sinAviso: { n: sinAviso.length, faltanteMedio: redondear0(media(sinAviso.map(d => d.caso.faltanteReal))) },
    /** Simulación del motor, no contrastada con la verdad: se informa como dato descriptivo. */
    deudas: (() => {
      const comparaciones = decididos.map(d => d.analisis.deudas).filter(d => d !== null);
      const ahorros = comparaciones.filter(d => d.ahorroVsMinimos > 0).map(d => d.ahorroVsMinimos);
      return { clientesConDeuda: comparaciones.length, conAhorro: ahorros.length, ahorroMediano: redondear0(cuantil(ahorros, 0.5)),
        minimosNoTerminan: comparaciones.filter(d => d.minimos.noTermina).length };
    })(),
  };
}

// ── Población ────────────────────────────────────────────────────────────────

function describir(clientes: Cliente[], casos: Caso[]) {
  const contar = (lista: MovimientoEtiquetado[][]) => lista.reduce((s, l) => s + l.length, 0);
  const todos = clientes.flatMap(c => [...c.historia, ...c.ocultos, ...c.futuro]);
  const ingresos = clientes.map(c => c.ingresoMensual);
  return {
    clientes: clientes.length,
    porTipo: Object.fromEntries(TIPOS.map(t => [t, clientes.filter(c => c.tipo === t).length])),
    porEscenario: Object.fromEntries([...ESCENARIOS, 'ninguno'].map(e => [e, clientes.filter(c => e === 'ninguno' ? !c.escenarios.length : c.escenarios.includes(e as never)).length])),
    porIngreso: Object.fromEntries(TRAMOS_INGRESO.map(t => [t, clientes.filter(c => tramoIngreso(c) === t).length])),
    movimientos: { total: todos.length, historia: contar(clientes.map(c => c.historia)), ocultos: contar(clientes.map(c => c.ocultos)), futuro: contar(clientes.map(c => c.futuro)),
      recurrentes: todos.filter(m => m.recurrente).length, duplicados: todos.filter(m => m.duplicado).length, atipicos: todos.filter(m => m.atipico).length,
      enTarjeta: todos.filter(m => m.canal === 'tarjeta').length },
    ingresoMensual: { p10: redondear0(cuantil(ingresos, 0.1)), mediana: redondear0(cuantil(ingresos, 0.5)), p90: redondear0(cuantil(ingresos, 0.9)) },
    conDeuda: clientes.filter(c => c.deudas.length).length,
    primerCorte: clientes.reduce((a, c) => c.corte < a ? c.corte : a, clientes[0]?.corte ?? ''),
    ultimoCorte: clientes.reduce((a, c) => c.corte > a ? c.corte : a, clientes[0]?.corte ?? ''),
    deficitReal: parte(casos.filter(k => k.avisoReal.hay).length, casos.length),
    diaMedianoDelDeficit: redondear0(cuantil(casos.filter(k => k.avisoReal.hay).map(k => k.avisoReal.dia!), 0.5)),
    faltanteMedianoSiHayDeficit: redondear0(cuantil(casos.filter(k => k.avisoReal.hay).map(k => k.faltanteReal), 0.5)),
  };
}

// ── Todo junto ───────────────────────────────────────────────────────────────

export interface Opciones { semillaAjuste: number; semillaEvaluacion: number; clientes: number }

export function evaluar(opciones: Opciones) {
  if (opciones.semillaAjuste === opciones.semillaEvaluacion) throw new Error('Ajuste y evaluación necesitan semillas distintas');
  const clientes = generarPoblacion(opciones.semillaEvaluacion, opciones.clientes);
  const casos = clientes.map(evaluarCliente);
  const ajuste = generarPoblacion(opciones.semillaAjuste, opciones.clientes).map(evaluarCliente);
  return {
    configuracion: { ...opciones, diasDeHistoria: DIAS_HISTORIA, diasEvaluados: DIAS_FUTURO, unidad: 'céntimos de sol' },
    poblacion: describir(clientes, casos),
    pronostico: {
      global: desglosar(casos),
      porTipo: porGrupo(casos, TIPOS, k => [k.cliente.tipo]),
      porEscenario: porGrupo(casos, [...ESCENARIOS, 'ninguno'], k => k.cliente.escenarios.length ? k.cliente.escenarios : ['ninguno']),
      porIngreso: porGrupo(casos, TRAMOS_INGRESO, k => [tramoIngreso(k.cliente)]),
      fechaDelAviso: Object.fromEntries(METODOS.map(m => [m, fechaAviso(casos, m)])) as Record<Metodo, FechaAviso>,
    },
    origenDelError: descomponer(casos),
    calibracion: calibrar(ajuste, casos),
    recurrentes: medirRecurrentes(clientes),
    detectores: medirDetectores(clientes),
    decision: medirDecision(casos),
  };
}
export type Resultados = ReturnType<typeof evaluar>;

/** Para pruebas y para la población de ajuste: saldo en céntimos sin tocar. */
export type { Centimos };
