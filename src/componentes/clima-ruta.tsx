"use client";

import { useEffect, useId, useRef, useState } from "react";
import { easeCubicInOut, select, timer } from "d3";
import "d3-transition";

export type Clima = "tormenta" | "nublado" | "abriendo" | "despejado";

/** Solo representa las tareas marcadas, no modifica la proyección financiera. */
export function climaDelAvance(cumplidos: number, total: number): Clima {
  if (total <= 0) return "nublado";
  if (cumplidos >= total) return "despejado";
  if (cumplidos <= 0) return "tormenta";
  return cumplidos === 1 ? "nublado" : "abriendo";
}

const DESCRIPCIONES: Record<Clima, string> = {
  tormenta: "Lluvia intensa: aún no marcaste pasos.",
  nublado: "Nubes oscuras, sin lluvia.",
  abriendo: "Las nubes se abren y asoma el sol.",
  despejado: "Sol y nubes blancas: completaste todos los pasos.",
};

const NUBE = "M21 45C9 45 3 38 3 29C3 20 10 13 20 13C23 4 30 0 40 0C53 0 62 8 64 18C69 13 75 12 81 14C89 16 94 22 94 29C103 30 108 36 106 41C105 45 100 47 93 47H21Z";
const CIELOS = {
  tormenta: { cielo: "#e8edf5", arriba: "#596d89", abajo: "#263955", sol: 0 },
  nublado: { cielo: "#edf1f7", arriba: "#63748e", abajo: "#35465f", sol: 0 },
  abriendo: { cielo: "#e7f5ff", arriba: "#c2d3e5", abajo: "#91acc7", sol: 0.85 },
  despejado: { cielo: "#e9f7ff", arriba: "#ffffff", abajo: "#d7eaf8", sol: 1 },
};

export function ClimaRuta({ cumplidos, total }: { cumplidos: number; total: number }) {
  const id = useId().replace(/:/g, "");
  const elemento = useRef<SVGGElement>(null);
  const [animando, setAnimando] = useState(true);
  const clima = climaDelAvance(cumplidos, total);

  useEffect(() => {
    const nodo = elemento.current;
    if (!nodo) return;
    const lienzo = select(nodo);
    const colores = CIELOS[clima];
    const duracion = animando ? 850 : 0;
    const defs = lienzo.selectAll<SVGDefsElement, null>("defs").data([null]).join("defs");
    const gradiente = defs.selectAll<SVGLinearGradientElement, null>("linearGradient")
      .data([null]).join("linearGradient").attr("id", `${id}-nubes`).attr("x2", "0%").attr("y2", "100%");
    gradiente.selectAll<SVGStopElement, string>("stop").data([colores.arriba, colores.abajo])
      .join(entrar => entrar.append("stop").attr("stop-color", d => d))
      .attr("offset", (_, i) => i === 0 ? "0%" : "100%")
      .transition("clima").duration(duracion).attr("stop-color", d => d);
    const recorte = defs.selectAll<SVGClipPathElement, null>("clipPath").data([null]).join("clipPath").attr("id", `${id}-lluvia`);
    recorte.selectAll("rect").data([null]).join("rect").attr("x", 35).attr("y", 65).attr("width", 133).attr("height", 57);

    lienzo.selectAll<SVGEllipseElement, null>("ellipse.cielo").data([null])
      .join(entrar => entrar.append("ellipse").attr("fill", colores.cielo))
      .attr("class", "cielo").attr("cx", 101).attr("cy", 64).attr("rx", 87).attr("ry", 56)
      .transition("clima").duration(duracion).attr("fill", colores.cielo);

    const posicionSol = clima === "despejado" ? "translate(111,44)" : "translate(126,42)";
    const sol = lienzo.selectAll<SVGGElement, null>("g.sol").data([null])
      .join(entrar => entrar.append("g").attr("opacity", colores.sol).attr("transform", posicionSol))
      .attr("class", "sol");
    sol.transition("clima").duration(duracion).ease(easeCubicInOut)
      .attr("transform", posicionSol)
      .attr("opacity", colores.sol);
    const aura = sol.selectAll("circle.aura").data([null]).join("circle").attr("class", "aura")
      .attr("r", 33).attr("fill", "#ffcf58").attr("opacity", 0.15);
    const rayos = sol.selectAll<SVGGElement, null>("g.rayos").data([null]).join("g").attr("class", "rayos");
    rayos.selectAll<SVGLineElement, number>("line").data(Array.from({ length: 10 }, (_, i) => i)).join("line")
      .attr("x1", i => Math.cos(i * Math.PI / 5) * 25).attr("y1", i => Math.sin(i * Math.PI / 5) * 25)
      .attr("x2", i => Math.cos(i * Math.PI / 5) * 30).attr("y2", i => Math.sin(i * Math.PI / 5) * 30)
      .attr("stroke", "#f8b633").attr("stroke-width", 3).attr("stroke-linecap", "round");
    sol.selectAll("circle.disco").data([null]).join("circle").attr("class", "disco").attr("r", 20)
      .attr("fill", "#ffd464").attr("stroke", "#ffbd3f").attr("stroke-width", 1.5);
    sol.selectAll("path.brillo").data([null]).join("path").attr("class", "brillo")
      .attr("d", "M-12 -5A13 13 0 0 1 1 -13").attr("fill", "none").attr("stroke", "#fff3c7")
      .attr("stroke-width", 3).attr("stroke-linecap", "round");

    const lluvia = lienzo.selectAll<SVGGElement, null>("g.lluvia").data([null])
      .join(entrar => entrar.append("g").attr("opacity", clima === "tormenta" ? 1 : 0)).attr("class", "lluvia")
      .attr("clip-path", `url(#${id}-lluvia)`);
    lluvia.transition("clima").duration(animando ? 250 : 0).attr("opacity", clima === "tormenta" ? 1 : 0);
    const gotas = lluvia.selectAll<SVGLineElement, number>("line").data(Array.from({ length: 42 }, (_, i) => i)).join("line")
      .attr("x1", i => 44 + (i % 14) * 9).attr("x2", i => 38 + (i % 14) * 9)
      .attr("y1", i => 66 + Math.floor(i / 14) * 18).attr("y2", i => 78 + Math.floor(i / 14) * 18)
      .attr("stroke", "#4598d5").attr("stroke-width", 1.8).attr("stroke-linecap", "round");
    const salpicaduras = lluvia.selectAll<SVGEllipseElement, number>("ellipse").data(Array.from({ length: 7 }, (_, i) => i)).join("ellipse")
      .attr("cx", i => 47 + i * 17).attr("cy", 116).attr("rx", 3).attr("ry", 1)
      .attr("fill", "none").attr("stroke", "#65b6e7").attr("stroke-width", 1.2);
    const rayo = lienzo.selectAll<SVGPathElement, null>("path.relampago").data([null]).join("path").attr("class", "relampago")
      .attr("d", "M101 71L91 91H100L93 106L116 84H105L112 71Z").attr("fill", "#ffcc53").attr("opacity", 0);
    const viento = lienzo.selectAll<SVGGElement, null>("g.viento").data([null]).join("g").attr("class", "viento").attr("opacity", 0);
    viento.selectAll<SVGPathElement, string>("path").data(["M32 94h27q8 0 8-5", "M117 99h25q7 0 7-5", "M60 107h30"])
      .join("path").attr("d", d => d).attr("fill", "none").attr("stroke", "#90a9c3")
      .attr("stroke-width", 2).attr("stroke-linecap", "round");

    const posiciones = clima === "despejado"
      ? [{ x: 21, y: 60, s: 0.61 }, { x: 126, y: 68, s: 0.5 }, { x: 56, y: 75, s: 0.62 }]
      : clima === "abriendo"
        ? [{ x: 20, y: 34, s: 0.72 }, { x: 117, y: 51, s: 0.61 }, { x: 44, y: 53, s: 0.85 }]
        : [{ x: 35, y: 24, s: 0.75 }, { x: 94, y: 30, s: 0.72 }, { x: 49, y: 39, s: 1 }];
    const nubes = lienzo.selectAll<SVGGElement, typeof posiciones[number]>("g.nube").data(posiciones)
      .join(entrar => entrar.append("g").attr("transform", d => `translate(${d.x},${d.y}) scale(${d.s})`))
      .attr("class", "nube");
    nubes.transition("clima").duration(duracion).ease(easeCubicInOut)
      .attr("transform", d => `translate(${d.x},${d.y}) scale(${d.s})`);
    const flotantes = nubes.selectAll<SVGGElement, number>("g.flota").data((_, i) => [i]).join("g").attr("class", "flota");
    flotantes.selectAll("path.silueta").data([null]).join("path").attr("class", "silueta")
      .attr("d", NUBE).attr("fill", `url(#${id}-nubes)`)
      .attr("stroke", clima === "despejado" ? "#c6e0ef" : "none").attr("stroke-width", 0.8);
    flotantes.selectAll("path.reflejo").data([null]).join("path").attr("class", "reflejo")
      .attr("d", "M24 15C29 5 43 3 52 11").attr("fill", "none").attr("stroke", "white")
      .attr("stroke-width", 2).attr("stroke-linecap", "round").attr("opacity", 0.18);

    // Animación solicitada explícitamente, con pausa manual y sin trabajar fuera de pantalla.
    let visible = true;
    let reloj: ReturnType<typeof timer> | undefined;
    const detener = () => { reloj?.stop(); reloj = undefined; };
    const actualizar = () => {
      detener();
      if (!animando || !visible || document.hidden) {
        flotantes.attr("transform", "translate(0,0)");
        viento.attr("opacity", 0);
        rayo.attr("opacity", 0);
        return;
      }
      let ultimoFotograma = -Infinity;
      reloj = timer(t => {
        if (t - ultimoFotograma < 30) return;
        ultimoFotograma = t;
        const oscuro = clima === "tormenta" || clima === "nublado";
        flotantes.attr("transform", i => `translate(${Math.sin(t / (oscuro ? 570 : 1050) + i * 1.8) * (oscuro ? 11 : 7)},${Math.cos(t / 850 + i) * 4}) rotate(${Math.sin(t / 1100 + i) * 2},53,24)`);
        if (colores.sol > 0) {
          rayos.attr("transform", `rotate(${t / 24}) scale(${1 + Math.sin(t / 450) * 0.08})`);
          aura.attr("r", 33 + Math.sin(t / 650) * 5).attr("opacity", 0.2 + Math.sin(t / 650) * 0.07);
        }
        if (clima === "nublado") {
          viento.attr("transform", `translate(${Math.sin(t / 700) * 13},0)`).attr("opacity", 0.35 + Math.sin(t / 700) * 0.25);
        }
        if (clima === "tormenta") {
          gotas.attr("y1", i => 58 + ((t * 0.22 + i * 17) % 66))
            .attr("y2", i => 70 + ((t * 0.22 + i * 17) % 66));
          salpicaduras.attr("rx", i => 1 + ((t + i * 170) % 800) / 110)
            .attr("ry", i => 0.5 + ((t + i * 170) % 800) / 500)
            .attr("opacity", i => 1 - ((t + i * 170) % 800) / 800);
          const fase = t % 5200;
          rayo.attr("opacity", fase > 1800 && fase < 2500 ? Math.sin((fase - 1800) / 700 * Math.PI) * 0.9 : 0);
        }
      });
    };
    const observador = typeof IntersectionObserver === "undefined" ? undefined : new IntersectionObserver(([entrada]) => {
      visible = entrada.isIntersecting;
      actualizar();
    });
    observador?.observe(nodo.ownerSVGElement!);
    document.addEventListener("visibilitychange", actualizar);
    actualizar();
    return () => {
      detener();
      observador?.disconnect();
      document.removeEventListener("visibilitychange", actualizar);
      lienzo.selectAll("*").interrupt("clima");
    };
  }, [clima, id, animando]);

  return (
    <div style={{ position: "relative", width: "clamp(104px, 25vw, 148px)", flexShrink: 0 }}>
      <svg viewBox="0 0 200 128" width="132" height="85" role="img"
      aria-label={`Avance de tus pasos: ${DESCRIPCIONES[clima]}`} data-clima={clima}
      style={{ display: "block", width: "100%", height: "auto" }}
    >
      <title>{DESCRIPCIONES[clima]}</title>
      <g ref={elemento} aria-hidden="true" />
      </svg>
      <button type="button" onClick={() => setAnimando(a => !a)}
        aria-label={animando ? "Pausar animación del clima" : "Reproducir animación del clima"}
        title={animando ? "Pausar animación" : "Reproducir animación"}
        style={{ position: "absolute", right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: "50%", border: "1px solid #dfe9f0", background: "#ffffffdd", color: "#1464a5", cursor: "pointer" }}>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          {animando ? <path d="M3 2V10M8 2V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /> : <path d="M3 1.5 10 6 3 10.5Z" fill="currentColor" />}
        </svg>
      </button>
    </div>
  );
}
