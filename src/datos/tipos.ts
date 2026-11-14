import type { Categoria, Centimos, FechaISO, Movimiento, PuntosBasicos, TipoPerfil } from "../motor/tipos";

/** Lo que la persona cuenta de sí misma. Sin DNI, dirección ni nombre completo: ninguna función los usa. */
export interface DatosPerfil {
  /** Se conserva al editar; el servidor usa este id solo para el respaldo sin IA. */
  id: string;
  nombre: string;
  tipo: TipoPerfil;
  descripcion: string;
  /** Ingreso del mes, aproximado y solo informativo (el motor proyecta con la historia). */
  ingresoAprox: Centimos;
  /** Días del mes en que suele cobrar; vacío si cobra de forma variable. */
  diasCobro: number[];
  /** «Hoy» de la demo. */
  hoy: FechaISO;
}

export interface Cuenta {
  id: string;
  nombre: string;
  saldo: Centimos;
}

/** Ingreso o gasto que se repite cada mes el mismo día. El monto es positivo; el sentido lo da la lista. */
export interface Fijo {
  id: string;
  descripcion: string;
  monto: Centimos;
  dia: number;
  categoria: Categoria;
}

export type TipoDeudaDebo = "tarjeta" | "prestamo" | "personal";

export interface DeudaGuardada {
  id: string;
  /** Con quién se tiene la deuda: BBVA, otra entidad o una persona. */
  entidad: string;
  /** Cómo se muestra: «Tarjeta Azul». */
  nombre: string;
  tipo: TipoDeudaDebo;
  saldo: Centimos;
  /** null si la persona no la conoce. */
  tceaBp: PuntosBasicos | null;
  pagoMinimo: Centimos;
  pagoHabitual: Centimos;
  diaPago: number;
  diasAtraso: number;
  pagada: boolean;
}

/** Dinero que otros le deben a la persona. */
export interface Cobro {
  id: string;
  quien: string;
  monto: Centimos;
  fechaPrometida: FechaISO;
  nota: string;
  cobrado: boolean;
}

/** Solo lo extraído y confirmado; el archivo nunca se guarda. */
export interface DocumentoAnalizado {
  id: string;
  tipo: string;
  resumen: string;
  datos: unknown;
  fecha: FechaISO;
}

/** Foto completa de lo guardado. `movimientos` es solo la historia variable (comida, ventas…): los fijos y los pagos de deudas se derivan. */
export interface Datos {
  perfil: DatosPerfil;
  cuentas: Cuenta[];
  ingresosFijos: Fijo[];
  gastosFijos: Fijo[];
  movimientos: Movimiento[];
  deudas: DeudaGuardada[];
  cobros: Cobro[];
  documentos: DocumentoAnalizado[];
  avisosLeidos: string[];
}

export type Sentido = "ingreso" | "gasto";

