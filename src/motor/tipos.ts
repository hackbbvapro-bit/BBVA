/**
 * Contratos del motor. Todo lo que aparece en pantalla (montos, tasas, fechas)
 * sale de estas estructuras, calculadas por código con tests. La IA solo las explica.
 */

/** Dinero en céntimos enteros. S/ 12.50 = 1250. Nunca decimales. */
export type Centimos = number;

/** Fecha de calendario sin hora ni zona: 'AAAA-MM-DD'. */
export type FechaISO = string;

/** Tasa anual en puntos básicos enteros. 89.99 % = 8999. */
export type PuntosBasicos = number;

export type Canal = "cuenta" | "tarjeta" | "yape" | "plin" | "efectivo";

export type Categoria =
  | "sueldo"
  | "ingreso_variable"
  | "alquiler"
  | "servicios"
  | "suscripciones"
  | "deuda"
  | "comida"
  | "transporte"
  | "salud"
  | "educacion"
  | "ocio"
  | "compras"
  | "familia"
  | "otros";

export interface Movimiento {
  id: string;
  fecha: FechaISO;
  /** Positivo = entra dinero. Negativo = sale dinero. */
  monto: Centimos;
  descripcion: string;
  categoria: Categoria;
  canal: Canal;
}

export type TipoDeuda = "tarjeta" | "prestamo";

export interface Deuda {
  id: string;
  nombre: string;
  tipo: TipoDeuda;
  /** Lo que se debe hoy. */
  saldo: Centimos;
  /** Tasa de costo efectivo anual (TCEA) en puntos básicos. */
  tceaBp: PuntosBasicos;
  /** Pago mínimo del mes (tarjeta) o cuota fija (préstamo). */
  pagoMinimo: Centimos;
  /** Lo que la persona suele pagar cada mes (≥ pagoMinimo). */
  pagoHabitual: Centimos;
  /** Día del mes en que vence (1-31; si el mes es corto, último día). */
  diaPago: number;
}

export type TipoPerfil = "dependiente" | "independiente" | "mixto";

export interface Perfil {
  id: string;
  /** Nombre de pila inventado. Datos 100 % sintéticos. */
  nombre: string;
  tipo: TipoPerfil;
  descripcion: string;
  /** «Hoy» de la demo: último día con movimientos. */
  hoy: FechaISO;
  /** Saldo en cuenta al cierre de «hoy». */
  saldoActual: Centimos;
  /** 90 días de historia, ordenados por fecha ascendente. */
  movimientos: Movimiento[];
  deudas: Deuda[];
}

export type Frecuencia = "mensual" | "semanal";

export interface Recurrente {
  id: string;
  descripcion: string;
  categoria: Categoria;
  canal: Canal;
  /** Monto esperado con signo (mediana de lo observado). */
  monto: Centimos;
  frecuencia: Frecuencia;
  /** Solo si es mensual: día del mes (1-31; en meses cortos, el último día). */
  diaDelMes?: number;
  /** Última vez que se observó. Si es semanal, sirve de ancla (se repite cada 7 días). */
  ultimaFecha: FechaISO;
  /** Cuántas veces se observó en la historia. */
  veces: number;
  /** Si es el pago de una deuda, su id. */
  deudaId?: string;
  /** Si se puede mover de fecha sin romper nada grave (suscripción, pago de tarjeta dentro de gracia…). */
  movible: boolean;
}

export interface IngresoVariable {
  /** Ingreso semanal prudente (percentil 25 de las semanas observadas). */
  semanalPrudente: Centimos;
  /** Ingreso semanal típico (mediana). */
  semanalTipico: Centimos;
  semanasObservadas: number;
}

export interface GastoVariable {
  /** Gasto diario típico no recurrente (con signo negativo). */
  diario: Centimos;
  /** Desglose del gasto mensual estimado por categoría (positivo), de mayor a menor. */
  porCategoria: { categoria: Categoria; mensual: Centimos }[];
}

export interface EventoProyectado {
  fecha: FechaISO;
  monto: Centimos;
  descripcion: string;
  categoria: Categoria;
  origen: "recurrente" | "ingreso_variable" | "gasto_variable";
  recurrenteId?: string;
}

export interface DiaProyectado {
  fecha: FechaISO;
  /** Saldo al cierre del día. */
  saldo: Centimos;
  eventos: EventoProyectado[];
}

export interface Deficit {
  /** Primer día en que el saldo cierra bajo cero. */
  fecha: FechaISO;
  /** Cuánto falta ese día (positivo). */
  faltante: Centimos;
  /** Faltante máximo del periodo (positivo) y su fecha. */
  faltanteMaximo: Centimos;
  fechaFaltanteMaximo: FechaISO;
  /** Salidas de ese día y de los 2 anteriores que lo causan, de mayor a menor. */
  causas: EventoProyectado[];
  /** Próximo ingreso esperado después del déficit, si lo hay dentro del periodo. */
  proximoIngreso?: EventoProyectado;
  /** Días que faltan desde «hoy». */
  diasRestantes: number;
}

export interface Proyeccion {
  perfilId: string;
  desde: FechaISO;
  hasta: FechaISO;
  saldoInicial: Centimos;
  dias: DiaProyectado[];
  saldoMinimo: Centimos;
  fechaSaldoMinimo: FechaISO;
  saldoFinal: Centimos;
  /** null si el saldo nunca baja de cero. */
  deficit: Deficit | null;
  /**
   * Pagos que un ajuste «mover» llevó más allá de `hasta`. No caben en los días proyectados, pero se
   * siguen debiendo: se guardan aquí (sin duplicar ni perder) para que nadie confunda «salió de la
   * ventana» con «se resolvió». Sin ajustes, siempre está vacío.
   */
  fueraDeVentana: EventoProyectado[];
}

/** Cambios «qué pasa si…» que se aplican sobre la proyección base. */
export type Ajuste =
  | { tipo: "mover"; recurrenteId: string; desde: FechaISO; hacia: FechaISO }
  | { tipo: "cambiar_monto"; recurrenteId: string; fecha: FechaISO; monto: Centimos }
  | { tipo: "recortar"; categoria: Categoria; bp: PuntosBasicos; hasta: FechaISO };

export type TipoJugada = "pausar_suscripciones" | "pagar_minimo" | "recortar_gasto";

/**
 * Qué hace un ajuste con el déficit, comparado con no hacer nada:
 * - elimina: dentro de los 30 días ya no hay día en rojo y ningún pago quedó empujado fuera;
 * - reduce: sigue habiendo día en rojo, pero falta menos en el peor día;
 * - posterga: el rojo solo se corre a más tarde o algún pago salió de la ventana (se sigue debiendo);
 * - no_mejora: falta lo mismo o más, o no había rojo que arreglar.
 */
export type EfectoDeficit = "elimina" | "reduce" | "posterga" | "no_mejora";

/**
 * Qué tan seguro es el costo de una jugada:
 * - conocido: sale de reglas exactas (p. ej. gastar menos no le paga nada a nadie);
 * - estimado: hay cálculo con supuestos (intereses a la TCEA, o cargos que no vemos en los datos);
 * - desconocido: depende de la entidad y no hay cómo calcularlo. Nunca se muestra como monto ni se
 *   elige como «la más barata».
 */
export type CertezaCosto = "conocido" | "estimado" | "desconocido";

export interface Jugada {
  id: string;
  tipo: TipoJugada;
  titulo: string;
  /** Qué hacer, en una frase, con montos y fechas ya calculados. */
  detalle: string;
  /** Cuánto dinero libera antes del día crítico (positivo). */
  libera: Centimos;
  /**
   * Cuánto cuesta en soles (intereses o comisiones). Se lee junto con `certezaCosto`: si es
   * «desconocido», este número no significa nada y no se muestra.
   */
  costo: Centimos;
  certezaCosto: CertezaCosto;
  /** Explicación del costo (p. ej. «intereses de 30 días a TCEA 89.99 %»). */
  costoDetalle: string;
  /** Si aplicándola sola desaparece el déficit del periodo sin empujar pagos fuera de él (efecto «elimina»). */
  resuelve: boolean;
  efecto: EfectoDeficit;
  /** Saldo mínimo del periodo tras aplicarla. */
  saldoMinimoDespues: Centimos;
  /** Ajustes que la representan, para volver a proyectar y dibujar el «después». */
  ajustes: Ajuste[];
}

export interface PlanDeudas {
  estrategia: "avalancha" | "bola_de_nieve" | "minimos";
  /** Orden en que se atacan las deudas (ids). */
  orden: string[];
  meses: number;
  interesTotal: Centimos;
  totalPagado: Centimos;
  /** true si con ese presupuesto la deuda no baja (o no termina en 360 meses); las cifras cuentan solo hasta que se detecta. */
  noTermina: boolean;
}

export interface ComparacionDeudas {
  presupuestoMensual: Centimos;
  avalancha: PlanDeudas;
  bolaDeNieve: PlanDeudas;
  minimos: PlanDeudas;
  /** Intereses que ahorra la avalancha frente a pagar solo mínimos. 0 si alguno de los dos planes no termina. */
  ahorroVsMinimos: Centimos;
  /** Deuda a atacar primero (la de TCEA más alta). */
  primera: Deuda | null;
}

/** Resultado completo que consumen la interfaz y las herramientas del agente. */
export interface Analisis {
  perfilId: string;
  hoy: FechaISO;
  recurrentes: Recurrente[];
  ingresoVariable: IngresoVariable;
  gastoVariable: GastoVariable;
  proyeccion: Proyeccion;
  jugadas: Jugada[];
  /** null si la persona no tiene deudas. */
  deudas: ComparacionDeudas | null;
}
