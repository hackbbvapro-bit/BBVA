"use client";
import { useState, type PointerEvent, type ReactNode } from "react";
import { formatoCorto, formatoLargo, formatoSoles } from "@/motor";
import type { PuntoSaldo, Semana } from "@/evaluacion/series";
import { unido } from "@/componentes/ui";

/**
 * Gráficos de «Datos de prueba». Solo dibujan: las series llegan calculadas (src/evaluacion/series.ts).
 * Colores de las series comprobados con el validador de paleta sobre fondo blanco (separación para
 * daltonismo y contraste). El texto nunca usa el color de la serie: va en los tonos de texto de la app.
 * Cada gráfico se dibuja en dos tamaños (celular y pantalla ancha) para que las letras no se encojan.
 */
const AZUL = "#1464a5";
const VERDE = "#1b9e5a";
const TINTA = "#070e46";
const GRIS = "#5b6670";
const LINEA = "#dfe9f0";
const NIEBLA = "#f3f5f7";

interface Lienzo {
  ancho: number;
  alto: number;
  izq: number;
  der: number;
  arr: number;
  aba: number;
  plotAncho: number;
  plotAlto: number;
}
function lienzo(ancho: number): Lienzo {
  const angosto = ancho < 420;
  const l = { ancho, alto: angosto ? 230 : 250, izq: angosto ? 56 : 66, der: 12, arr: 24, aba: 28 };
  return { ...l, plotAncho: l.ancho - l.izq - l.der, plotAlto: l.alto - l.arr - l.aba };
}
const ANCHO_CELULAR = 330;
const ANCHO_PANTALLA = 520;

/** El mismo gráfico en dos tamaños: se muestra el que corresponde al ancho de la pantalla. */
function EnDosTamanos({ dibujar }: { dibujar: (l: Lienzo) => ReactNode }) {
  return (
    <>
      <div className="sm:hidden">{dibujar(lienzo(ANCHO_CELULAR))}</div>
      <div className="hidden sm:block">{dibujar(lienzo(ANCHO_PANTALLA))}</div>
    </>
  );
}

/** Paso «redondo» (1, 2 o 5 por una potencia de diez) para unas cuatro marcas en el eje, en céntimos. */
function pasoRedondo(rango: number): number {
  const bruto = Math.max(rango, 100) / 4;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const base = bruto / potencia;
  return (base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10) * potencia;
}
function marcas(min: number, max: number): number[] {
  const paso = pasoRedondo(max - min);
  const salida: number[] = [];
  for (let v = Math.ceil(min / paso) * paso; v <= max + 1e-6; v += paso) salida.push(Math.round(v));
  return salida;
}
const enEje = (centimos: number) => unido(formatoSoles(Math.round(centimos / 100) * 100, { sinDecimales: true }));
const tabular = { fontVariantNumeric: "tabular-nums" } as const;

function Vacio() {
  return <p className="mt-4 text-sm text-gris">No hay datos en esas fechas.</p>;
}

/** Cuadro flotante con el detalle del punto o la semana bajo el cursor. */
function Flotante({ x, ancho, children }: { x: number; ancho: number; children: ReactNode }) {
  const aLaDerecha = x < ancho / 2;
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-1 z-10 w-max max-w-[14rem] rounded-xl border border-linea bg-white px-3 py-2 text-[13px] leading-snug text-tinta shadow-[0_6px_20px_-8px_rgb(7_14_70/0.35)]"
      style={aLaDerecha ? { left: `calc(${(x / ancho) * 100}% + 10px)` } : { right: `calc(${((ancho - x) / ancho) * 100}% + 10px)` }}
    >
      {children}
    </div>
  );
}

/** Posición horizontal del puntero dentro del dibujo, en unidades del viewBox. */
function xDelPuntero(e: PointerEvent<SVGSVGElement>, ancho: number): number {
  const caja = e.currentTarget.getBoundingClientRect();
  return ((e.clientX - caja.left) / caja.width) * ancho;
}

/* ---------- Saldo día a día ---------- */

export function GraficoSaldo({ puntos, corte }: { puntos: PuntoSaldo[]; corte: string }) {
  if (puntos.length < 2) return <Vacio />;
  return <EnDosTamanos dibujar={l => <Saldo puntos={puntos} corte={corte} l={l} />} />;
}

function Saldo({ puntos, corte, l }: { puntos: PuntoSaldo[]; corte: string; l: Lienzo }) {
  const [activo, setActivo] = useState<number | null>(null);
  const saldos = puntos.map(p => p.saldo);
  const masBajo = Math.min(...saldos);
  const ticks = marcas(Math.min(0, masBajo), Math.max(...saldos, 100));
  const tope = Math.max(...saldos, 100, ticks[ticks.length - 1] ?? 0);
  const piso = Math.min(0, masBajo, ticks[0] ?? 0);
  const x = (i: number) => l.izq + (i / (puntos.length - 1)) * l.plotAncho;
  const y = (v: number) => l.arr + (1 - (v - piso) / (tope - piso || 1)) * l.plotAlto;
  const trazo = (desde: number, hasta: number) => puntos.slice(desde, hasta + 1).map((p, k) => `${k === 0 ? "M" : "L"}${x(desde + k).toFixed(1)},${y(p.saldo).toFixed(1)}`).join(" ");

  const iCorte = puntos.findIndex(p => p.fecha === corte);
  // Último día que el copiloto ve dentro de lo que se está mostrando (-1 si el rango es solo de días siguientes).
  const ultimoVisto = iCorte !== -1 ? iCorte : puntos.filter(p => !p.futuro).length - 1;
  const hayFuturo = puntos.some(p => p.futuro);
  const finHistoria = Math.max(ultimoVisto, 0);
  const iMin = saldos.indexOf(masBajo);
  const etiquetasX = [0, Math.round((puntos.length - 1) / 2), puntos.length - 1];
  const p = activo === null ? null : puntos[activo];
  const indiceEn = (e: PointerEvent<SVGSVGElement>) =>
    Math.max(0, Math.min(puntos.length - 1, Math.round(((xDelPuntero(e, l.ancho) - l.izq) / l.plotAncho) * (puntos.length - 1))));
  const aLaIzquierda = finHistoria > puntos.length * 0.6;

  return (
    <div className="relative mt-3">
      <svg
        viewBox={`0 0 ${l.ancho} ${l.alto}`}
        className="block w-full touch-pan-y"
        role="img"
        aria-label={`Saldo día a día del ${formatoCorto(puntos[0].fecha)} al ${formatoCorto(puntos[puntos.length - 1].fecha)}. El punto más bajo fue ${formatoSoles(masBajo)} el ${formatoLargo(puntos[iMin].fecha)}.`}
        onPointerMove={e => setActivo(indiceEn(e))}
        onPointerDown={e => setActivo(indiceEn(e))}
        onPointerLeave={() => setActivo(null)}
      >
        {hayFuturo && finHistoria < puntos.length - 1 && (
          <>
            <rect x={x(finHistoria)} y={l.arr} width={x(puntos.length - 1) - x(finHistoria)} height={l.plotAlto} fill={NIEBLA} />
            <text x={x(puntos.length - 1)} y={l.arr - 8} textAnchor="end" fontSize="11" fill={GRIS}>
              El copiloto no ve estos días
            </text>
          </>
        )}
        {ticks.map(t => (
          <g key={t}>
            <line x1={l.izq} x2={l.ancho - l.der} y1={y(t)} y2={y(t)} stroke={t === 0 && masBajo < 0 ? GRIS : LINEA} strokeWidth="1" />
            <text x={l.izq - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={GRIS} style={tabular}>
              {enEje(t)}
            </text>
          </g>
        ))}
        {etiquetasX.map((i, k) => (
          <text key={i} x={x(i)} y={l.alto - 8} textAnchor={k === 0 ? "start" : k === etiquetasX.length - 1 ? "end" : "middle"} fontSize="11" fill={GRIS}>
            {formatoCorto(puntos[i].fecha)}
          </text>
        ))}
        {ultimoVisto >= 1 && (
          <>
            <path d={`${trazo(0, ultimoVisto)} L${x(ultimoVisto).toFixed(1)},${y(Math.max(piso, 0)).toFixed(1)} L${x(0).toFixed(1)},${y(Math.max(piso, 0)).toFixed(1)} Z`} fill={AZUL} opacity="0.1" />
            <path d={trazo(0, ultimoVisto)} fill="none" stroke={AZUL} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}
        {hayFuturo && finHistoria < puntos.length - 1 && (
          <path d={trazo(finHistoria, puntos.length - 1)} fill="none" stroke={AZUL} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="1 5" />
        )}
        {iCorte !== -1 && (
          <>
            <circle cx={x(iCorte)} cy={y(puntos[iCorte].saldo)} r="5" fill={AZUL} stroke="#ffffff" strokeWidth="2" />
            <text
              x={x(iCorte) + (aLaIzquierda ? -9 : 9)}
              y={Math.max(l.arr + 12, y(puntos[iCorte].saldo) - 10)}
              textAnchor={aLaIzquierda ? "end" : "start"}
              fontSize="12"
              fontWeight="600"
              fill={TINTA}
              stroke="#ffffff"
              strokeWidth="3"
              paintOrder="stroke"
              style={tabular}
            >
              Hoy: {unido(formatoSoles(puntos[iCorte].saldo))}
            </text>
          </>
        )}
        {p && activo !== null && (
          <>
            <line x1={x(activo)} x2={x(activo)} y1={l.arr} y2={l.arr + l.plotAlto} stroke={GRIS} strokeWidth="1" />
            <circle cx={x(activo)} cy={y(p.saldo)} r="5" fill={AZUL} stroke="#ffffff" strokeWidth="2" />
          </>
        )}
      </svg>
      {p && activo !== null && (
        <Flotante x={x(activo)} ancho={l.ancho}>
          <span className="block text-gris">{formatoLargo(p.fecha)}</span>
          <span className="block font-semibold tabular-nums text-noche">{unido(formatoSoles(p.saldo))}</span>
          {p.futuro && <span className="block text-gris">Día que el copiloto no ve</span>}
        </Flotante>
      )}
    </div>
  );
}

/* ---------- Entradas y salidas por semana ---------- */

/** Columna con la punta redondeada (4 px) y la base cuadrada, apoyada en la línea de cero. */
function columna(cx: number, ancho: number, arriba: number, base: number): string {
  const r = Math.min(4, ancho / 2, Math.max(0, base - arriba));
  return `M${cx},${base} L${cx},${arriba + r} Q${cx},${arriba} ${cx + r},${arriba} L${cx + ancho - r},${arriba} Q${cx + ancho},${arriba} ${cx + ancho},${arriba + r} L${cx + ancho},${base} Z`;
}

export function GraficoSemanas({ semanas }: { semanas: Semana[] }) {
  if (semanas.length === 0) return <Vacio />;
  return (
    <div className="mt-3">
      <ul className="mb-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-gris" aria-label="Leyenda">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ background: VERDE }} />
          Entra
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ background: AZUL }} />
          Sale
        </li>
      </ul>
      <EnDosTamanos dibujar={l => <Semanas semanas={semanas} l={l} />} />
    </div>
  );
}

function Semanas({ semanas, l }: { semanas: Semana[]; l: Lienzo }) {
  const [activa, setActiva] = useState<number | null>(null);
  const ticks = marcas(0, Math.max(100, ...semanas.flatMap(s => [s.entra, s.sale])));
  const tope = Math.max(100, ...semanas.flatMap(s => [s.entra, s.sale]), ticks[ticks.length - 1] ?? 0);
  const banda = l.plotAncho / semanas.length;
  const barra = Math.max(3, Math.min(14, (banda - 6) / 2));
  const y = (v: number) => l.arr + (1 - v / tope) * l.plotAlto;
  const base = y(0);
  const xBanda = (i: number) => l.izq + i * banda;
  const primeraFutura = semanas.findIndex(s => s.futuro);
  const cada = Math.max(1, Math.ceil(semanas.length / (l.ancho < 420 ? 4 : 6)));
  const s = activa === null ? null : semanas[activa];
  const semanaEn = (e: PointerEvent<SVGSVGElement>) => Math.max(0, Math.min(semanas.length - 1, Math.floor((xDelPuntero(e, l.ancho) - l.izq) / banda)));

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${l.ancho} ${l.alto}`}
        className="block w-full touch-pan-y"
        role="img"
        aria-label={`Entradas y salidas de la cuenta por semana, del ${formatoCorto(semanas[0].desde)} al ${formatoCorto(semanas[semanas.length - 1].hasta)}.`}
        onPointerMove={e => setActiva(semanaEn(e))}
        onPointerDown={e => setActiva(semanaEn(e))}
        onPointerLeave={() => setActiva(null)}
      >
        {primeraFutura > 0 && (
          <>
            <rect x={xBanda(primeraFutura)} y={l.arr} width={l.ancho - l.der - xBanda(primeraFutura)} height={l.plotAlto} fill={NIEBLA} />
            <text x={l.ancho - l.der} y={l.arr - 8} textAnchor="end" fontSize="11" fill={GRIS}>
              El copiloto no ve estas semanas
            </text>
          </>
        )}
        {activa !== null && <rect x={xBanda(activa)} y={l.arr} width={banda} height={l.plotAlto} fill={LINEA} opacity="0.6" />}
        {ticks.map(t => (
          <g key={t}>
            <line x1={l.izq} x2={l.ancho - l.der} y1={y(t)} y2={y(t)} stroke={LINEA} strokeWidth="1" />
            <text x={l.izq - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={GRIS} style={tabular}>
              {enEje(t)}
            </text>
          </g>
        ))}
        {semanas.map((w, i) => {
          const centro = xBanda(i) + banda / 2;
          return (
            <g key={w.desde}>
              {w.entra > 0 && <path d={columna(centro - barra - 1, barra, y(w.entra), base)} fill={VERDE} />}
              {w.sale > 0 && <path d={columna(centro + 1, barra, y(w.sale), base)} fill={AZUL} />}
              {i % cada === 0 && (
                <text x={centro} y={l.alto - 8} textAnchor="middle" fontSize="11" fill={GRIS}>
                  {formatoCorto(w.desde)}
                </text>
              )}
            </g>
          );
        })}
        <line x1={l.izq} x2={l.ancho - l.der} y1={base} y2={base} stroke={GRIS} strokeWidth="1" />
      </svg>
      {s && activa !== null && (
        <Flotante x={xBanda(activa) + banda / 2} ancho={l.ancho}>
          <span className="block text-gris">
            Semana del {formatoCorto(s.desde)} al {formatoCorto(s.hasta)}
          </span>
          <span className="mt-1 grid grid-cols-[auto_auto] gap-x-4 tabular-nums">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-sm" style={{ background: VERDE }} />
              Entra
            </span>
            <span className="text-right font-semibold text-noche">{unido(formatoSoles(s.entra))}</span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-sm" style={{ background: AZUL }} />
              Sale
            </span>
            <span className="text-right font-semibold text-noche">{unido(formatoSoles(s.sale))}</span>
            <span>Queda</span>
            <span className="text-right font-semibold text-noche">{unido(formatoSoles(s.entra - s.sale))}</span>
          </span>
          {s.futuro && <span className="mt-1 block text-gris">Semana que el copiloto no ve</span>}
        </Flotante>
      )}
    </div>
  );
}
