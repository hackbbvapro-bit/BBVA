import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { analizar, formatoLargo, formatoSoles, rangoDias, type Movimiento, type Perfil } from "@/motor";
import { aPerfil } from "@/datos/aPerfil";
import { datosDeEjemplo } from "@/datos/semilla";
import { prioridadDePagos } from "@/datos/paraPrioridad";
import { crecimientoDelHueco, mejorJugada } from "@/explica/explica";
import { datosJugadas } from "@/agente/datos";
import { flujoMensual, desgloseMensual, hechosDe, REGLA_DEUDAS_EN_ROJO, resumenDelMes, trazarRuta } from "@/ruta/ruta";
import { OrdenDePago } from "./orden-pago";
import { alertaPrincipal, cifras } from "./tablero";

/** Andrea, el caso de ejemplo: todas las pantallas la leen del mismo análisis. */
function andrea() {
  const datos = datosDeEjemplo();
  const perfil = aPerfil(datos);
  const analisis = analizar(perfil);
  return { datos, perfil, analisis, dia: formatoLargo(analisis.proyeccion.deficit!.fecha) };
}

/**
 * Persona sintética cuyo hueco CRECE después del primer día en rojo: paga S/ 100 de tarjeta el 23, cobra el 30 y entre
 * medio sigue gastando S/ 2.50 al día. El primer día en rojo falta poco; el día más bajo falta bastante más.
 */
function huecoQueCrece(): Perfil {
  const movimientos: Movimiento[] = ["08", "09", "10"].flatMap(mes => [
    { id: `p-${mes}`, fecha: `2026-${mes}-23`, descripcion: "Pago Azul", monto: -10000, categoria: "deuda", canal: "cuenta" },
    { id: `s-${mes}`, fecha: `2026-${mes}-30`, descripcion: "Sueldo", monto: 20000, categoria: "sueldo", canal: "cuenta" },
  ] satisfies Movimiento[]);
  for (const fecha of rangoDias("2026-08-22", 84)) {
    movimientos.push({ id: `c-${fecha}`, fecha, descripcion: "Comida", monto: -250, categoria: "comida", canal: "cuenta" });
  }
  movimientos.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id));
  return {
    id: "p", nombre: "Prueba", tipo: "independiente", descripcion: "", hoy: "2026-11-13", saldoActual: 11000, movimientos,
    deudas: [{ id: "azul", nombre: "Azul", tipo: "tarjeta", saldo: 20000, tceaBp: 10000, pagoMinimo: 5000, pagoHabitual: 10000, diaPago: 23 }],
  };
}

describe("P0-1: las pantallas dicen lo mismo", () => {
  it("Inicio, Mi ruta y el asistente nombran la misma «salida más barata»", () => {
    const { datos, perfil, analisis, dia } = andrea();
    const barata = mejorJugada(analisis)!;
    expect(barata.titulo).toBe("Pausa tus suscripciones este mes");
    expect(cifras(perfil, analisis)[3].nota.startsWith(barata.titulo)).toBe(true);
    const tapar = trazarRuta(perfil, analisis, hechosDe(datos)).pasos.find(p => p.startsWith(`Tapa el hueco del ${dia}`))!;
    expect(tapar.toLowerCase()).toContain(barata.titulo.toLowerCase());
    expect(datosJugadas(analisis)).toMatchObject({ la_mas_barata_que_resuelve_sola: barata.titulo });
  });

  it("con un día en rojo, «Qué pagar primero» no suma extra a ninguna deuda y repite la regla de Mi ruta", () => {
    const { datos, perfil, analisis, dia } = andrea();
    const r = prioridadDePagos(datos, analisis);
    expect(r.rojoEl).toBe(analisis.proyeccion.deficit!.fecha);
    // Préstamo 270 + Azul 160 + Verde 80 de mínimos; de los S/ 750.93 disponibles quedan S/ 240.93 de margen.
    expect(Object.fromEntries(r.decisiones.map(d => [d.id, d.monto]))).toEqual({ "independiente-prestamo": 27000, "independiente-tarjeta": 16000, segunda: 8000 });
    expect(r.comprometido).toBe(51000);
    expect(r.sobrante).toBe(24093);
    expect(r.decisiones.every(d => !d.motivo.includes("extra"))).toBe(true);

    const regla = REGLA_DEUDAS_EN_ROJO(dia);
    expect(trazarRuta(perfil, analisis, hechosDe(datos)).pasos).toContain(regla);
    const html = renderToStaticMarkup(<OrdenDePago r={r} jugada={mejorJugada(analisis)?.titulo} />);
    expect(html).toContain(regla);
    expect(html).toContain("«Pausa tus suscripciones este mes»");
    expect(html).not.toContain("el resto va a la deuda más cara");
  });

  it("sin día en rojo, lo que sobra sí va a la deuda más cara", () => {
    const { datos, analisis } = andrea();
    const sinRojo = { ...analisis, proyeccion: { ...analisis.proyeccion, deficit: null } };
    const r = prioridadDePagos(datos, sinRojo);
    expect(r.rojoEl).toBeNull();
    expect(r.sobrante).toBe(0);
    expect(r.decisiones.some(d => d.motivo.includes("extra"))).toBe(true);
  });

  it("Mi dinero y Mi ruta dan los mismos ingresos y gastos del mes (ya no S/ 0 de ingresos)", () => {
    const { perfil, analisis } = andrea();
    const mes = resumenDelMes(perfil, analisis);
    const flujo = flujoMensual(perfil, analisis);
    expect(mes.entra).toBe(flujo.ingresos);
    expect(mes.sale).toBe(flujo.gastos);
    // Andrea no tiene ingresos fijos: todo lo que entra es variable (S/ 823.43 a la semana × 52 / 12).
    expect(mes).toMatchObject({ entra: 356820, sale: 311270, notaEntra: "Ingreso variable estimado, a la baja para no ilusionarte" });
    const d = desgloseMensual(analisis);
    expect(d.ingresosFijos + d.ingresoVariable).toBe(356820);
    expect(d.gastosFijos + d.gastoVariable).toBe(311270);
    expect(mes.notaSale).toBe(`Fijos ${formatoSoles(d.gastosFijos)} + día a día ${formatoSoles(d.gastoVariable)}, sin cuotas de deudas`);
  });
});

describe("P0-2: el aviso no subestima el hueco", () => {
  it("si el hueco crece después del primer día en rojo, Inicio y Mi ruta lo dicen con el monto y el día más bajo", () => {
    const perfil = huecoQueCrece();
    const analisis = analizar(perfil);
    const d = analisis.proyeccion.deficit!;
    expect(d.faltanteMaximo).toBeGreaterThan(d.faltante);
    const crece = `Si no haces nada, el hueco crece hasta ${formatoSoles(d.faltanteMaximo)} el ${formatoLargo(d.fechaFaltanteMaximo)}.`;
    expect(crecimientoDelHueco(d)).toBe(crece);
    const alerta = alertaPrincipal(analisis)!;
    expect(alerta.monto).toBe(formatoSoles(d.faltante));
    expect(alerta.detalle).toContain(crece);
    expect(alerta.detalle).toContain("Ese día sale pago azul.");
    expect(alerta.detalle).not.toMatch(/estás a tiempo/i);
    expect(trazarRuta(perfil, analisis).motivos.join(" ")).toContain(crece);
  });

  it("si el primer día en rojo ya es el más bajo, no agrega nada y el verbo concuerda con dos causas", () => {
    const { analisis } = andrea();
    const d = analisis.proyeccion.deficit!;
    expect(d.faltanteMaximo).toBe(d.faltante);
    expect(crecimientoDelHueco(d)).toBe("");
    const alerta = alertaPrincipal(analisis)!;
    expect(alerta.detalle).toMatch(/^Ese día se juntan .+ y .+\. Quedan \d+ días para evitarlo\.$/);
  });

  it("sin déficit no hay alerta", () => {
    const perfil = { ...huecoQueCrece(), saldoActual: 1_000_000 };
    expect(alertaPrincipal(analizar(perfil))).toBeUndefined();
  });
});
