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
  const id = useId().replace(/:/g, "");
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
  const area = (serie: Proyeccion) => `${linea(serie)} L328,${y(0)} L80,${y(0)} Z`;
  const fecha = base.deficit?.fecha ?? base.fechaSaldoMinimo;
  const indice = base.dias.findIndex(d => d.fecha === fecha);
  const punto = base.dias[indice];
  // Solo geometría: dónde cabe cada rótulo sin pisar a otro.
  const xPunto = punto ? Math.min(306, Math.max(102, x(indice))) : 205;
  const ceroVisible = y(0) - y(maximo) > 16 && Math.abs(y(minimo) - y(0)) > 16;
  const rotulo = base.deficit ? `Faltan ${formatoSoles(base.deficit.faltante)}` : undefined;
  const anchoRotulo = rotulo ? rotulo.length * 7 + 18 : 0;
  const xRotulo = punto ? Math.min(328 - anchoRotulo / 2, Math.max(80 + anchoRotulo / 2, x(indice))) : 0;
  const yRotulo = punto ? Math.max(4, y(punto.saldo) - 40) : 0;
  return (
    <svg
      className="mt-4 h-auto w-full overflow-visible"
      viewBox="0 0 350 250"
      role="img"
      aria-label={descripcion}
    >
      <defs>
        <clipPath id={`${id}-bajo`}>
          <rect x="80" y={y(0)} width="248" height={224 - y(0)} />
        </clipPath>
        <clipPath id={`${id}-sobre`}>
          <rect x="80" y="0" width="248" height={y(0)} />
        </clipPath>
        <linearGradient id={`${id}-agua`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-agua)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--color-agua)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-coral`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-coral)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--color-coral)" stopOpacity="0.38" />
        </linearGradient>
        <filter id={`${id}-brillo`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={`M80,${y(maximo)}H328 M80,${y(minimo)}H328`} stroke="var(--color-linea)" />
      <g className="desvanecer" opacity={despues ? 0.25 : 1}>
        <path d={area(base)} clipPath={`url(#${id}-sobre)`} fill={`url(#${id}-agua)`} />
        <path d={area(base)} clipPath={`url(#${id}-bajo)`} fill={`url(#${id}-coral)`} />
      </g>
      <path d={`M80,${y(0)}H328`} stroke="var(--color-gris)" strokeOpacity="0.6" strokeDasharray="4 5" />
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
        key={`base-${base.perfilId}`}
        className="trazo desvanecer"
        pathLength={1}
        d={linea(base)}
        fill="none"
        stroke="var(--color-tinta)"
        strokeOpacity={despues ? 0.35 : 1}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {despues && (
        <g key={linea(despues)}>
          <path d={area(despues)} clipPath={`url(#${id}-sobre)`} fill={`url(#${id}-agua)`} className="aparecer" />
          <path
            className="trazo"
            pathLength={1}
            d={linea(despues)}
            fill="none"
            stroke="var(--color-agua)"
            strokeWidth="3.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            filter={`url(#${id}-brillo)`}
          />
        </g>
      )}
      {punto && (
        <g>
          <path
            d={`M${x(indice)},${y(punto.saldo) + 8}V226`}
            stroke="var(--color-gris)"
            strokeOpacity="0.6"
            strokeDasharray="2 4"
          />
          {!despues && (
            <circle
              className="latido"
              cx={x(indice)}
              cy={y(punto.saldo)}
              r="5"
              fill={base.deficit ? "var(--color-coral)" : "var(--color-ambar)"}
            />
          )}
          <circle
            cx={x(indice)}
            cy={y(punto.saldo)}
            r="5.5"
            fill={base.deficit ? "var(--color-coral)" : "var(--color-ambar)"}
            stroke="white"
            strokeWidth="2.5"
          />
          {rotulo && !despues && (
            <g className="aparecer" style={{ animationDelay: "1.1s" }}>
              <rect
                x={xRotulo - anchoRotulo / 2}
                y={yRotulo}
                width={anchoRotulo}
                height="24"
                rx="12"
                fill="var(--color-coral)"
              />
              <text
                x={xRotulo}
                y={yRotulo + 16}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill="white"
              >
                {rotulo}
              </text>
            </g>
          )}
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
