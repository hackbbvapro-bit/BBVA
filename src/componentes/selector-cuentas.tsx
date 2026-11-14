"use client";

import { useEffect, useId, useRef } from "react";
import { easeCubicIn, easeCubicOut, select } from "d3";
import "d3-transition";
import type { Cuenta } from "@/datos/tipos";
import { saldoDeCuentas } from "@/cliente/cuentas";
import { formatoSoles } from "@/motor/dinero";
import { IconoCifra } from "./icono-cifra";
import { unido } from "./ui";

/** Fondo y chip de una tarjeta ilustrada: SVG construido enteramente con D3. */
function DibujoTarjeta({ orden, activa }: { orden: number; activa: boolean }) {
  const elemento = useRef<SVGSVGElement>(null);
  const id = useId().replace(/:/g, "");
  useEffect(() => {
    const svg = select(elemento.current);
    svg.selectAll("*").remove();
    const colores = [
      ["#075a9c", "#072146"],
      ["#087b83", "#07464c"],
      ["#6652a1", "#30235d"],
    ][orden % 3];
    const gradiente = svg
      .append("defs")
      .append("linearGradient")
      .attr("id", id)
      .attr("x2", "100%")
      .attr("y2", "100%");
    gradiente.append("stop").attr("offset", "0%").attr("stop-color", colores[0]);
    gradiente.append("stop").attr("offset", "100%").attr("stop-color", colores[1]);
    svg.append("rect").attr("width", 180).attr("height", 112).attr("rx", 15).attr("fill", `url(#${id})`);
    svg
      .append("circle")
      .attr("cx", 165)
      .attr("cy", 98)
      .attr("r", 70)
      .attr("fill", "white")
      .attr("opacity", 0.045);
    svg
      .append("path")
      .attr("d", "M110 -10Q88 50 192 67M130 -10Q108 47 192 48")
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-opacity", 0.1)
      .attr("stroke-width", 1);
    const chip = svg.append("g").attr("transform", "translate(14 13)");
    chip.append("rect").attr("width", 20).attr("height", 15).attr("rx", 4).attr("fill", "#ead9aa");
    chip
      .append("path")
      .attr("d", "M7 0v15M13 0v15M0 5h7m6 0h7M0 10h7m6 0h7M7 7.5h6")
      .attr("fill", "none")
      .attr("stroke", "#9d8c64")
      .attr("stroke-width", 0.8);
    svg
      .append("path")
      .attr("d", "M41 16q5 4 0 8M44 13q8 7 0 14")
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-opacity", 0.65)
      .attr("stroke-width", 1.4)
      .attr("stroke-linecap", "round");
    if (activa) {
      svg.append("circle").attr("cx", 160).attr("cy", 20).attr("r", 9).attr("fill", "#c1f2e5");
      svg
        .append("path")
        .attr("d", "m156 20 2.5 2.5 5-5")
        .attr("fill", "none")
        .attr("stroke", "#086553")
        .attr("stroke-width", 1.7)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round");
    }
    return () => {
      svg.selectAll("*").remove();
    };
  }, [id, orden, activa]);
  return (
    <svg
      ref={elemento}
      viewBox="0 0 180 112"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    />
  );
}

/** Desplegable anclado al saldo. No bloquea la página ni mueve el resto de las cifras. */
export function SelectorCuentas({
  id,
  abierto,
  cuentas,
  seleccion,
  elegir,
  cerrar,
  gestionar,
  tarjetasCredito = false,
}: {
  id: string;
  abierto: boolean;
  cuentas: Cuenta[];
  seleccion: string | null;
  elegir: (id: string | null) => void;
  cerrar: () => void;
  gestionar?: () => void;
  tarjetasCredito?: boolean;
}) {
  const elemento = useRef<HTMLDivElement>(null);
  const general = saldoDeCuentas(cuentas, null);

  useEffect(() => {
    const nodo = elemento.current;
    if (!nodo) return;
    const panel = select(nodo);
    const tarjetas = panel.selectAll<HTMLButtonElement, unknown>(".cuenta-tarjeta");
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panel.interrupt("cuentas");
    tarjetas.interrupt("cuentas");
    if (abierto) {
      nodo.hidden = false;
      panel.style("pointer-events", "auto");
      if (reducido) {
        panel.style("opacity", 1).style("transform", "none");
        tarjetas.style("opacity", 1).style("transform", "none");
      } else {
        panel
          .style("opacity", 0)
          .style("transform", `translate(${tarjetasCredito ? 10 : -10}px, 0px) scale(0.98)`)
          .transition("cuentas")
          .duration(220)
          .ease(easeCubicOut)
          .style("opacity", 1)
          .style("transform", "translate(0px, 0px) scale(1)");
        tarjetas
          .style("opacity", 0)
          .style("transform", "translate(-8px, 0px)")
          .transition("cuentas")
          .delay((_, i) => 50 + i * 35)
          .duration(300)
          .ease(easeCubicOut)
          .style("opacity", 1)
          .style("transform", "translate(0px, 0px)");
      }
    } else if (!nodo.hidden) {
      panel.style("pointer-events", "none");
      if (reducido) nodo.hidden = true;
      else
        panel
          .transition("cuentas")
          .duration(150)
          .ease(easeCubicIn)
          .style("opacity", 0)
          .style("transform", `translate(${tarjetasCredito ? 6 : -6}px, 0px) scale(0.985)`)
          .on("end", () => {
            nodo.hidden = true;
          });
    }
    return () => {
      panel.interrupt("cuentas");
      tarjetas.interrupt("cuentas");
    };
  }, [abierto, tarjetasCredito]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      const tarjeta = elemento.current?.closest("[data-cifra]");
      if (e.target instanceof Node && !tarjeta?.contains(e.target)) cerrar();
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      cerrar();
      elemento.current
        ?.closest("[data-cifra]")
        ?.querySelector<HTMLButtonElement>(".cifra-selector")
        ?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    window.addEventListener("resize", cerrar);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
      window.removeEventListener("resize", cerrar);
    };
  }, [abierto, cerrar]);

  function seleccionar(id: string | null) {
    elegir(id);
    elemento.current
      ?.closest("[data-cifra]")
      ?.querySelector<HTMLButtonElement>(".cifra-selector")
      ?.focus({ preventScroll: true });
  }

  return (
    <div ref={elemento} id={id} className="cuentas-inline" data-tipo={tarjetasCredito ? "credito" : "cuentas"} hidden inert={!abierto} aria-hidden={!abierto}>
      <div className="cuentas-inline-cabecera">
        <span id={`${id}-titulo`}>{tarjetasCredito ? "Tarjetas de crédito" : "Cuentas"}</span>
        {gestionar && (
          <button type="button" className="cuentas-inline-gestionar" onClick={gestionar}>
            Administrar &#8599;
          </button>
        )}
        <button
          type="button"
          className="cuentas-inline-cerrar"
          aria-label={tarjetasCredito ? "Cerrar selector de tarjetas" : "Cerrar selector de cuentas"}
          onClick={cerrar}
        >
          &times;
        </button>
      </div>
      <div role="group" aria-labelledby={`${id}-titulo`}>
        <button
          type="button"
          className="cuentas-general"
          aria-pressed={seleccion === null}
          onClick={() => seleccionar(null)}
        >
          <span className="cuentas-general-icono">
            <IconoCifra tipo={tarjetasCredito ? "deuda" : "cartera"} orden={0} cantidad={cuentas.length} />
          </span>
          <span className="cuentas-general-texto">
            <span>Acumulado general</span>
            <small className="sr-only">
              {cuentas.length === 1 ? "Tu cuenta" : `${cuentas.length} cuentas`}
            </small>
          </span>
          <span className="tabular-nums">{unido(formatoSoles(general.saldo))}</span>
          {seleccion === null && (
            <span className="cuentas-general-check" aria-hidden="true">
              &#10003;
            </span>
          )}
        </button>
        {cuentas.length > 0 ? (
          <div
            className="cuentas-carrusel"
            aria-label="Tus tarjetas"
            onKeyDown={e => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              const opciones = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
              const actual = opciones.indexOf(document.activeElement as HTMLButtonElement);
              const siguiente = opciones[actual + (e.key === "ArrowRight" ? 1 : -1)];
              if (siguiente) {
                e.preventDefault();
                siguiente.focus({ preventScroll: true });
                siguiente.scrollIntoView({
                  behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                    ? "instant"
                    : "smooth",
                  block: "nearest",
                  inline: "nearest",
                });
              }
            }}
          >
            {cuentas.map((c, i) => (
              <button
                key={c.id}
                type="button"
                className="cuenta-tarjeta"
                aria-pressed={seleccion === c.id}
                onClick={() => seleccionar(c.id)}
              >
                <DibujoTarjeta orden={i} activa={seleccion === c.id} />
                <span className="cuenta-tarjeta-nombre" title={c.nombre}>
                  {c.nombre}
                </span>
                <span className="cuenta-tarjeta-saldo tabular-nums">{unido(formatoSoles(c.saldo))}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="cuentas-vacias">{tarjetasCredito ? "No tienes tarjetas de crédito pendientes." : "Agrega tu primera cuenta en Mi dinero."}</p>
        )}
      </div>
      <p className="sr-only">{tarjetasCredito ? "La proyección considera todas tus deudas." : "La proyección usa todas tus cuentas."} Puedes deslizar para ver más.</p>
    </div>
  );
}
