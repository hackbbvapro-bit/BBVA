"use client";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { area, easeCubicInOut, line, pointer, scaleLinear, select } from "d3";
import "d3-transition";
import {
  formatoCorto, formatoLargo, formatoSoles, marcasDelEje, puntosDelGrafico,
  type Horizonte, type Proyeccion,
} from "@/motor";

const MANO_ABIERTA = "M8 11V3.5a1.5 1.5 0 0 1 3 0v5l1-.5a1.7 1.7 0 0 1 1.8.2l.4.3a1.7 1.7 0 0 1 1.8.1l.5.4a1.7 1.7 0 0 1 1.8 1.7v4.2c0 3-2 5.1-4.8 5.1h-1.3c-1.8 0-3.2-.8-4.2-2.3l-3.2-4.6a1.6 1.6 0 0 1 2.4-2.1L8 13";
const MANO_PULSANDO = "M8 11V6.5a1.5 1.5 0 0 1 3 0v2l1-.5a1.7 1.7 0 0 1 1.8.2l.4.3a1.7 1.7 0 0 1 1.8.1l.5.4a1.7 1.7 0 0 1 1.8 1.7v4.2c0 3-2 5.1-4.8 5.1h-1.3c-1.8 0-3.2-.8-4.2-2.3l-3.2-4.6a1.6 1.6 0 0 1 2.4-2.1L8 13";

/** Márgenes del área de dibujo: a la izquierda los montos, abajo las fechas, arriba aire para la burbuja. */
const M = { izq: 58, der: 12, arr: 14, aba: 30 };
/** Separación mínima (px) entre dos montos del eje vertical para que no se monten. */
const SEPARACION_EJE = 20;

/** Monto redondeado a soles enteros, solo para rotular el eje (el valor exacto sale en la burbuja). */
const rotulo = (centimos: number) => formatoSoles(Math.round(centimos / 100) * 100, { sinDecimales: true });

/** Sin horizonte explícito se deduce del largo: más de 31 días se dibuja por semanas. */
const horizonteDe = (dias: number): Horizonte => (dias > 31 ? "2m" : "mes");

/** Ancho real del contenedor en píxeles: el gráfico se dibuja a su tamaño, sin estirar letras ni líneas. */
function useAncho(fijo: number | undefined) {
  const caja = useRef<HTMLDivElement>(null);
  const [medido, setMedido] = useState<number | null>(null);
  useEffect(() => {
    if (fijo !== undefined || !caja.current || typeof ResizeObserver === "undefined") return;
    const nodo = caja.current;
    const medir = () => { const w = Math.round(nodo.clientWidth); if (w > 0) setMedido(w); };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(nodo);
    return () => observador.disconnect();
  }, [fijo]);
  return { caja, ancho: fijo ?? medido ?? 350 };
}

export function Grafico({ base, despues, siPagan, descripcion, ancho: anchoFijo, fondo = "white", horizonte }: {
  base: Proyeccion;
  despues?: Proyeccion;
  siPagan?: { saldo: number }[];
  descripcion: string;
  /** Ancho fijo en px; si falta, el gráfico ocupa el ancho de su contenedor. */
  ancho?: number;
  fondo?: string;
  horizonte?: Horizonte;
}) {
  const id = useId().replace(/:/g, "");
  const { caja, ancho } = useAncho(anchoFijo);
  const alto = ancho < 480 ? 236 : 272;
  const capaToque = useRef<SVGRectElement>(null);
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
  const h = horizonte ?? horizonteDe(serie.dias.length);
  const puntos = useMemo(() => puntosDelGrafico(serie.dias, h), [serie, h]);
  const marcas = useMemo(() => marcasDelEje(serie.dias, puntos, ancho < 480 ? 4 : 6), [serie, puntos, ancho]);
  // La selección siempre cae en un punto visible: el más cercano al día pedido.
  const pedido = Math.max(0, serie.dias.findIndex(d => d.fecha === (seleccion ?? serie.deficit?.fecha ?? serie.fechaSaldoMinimo)));
  const posicion = puntos.length ? puntos.reduce((mejor, p, j) => (Math.abs(p - pedido) < Math.abs(puntos[mejor] - pedido) ? j : mejor), 0) : 0;
  const indice = puntos[posicion] ?? 0;
  const dia = serie.dias[indice];

  const g = useMemo(() => {
    const valores = [...base.dias, ...(despues?.dias ?? []), ...(siPagan ?? [])].map(d => d.saldo);
    const minimo = Math.min(0, ...valores), maximo = Math.max(0, ...valores);
    const margen = Math.max((maximo - minimo) * 0.1, 100);
    const x = scaleLinear().domain([0, Math.max(base.dias.length - 1, 1)]).range([M.izq, ancho - M.der]);
    const y = scaleLinear().domain([minimo - margen, maximo + margen]).range([alto - M.aba, M.arr]);
    const linea = line<{ saldo: number }>().x((_, i) => x(i)).y(d => y(d.saldo));
    const superficie = area<{ saldo: number }>().x((_, i) => x(i)).y0(y(0)).y1(d => y(d.saldo));
    // Montos del eje: el cero siempre; el máximo y el mínimo solo si no chocan con otro rótulo.
    const eje: number[] = [0];
    for (const v of [maximo, minimo]) {
      if (v !== 0 && eje.every(o => Math.abs(y(v) - y(o)) >= SEPARACION_EJE)) eje.push(v);
    }
    return { x, y, linea, superficie, eje };
  }, [base, despues, siPagan, ancho, alto]);

  useEffect(() => {
    const nodo = capaToque.current;
    if (!nodo || !puntos.length) return;
    const elegir = (evento: PointerEvent) => {
      if (!nodo.ownerSVGElement) return;
      const [px] = pointer(evento, nodo.ownerSVGElement);
      const dia = g.x.invert(px);
      const cercano = puntos.reduce((mejor, p) => (Math.abs(p - dia) < Math.abs(mejor - dia) ? p : mejor), puntos[0]);
      setSeleccion(serie.dias[cercano].fecha);
    };
    const capa = select(nodo);
    capa
      .on("pointerdown.explorar", (evento: PointerEvent) => { registrarActividad(true); elegir(evento); })
      .on("pointermove.explorar", (evento: PointerEvent) => {
        if (evento.pointerType === "mouse" || evento.buttons === 1) { registrarActividad(false); elegir(evento); }
      });
    return () => { capa.on(".explorar", null); };
  }, [serie, g, puntos, registrarActividad]);

  if (!dia) return <p className="mt-4 text-sm text-gris">No hay días para proyectar todavía.</p>;
  const indiceAlerta = serie.dias.findIndex(d => d.saldo < 0);
  const radio = puntos.length <= 8 ? 3.5 : puntos.length <= 31 ? 2.6 : 3;
  const color = (saldo: number) => (saldo < 0 ? "var(--color-coral-fuerte)" : "var(--color-agua-fuerte)");
  const piso = alto - M.aba;
  return (
    <div ref={caja} className="proyeccion-interactiva mt-3 w-full min-w-0">
      <svg className="block h-auto w-full select-none" viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label={descripcion}>
        <defs>
          <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-agua)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--color-agua)" stopOpacity="0.03" />
          </linearGradient>
          <clipPath id={`${id}-negativo`}>
            <rect x={M.izq} y={g.y(0)} width={ancho - M.izq - M.der} height={Math.max(0, piso - g.y(0))} />
          </clipPath>
        </defs>
        {g.eje.map(valor => (
          <g key={valor}>
            <path d={`M${M.izq},${g.y(valor)}H${ancho - M.der}`} stroke="var(--color-linea-fuerte)" strokeDasharray={valor === 0 ? "4 4" : undefined} strokeOpacity={valor === 0 ? 0.9 : 0.5} />
            <text x={M.izq - 8} y={g.y(valor)} dy="0.35em" textAnchor="end" fill="var(--color-gris)" fontSize="11" style={{ fontVariantNumeric: "tabular-nums" }}>{rotulo(valor)}</text>
          </g>
        ))}
        {marcas.map((m, j) => {
          const primero = j === 0;
          const ultimo = j === marcas.length - 1 && g.x(m) > ancho - M.der - 24;
          return (
            <text key={m} x={g.x(m)} y={alto - 9} textAnchor={primero ? "start" : ultimo ? "end" : "middle"} fill="var(--color-gris)" fontSize="11" fontWeight={primero ? 600 : 400}>
              {primero ? "Hoy" : formatoCorto(serie.dias[m].fecha)}
            </text>
          );
        })}
        <path d={g.superficie(serie.dias) ?? ""} fill={`url(#${id}-area)`} />
        <path d={g.superficie(serie.dias) ?? ""} fill="var(--color-coral)" fillOpacity="0.16" clipPath={`url(#${id}-negativo)`} />
        <path d={g.linea(base.dias) ?? ""} fill="none" stroke="var(--color-noche)" strokeWidth="2" strokeOpacity={despues ? 0.3 : 1} strokeLinejoin="round" strokeLinecap="round" />
        {despues && <path d={g.linea(despues.dias) ?? ""} fill="none" stroke="var(--color-electrico)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />}
        {siPagan && !despues && <path d={g.linea(siPagan) ?? ""} fill="none" stroke="var(--color-verde-fuerte)" strokeWidth="2.5" strokeDasharray="1 6" strokeLinecap="round" />}
        <path d={`M${g.x(indice)},${M.arr - 4}V${piso}`} stroke="var(--color-agua-fuerte)" strokeDasharray="3 4" strokeOpacity={seleccion ? 0.55 : 0.3} />
        <g aria-hidden="true" pointerEvents="none">
          {puntos.map(i => i !== indice && (
            <circle key={serie.dias[i].fecha} cx={g.x(i)} cy={g.y(serie.dias[i].saldo)} r={radio} fill={color(serie.dias[i].saldo)} stroke={fondo} strokeWidth="1.5" />
          ))}
        </g>
        {indiceAlerta >= 0 && indiceAlerta !== indice && (
          <g pointerEvents="none" aria-hidden="true" transform={`translate(${g.x(indiceAlerta)},${g.y(serie.dias[indiceAlerta].saldo)})`}>
            <circle r="7" fill="var(--color-coral-fuerte)" stroke={fondo} strokeWidth="1.5" />
            <line x1="0" y1="-3" x2="0" y2="1" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <circle cy="3" r="0.8" fill="white" />
          </g>
        )}
        <g pointerEvents="none" aria-hidden="true">
          <circle cx={g.x(indice)} cy={g.y(dia.saldo)} r="9" fill={color(dia.saldo)} fillOpacity="0.16" />
          <circle cx={g.x(indice)} cy={g.y(dia.saldo)} r="5" fill={color(dia.saldo)} stroke={fondo} strokeWidth="2" />
        </g>
        {mostrarMano && (
          <g pointerEvents="none" aria-hidden="true" transform={`translate(${g.x(0)},${g.y(serie.dias[0].saldo)})`}>
            <circle className="proyeccion-toque" r="8" fill="none" stroke="var(--color-agua-fuerte)" strokeWidth="1.5" />
            <g transform="translate(-9,-2)">
              <path ref={mano} d={MANO_ABIERTA} fill="white" stroke="var(--color-agua-fuerte)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </g>
        )}
        <Burbuja x={g.x(indice)} y={g.y(dia.saldo)} fecha={formatoCorto(dia.fecha)} monto={formatoSoles(dia.saldo)} negativo={dia.saldo < 0}
          limites={{ izq: M.izq, der: ancho - M.der, arr: 2, aba: piso }} />
        <rect ref={capaToque} x={M.izq - 8} y="0" width={ancho - M.izq + 8} height={piso + 6} fill="transparent" style={{ touchAction: "pan-y", cursor: "pointer" }} />
      </svg>
      <input className="sr-only focus:not-sr-only focus:w-full" type="range" min="0" max={Math.max(0, puntos.length - 1)} step="1" value={posicion}
        aria-label="Día de la proyección" aria-valuetext={`${formatoLargo(dia.fecha)}: ${formatoSoles(dia.saldo)}`}
        onChange={e => { registrarActividad(true); setSeleccion(serie.dias[puntos[Number(e.target.value)]].fecha); }} />
      <span className="sr-only" aria-live="polite">{seleccion && `${formatoLargo(dia.fecha)}: ${formatoSoles(dia.saldo)}`}</span>
    </div>
  );
}

/** Burbuja con fecha y monto del día elegido; siempre dentro del área de dibujo (arriba del punto si cabe). */
function Burbuja({ x, y, fecha, monto, negativo, limites }: {
  x: number; y: number; fecha: string; monto: string; negativo: boolean;
  limites: { izq: number; der: number; arr: number; aba: number };
}) {
  const ancho = Math.round(Math.max(fecha.length * 6.2, monto.length * 7.4) + 20);
  const alto = 38;
  const bx = Math.max(limites.izq, Math.min(limites.der - ancho, x - ancho / 2));
  const arriba = y - 14 - alto >= limites.arr;
  const by = arriba ? y - 14 - alto : Math.min(limites.aba - alto, y + 14);
  return (
    <g pointerEvents="none" transform={`translate(${bx},${by})`}>
      <rect width={ancho} height={alto} rx="9" fill="white" stroke="var(--color-linea-fuerte)" style={{ filter: "drop-shadow(0 2px 6px rgb(7 33 70 / 0.12))" }} />
      <text x={ancho / 2} y="15" textAnchor="middle" fill="var(--color-gris)" fontSize="10.5" fontWeight="600">{fecha}</text>
      <text x={ancho / 2} y="30" textAnchor="middle" fill={negativo ? "var(--color-coral-fuerte)" : "var(--color-noche)"} fontSize="13" fontWeight="700" style={{ fontVariantNumeric: "tabular-nums" }}>{monto}</text>
    </g>
  );
}
