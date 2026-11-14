/**
 * Población sintética con verdad de referencia.
 *
 * Cada cliente inventado trae 90 días de historia (lo único que ve el motor), los 30 días
 * siguientes guardados aparte (la verdad contra la que se mide) y etiquetas por movimiento:
 * si pertenece a una serie recurrente, si es un cobro doble o un registro repetido y si es
 * un gasto atípico. Nada sale de datos reales: las proporciones son supuestos de diseño
 * declarados en docs/DATOS.md, no estadísticas de mercado.
 *
 * Regla de fuga: el generador escribe historia y futuro con el mismo proceso, pero el motor
 * solo recibe `aPerfil(cliente)`, que no contiene ni el futuro ni las etiquetas.
 */
import { crearAzar } from '@/datos/azar';
import { sumar } from '@/motor/dinero';
import { aISO, diaSemana, diasEntre, fechaEnMes, partes, rangoDias, sumarDias } from '@/motor/fechas';
import type { Canal, Categoria, Centimos, Deuda, FechaISO, Movimiento, Perfil, TipoPerfil } from '@/motor/tipos';

export const DIAS_HISTORIA = 90;
export const DIAS_FUTURO = 30;
const DIAS = DIAS_HISTORIA + DIAS_FUTURO;
/**
 * Tope del colchón (lo que quedó en la cuenta el día más apretado de la historia) como parte del
 * ingreso mensual. Es el supuesto de diseño que fija cuánta gente termina en déficit: con 0.10,
 * cerca de uno de cada cinco clientes de la población de ajuste queda en negativo en los 30 días
 * siguientes (con 0.30 era uno de cada siete, pocos casos para medir el aviso). No es un dato de mercado.
 */
export const COLCHON_MAXIMO = 0.1;
/** Los cortes se reparten en un año entero para cubrir fines de mes, febrero y gratificaciones. */
const PRIMER_CORTE: FechaISO = '2025-07-01';

export const ESCENARIOS = ['ingreso_irregular', 'suscripcion_duplicada', 'movimiento_repetido',
  'cambio_patron', 'datos_incompletos', 'gasto_atipico'] as const;
export type Escenario = typeof ESCENARIOS[number];
export type Serie = 'mensual' | 'quincenal' | 'semanal';

export interface MovimientoEtiquetado extends Movimiento {
  /** Comercio ficticio. Ninguno corresponde a una marca real. */
  comercio: string;
  /** Verdad: pertenece a una serie que se repite por construcción (sueldo, alquiler, cuota…). */
  recurrente: boolean;
  serie?: Serie;
  /** Verdad: es un cobro doble real o un registro repetido que no movió dinero. */
  duplicado: boolean;
  tipoDuplicado?: 'cobro_doble' | 'registro_repetido';
  /** Verdad: gasto grande fuera del patrón del cliente. */
  atipico: boolean;
}

export interface Cliente {
  /** Identificador ficticio: cli-0001. */
  id: string;
  tipo: TipoPerfil;
  escenarios: Escenario[];
  /** Último día de historia: el «hoy» que ve el motor. */
  corte: FechaISO;
  /** Ingreso mensual objetivo con el que se generó (supuesto de diseño). */
  ingresoMensual: Centimos;
  saldoApertura: Centimos;
  /** Saldo real al cierre del corte, calculado con todos los movimientos reales. */
  saldoCorte: Centimos;
  /** Lo que ve el motor: puede traer huecos y registros repetidos. */
  historia: MovimientoEtiquetado[];
  /** Movimientos reales que faltan en la historia (escenario datos_incompletos). */
  ocultos: MovimientoEtiquetado[];
  /** Los 30 días siguientes al corte. El motor nunca los recibe. */
  futuro: MovimientoEtiquetado[];
  deudas: Deuda[];
}

/** Un registro repetido es un fantasma: aparece en los datos pero no movió dinero. */
export function esReal(m: MovimientoEtiquetado): boolean {
  return m.tipoDuplicado !== 'registro_repetido';
}
/** Misma convención que los perfiles de la demo: la tarjeta de crédito no toca el saldo de la cuenta. */
export function tocaSaldo(m: MovimientoEtiquetado): boolean {
  return esReal(m) && m.canal !== 'tarjeta';
}
/** Lo único que recibe el motor. */
export function aPerfil(c: Cliente): Perfil {
  return { id: c.id, nombre: c.id, tipo: c.tipo, descripcion: 'Cliente sintético de evaluación',
    hoy: c.corte, saldoActual: c.saldoCorte, movimientos: c.historia, deudas: c.deudas };
}

type Azar = ReturnType<typeof crearAzar>;
const UNIDAD = 1_000_000;
function uniforme(a: Azar): number { return (a.entero(0, UNIDAD - 1) + 0.5) / UNIDAD; }
function entre(a: Azar, min: number, max: number): number { return min + (max - min) * uniforme(a); }
function normal(a: Azar): number { return Math.sqrt(-2 * Math.log(uniforme(a))) * Math.cos(2 * Math.PI * uniforme(a)); }
/** Factor de media 1 con cola a la derecha (lognormal): casi siempre cerca de 1, a veces mucho más. */
function ruido(a: Azar, sigma: number): number { return Math.exp(sigma * normal(a) - sigma * sigma / 2); }
function ponderado<T>(a: Azar, opciones: readonly (readonly [T, number])[]): T {
  let resto = a.entero(1, opciones.reduce((s, [, peso]) => s + peso, 0));
  for (const [valor, peso] of opciones) { if (resto <= peso) return valor; resto -= peso; }
  return opciones[opciones.length - 1][0];
}
/** Convierte un valor con decimales en céntimos enteros, redondeado a un paso (p. ej. 100 = un sol). */
export function aPaso(valor: number, paso: Centimos): Centimos {
  return Math.max(paso, Math.round(valor / paso) * paso);
}
/** Semilla propia por cliente: añadir clientes no cambia a los anteriores. */
function mezclar(semilla: number, indice: number): number {
  return (Math.imul(semilla ^ 0x9e3779b9, 0x85ebca6b) + Math.imul(indice + 1, 0xc2b2ae35)) >>> 0;
}

const SUSCRIPCIONES = [
  ['Streaming Nube', [2490, 3490, 4490]],
  ['Música Onda', [1690, 1990]],
  ['Gimnasio Ritmo', [7990, 9990, 12990]],
  ['Almacenamiento Cielo', [690, 990]],
  ['Curso en línea Aula', [3990, 5990]],
  ['Revista digital Faro', [1290, 1990]],
] as const;
const COMIDA = ['Mercado Central', 'Bodega La Esquina', 'Menú Doña Flor', 'Panadería El Trigal', 'Minimarket Sol'];
const OCIO = ['Cine Aurora', 'Café Molino', 'Pollería El Fogón', 'Cancha Sintética Gol'];
const COMPRAS = ['Tienda Ropa Lima', 'Ferretería El Tornillo', 'Bazar Colores', 'Electro Hogar Luz'];
const OTROS = ['Librería Papel', 'Lavandería Burbuja', 'Peluquería Estilo', 'Kiosco Central'];
const ATIPICOS: readonly (readonly [string, Categoria])[] = [
  ['Emergencia médica', 'salud'], ['Reparación del hogar', 'compras'],
  ['Apoyo a un familiar', 'familia'], ['Matrícula', 'educacion'], ['Reparación del vehículo', 'transporte'],
];

type Borrador = Omit<MovimientoEtiquetado, 'id' | 'fecha'> & { dia: number };
type Extra = Partial<Pick<MovimientoEtiquetado, 'comercio' | 'recurrente' | 'serie' | 'duplicado' | 'tipoDuplicado' | 'atipico'>>;

export function generarCliente(semilla: number, indice: number): Cliente {
  const azar = crearAzar(mezclar(semilla, indice));
  const id = `cli-${String(indice + 1).padStart(4, '0')}`;
  const corte = sumarDias(PRIMER_CORTE, azar.entero(0, 364));
  const inicio = sumarDias(corte, -(DIAS_HISTORIA - 1));
  const fechas = rangoDias(inicio, DIAS);
  const semana = fechas.map(diaSemana);
  const tipo = ponderado<TipoPerfil>(azar, [['dependiente', 40], ['independiente', 35], ['mixto', 25]]);
  const ingresoMensual = aPaso(azar.probabilidad(0.7) ? entre(azar, 120_000, 350_000) : entre(azar, 350_000, 700_000), 1000);

  const escenarios: Escenario[] = [];
  const irregular = azar.probabilidad({ dependiente: 0.15, independiente: 0.45, mixto: 0.3 }[tipo]);
  if (irregular) escenarios.push('ingreso_irregular');
  if (azar.probabilidad(0.12)) escenarios.push('suscripcion_duplicada');
  if (azar.probabilidad(0.12)) escenarios.push('movimiento_repetido');
  if (azar.probabilidad(0.2)) escenarios.push('cambio_patron');
  if (azar.probabilidad(0.15)) escenarios.push('datos_incompletos');
  const atipicos = ponderado(azar, [[0, 70], [1, 18], [2, 9], [3, 3]]);
  if (atipicos > 0) escenarios.push('gasto_atipico');

  // Cambio de patrón: puede caer en la historia (el motor lo ve a medias) o en el futuro (no lo ve).
  const patron = escenarios.includes('cambio_patron') ? {
    dia: azar.entero(45, 105),
    clase: azar.elegir(['gasto', 'ingreso_baja', 'ingreso_sube', 'cargo_nuevo'] as const),
  } : null;
  const factorPatron = !patron ? 1 : patron.clase === 'gasto' ? entre(azar, 1.3, 1.6)
    : patron.clase === 'ingreso_baja' ? entre(azar, 0.6, 0.8) : patron.clase === 'ingreso_sube' ? entre(azar, 1.15, 1.3) : 1;
  const fIngreso = (dia: number) => patron && dia >= patron.dia && patron.clase.startsWith('ingreso') ? factorPatron : 1;
  const fGasto = (dia: number) => patron && dia >= patron.dia && patron.clase === 'gasto' ? factorPatron : 1;

  const borradores: Borrador[] = [];
  const agregar = (dia: number, monto: Centimos, descripcion: string, categoria: Categoria, canal: Canal, extra: Extra = {}) => {
    if (dia < 0 || dia >= DIAS || monto === 0) return;
    borradores.push({ dia, monto, descripcion, comercio: descripcion, categoria, canal,
      recurrente: false, duplicado: false, atipico: false, ...extra });
  };
  // Meses que tocan la ventana, con uno de margen a cada lado por los pagos que se adelantan o atrasan.
  const meses: { anio: number; mes: number }[] = [];
  for (let f = sumarDias(inicio, -31); f <= sumarDias(fechas[DIAS - 1], 31); f = sumarDias(fechaEnMes(partes(f).anio, partes(f).mes, 31), 1)) {
    meses.push({ anio: partes(f).anio, mes: partes(f).mes });
  }
  const cadaMes = (diaDelMes: number, hacer: (dia: number) => void) => {
    for (const { anio, mes } of meses) hacer(diasEntre(inicio, fechaEnMes(anio, mes, diaDelMes)));
  };

  // ── Ingresos ────────────────────────────────────────────────────────────────
  const parteSueldo = tipo === 'dependiente' ? ingresoMensual : tipo === 'mixto' ? aPaso(ingresoMensual * 0.55, 1000) : 0;
  if (tipo !== 'independiente') {
    const empleador: Extra = { comercio: 'Empleador', recurrente: true };
    const pagar = (dia: number, monto: number, serie: Serie) => {
      // Sueldo atrasado: solo en dependientes con ingreso irregular.
      const real = dia + (tipo === 'dependiente' && irregular && azar.probabilidad(0.35) ? azar.entero(3, 10) : 0);
      agregar(real, aPaso(monto * fIngreso(real), 100), 'Sueldo', 'sueldo', 'cuenta', { ...empleador, serie });
    };
    if (tipo === 'mixto' && azar.probabilidad(0.3)) {
      const semanal = aPaso(parteSueldo * 7 / 30, 100);
      semana.forEach((s, dia) => { if (s === 5) agregar(dia, aPaso(semanal * fIngreso(dia), 100), 'Pago semanal', 'sueldo', 'cuenta', { ...empleador, serie: 'semanal' }); });
    } else if (tipo === 'dependiente' && azar.probabilidad(0.25)) {
      // Quincena: día 15 y último día del mes, con la misma descripción.
      cadaMes(15, dia => pagar(dia, parteSueldo / 2, 'quincenal'));
      cadaMes(31, dia => pagar(dia, parteSueldo / 2, 'quincenal'));
    } else {
      const diaPago = azar.elegir([1, 15, 25, 28, 30, 31]);
      const adelanta = azar.probabilidad(0.6);
      cadaMes(diaPago, dia => {
        const s = diaSemana(sumarDias(inicio, dia));
        pagar(dia - (adelanta ? (s === 6 ? 1 : s === 0 ? 2 : 0) : 0), parteSueldo, 'mensual');
      });
    }
    if (tipo === 'dependiente' && azar.probabilidad(0.7)) {
      // Gratificación de julio y diciembre: ingreso grande que no se repite cada mes.
      for (const { anio, mes } of meses) if (mes === 7 || mes === 12) {
        agregar(diasEntre(inicio, aISO(anio, mes, 15)), parteSueldo, 'Gratificación', 'sueldo', 'cuenta', { comercio: 'Empleador' });
      }
    }
  }
  if (tipo !== 'dependiente') {
    const propio = tipo === 'independiente';
    const pDia = (s: number) => propio ? (s === 0 ? 0.35 : 0.85) : (s === 6 || s === 0 ? 0.8 : s === 5 ? 0.3 : 0);
    // Días de venta esperados cada 30 días según las probabilidades de arriba.
    const base = (ingresoMensual - parteSueldo) / (propio ? 23.36 : 8.14);
    const semanas = Array.from({ length: Math.ceil(DIAS / 7) }, () => irregular && azar.probabilidad(0.25) ? entre(azar, 0.1, 0.35) : entre(azar, 0.7, 1.3));
    semana.forEach((s, dia) => {
      if (!azar.probabilidad(pDia(s))) return;
      const canal = ponderado<Canal>(azar, [['yape', 40], ['efectivo', 35], ['plin', 10], ['cuenta', 15]]);
      agregar(dia, aPaso(base * semanas[Math.floor(dia / 7)] * ruido(azar, 0.35) * fIngreso(dia), 50),
        'Ventas del día', 'ingreso_variable', canal, { comercio: 'Negocio propio' });
    });
    if (irregular) semanas.forEach((_, i) => {
      if (azar.probabilidad(0.12)) agregar(i * 7 + azar.entero(0, 6), aPaso(ingresoMensual * entre(azar, 0.25, 0.6), 1000),
        'Pedido grande', 'ingreso_variable', 'cuenta', { comercio: 'Negocio propio' });
    });
  }

  // ── Cargos fijos ────────────────────────────────────────────────────────────
  let fijoMensual = 0;
  const fijo = (o: { descripcion: string; categoria: Categoria; canal: Canal; monto: Centimos; dia: number;
    variacion?: number; corrimiento?: [number, number]; tardio?: number; desde?: number }) => {
    if (o.desde === undefined) fijoMensual += o.monto;
    cadaMes(o.dia, base => {
      const corrido = base + (o.corrimiento ? azar.entero(o.corrimiento[0], o.corrimiento[1]) : 0)
        + (o.tardio && azar.probabilidad(o.tardio) ? azar.entero(3, 6) : 0);
      const monto = o.variacion ? aPaso(o.monto * entre(azar, 1 - o.variacion, 1 + o.variacion), 10) : o.monto;
      if (o.desde !== undefined && corrido < o.desde) return;
      agregar(corrido, -monto, o.descripcion, o.categoria, o.canal, { recurrente: true, serie: 'mensual' });
    });
  };
  const tieneTarjeta = azar.probabilidad(0.55);
  if (azar.probabilidad(0.6)) fijo({ descripcion: 'Alquiler', categoria: 'alquiler', canal: azar.probabilidad(0.7) ? 'cuenta' : 'efectivo',
    monto: aPaso(ingresoMensual * entre(azar, 0.18, 0.32), 1000), dia: azar.elegir([1, 2, 3, 5, 28, 30]), tardio: 0.15 });
  if (azar.probabilidad(0.85)) fijo({ descripcion: 'Servicio de luz', categoria: 'servicios', canal: 'cuenta',
    monto: aPaso(entre(azar, 6000, 22000), 10), dia: azar.entero(5, 25), variacion: 0.15, corrimiento: [-1, 3] });
  if (azar.probabilidad(0.7)) fijo({ descripcion: 'Servicio de agua', categoria: 'servicios', canal: 'cuenta',
    monto: aPaso(entre(azar, 3000, 9000), 10), dia: azar.entero(5, 25), variacion: 0.1, corrimiento: [-1, 2] });
  if (azar.probabilidad(0.7)) fijo({ descripcion: 'Internet hogar', categoria: 'servicios', canal: 'cuenta',
    monto: azar.elegir([6900, 7990, 8990, 9990, 12900]), dia: azar.entero(1, 28) });
  if (azar.probabilidad(0.85)) fijo({ descripcion: 'Plan celular', categoria: 'servicios', canal: 'cuenta',
    monto: azar.elegir([2990, 3990, 4990, 5990, 7990]), dia: azar.entero(1, 28), corrimiento: [0, 1] });
  const elegidas = [...SUSCRIPCIONES];
  for (let n = ponderado(azar, [[0, 25], [1, 35], [2, 28], [3, 12]]); n > 0; n--) {
    const [nombre, precios] = elegidas.splice(azar.entero(0, elegidas.length - 1), 1)[0];
    fijo({ descripcion: nombre, categoria: 'suscripciones', canal: tieneTarjeta && azar.probabilidad(0.4) ? 'tarjeta' : 'cuenta',
      monto: azar.elegir(precios), dia: azar.entero(1, 28) });
  }
  const deudas: Deuda[] = [];
  if (tieneTarjeta) {
    const saldo = aPaso(ingresoMensual * entre(azar, 0.3, 1.5), 1000);
    const pagoMinimo = aPaso(Math.max(3000, saldo * 0.05), 100);
    const pagoHabitual = aPaso(pagoMinimo * entre(azar, 1.2, 2.5), 100);
    const d: Deuda = { id: `${id}-tarjeta`, nombre: azar.elegir(['Tarjeta Clásica', 'Tarjeta Oro', 'Tarjeta Compras']), tipo: 'tarjeta',
      saldo, tceaBp: azar.entero(45, 115) * 100, pagoMinimo, pagoHabitual, diaPago: azar.entero(1, 28) };
    deudas.push(d);
    // Tres estilos de pago: siempre lo mismo, con variación leve o errático.
    fijo({ descripcion: `Pago ${d.nombre}`, categoria: 'deuda', canal: 'cuenta', monto: pagoHabitual, dia: d.diaPago,
      variacion: ponderado(azar, [[0, 20], [0.1, 55], [0.4, 25]]), corrimiento: [-2, 0] });
  }
  if (azar.probabilidad(0.3)) {
    const cuota = aPaso(ingresoMensual * entre(azar, 0.06, 0.14), 100);
    const d: Deuda = { id: `${id}-prestamo`, nombre: azar.elegir(['Préstamo Personal', 'Préstamo Vehicular', 'Préstamo Estudios']), tipo: 'prestamo',
      saldo: cuota * azar.entero(6, 30), tceaBp: azar.entero(18, 60) * 100, pagoMinimo: cuota, pagoHabitual: cuota, diaPago: azar.entero(1, 28) };
    deudas.push(d);
    fijo({ descripcion: `Pago ${d.nombre}`, categoria: 'deuda', canal: 'cuenta', monto: cuota, dia: d.diaPago });
  }
  if (tipo === 'independiente' && azar.probabilidad(0.4)) {
    const diaFijo = azar.entero(1, 6);
    const pago = aPaso(ingresoMensual * 7 / 30 * entre(azar, 0.12, 0.2), 100);
    fijoMensual += Math.round(pago * 30 / 7);
    semana.forEach((s, dia) => { if (s === diaFijo) agregar(dia, -aPaso(pago * entre(azar, 0.92, 1.08), 10), 'Pago a proveedor', 'otros',
      azar.probabilidad(0.6) ? 'cuenta' : 'efectivo', { comercio: 'Proveedor mayorista', recurrente: true, serie: 'semanal' }); });
  }
  if (patron?.clase === 'cargo_nuevo') fijo({ descripcion: 'Cuota de colegio', categoria: 'educacion', canal: 'cuenta',
    monto: aPaso(ingresoMensual * entre(azar, 0.08, 0.15), 1000), dia: Math.min(28, partes(fechas[patron.dia]).dia), desde: patron.dia });

  // ── Gasto del día a día ─────────────────────────────────────────────────────
  // Gasto total entre 80 % y 112 % del ingreso: hay quien ahorra y quien se va quedando corto.
  const variableDiario = Math.max(ingresoMensual * 0.2, ingresoMensual * entre(azar, 0.8, 1.12) - fijoMensual) / 30;
  const tarifa = azar.elegir([150, 200, 250, 300, 350]);
  const resto = Math.max(variableDiario * 0.5, variableDiario - tarifa * 1.85);
  const tendencia = entre(azar, -0.06, 0.09);
  const cobros = new Set(borradores.filter(b => b.monto >= ingresoMensual * 0.3).map(b => b.dia));
  const canalGasto = () => ponderado<Canal>(azar, [['cuenta', 30], ['yape', 30], ['plin', 5], ['efectivo', 20], ['tarjeta', tieneTarjeta ? 15 : 0]]);
  for (let dia = 0; dia < DIAS; dia++) {
    const s = semana[dia];
    const finDeSemana = s === 6 || s === 0;
    const recienCobro = [0, 1, 2].some(n => cobros.has(dia - n));
    const nivel = (1 + tendencia * (dia - 45) / 30) * fGasto(dia) * (recienCobro ? 1.3 : 1);
    const gastar = (media: number, sigma: number, lista: string[], categoria: Categoria) => {
      const comercio = azar.elegir(lista);
      agregar(dia, -aPaso(media * nivel * ruido(azar, sigma), 10), comercio, categoria, canalGasto());
    };
    const comidas = finDeSemana ? ponderado(azar, [[0, 10], [1, 40], [2, 35], [3, 15]]) : ponderado(azar, [[0, 20], [1, 50], [2, 30]]);
    for (let n = 0; n < comidas; n++) gastar(resto * 0.58 / 1.229, 0.6, COMIDA, 'comida');
    // Pasajes: la misma tarifa varias veces el mismo día. No son duplicados; un detector ingenuo los confunde.
    if (s !== 0 && (s !== 6 || azar.probabilidad(0.5))) {
      const canal: Canal = azar.probabilidad(0.6) ? 'efectivo' : 'yape';
      for (let n = ponderado(azar, [[0, 10], [2, 55], [3, 15], [4, 20]]); n > 0; n--) agregar(dia, -tarifa, 'Pasaje', 'transporte', canal, { comercio: 'Transporte urbano' });
    }
    if (azar.probabilidad(0.06)) agregar(dia, -aPaso(entre(azar, 800, 2500), 10), 'Taxi por aplicación', 'transporte', canalGasto());
    if (azar.probabilidad(s === 5 || finDeSemana ? 0.45 : 0.08)) gastar(resto * 0.14 / 0.2386, 0.6, OCIO, 'ocio');
    if (azar.probabilidad(0.1)) gastar(resto * 0.16 / 0.1, 0.9, COMPRAS, 'compras');
    if (azar.probabilidad(0.15)) gastar(resto * 0.08 / 0.15, 0.6, OTROS, 'otros');
    if (azar.probabilidad(0.03)) gastar(resto * 0.04 / 0.03, 0.8, ['Farmacia Salud'], 'salud');
  }
  for (let n = 0; n < atipicos; n++) {
    const [descripcion, categoria] = azar.elegir(ATIPICOS);
    agregar(azar.entero(0, DIAS - 1), -aPaso(ingresoMensual * entre(azar, 0.15, 0.45), 1000), descripcion, categoria,
      tieneTarjeta && azar.probabilidad(0.2) ? 'tarjeta' : azar.probabilidad(0.7) ? 'cuenta' : 'efectivo', { atipico: true });
  }
  // Cobro doble real: el comercio cobra dos veces el mismo cargo. Sí sale dinero.
  if (escenarios.includes('suscripcion_duplicada')) {
    const cargos = borradores.filter(b => b.dia <= DIAS_HISTORIA - 3 && b.recurrente && (b.categoria === 'suscripciones' || b.categoria === 'servicios'));
    if (cargos.length) {
      const original = azar.elegir(cargos);
      borradores.push({ ...original, dia: original.dia + azar.elegir([0, 0, 1, 2]), recurrente: false, serie: undefined,
        duplicado: true, tipoDuplicado: 'cobro_doble' });
    } else escenarios.splice(escenarios.indexOf('suscripcion_duplicada'), 1);
  }

  // ── Saldo verdadero: se calcula antes de estropear los datos ────────────────
  borradores.sort((a, b) => a.dia - b.dia);
  const flujoDia = Array.from({ length: DIAS }, () => 0);
  for (const b of borradores) if (b.canal !== 'tarjeta') flujoDia[b.dia] += b.monto;
  let acumulado = 0, minimo = 0;
  for (let dia = 0; dia < DIAS_HISTORIA; dia++) { acumulado += flujoDia[dia]; minimo = Math.min(minimo, acumulado); }
  // Supuesto: en los 90 días de historia nadie quedó en negativo; el día más apretado dejó este colchón.
  const colchon = aPaso(ingresoMensual * entre(azar, 0, COLCHON_MAXIMO), 100);
  const saldoApertura = colchon - minimo;
  const saldoCorte = saldoApertura + acumulado;

  // ── Datos estropeados: solo en la historia ──────────────────────────────────
  const oculto = new Set<Borrador>();
  if (escenarios.includes('datos_incompletos')) {
    const enHistoria = borradores.filter(b => b.dia < DIAS_HISTORIA);
    if (azar.probabilidad(0.5)) {
      const desde = azar.entero(5, 65), largo = azar.entero(10, 20);
      for (const b of enHistoria) if (b.dia >= desde && b.dia < desde + largo) oculto.add(b);
    } else {
      const p = entre(azar, 0.1, 0.2);
      for (const b of enHistoria) if (azar.probabilidad(p)) oculto.add(b);
    }
  }
  const repetidos: Borrador[] = [];
  if (escenarios.includes('movimiento_repetido')) {
    const visibles = borradores.filter(b => b.dia < DIAS_HISTORIA && !oculto.has(b));
    for (let n = azar.entero(1, 4); n > 0 && visibles.length; n--) {
      repetidos.push({ ...azar.elegir(visibles), recurrente: false, serie: undefined, duplicado: true, tipoDuplicado: 'registro_repetido' });
    }
  }
  const ordenados = [...borradores, ...repetidos].sort((a, b) => a.dia - b.dia);
  const historia: MovimientoEtiquetado[] = [], ocultos: MovimientoEtiquetado[] = [], futuro: MovimientoEtiquetado[] = [];
  ordenados.forEach((b, i) => {
    const { dia, ...resto } = b;
    const m: MovimientoEtiquetado = { id: `${id}-t${String(i + 1).padStart(4, '0')}`, fecha: fechas[dia], ...resto };
    if (m.serie === undefined) delete m.serie;
    (dia >= DIAS_HISTORIA ? futuro : oculto.has(b) ? ocultos : historia).push(m);
  });
  return { id, tipo, escenarios, corte, ingresoMensual, saldoApertura, saldoCorte, historia, ocultos, futuro, deudas };
}
export function generarPoblacion(semilla: number, cantidad: number): Cliente[] {
  return Array.from({ length: cantidad }, (_, i) => generarCliente(semilla, i));
}

/** Saldo real al cierre de cada uno de los 30 días siguientes al corte (posición 0 = corte + 1). */
export function saldosReales(c: Cliente): Centimos[] {
  const saldos: Centimos[] = [];
  let saldo = c.saldoCorte;
  for (const fecha of rangoDias(sumarDias(c.corte, 1), DIAS_FUTURO)) {
    saldo = sumar([saldo, ...c.futuro.filter(m => m.fecha === fecha && tocaSaldo(m)).map(m => m.monto)]);
    saldos.push(saldo);
  }
  return saldos;
}
