/** Extracción ya hecha del reporte de ejemplo `public/ejemplos/reporte-sbs-ejemplo.png` (datos inventados, octubre 2026). */
import type { Extraccion } from "./esquema";

export const RUTA_IMAGEN_EJEMPLO = "/ejemplos/reporte-sbs-ejemplo.png";

export const EXTRACCION_EJEMPLO: Extraccion = {
  tipo: "reporte-sbs",
  resumen: "Reporte de deudas de ejemplo (datos inventados), periodo octubre 2026, con 5 deudas.",
  deudas: [
    {
      entidad: "BBVA",
      nombre: "Tarjeta de crédito BBVA",
      producto: "tarjeta",
      saldo: 2350,
      calificacion: "normal",
      diasAtraso: 0,
      pagoMinimo: 180,
      tcea: 69,
      diaPago: 12,
    },
    {
      entidad: "Caja Ejemplo",
      nombre: "Préstamo personal",
      producto: "personal",
      saldo: 4800,
      calificacion: "cpp",
      diasAtraso: 22,
      pagoMinimo: 410,
      tcea: 48,
      diaPago: 5,
    },
    {
      entidad: "Financiera Ejemplo",
      nombre: "Préstamo personal",
      producto: "personal",
      saldo: 3100,
      calificacion: "deficiente",
      diasAtraso: 45,
      pagoMinimo: 320,
      tcea: 79,
      diaPago: 28,
    },
    {
      entidad: "Banco Ejemplo",
      nombre: "Tarjeta de crédito",
      producto: "tarjeta",
      saldo: 1200,
      calificacion: "normal",
      diasAtraso: 0,
      pagoMinimo: 95,
      tcea: 55,
      diaPago: 20,
    },
    {
      entidad: "Cooperativa Ejemplo",
      nombre: "Préstamo",
      producto: "prestamo",
      saldo: 900,
      calificacion: "normal",
      diasAtraso: 3,
      pagoMinimo: 150,
      tcea: 32,
      diaPago: 17,
    },
  ],
  movimientos: [],
  cobros: [],
};
