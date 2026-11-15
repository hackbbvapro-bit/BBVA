"use client";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { area, easeCubicInOut, line, pointer, scaleLinear, select } from "d3";
import "d3-transition";
import {
  episodiosEnRojo, esSemanal, formatoCorto, formatoLargo, formatoSoles, puntosDelGrafico, semanasDelGrafico,
  type Horizonte, type Proyeccion,
} from "@/motor";

const MANO_ABIERTA = "M8 11V3.5a1.5 1.5 0 0 1 3 0v5l1-.5a1.7 1.7 0 0 1 1.8.2l.4.3a1.7 1.7 0 0 1 1.8.1l.5.4a1.7 1.7 0 0 1 1.8 1.7v4.2c0 3-2 5.1-4.8 5.1h-1.3c-1.8 0-3.2-.8-4.2-2.3l-3.2-4.6a1.6 1.6 0 0 1 2.4-2.1L8 13";
const MANO_PULSANDO = "M8 11V6.5a1.5 1.5 0 0 1 3 0v2l1-.5a1.7 1.7 0 0 1 1.8.2l.4.3a1.7 1.7 0 0 1 1.8.1l.5.4a1.7 1.7 0 0 1 1.8 1.7v4.2c0 3-2 5.1-4.8 5.1h-1.3c-1.8 0-3.2-.8-4.2-2.3l-3.2-4.6a1.6 1.6 0 0 1 2.4-2.1L8 13";

/** Márgenes del área de dibujo: a la izquierda los montos, arriba el monto elegido y abajo su fecha. */
const M = { izq: 58, der: 12, arr: 34, aba: 26 };
/** Media anchura reservada para el rótulo del punto elegido (monto arriba, fecha abajo). */
const MEDIA_ETIQUETA = 62;
/** Separación mínima (px) entre dos montos del eje vertical para que no se monten. */
const SEPARACION_EJE = 20;

/** Monto redondeado a soles enteros, solo para rotular el eje (el valor exacto sale arriba al elegir un punto). */
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
  const semanal = esSemanal(h);
  const puntos = useMemo(() => puntosDelGrafico(serie.dias, h), [serie, h]);
  const semanas = useMemo(() => (semanal ? semanasDelGrafico(serie.dias) : []), [serie, semanal]);
  // Diario: el punto pedido tal cual. Semanal: la semana que contiene el día pedido (su punto es el cierre).
  const pedido = Math.max(0, serie.dias.findIndex(d => d.fecha === (seleccion ?? serie.deficit?.fecha ?? serie.fechaSaldoMinimo)));
  const posicion = Math.max(0, semanal
    ? (pedido === 0 ? 0 : puntos.findIndex(p => p >= pedido))
    : puntos.indexOf(pedido));
  const indice = puntos[posicion] ?? 0;
  const dia = serie.dias[indice];
  const semana = semanas.find(s => s.indice === indice && indice > 0);

  const g = useMemo(() => {
    const valores = [...base.dias, ...(despues?.dias ?? []), ...(siPagan ?? [])].map(d => d.saldo);
    const minimo = Math.min(0, ...valores), maximo = Math.max(0, ...valores);
    const margen = Math.max((maximo - minimo) * 0.08, 100);
    const x = scaleLinear().domain([0, Math.max(base.dias.length - 1, 1)]).range([M.izq, ancho - M.der]);
    const y = scaleLinear().domain([minimo - margen, maximo + margen]).range([alto - M.aba, M.arr]);
    // Las líneas pasan solo por los puntos visibles: en semanal, hoy y el cierre de cada semana (el acumulado).
    const linea = (arr: readonly { saldo: number }[]) =>
      line<number>().x(i => x(i)).y(i => y(arr[i].saldo))(puntos.filter(i => i < arr.length)) ?? "";
    const superficie = area<number>().x(i => x(i)).y0(y(0)).y1(i => y(serie.dias[i].saldo))(puntos) ?? "";
    // Montos del eje: el cero siempre; el máximo y el mínimo solo si no chocan con otro rótulo.
    const eje: number[] = [0];
    for (const v of [maximo, minimo]) {
      if (v !== 0 && eje.every(o => Math.abs(y(v) - y(o)) >= SEPARACION_EJE)) eje.push(v);
    }
    return { x, y, linea, superficie, eje };
  }, [base, despues, siPagan, serie, puntos, ancho, alto]);

  // Alertas: una por cada caída a rojo. Diario: en el primer día en rojo. Semanal: en lo más bajo de la semana
  // donde empieza la caída, para que se vea dónde cae aunque la semana cierre en positivo.
  const alertas = useMemo(() => {
    if (!semanal) return episodiosEnRojo(serie.dias).map(i => ({ clave: serie.dias[i].fecha, i, saldo: serie.dias[i].saldo }));
    return semanas.filter(s => s.alerta).map(s => ({
      clave: s.desde, i: serie.dias.findIndex(d => d.fecha === s.fechaMinimo), saldo: s.saldoMinimo,
    }));
  }, [semanal, semanas, serie]);

  // Caídas que el punto semanal no deja ver: semanas con alerta, o que cierran en positivo pero tocaron rojo.
  // Se marcan con una línea punteada desde donde pasa la línea ese día hasta lo más bajo. Las semanas que siguen
  // en rojo sin caída nueva no llevan marca: la línea ya va por la zona roja.
  const caidas = useMemo(() => semanas
    .filter(s => s.saldoMinimo < 0 && (s.alerta || s.saldo >= 0))
    .map(s => {
      const i = serie.dias.findIndex(d => d.fecha === s.fechaMinimo);
      const antes = [...puntos].reverse().find(p => p <= i) ?? 0;
      const despuesP = puntos.find(p => p >= i) ?? antes;
      const t = despuesP === antes ? 0 : (i - antes) / (despuesP - antes);
      const enLinea = serie.dias[antes].saldo + t * (serie.dias[despuesP].saldo - serie.dias[antes].saldo);
      return { clave: s.desde, i, desde: enLinea, hasta: s.saldoMinimo, alerta: s.alerta };
    })
    .filter(c => c.hasta < c.desde), [semanas, serie, puntos]);

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
  const radio = puntos.length <= 8 ? 3.5 : puntos.length <= 31 ? 2.6 : 3;
  const color = (saldo: number) => (saldo < 0 ? "var(--color-coral-fuerte)" : "var(--color-agua-fuerte)");
  const piso = alto - M.aba;
  const etiquetaX = Math.max(M.izq + MEDIA_ETIQUETA - 8, Math.min(ancho - M.der - MEDIA_ETIQUETA + 8, g.x(indice)));
  const fechaEtiqueta = semana
    ? `${formatoCorto(semana.desde)} – ${formatoCorto(semana.hasta)}`
    : `${formatoCorto(dia.fecha)} ${dia.fecha.slice(0, 4)}`;
  // En semanal el punto es el cierre; si por dentro bajó a rojo, se dice cuánto y cuándo.
  const caidaInterna = semana && semana.saldoMinimo < 0 && semana.saldoMinimo < semana.saldo ? semana : undefined;
  const textoAccesible = semana
    ? `Semana del ${formatoLargo(semana.desde)} al ${formatoLargo(semana.hasta)}: cierra con ${formatoSoles(semana.saldo)}${caidaInterna ? `; lo más bajo, ${formatoSoles(caidaInterna.saldoMinimo)} el ${formatoLargo(caidaInterna.fechaMinimo)}` : ""}`
    : `${formatoLargo(dia.fecha)}: ${formatoSoles(dia.saldo)}`;
  return (
    <div ref={caja} className="proyeccion-interactiva mt-3 w-full min-w-0">
      <svg className="block h-auto w-full select-none" viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label={descripcion}>
        <defs>
          <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-agua)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--color-agua)" stopOpacity="0.04" />
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
        <path d={g.superficie} fill={`url(#${id}-area)`} />
        <path d={g.superficie} fill="var(--color-coral)" fillOpacity="0.16" clipPath={`url(#${id}-negativo)`} />
        <path d={g.linea(base.dias)} fill="none" stroke="var(--color-noche)" strokeWidth="2.3" strokeOpacity={despues ? 0.3 : 1} strokeLinejoin="round" strokeLinecap="round" />
        {despues && <path d={g.linea(despues.dias)} fill="none" stroke="var(--color-electrico)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
        {siPagan && !despues && <path d={g.linea(siPagan)} fill="none" stroke="var(--color-verde-fuerte)" strokeWidth="2.5" strokeDasharray="1 6" strokeLinecap="round" />}
        <g aria-hidden="true" pointerEvents="none">
          {caidas.map(c => (
            <g key={`caida-${c.clave}`}>
              <path d={`M${g.x(c.i)},${g.y(c.desde)}V${g.y(c.hasta)}`} stroke="var(--color-coral-fuerte)" strokeWidth="1.5" strokeDasharray="2 3" />
              {!c.alerta && <circle cx={g.x(c.i)} cy={g.y(c.hasta)} r="2.6" fill="var(--color-coral-fuerte)" stroke={fondo} strokeWidth="1" />}
            </g>
          ))}
        </g>
        <path d={`M${g.x(indice)},${M.arr - 4}V${piso}`} stroke="var(--color-agua-fuerte)" strokeDasharray="3 4" strokeOpacity={seleccion ? 0.55 : 0.35} />
        <g aria-hidden="true" pointerEvents="none">
          {puntos.map(i => i !== indice && (
            <circle key={serie.dias[i].fecha} cx={g.x(i)} cy={g.y(serie.dias[i].saldo)} r={radio} fill={color(serie.dias[i].saldo)} stroke={fondo} strokeWidth="1.5" />
          ))}
        </g>
        <g pointerEvents="none" aria-hidden="true">
          <circle cx={g.x(indice)} cy={g.y(dia.saldo)} r="9" fill={color(dia.saldo)} fillOpacity="0.16" />
          <circle cx={g.x(indice)} cy={g.y(dia.saldo)} r="5" fill={color(dia.saldo)} stroke={fondo} strokeWidth="2" />
        </g>
        {alertas.map(a => (
          <g key={`alerta-${a.clave}`} className="grafico-alerta" pointerEvents="none" aria-hidden="true" transform={`translate(${g.x(a.i)},${g.y(a.saldo)})`}>
            <circle r="7" fill="var(--color-coral-fuerte)" stroke={fondo} strokeWidth="1.5" />
            <line x1="0" y1="-3" x2="0" y2="1" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <circle cy="3" r="0.8" fill="white" />
          </g>
        ))}
        {mostrarMano && (
          <g pointerEvents="none" aria-hidden="true" transform={`translate(${g.x(0)},${g.y(serie.dias[0].saldo)})`}>
            <circle className="proyeccion-toque" r="8" fill="none" stroke="var(--color-agua-fuerte)" strokeWidth="1.5" />
            <g transform="translate(-9,-2)">
              <path ref={mano} d={MANO_ABIERTA} fill="white" stroke="var(--color-agua-fuerte)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </g>
        )}
        <g pointerEvents="none" aria-hidden="true">
          <text x={etiquetaX} y="13" textAnchor="middle" fill={dia.saldo < 0 ? "var(--color-coral-fuerte)" : "var(--color-verde-fuerte)"} fontSize="13" fontWeight="700" style={{ fontVariantNumeric: "tabular-nums" }}>{formatoSoles(dia.saldo)}</text>
          {caidaInterna && (
            <text x={etiquetaX} y="26" textAnchor="middle" fill="var(--color-coral-fuerte)" fontSize="10" fontWeight="600" style={{ fontVariantNumeric: "tabular-nums" }}>
              mín. {formatoSoles(caidaInterna.saldoMinimo)} el {formatoCorto(caidaInterna.fechaMinimo)}
            </text>
          )}
          <text x={etiquetaX} y={alto - 7} textAnchor="middle" fill="var(--color-noche)" fontSize="11" fontWeight="700">{fechaEtiqueta}</text>
        </g>
        <rect ref={capaToque} x={M.izq - 8} y="0" width={ancho - M.izq + 8} height={piso + 6} fill="transparent" style={{ touchAction: "pan-y", cursor: "pointer" }} />
      </svg>
      <input className="sr-only focus:not-sr-only focus:w-full" type="range" min="0" max={Math.max(0, puntos.length - 1)} step="1" value={posicion}
        aria-label={semanal ? "Semana de la proyección" : "Día de la proyección"} aria-valuetext={textoAccesible}
        onChange={e => { registrarActividad(true); setSeleccion(serie.dias[puntos[Number(e.target.value)]].fecha); }} />
      <span className="sr-only" aria-live="polite">{seleccion && textoAccesible}</span>
    </div>
  );
}
