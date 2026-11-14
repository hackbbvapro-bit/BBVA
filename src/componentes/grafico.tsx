"use client";
import { useId } from "react";
import { formatoCorto, formatoSoles, type Proyeccion } from "@/motor";

export function Grafico({
  base,
  despues,
  descripcion,
}: {
  base: Proyeccion;
  despues?: Proyeccion;
  descripcion: string;
}) {
  const clip = useId();
  const valores = [...base.dias, ...(despues?.dias ?? [])].map(d => d.saldo);
  const minimo = Math.min(...valores),
    maximo = Math.max(...valores);
  const inferior = Math.min(0, minimo),
    superior = Math.max(0, maximo);
  const margen = Math.max((superior - inferior) * 0.12, 1);
  const y = (saldo: number) => 24 + ((superior + margen - saldo) / (superior - inferior + margen * 2)) * 176;
  const x = (i: number) => 80 + (i / Math.max(base.dias.length - 1, 1)) * 248;
  const linea = (serie: Proyeccion) =>
    serie.dias.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.saldo)}`).join(" ");
  const fecha = base.deficit?.fecha ?? base.fechaSaldoMinimo;
  const indice = base.dias.findIndex(d => d.fecha === fecha);
  const punto = base.dias[indice];
  // Solo geometría: dónde cabe cada rótulo sin pisar a otro.
  const xPunto = punto ? Math.min(306, Math.max(102, x(indice))) : 205;
  const ceroVisible = y(0) - y(maximo) > 16 && Math.abs(y(minimo) - y(0)) > 16;
  return (
    <svg
      className="mt-4 h-auto w-full overflow-visible"
      viewBox="0 0 350 250"
      role="img"
      aria-label={descripcion}
    >
      <defs>
        <clipPath id={clip}>
          <rect x="80" y={y(0)} width="248" height={224 - y(0)} />
        </clipPath>
      </defs>
      <path
        d={`${linea(base)} L328,${y(0)} L80,${y(0)} Z`}
        clipPath={`url(#${clip})`}
        fill="var(--color-coral-suave)"
      />
      <path d={`M80,${y(maximo)}H328 M80,${y(minimo)}H328`} stroke="var(--color-linea)" />
      <path d={`M80,${y(0)}H328`} stroke="var(--color-gris)" strokeDasharray="4 5" />
      <text x="3" y={y(maximo) + 4} fontSize="13" fill="var(--color-gris)">
        {formatoSoles(maximo, { sinDecimales: true })}
      </text>
      <text x="3" y={y(minimo) + 4} fontSize="13" fill="var(--color-gris)">
        {formatoSoles(minimo, { sinDecimales: true })}
      </text>
      {ceroVisible && (
        <text x="3" y={y(0) + 4} fontSize="13" fill="var(--color-gris)">
          {formatoSoles(0, { sinDecimales: true })}
        </text>
      )}
      <path
        d={linea(base)}
        fill="none"
        stroke="var(--color-tinta)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {despues && (
        <path
          d={linea(despues)}
          fill="none"
          stroke="var(--color-agua)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )}
      {punto && (
        <g>
          <circle
            cx={x(indice)}
            cy={y(punto.saldo)}
            r="5"
            fill={base.deficit ? "var(--color-coral)" : "var(--color-ambar)"}
            stroke="white"
            strokeWidth="2"
          />
          <path
            d={`M${x(indice)},${y(punto.saldo) + 8}V226`}
            stroke="var(--color-gris)"
            strokeDasharray="2 4"
          />
          <text
            x={xPunto}
            y="240"
            textAnchor="middle"
            fontSize="13"
            fontWeight="700"
            fill="var(--color-tinta)"
          >
            {formatoCorto(fecha)}
          </text>
        </g>
      )}
      {xPunto > 150 && (
        <text x="80" y="240" fontSize="13" fill="var(--color-gris)">
          {formatoCorto(base.dias[0]?.fecha ?? base.desde)}
        </text>
      )}
      {xPunto < 262 && (
        <text x="328" y="240" textAnchor="end" fontSize="13" fill="var(--color-gris)">
          {formatoCorto(base.hasta)}
        </text>
      )}
    </svg>
  );
}
