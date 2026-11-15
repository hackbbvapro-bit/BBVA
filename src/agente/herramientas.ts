/** Herramientas del agente: cada una consulta el motor. El modelo no tiene otra fuente de números. */
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { analizar, type Analisis, type Perfil } from "../motor";
import type { CobroPendiente } from "../motor/cobros";
import { leerMonto } from "../motor/numeros";
import type { Avance, Hechos, Ruta } from "../ruta/ruta";
import { datosDeudas, datosJugadas, datosProximosPagos, datosResumen, datosRuta, datosSimulacion } from "./datos";
import { FAMILIAS, buscarEnCatalogo, menuDelCatalogo } from "../catalogo-bbva/catalogo";
import { SENALES_DICHAS } from "../catalogo-bbva/orientacion";
import { senalesDe } from "../catalogo-bbva/senales";
import {
  CATEGORIAS, EsquemaAccion, aplicar, efectoComoDato, efectoDe, frase, fraseDeConfirmacion, leerFecha, pideConfirmacion, yaPreguntoPor,
  type Accion, type Situacion,
} from "./registro";

const SinDatos = z.object({});
const BusquedaCatalogo = z.object({
  consulta: z.string().trim().max(80).optional().describe("Qué busca, en palabras de la persona: «tarjeta sin membresía», «crédito para casa», «seguro de salud». Vacío para ver el menú completo."),
  familia: z.enum(FAMILIAS).optional().describe("Para limitar a una familia de productos."),
  lo_que_dijo: z.array(z.enum(SENALES_DICHAS)).max(SENALES_DICHAS.length).optional().describe("Solo lo que la persona dijo EXPLÍCITAMENTE en esta conversación: que cobra su sueldo en BBVA o que tiene la meta de comprar vivienda, auto o estudiar. Nunca lo supongas."),
});
const DiasPagos = z.object({
  dias: z.number().int().min(1).max(30).optional().describe("Cuántos días hacia adelante mirar. Por defecto 7."),
});
const Gasto = z.object({
  monto_soles: z.number().positive().max(1_000_000).describe("Monto del gasto en soles, por ejemplo 350 o 89.90."),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Día del gasto en formato AAAA-MM-DD, dentro del periodo proyectado."),
});

const montoDicho = () =>
  z.string().trim().min(1).max(40)
    .describe("El monto tal como lo dijo la persona, sin calcular nada: «1000», «1.000», «mil», «S/ 250.50», «cien soles».");
const anotar = z.boolean()
  .describe("true si es un hecho (ya pasó, o la persona afirma que pasará) y debe quedar en su panel; false si solo pregunta «¿y si…?».");
const confirmado = z.boolean().optional()
  .describe("Ponlo en true SOLO si en tu mensaje anterior le preguntaste si anotabas este mismo monto y la persona acaba de responder que sí. En cualquier otro caso, no lo pongas.");
const descripcion = z.string().trim().max(40).optional().describe("Qué es, en 1 a 4 palabras: «Limpieza», «Luz», «Sueldo».");
const diaDelMes = z.number().int().min(1).max(31).optional().describe("Solo para cada_mes: el día del mes que dijo la persona (1 a 31).");

const Ingreso = z.object({
  monto: montoDicho(),
  cuando: z.enum(["ya_llego", "por_llegar", "cada_mes"])
    .describe("ya_llego: ya lo recibió. por_llegar: le pagarán una vez más adelante. cada_mes: ingreso que se repite."),
  fecha_dicha: z.string().trim().max(40).optional()
    .describe("Solo para por_llegar: el día tal como lo dijo («mañana», «el viernes», «el 20», «20 de diciembre», «fin de mes»). Si no lo dijo, no lo pongas."),
  dia_del_mes: diaDelMes,
  descripcion,
  anotar,
});
const GastoAnotado = z.object({
  monto: montoDicho(),
  cuando: z.enum(["ya_paso", "cada_mes"]).describe("ya_paso: ya lo gastó o pagó. cada_mes: gasto fijo que se repite."),
  dia_del_mes: diaDelMes,
  descripcion,
  categoria: z.enum(CATEGORIAS).optional().describe("Solo para cada_mes."),
  anotar,
  confirmado,
});
const DeudaAnotada = z.object({
  entidad: z.string().trim().min(1).max(40).describe("A quién le debe: una entidad, o «Familiar», «Amigo»."),
  nombre: z.string().trim().min(1).max(40).describe("Cómo llamarla: «Préstamo moto», «Tarjeta»."),
  tipo: z.enum(["tarjeta", "prestamo", "personal"]),
  saldo: montoDicho().describe("Cuánto debe en total, tal como lo dijo."),
  pago_mensual: montoDicho().describe("Cuánto paga al mes, tal como lo dijo."),
  dia_de_pago: z.number().int().min(1).max(31),
  tcea_dicha: z.string().trim().max(20).optional().describe("El costo anual (TCEA) si lo dijo, por ejemplo «45%». Si no lo dijo, no lo pongas."),
  anotar,
  confirmado,
});

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** «45%», «45,5 %» → puntos básicos (4550). null si no se dijo o no se entiende. */
export function leerTcea(texto: string | undefined): number | null {
  const m = texto?.replace(",", ".").match(/^\s*(\d{1,3}(?:\.\d{1,2})?)\s*%?\s*$/);
  return m ? Math.round(Number(m[1]) * 100) : null;
}

export interface OpcionesHerramientas {
  /** Cobros pendientes de la persona: el resumen y los efectos cuentan lo que está por llegar. */
  cobros?: readonly CobroPendiente[];
  /** Se llama cuando el modelo anota algo como hecho: el navegador lo guarda en el panel. */
  alAccion?: (accion: Accion, texto: string) => void;
  /** Qué pasos de la ruta marcó la persona en «Mi ruta» (calculado en el servidor). */
  avance?: Avance;
  /** Historial crediticio declarado (tuvo crédito, días de atraso): afina las señales del catálogo. */
  hechos?: Hechos;
  /** El último mensaje del asistente antes de este turno: un «confirmado» solo vale si ahí preguntó por ese monto. */
  ultimoDelAsistente?: string;
}

const comoTexto = (datos: unknown): string => JSON.stringify(datos);
const error = (mensaje: string) => comoTexto({ error: mensaje });
const SIN_MONTO = "No entendí el monto. Pregúntale a la persona cuánto es, sin adivinar.";

export function crearHerramientas(perfil: Perfil, analisis: Analisis, ruta?: Ruta, opciones: OpcionesHerramientas = {}) {
  // Estado de esta conversación: lo que se anota cambia los números que ven las demás herramientas.
  let situacion: Situacion = { perfil, cobros: (opciones.cobros ?? []).filter(c => !c.cobrado) };
  let actual = analisis;
  const yaAnotadas = new Set<string>();

  function registrar(propuesta: Accion, quiereAnotar: boolean, confirmado = false): string {
    const valida = EsquemaAccion.safeParse(propuesta);
    if (!valida.success) return error("Faltan datos o no son válidos. Pregúntale a la persona lo que falta.");
    const accion = valida.data;
    const efecto = efectoDe(accion, situacion);
    // Si cambia mucho sus números, no se guarda hasta que la persona lo confirme. Que ya se le preguntó lo
    // comprueba el código (el mensaje anterior del asistente nombra ese monto en una pregunta), no el modelo.
    const confirmada = confirmado && yaPreguntoPor(accion, opciones.ultimoDelAsistente);
    if (quiereAnotar && pideConfirmacion(accion, efecto) && !confirmada) {
      return comoTexto({
        anotado_en_su_panel: false,
        necesita_confirmacion: "NO se guardó: cambia mucho sus números. Muéstrale el efecto y pregúntale si lo anotas, con el monto exacto. Si responde que sí, vuelve a llamar con confirmado=true.",
        ...efectoComoDato(accion, efecto),
        respuesta_sugerida: fraseDeConfirmacion(accion, efecto),
      });
    }
    const texto = frase(accion, efecto, quiereAnotar);
    const clave = JSON.stringify(accion);
    if (quiereAnotar && !yaAnotadas.has(clave)) {
      // Una misma acción no se anota dos veces en la misma respuesta, aunque el modelo repita la llamada.
      yaAnotadas.add(clave);
      situacion = aplicar(accion, situacion);
      actual = analizar(situacion.perfil);
      opciones.alAccion?.(accion, texto);
    }
    return comoTexto({ anotado_en_su_panel: quiereAnotar, ...efectoComoDato(accion, efecto), respuesta_sugerida: texto });
  }

  const herramientas = [
    betaZodTool({
      name: "ver_resumen",
      description:
        "Saldo de hoy, saldo más bajo de los próximos 30 días, si habrá algún día en negativo (cuándo, cuánto falta y por qué), ingresos y gastos típicos, y los pagos que le deben (si los hay). Úsala para cualquier pregunta sobre cómo va la persona o si le alcanzará el dinero.",
      inputSchema: SinDatos,
      eager_input_streaming: true,
      run: () => comoTexto(datosResumen(situacion.perfil, actual, situacion.cobros)),
    }),
    betaZodTool({
      name: "ver_jugadas",
      description:
        "Las jugadas que propone el motor para evitar el día en negativo, con cuánto libera cada una y cuánto cuesta en soles. Úsala cuando pregunten qué hacer, qué opciones hay o cuál conviene.",
      inputSchema: SinDatos,
      eager_input_streaming: true,
      run: () => comoTexto(datosJugadas(actual)),
    }),
    betaZodTool({
      name: "ver_deudas",
      description:
        "Las deudas con su saldo, TCEA y pagos, cuál pagar primero y cuánto se ahorra frente a pagar solo los mínimos. Trae además la educación: por tarjeta, cuánto del pago mínimo se va en intereses y cuánto tarda pagando solo eso; qué pasa si no paga; cómo salir; y un glosario de palabras de banco. Úsala para cualquier pregunta sobre tarjetas, préstamos, intereses, pago mínimo o cómo salir de deudas.",
      inputSchema: SinDatos,
      eager_input_streaming: true,
      run: () => comoTexto(datosDeudas(situacion.perfil, actual)),
    }),
    betaZodTool({
      name: "ver_proximos_pagos",
      description: "Los pagos fijos (alquiler, servicios, cuotas) que salen en los próximos días, con su fecha y monto.",
      inputSchema: DiasPagos,
      eager_input_streaming: true,
      run: ({ dias }) => comoTexto(datosProximosPagos(actual, dias)),
    }),
    betaZodTool({
      name: "simular_gasto",
      description:
        "Responde «¿me alcanza para gastar X tal día?»: calcula cómo queda el saldo si se hace un gasto único en una fecha. Úsala siempre que pregunten si pueden comprar o pagar algo.",
      inputSchema: Gasto,
      eager_input_streaming: true,
      run: ({ monto_soles, fecha }) => comoTexto(datosSimulacion(actual, monto_soles, fecha)),
    }),
    betaZodTool({
      name: "anotar_ingreso",
      description:
        "Cuando la persona cuenta que recibió, recibirá o gana dinero («me acaban de pagar 1.000», «me van a dar 100 el viernes por limpiar», «gano 1.500 al mes el día 30»), o pregunta «¿y si me pagan X?». El motor recalcula su saldo y su mes y devuelve el antes y el después; con anotar=true queda guardado en su panel.",
      inputSchema: Ingreso,
      eager_input_streaming: true,
      run: ({ monto, cuando, fecha_dicha, dia_del_mes, descripcion: d, anotar: si }) => {
        const centimos = leerMonto(monto);
        if (centimos === null || centimos <= 0) return error(SIN_MONTO);
        const nombre = d?.trim() || undefined;
        if (cuando === "ya_llego") {
          return registrar({ tipo: "saldo", monto: centimos, descripcion: nombre ? `Ingreso: ${nombre}` : "Ingreso extra" }, si);
        }
        if (cuando === "cada_mes") {
          if (!dia_del_mes) return error("Falta el día del mes en que le pagan. Pregúntaselo.");
          return registrar(
            { tipo: "fijo", sentido: "ingreso", descripcion: nombre ?? "Ingreso fijo", monto: centimos, dia: dia_del_mes, categoria: "sueldo" },
            si,
          );
        }
        const fecha = fecha_dicha ? (ISO.test(fecha_dicha) ? fecha_dicha : leerFecha(fecha_dicha, situacion.perfil.hoy)) : null;
        if (!fecha) return error("Falta el día en que le pagarán (o no lo entendí). Pregúntaselo.");
        return registrar({ tipo: "cobro", quien: nombre ?? "Ingreso por llegar", monto: centimos, fecha }, si);
      },
    }),
    betaZodTool({
      name: "anotar_gasto",
      description:
        "Cuando la persona cuenta que gastó o pagó algo («gasté 80 en el mercado», «pagué 120 de luz») o tiene un gasto que se repite cada mes («pago 50 de internet cada mes el 15»). El motor recalcula y, con anotar=true, queda en su panel. Para «¿me alcanza para gastar…?» no uses esta: usa simular_gasto. Plata que pidió prestada («me presté», «saqué un préstamo») no es un gasto: es una deuda, usa anotar_deuda.",
      inputSchema: GastoAnotado,
      eager_input_streaming: true,
      run: ({ monto, cuando, dia_del_mes, descripcion: d, categoria, anotar: si, confirmado: ok }) => {
        const centimos = leerMonto(monto);
        if (centimos === null || centimos <= 0) return error(SIN_MONTO);
        const nombre = d?.trim() || undefined;
        if (cuando === "ya_paso") return registrar({ tipo: "saldo", monto: -centimos, descripcion: nombre ? `Gasto: ${nombre}` : "Gasto" }, si, ok);
        if (!dia_del_mes) return error("Falta el día del mes en que lo paga. Pregúntaselo.");
        return registrar(
          { tipo: "fijo", sentido: "gasto", descripcion: nombre ?? "Gasto fijo", monto: centimos, dia: dia_del_mes, categoria: categoria ?? "otros" },
          si,
          ok,
        );
      },
    }),
    betaZodTool({
      name: "anotar_deuda",
      description:
        "Cuando la persona cuenta una deuda nueva con cuánto debe, cuánto paga al mes y qué día. Si falta alguno de esos datos, pregúntalo antes de llamarla; no los inventes. El motor recalcula y, con anotar=true, queda en su panel.",
      inputSchema: DeudaAnotada,
      eager_input_streaming: true,
      run: ({ entidad, nombre, tipo, saldo, pago_mensual, dia_de_pago, tcea_dicha, anotar: si, confirmado: ok }) => {
        const total = leerMonto(saldo);
        const cuota = leerMonto(pago_mensual);
        if (!total || !cuota) return error(SIN_MONTO);
        return registrar(
          { tipo: "deuda", entidad, nombre, tipoDeuda: tipo, saldo: total, pagoMensual: cuota, dia: dia_de_pago, tceaBp: leerTcea(tcea_dicha) },
          si,
          ok,
        );
      },
    }),
    betaZodTool({
      name: "buscar_producto_bbva",
      description:
        "Catálogo de productos de BBVA Perú para personas naturales (cuentas, tarjetas de crédito, préstamos, vivienda y auto, fondos e inversiones, seguros y servicios), copiado de la web oficial con su fecha de consulta. Sin consulta devuelve el menú (todas las familias, o solo la que pases en familia): úsalo cuando pidan la lista, p. ej. «qué tarjetas tienen» → familia tarjetas_credito sin consulta. Con consulta devuelve hasta cuatro fichas completas (para qué sirve, requisitos, cifras oficiales tal cual y enlace): úsala para una necesidad concreta o para ver el detalle de un producto del menú por su nombre. Cada ficha trae el criterio calculado por código con los números de la persona: «encaja_con_tu_situacion», «cuando_si», «cuando_no», «falta_confirmar», «freno» y «avisos»; el menú trae «para_tu_situacion». Úsala siempre que pregunten por productos de BBVA o por qué producto les conviene.",
      inputSchema: BusquedaCatalogo,
      eager_input_streaming: true,
      run: ({ consulta, familia, lo_que_dijo }) => {
        // Las señales se calculan aquí, con los números de este momento (incluye lo anotado en la conversación).
        const situacionPersona = { senales: senalesDe(situacion.perfil, actual, opciones.hechos, lo_que_dijo) };
        return comoTexto(consulta
          ? buscarEnCatalogo(consulta, familia, undefined, situacionPersona)
          : menuDelCatalogo(familia, undefined, situacionPersona));
      },
    }),
  ];
  if (!ruta) return herramientas;
  return [
    ...herramientas,
    betaZodTool({
      name: "ver_ruta",
      description:
        "La ruta que el motor trazó para esta persona (estar en verde, construir historial o hacer crecer su plata): por qué le toca, los pasos en orden y cuáles ya marcó como hechos, el siguiente paso, las alternativas generales para comparar con su condición, cuánto le queda libre al mes y cómo va su colchón para imprevistos. Úsala cuando pregunten por dónde empezar, cómo van o qué sigue, qué les conviene, cómo construir historial, qué hacer con lo que sobra o por productos.",
      inputSchema: SinDatos,
      eager_input_streaming: true,
      run: () => comoTexto(datosRuta(ruta, opciones.avance)),
    }),
  ];
}
