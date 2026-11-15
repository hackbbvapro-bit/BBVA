"use client";

import { useEffect, useRef } from "react";
import { curveMonotoneX, easeBackOut, easeCubicOut, line, select } from "d3";
import "d3-transition";
import { partes } from "@/motor/fechas";

export type TipoIconoCifra = "saldo" | "cuenta" | "cartera" | "deuda" | "cuotas" | "salida";

/** Ilustraciones SVG dibujadas y animadas con D3. Sin imágenes, bucles ni cifras inventadas. */
export function IconoCifra({
  tipo,
  orden,
  selector = false,
  cantidad = 0,
  fecha,
}: {
  tipo: TipoIconoCifra;
  orden: number;
  selector?: boolean;
  cantidad?: number;
  fecha?: string;
}) {
  const elemento = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!elemento.current) return;
    const svg = select(elemento.current);
    svg.selectAll("*").remove();
    const dibujo = svg
      .append("g")
      .attr("fill", "none")
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round");
    const trazo = (d: string, relleno = "none") =>
      dibujo
        .append("path")
        .attr("d", d)
        .attr("fill", relleno)
        .attr("stroke", "currentColor")
        .attr("stroke-width", 1.8)
        .attr("data-trazo", "");

    if (tipo === "cartera") {
      trazo(
        "M9 16h29a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V20a4 4 0 0 1 4-4Z",
        "var(--cifra-suave)",
      );
      const visibles = Math.min(3, Math.max(0, Math.floor(cantidad)));
      const tarjetas = dibujo
        .selectAll("g[data-tarjeta-cartera]")
        .data(
          Array.from({ length: visibles }, (_, i) => ({
            x: 9 + i * 3,
            y: 12 - (visibles - 1 - i) * 4,
            color: ["#8cc8ef", "#78cbbc", "#b6a4e0"][i],
          })),
        )
        .join("g")
        .attr("data-tarjeta-cartera", "")
        .attr("data-flota", "");
      tarjetas
        .append("rect")
        .attr("x", d => d.x)
        .attr("y", d => d.y)
        .attr("width", 25)
        .attr("height", 22)
        .attr("rx", 3)
        .attr("fill", d => d.color)
        .attr("stroke", "white")
        .attr("stroke-width", 1.2);
      tarjetas
        .append("path")
        .attr("d", d => `M${d.x + 4} ${d.y + 4}h12`)
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .attr("opacity", 0.7);
      trazo("M5 23h37v15a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z", "white");
      trazo("M42 29h-9a4 4 0 0 0 0 8h9", "var(--cifra-suave)");
      dibujo
        .append("circle")
        .attr("cx", 34)
        .attr("cy", 33)
        .attr("r", 1.4)
        .attr("fill", "var(--cifra-acento)");
    } else if (tipo === "cuenta") {
      trazo("M10 12h28a5 5 0 0 1 5 5v20a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V17a5 5 0 0 1 5-5Z", "white");
      dibujo.append("path").attr("d", "M6 20h36v6H6Z").attr("fill", "var(--cifra-suave)");
      dibujo
        .append("rect")
        .attr("x", 11)
        .attr("y", 29)
        .attr("width", 9)
        .attr("height", 7)
        .attr("rx", 2)
        .attr("fill", "var(--cifra-acento)");
      trazo("M25 32h7M11 8h22");
    } else if (tipo === "saldo") {
      trazo("M10 17V13a4 4 0 0 1 4-4h17v8", "var(--cifra-suave)");
      trazo("M10 16h25a4 4 0 0 1 4 4v17a4 4 0 0 1-4 4H12a5 5 0 0 1-5-5V21a5 5 0 0 1 5-5Z", "white");
      trazo("M39 25h-9a4 4 0 0 0 0 8h9", "var(--cifra-suave)");
      dibujo.append("circle").attr("cx", 31).attr("cy", 29).attr("r", 1.5).attr("fill", "currentColor");
      const moneda = dibujo.append("g").attr("data-flota", "");
      moneda
        .append("circle")
        .attr("cx", 32)
        .attr("cy", 12)
        .attr("r", 8)
        .attr("fill", "var(--cifra-acento)")
        .attr("stroke", "white")
        .attr("stroke-width", 2);
      moneda
        .append("path")
        .attr("d", "M32 8v8m2-6h-3a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 1 0 3h-3")
        .attr("stroke", "white")
        .attr("stroke-width", 1.4);
    } else if (tipo === "deuda") {
      trazo(
        "M15 9h23a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H15a4 4 0 0 1-4-4V13a4 4 0 0 1 4-4Z",
        "var(--cifra-suave)",
      );
      trazo("M9 17h24a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V21a4 4 0 0 1 4-4Z", "white");
      dibujo.append("path").attr("d", "M6 24h30v5H6Z").attr("fill", "currentColor").attr("opacity", 0.12);
      trazo("M11 34h7m4 0h3");
      const brillo = dibujo.append("g").attr("data-flota", "");
      brillo
        .append("circle")
        .attr("cx", 37)
        .attr("cy", 12)
        .attr("r", 7)
        .attr("fill", "var(--cifra-acento)")
        .attr("stroke", "white")
        .attr("stroke-width", 2);
      brillo.append("path").attr("d", "M37 8v8m-4-4h8").attr("stroke", "white").attr("stroke-width", 1.5);
    } else if (tipo === "cuotas") {
      trazo("M14 11h22a5 5 0 0 1 5 5v21a5 5 0 0 1-5 5H14a5 5 0 0 1-5-5V16a5 5 0 0 1 5-5Z", "white");
      dibujo
        .append("path")
        .attr("d", "M10 20h30v-5a3 3 0 0 0-3-3H13a3 3 0 0 0-3 3Z")
        .attr("fill", "var(--cifra-suave)");
      trazo("M9 21h32M17 7v8M33 7v8");
      if (fecha) {
        const { dia } = partes(fecha);
        dibujo.append("text").attr("x", 25).attr("y", 36).attr("text-anchor", "middle")
          .attr("fill", "currentColor").attr("font-size", 16).attr("font-weight", 700).text(String(dia));
      } else {
        dibujo.append("path").attr("d", "M20 32h10").attr("stroke", "currentColor").attr("stroke-width", 2);
      }
    } else {
      dibujo
        .selectAll("rect[data-barra]")
        .data([
          { x: 9, y: 29, h: 11 },
          { x: 20, y: 22, h: 18 },
          { x: 31, y: 13, h: 27 },
        ])
        .join("rect")
        .attr("data-barra", "")
        .attr("x", d => d.x)
        .attr("y", d => d.y)
        .attr("width", 7)
        .attr("height", d => d.h)
        .attr("rx", 2.5)
        .attr("fill", "var(--cifra-acento)")
        .attr("opacity", (_, i) => 0.18 + i * 0.14);
      const camino = line<[number, number]>().curve(curveMonotoneX)([
        [7, 28],
        [17, 20],
        [25, 22],
        [39, 8],
      ]);
      trazo(camino ?? "").attr("stroke-width", 2.4);
      trazo("M31 8h8v8").attr("stroke-width", 2.4);
    }

    if (selector) {
      const indicador = dibujo.append("g");
      indicador
        .append("circle")
        .attr("cx", 40)
        .attr("cy", 38)
        .attr("r", 7)
        .attr("fill", "currentColor")
        .attr("stroke", "white")
        .attr("stroke-width", 1.5);
      indicador
        .append("path")
        .attr("d", tipo === "cartera" ? "m39 35 3 3-3 3" : "m37 37 3 3 3-3")
        .attr("stroke", "white")
        .attr("stroke-width", 1.8);
    }

    const trazos = dibujo.selectAll<SVGPathElement, unknown>("[data-trazo]").attr("pathLength", 1);
    const flotantes = dibujo.selectAll<SVGGElement, unknown>("[data-flota]");
    // El chip de la tarjeta también es un rectángulo, pero no tiene datos de una barra.
    const barras = dibujo.selectAll<SVGRectElement, { x: number; y: number; h: number }>("rect[data-barra]");
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)");
    const tarjeta = select(elemento.current.closest(".cifra-selector") ?? elemento.current);

    function terminar() {
      trazos.interrupt("cifra").attr("stroke-dasharray", null).attr("stroke-dashoffset", null);
      flotantes.interrupt("cifra").attr("transform", null);
      barras
        .interrupt("cifra")
        .attr("y", d => d.y)
        .attr("height", d => d.h);
    }

    function animar(retraso = 0) {
      terminar();
      if (reducido.matches || document.hidden) return;
      trazos
        .attr("stroke-dasharray", 1)
        .attr("stroke-dashoffset", 1)
        .transition("cifra")
        .delay(retraso)
        .duration(650)
        .ease(easeCubicOut)
        .attr("stroke-dashoffset", 0);
      flotantes
        .attr("transform", "translate(0 5)")
        .transition("cifra")
        .delay(retraso + 100)
        .duration(650)
        .ease(easeBackOut.overshoot(1.7))
        .attr("transform", "translate(0 0)");
      barras
        .attr("y", 40)
        .attr("height", 0)
        .transition("cifra")
        .delay((_, i) => retraso + i * 85)
        .duration(550)
        .ease(easeCubicOut)
        .attr("y", d => d.y)
        .attr("height", d => d.h);
    }

    animar(orden * 65);
    tarjeta.on("pointerenter.cifra", () => animar()).on("pointerdown.cifra", () => animar());
    reducido.addEventListener("change", terminar);
    return () => {
      terminar();
      tarjeta.on(".cifra", null);
      reducido.removeEventListener("change", terminar);
      svg.selectAll("*").remove();
    };
  }, [tipo, orden, selector, cantidad, fecha]);

  return (
    <svg ref={elemento} viewBox="0 0 48 48" width="40" height="40" aria-hidden="true" focusable="false" />
  );
}
