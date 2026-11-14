/** Herramientas del agente: cada una consulta el motor. El modelo no tiene otra fuente de números. */
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Analisis, Perfil } from "../motor";
import type { Ruta } from "../ruta/ruta";
import { datosDeudas, datosJugadas, datosProximosPagos, datosResumen, datosRuta, datosSimulacion } from "./datos";

const SinDatos = z.object({});
const DiasPagos = z.object({
  dias: z.number().int().min(1).max(30).optional().describe("Cuántos días hacia adelante mirar. Por defecto 7."),
});
const Gasto = z.object({
  monto_soles: z.number().positive().max(1_000_000).describe("Monto del gasto en soles, por ejemplo 350 o 89.90."),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Día del gasto en formato AAAA-MM-DD, dentro del periodo proyectado."),
});

export function crearHerramientas(perfil: Perfil, analisis: Analisis, ruta?: Ruta) {
  const comoTexto = (datos: unknown): string => JSON.stringify(datos);
  const herramientas = [
    betaZodTool({
      name: "ver_resumen",
      description:
        "Saldo de hoy, saldo más bajo de los próximos 30 días, si habrá algún día en negativo (cuándo, cuánto falta y por qué), ingresos y gastos típicos. Úsala para cualquier pregunta sobre cómo va la persona o si le alcanzará el dinero.",
      inputSchema: SinDatos,
      eager_input_streaming: true,
      run: () => comoTexto(datosResumen(perfil, analisis)),
    }),
    betaZodTool({
      name: "ver_jugadas",
      description:
        "Las jugadas que propone el motor para evitar el día en negativo, con cuánto libera cada una y cuánto cuesta en soles. Úsala cuando pregunten qué hacer, qué opciones hay o cuál conviene.",
      inputSchema: SinDatos,
      eager_input_streaming: true,
      run: () => comoTexto(datosJugadas(analisis)),
    }),
    betaZodTool({
      name: "ver_deudas",
      description:
        "Las deudas con su saldo, TCEA y pagos, cuál pagar primero y cuánto se ahorra frente a pagar solo los mínimos. Úsala para cualquier pregunta sobre tarjetas, préstamos, intereses o cómo salir de deudas.",
      inputSchema: SinDatos,
      eager_input_streaming: true,
      run: () => comoTexto(datosDeudas(perfil, analisis)),
    }),
    betaZodTool({
      name: "ver_proximos_pagos",
      description: "Los pagos fijos (alquiler, servicios, cuotas) que salen en los próximos días, con su fecha y monto.",
      inputSchema: DiasPagos,
      eager_input_streaming: true,
      run: ({ dias }) => comoTexto(datosProximosPagos(analisis, dias)),
    }),
    betaZodTool({
      name: "simular_gasto",
      description:
        "Responde «¿me alcanza para gastar X tal día?»: calcula cómo queda el saldo si se hace un gasto único en una fecha. Úsala siempre que pregunten si pueden comprar o pagar algo.",
      inputSchema: Gasto,
      eager_input_streaming: true,
      run: ({ monto_soles, fecha }) => comoTexto(datosSimulacion(analisis, monto_soles, fecha)),
    }),
  ];
  if (!ruta) return herramientas;
  return [
    ...herramientas,
    betaZodTool({
      name: "ver_ruta",
      description:
        "La ruta que el motor trazó para esta persona (estar en verde, construir historial o hacer crecer su plata): por qué le toca, los pasos en orden, las alternativas generales para comparar con su condición, cuánto le queda libre al mes y cómo va su colchón para imprevistos. Úsala cuando pregunten por dónde empezar, qué les conviene, cómo construir historial, qué hacer con lo que sobra o por productos.",
      inputSchema: SinDatos,
      eager_input_streaming: true,
      run: () => comoTexto(datosRuta(ruta)),
    }),
  ];
}
