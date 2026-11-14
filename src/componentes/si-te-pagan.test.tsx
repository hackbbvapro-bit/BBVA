"use client";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { aPerfil } from "@/datos/aPerfil";
import { datosDeRosa } from "@/datos/semilla";
import { analizar, conCobros, type CobroPendiente } from "@/motor";
import { Grafico } from "@/componentes/grafico";
import { Hoy } from "@/componentes/hoy";
import { fraseSiTePagan, GraficoSiTePagan } from "@/componentes/si-te-pagan";

const perfil = aPerfil(datosDeRosa());
const analisis = analizar(perfil);
const base = analisis.proyeccion;
const voz = { leer: () => undefined, detener: () => undefined, sonando: false };
const plano = (html: string) => html.replace(/\u00a0/g, " ");
const cobro = (id: string, monto: number, fechaPrometida: string): CobroPendiente => ({ id, quien: id, monto, fechaPrometida, cobrado: false });

describe("«si te pagan» en pantalla", () => {
  it("la semilla de Rosa no trae cobros: no se muestra el botón ni se inventa nada", () => {
    const html = renderToStaticMarkup(<GraficoSiTePagan base={base} cobros={[]} descripcion="x" />);
    expect(html).not.toContain("si te pagan");
    expect(html).not.toContain("Ver si te pagan");
  });

  it("con un cobro dentro del periodo ofrece el botón con el total y la advertencia", () => {
    const html = plano(renderToStaticMarkup(<GraficoSiTePagan base={base} cobros={[cobro("a", 25050, "2026-11-20")]} descripcion="x" />));
    expect(html).toContain("Ver si te pagan S/ 250.50");
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain("cuentan solo si te pagan en la fecha prometida");
    expect(html).not.toMatch(/NaN|undefined/);
  });

  it("un cobro vencido no mueve nada y se explica", () => {
    const html = plano(renderToStaticMarkup(<GraficoSiTePagan base={base} cobros={[cobro("v", 10000, "2026-11-01")]} descripcion="x" />));
    expect(html).not.toContain("Ver si te pagan");
    expect(html).toContain("1 cobro vencido (S/ 100.00) no se cuenta");
  });

  it("Hoy recibe cobros y sigue renderizando sin ellos", () => {
    expect(renderToStaticMarkup(<Hoy perfil={perfil} analisis={analisis} {...voz} />)).not.toContain("Ver si te pagan");
    const conUno = plano(renderToStaticMarkup(<Hoy perfil={perfil} analisis={analisis} cobros={[cobro("a", 25050, "2026-11-20")]} {...voz} />));
    expect(conUno).toContain("Ver si te pagan S/ 250.50");
  });

  it("la línea punteada se queda dentro del lienzo", () => {
    const e = conCobros(base, [cobro("a", 120000, "2026-11-20")]);
    const html = renderToStaticMarkup(<Grafico base={base} siPagan={e.dias} descripcion="x" />);
    expect(html).toContain('stroke-dasharray="1 6"');
    for (const [, x, y] of html.matchAll(/[ML]([\d.-]+),([\d.-]+)/g)) {
      expect(Number(x)).toBeGreaterThanOrEqual(0);
      expect(Number(x)).toBeLessThanOrEqual(350);
      expect(Number(y)).toBeGreaterThanOrEqual(0);
      expect(Number(y)).toBeLessThanOrEqual(250);
    }
  });

  it("la frase dice la verdad en cada caso", () => {
    const resuelve = conCobros(base, [cobro("a", 100000, "2026-11-20")]);
    expect(fraseSiTePagan(resuelve)).toMatch(/^Si te pagan lo prometido en su fecha, no llegas a rojo\./);
    const parcial = conCobros(base, [cobro("a", 5000, "2026-11-20")]);
    expect(plano(fraseSiTePagan(parcial))).toMatch(/seguirías en rojo y te faltarían hasta S\/ \d/);
    const tarde = conCobros(base, [cobro("t", 5000, "2026-12-10")]);
    expect(fraseSiTePagan(tarde)).toContain("llega después de tu día en rojo");
  });
});
