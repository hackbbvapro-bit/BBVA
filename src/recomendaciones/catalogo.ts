/**
 * Catálogo ESTÁTICO de alternativas genéricas y educativas. Lo activan reglas de código (reglas.ts y ruta/ruta.ts), nunca la IA.
 * No nombra productos ni entidades, no enlaza a ningún banco y no trae cifras de mercado:
 * las condiciones reales cambian según la entidad y aquí solo se explica cómo funciona cada alternativa.
 */
export interface EntradaCatalogo {
  id: "tarjeta-con-garantia" | "tarjeta-inicio" | "reprogramar" | "cuenta-de-ahorro" | "deposito-a-plazo" | "fondo-mutuo";
  titulo: string;
  paraQuien: string;
  condicion: string;
}

export const CATALOGO: readonly EntradaCatalogo[] = [
  {
    id: "tarjeta-con-garantia",
    titulo: "Tarjeta de crédito con garantía (depósito de respaldo)",
    paraQuien: "Para quien quiere volver a tener una tarjeta y reconstruir su historial, aunque hoy su clasificación no sea la mejor.",
    condicion: "Funciona dejando un depósito inmovilizado como respaldo de la línea. El monto, la tasa y los requisitos cambian según la entidad: compáralos antes de decidir.",
  },
  {
    id: "tarjeta-inicio",
    titulo: "Tarjeta de inicio para construir historial",
    paraQuien: "Para quien aún no tiene una tarjeta de crédito y quiere empezar a construir su historial crediticio.",
    condicion: "Algunas entidades la ofrecen con un depósito de respaldo. Compara costos y requisitos antes de decidir.",
  },
  {
    id: "reprogramar",
    titulo: "Reprogramar o refinanciar con tu entidad",
    paraQuien: "Para quien ve que no le alcanzará para los pagos de sus deudas. Conviene preguntarlo antes de caer en atraso; también puedes preguntar por la compra de deuda.",
    condicion: "Pregunta qué opciones tiene tu entidad y compara el costo total antes de aceptar. Aquí no se muestran cifras.",
  },
  {
    id: "cuenta-de-ahorro",
    titulo: "Cuenta de ahorro separada",
    paraQuien: "Para guardar tu colchón aparte de la plata del día a día, sin que se mezcle con lo que gastas.",
    condicion: "Puedes retirar cuando quieras. El rendimiento y las comisiones dependen del producto: revísalos en su ficha oficial antes de decidir.",
  },
  {
    id: "deposito-a-plazo",
    titulo: "Depósito a plazo fijo",
    paraQuien: "Para plata que no vas a necesitar durante un tiempo y quieres mantener fuera de tu alcance.",
    condicion: "Te comprometes a un plazo: si retiras antes, puedes perder parte o todos los intereses. Las condiciones cambian según la entidad.",
  },
  {
    id: "fondo-mutuo",
    titulo: "Fondo mutuo",
    paraQuien: "Para plata de largo plazo, solo después de tener completo tu colchón.",
    condicion: "Su valor sube y baja: puedes ganar o perder. No hay rendimiento garantizado. Infórmate bien antes de decidir.",
  },
];
