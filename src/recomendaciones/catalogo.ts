/**
 * Catálogo ESTÁTICO de opciones BBVA. Lo activan reglas de código (reglas.ts), nunca la IA.
 * Regla de honestidad: una cifra solo aparece si tiene fuente. Sin fuente, no hay cifra:
 * no se inventan tasas, montos ni requisitos.
 */

export interface FuenteRecomendacion {
  url: string;
  /** Día en que se consultó la página, AAAA-MM-DD. */
  consultadoEl: string;
}

export interface EntradaCatalogo {
  id: "garantia-liquida" | "tarjeta-start" | "reprogramar";
  titulo: string;
  paraQuien: string;
  /** Condición tal como la publica la fuente; sin fuente, solo orientación sin cifras. */
  condicion: string;
  /** null = no hay cifra que respaldar. */
  fuente: FuenteRecomendacion | null;
}

export const CONSULTADO_EL = "2026-11-14";

export const CATALOGO: readonly EntradaCatalogo[] = [
  {
    id: "garantia-liquida",
    titulo: "Tarjeta de crédito con garantía líquida BBVA",
    paraQuien: "Para quien necesita volver a tener una tarjeta y un buen historial, aunque hoy su calificación no sea la mejor.",
    condicion: "Depósito desde S/ 700 como garantía",
    fuente: {
      url: "https://www.bbva.pe/personas/productos/tarjetas/credito/tarjeta-de-credito-garantia-liquida.html",
      consultadoEl: CONSULTADO_EL,
    },
  },
  {
    id: "tarjeta-start",
    titulo: "Tarjeta para construir historial (Tarjeta Start)",
    paraQuien: "Para quien aún no tiene una tarjeta de crédito y quiere empezar a construir su historial crediticio.",
    condicion: "Depósito desde S/ 500",
    fuente: {
      url: "https://www.bbva.pe/personas/productos/tarjetas/credito/tarjeta-credito-historial-crediticio.html",
      consultadoEl: CONSULTADO_EL,
    },
  },
  {
    id: "reprogramar",
    titulo: "Reprogramar o refinanciar con tu entidad",
    paraQuien: "Para quien ve que no le alcanzará para los pagos de sus deudas. Conviene preguntarlo antes de caer en atraso; también puedes preguntar por la compra de deuda.",
    condicion: "Pregunta qué opciones tiene tu entidad y compara el costo total antes de aceptar. No hay cifras publicadas aquí.",
    fuente: null,
  },
];
