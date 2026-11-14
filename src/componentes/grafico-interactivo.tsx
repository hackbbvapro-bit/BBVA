"use client";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { area, easeCubicInOut, line, pointer, scaleLinear, select } from "d3";
import "d3-transition";
import { formatoCorto, formatoLargo, formatoSoles, type DiaProyectado, type Proyeccion } from "@/motor";

const MANO_ABIERTA = "M8 11V3.5a1.5 1.5 0 0 1 3 0v5l1-.5a1.7 1.7 0 0 1 1.8.2l.4.3a1.7 1.7 0 0 1 1.8.1l.5.4a1.7 1.7 0 0 1 1.8 1.7v4.2c0 3-2 5.1-4.8 5.1h-1.3c-1.8 0-3.2-.8-4.2-2.3l-3.2-4.6a1.6 1.6 0 0 1 2.4-2.1L8 13";
const MANO_PULSANDO = "M8 11V6.5a1.5 1.5 0 0 1 3 0v2l1-.5a1.7 1.7 0 0 1 1.8.2l.4.3a1.7 1.7 0 0 1 1.8.1l.5.4a1.7 1.7 0 0 1 1.8 1.7v4.2c0 3-2 5.1-4.8 5.1h-1.3c-1.8 0-3.2-.8-4.2-2.3l-3.2-4.6a1.6 1.6 0 0 1 2.4-2.1L8 13";

export function Grafico({ base, despues, siPagan, descripcion, ancho = 350, fondo = "white" }: {
  base: Proyeccion;
  despues?: Proyeccion;
  siPagan?: { saldo: number }[];
  descripcion: string;
  ancho?: number;
  fondo?: string;
}) {
  const id = useId().replace(/:/g, "");
  const puntos = useRef<SVGGElement>(null);
  const mano = useRef<SVGPathElement>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mostrarMano, setMostrarMano] = useState(true);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const registrarActividad = useCallback((ocultar: boolean) => {
    if (!ocultar && espera.current === null) return;
    if (ocultar) setMostrarMano(false);
    if (espera.current !== null) clearTimeout(espera.current);
    espera.current = setTimeout(() => {
      espera.current = null;
      setMostrarMano(true);
    }, 2000);
  }, []);
  useEffect(() => () => {
    if (espera.current !== null) clearTimeout(espera.current);
  }, []);
  useEffect(() => {
    if (!mostrarMano || !mano.current) return;
    const elemento = select(mano.current);
    let activa = true;
    const pulsar = () => {
      if (!activa) return;
      elemento.attr("d", MANO_ABIERTA)
        .transition("pulsar").duration(300).ease(easeCubicInOut)
        .attr("d", MANO_PULSANDO)
        .transition().duration(160)
        .attr("d", MANO_PULSANDO)
        .transition().duration(450).ease(easeCubicInOut)
        .attr("d", MANO_ABIERTA)
        .on("end", pulsar);
    };
    pulsar();
    return () => { activa = false; elemento.interrupt("pulsar"); };
  }, [mostrarMano]);
  const serie = despues ?? base;
  const indice = Math.max(0, serie.dias.findIndex(d => d.fecha === (seleccion ?? serie.deficit?.fecha ?? serie.fechaSaldoMinimo)));
  const dia = serie.dias[indice];
  const g = useMemo(() => {
    const valores = [...base.dias, ...(despues?.dias ?? []), ...(siPagan ?? [])].map(d => d.saldo);
    const minimo = Math.min(0, ...valores), maximo = Math.max(0, ...valores);
    const margen = Math.max((maximo - minimo) * 0.12, 100);
    const x = scaleLinear().domain([0, Math.max(base.dias.length - 1, 1)]).range([72, ancho - 14]);
    const y = scaleLinear().domain([minimo - margen, maximo + margen]).range([194, 18]);
    const linea = line<{ saldo: number }>().x((_, i) => x(i)).y(d => y(d.saldo));
    const superficie = area<{ saldo: number }>().x((_, i) => x(i)).y0(y(0)).y1(d => y(d.saldo));
    return { x, y, linea, superficie, minimo, maximo };
  }, [base, despues, siPagan, ancho]);

  useEffect(() => {
    const nodo = puntos.current;
    if (!nodo || !serie.dias.length) return;
    const capa = select(nodo);
    capa.selectAll("*").remove();
    const elegir = (evento: PointerEvent) => {
      if (!nodo.ownerSVGElement) return;
      const [px] = pointer(evento, nodo.ownerSVGElement);
      const i = Math.max(0, Math.min(serie.dias.length - 1, Math.round(g.x.invert(px))));
      setSeleccion(serie.dias[i].fecha);
    };
    capa.append("rect").attr("x", 64).attr("y", 8).attr("width", ancho - 64).attr("height", 200)
      .attr("fill", "transparent").style("touch-action", "pan-y").style("cursor", "pointer")
      .on("pointerdown.explorar", (evento: PointerEvent) => {
        registrarActividad(true);
        elegir(evento);
      })
      .on("pointermove.explorar", (evento: PointerEvent) => {
        if (evento.pointerType === "mouse" || evento.buttons === 1) {
          registrarActividad(false);
          elegir(evento);
        }
      });
    capa.selectAll<SVGCircleElement, DiaProyectado>("circle").data(serie.dias, d => d.fecha).join("circle")
      .attr("cx", (_, i) => g.x(i)).attr("cy", d => g.y(d.saldo))
      .attr("r", (_, i) => i === indice ? 5 : 3)
      .attr("fill", d => d.saldo < 0 ? "var(--color-coral-fuerte)" : "var(--color-agua-fuerte)")
      .attr("stroke", fondo).attr("stroke-width", 1.5).style("pointer-events", "none");
    return () => { capa.selectAll("*").remove(); };
  }, [serie, g, ancho, fondo, indice, registrarActividad]);

  if (!dia) return <p className="mt-4 text-sm text-gris">No hay días para proyectar todavía.</p>;
  const etiquetaX = Math.max(0, Math.min(ancho - 100, g.x(indice) - 50));
  const indiceAlerta = serie.dias.findIndex(d => d.saldo < 0);
  return (
    <div className="proyeccion-interactiva">
      <svg className="mt-3 h-auto w-full overflow-visible" viewBox={`0 0 ${ancho} 226`} role="img" aria-label={descripcion}>
        <defs>
          <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-agua)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--color-agua)" stopOpacity="0.04" />
          </linearGradient>
          <clipPath id={`${id}-negativo`}>
            <rect x="72" y={g.y(0)} width={ancho - 86} height={Math.max(0, 208 - g.y(0))} />
          </clipPath>
        </defs>
        {[...new Set([g.maximo, 0, g.minimo])].map(valor => (
          <g key={valor}>
            <path d={`M72,${g.y(valor)}H${ancho - 14}`} stroke="var(--color-linea-fuerte)" strokeDasharray={valor === 0 ? "4 4" : undefined} strokeOpacity="0.65" />
            <text x="0" y={g.y(valor) + 4} fill="var(--color-gris)" fontSize="11">{formatoSoles(valor, { sinDecimales: true })}</text>
          </g>
        ))}
        <path d={g.superficie(serie.dias) ?? ""} fill={`url(#${id}-area)`} />
        <path d={g.superficie(serie.dias) ?? ""} fill="var(--color-coral)" fillOpacity="0.16" clipPath={`url(#${id}-negativo)`} />
        <path d={g.linea(base.dias) ?? ""} fill="none" stroke="var(--color-noche)" strokeWidth="2.3" strokeOpacity={despues ? 0.3 : 1} strokeLinejoin="round" />
        {despues && <path d={g.linea(despues.dias) ?? ""} fill="none" stroke="var(--color-electrico)" strokeWidth="2.5" strokeLinejoin="round" />}
        {siPagan && !despues && <path d={g.linea(siPagan) ?? ""} fill="none" stroke="var(--color-verde-fuerte)" strokeWidth="2.5" strokeDasharray="1 6" strokeLinecap="round" />}
        {seleccion && <path d={`M${g.x(indice)},12V201`} stroke="var(--color-agua-fuerte)" strokeDasharray="3 4" strokeOpacity="0.45" />}
        <g ref={puntos} aria-hidden="true" />
        {mostrarMano && (
          <g pointerEvents="none" aria-hidden="true" transform={`translate(${g.x(0)},${g.y(serie.dias[0].saldo)})`}>
            <circle className="proyeccion-toque" r="8" fill="none" stroke="var(--color-agua-fuerte)" strokeWidth="1.5" />
            <g transform="translate(-9,-2)">
              <path ref={mano} d={MANO_ABIERTA} fill="white" stroke="var(--color-agua-fuerte)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </g>
        )}
        {indiceAlerta >= 0 && (
          <g pointerEvents="none" aria-hidden="true" transform={`translate(${g.x(indiceAlerta)},${g.y(serie.dias[indiceAlerta].saldo)})`}>
            <circle r="7" fill="var(--color-coral-fuerte)" stroke={fondo} strokeWidth="1.5" />
            <line x1="0" y1="-3" x2="0" y2="1" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <circle cy="3" r="0.8" fill="white" />
          </g>
        )}
        {seleccion && (
          <g pointerEvents="none" transform={`translate(${etiquetaX},0)`}>
            <text x="50" y="10" textAnchor="middle" fill={dia.saldo < 0 ? "var(--color-coral-fuerte)" : "var(--color-verde-fuerte)"} fontSize="12" fontWeight="700">{formatoSoles(dia.saldo)}</text>
            <text x="50" y="220" textAnchor="middle" fill="var(--color-noche)" fontSize="10" fontWeight="600">{formatoCorto(dia.fecha)} {dia.fecha.slice(0, 4)}</text>
          </g>
        )}
      </svg>
      <input className="sr-only focus:not-sr-only focus:w-full" type="range" min="0" max={Math.max(0, serie.dias.length - 1)} step="1" value={indice}
        aria-label="Día de la proyección" aria-valuetext={`${formatoLargo(dia.fecha)}: ${formatoSoles(dia.saldo)}`}
        onChange={e => { registrarActividad(true); setSeleccion(serie.dias[Number(e.target.value)].fecha); }} />
      <span className="sr-only" aria-live="polite">{seleccion && `${formatoLargo(dia.fecha)}: ${formatoSoles(dia.saldo)}`}</span>
    </div>
  );
}
