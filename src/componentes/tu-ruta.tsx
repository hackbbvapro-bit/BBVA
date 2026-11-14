"use client";

import { Encabezado, Icono, botonPrincipal, tarjeta, unido } from "@/componentes/ui";
import type { ReactNode } from "react";
import { contadorDeAvance, type Avance, type IdPaso, type Ruta } from "@/ruta/ruta";

/**
 * «Mi ruta»: por dónde empezar según la situación de la persona y cómo va. Todo el texto y las cifras salen
 * del motor (src/ruta/ruta.ts); aquí solo se pinta. Las alternativas son genéricas: sin entidades, tasas ni
 * rendimientos. Marcar un paso solo guarda su identificador en este equipo.
 */

function Barra({ avance }: { avance: Avance }) {
  const pct = avance.total === 0 ? 0 : Math.round((avance.cumplidos / avance.total) * 100);
  return (
    <div
      role="progressbar"
      aria-label="Avance de tu ruta"
      aria-valuemin={0}
      aria-valuemax={avance.total}
      aria-valuenow={avance.cumplidos}
      aria-valuetext={contadorDeAvance(avance)}
      className="h-2 w-full overflow-hidden rounded-full bg-niebla"
    >
      <div className="h-full rounded-full bg-electrico transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Tarjeta corta del Inicio: la ruta, cuánto lleva y el paso que sigue. El detalle vive en «Mi ruta». */
export function SiguientePaso({ ruta, avance, alAbrir }: { ruta: Ruta; avance: Avance; alAbrir: () => void }) {
  return (
    <section className="aparecer rounded-2xl border border-linea bg-white px-4 py-3.5 md:px-5 md:py-4" aria-labelledby="siguiente-paso">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-xs font-semibold uppercase tracking-wide text-electrico">
          Tu ruta <span className="font-medium normal-case tracking-normal text-gris tabular-nums">· {contadorDeAvance(avance)}</span>
        </p>
        <button
          className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-electrico transition-colors duration-150 hover:bg-agua-suave [&_svg]:size-4"
          onClick={alAbrir}
        >
          Ver mi ruta
          <span aria-hidden="true" className="-rotate-90"><Icono nombre="abajo" /></span>
        </button>
      </div>
      <h2 id="siguiente-paso" className="mt-0.5 text-base font-semibold leading-snug text-noche text-balance">
        {ruta.titulo}
      </h2>
      <div className="mt-2.5">
        <Barra avance={avance} />
      </div>
      <p className="mt-2.5 text-sm leading-relaxed text-tinta">
        {avance.siguiente ? (
          <>
            <span className="font-semibold text-noche">Siguiente paso: </span>
            {unido(avance.siguiente)}
          </>
        ) : (
          "Marcaste todos los pasos. Si cambian tus datos, la ruta se vuelve a calcular."
        )}
      </p>
    </section>
  );
}

/** Fila plegable para lo que se consulta de vez en cuando (motivos, alternativas): no ocupa pantalla hasta que se abre. */
function Plegable({ titulo, cantidad, children }: { titulo: string; cantidad?: number; children: ReactNode }) {
  return (
    <details className="group border-t border-linea first:border-t-0">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-2 text-[15px] font-semibold text-noche [&::-webkit-details-marker]:hidden">
        <span>
          {titulo}
          {cantidad !== undefined && <span className="ml-1.5 font-medium text-gris tabular-nums">({cantidad})</span>}
        </span>
        <span aria-hidden="true" className="text-gris transition-transform duration-150 group-open:rotate-180 [&_svg]:size-4">
          <Icono nombre="abajo" />
        </span>
      </summary>
      <div className="pb-3">{children}</div>
    </details>
  );
}

/** Página «Mi ruta»: la ruta y sus pasos en una sola tarjeta; motivos y alternativas plegados; el aviso al pie. */
export function MiRuta({
  ruta,
  avance,
  alMarcar,
  alConversar,
}: {
  ruta: Ruta;
  avance: Avance;
  alMarcar: (id: IdPaso, hecho: boolean) => void;
  alConversar?: () => void;
}) {
  const siguiente = avance.pasos.findIndex(p => !p.hecho);
  return (
    <div className="max-w-3xl space-y-3 md:space-y-5">
      <Encabezado titulo="Mi ruta" bajada="Marca lo que ya hiciste y el asistente sigue desde ahí." />

      <section className={tarjeta} aria-labelledby="tu-ruta">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-electrico">Tu ruta</p>
          <p className="text-xs font-semibold text-gris tabular-nums">{contadorDeAvance(avance)}</p>
        </div>
        <h2 id="tu-ruta" className="mt-1 text-lg font-semibold leading-snug text-noche text-balance md:text-xl">
          {ruta.titulo}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-tinta md:text-[15px]">{unido(ruta.resumen)}</p>
        <div className="mt-3">
          <Barra avance={avance} />
        </div>

        <h3 id="tus-pasos" className="mt-5 text-xs font-semibold uppercase tracking-wide text-gris">
          Tus pasos, en orden
        </h3>
        <p className="mt-0.5 text-xs text-gris">Toca un paso cuando lo hayas hecho.</p>
        <ol className="mt-2 space-y-1" aria-labelledby="tus-pasos">
          {avance.pasos.map((p, i) => {
            const toca = i === siguiente;
            return (
              <li key={p.id}>
                <label
                  className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl px-2.5 py-2.5 transition-colors duration-150 ${toca ? "bg-agua-suave/70" : "hover:bg-niebla"}`}
                >
                  <input
                    type="checkbox"
                    checked={p.hecho}
                    onChange={e => alMarcar(p.id, e.target.checked)}
                    aria-label={`Paso ${i + 1}: ${p.texto}`}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`mt-px flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-electrico [&_svg]:size-3.5 ${p.hecho ? "border-electrico bg-electrico text-white" : toca ? "border-electrico bg-white text-electrico" : "border-linea bg-white text-gris"}`}
                  >
                    {p.hecho ? <Icono nombre="check" /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    {toca && <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-electrico">Siguiente</span>}
                    <span className={`block text-sm leading-relaxed md:text-[15px] ${p.hecho ? "text-gris line-through" : "text-tinta"}`}>{unido(p.texto)}</span>
                    {p.hecho && <span className="mt-0.5 block text-[11px] font-medium text-gris">Hecho · toca para desmarcar</span>}
                  </span>
                </label>
              </li>
            );
          })}
        </ol>
        {alConversar && (
          <button className={`${botonPrincipal} mt-3 w-full sm:w-auto`} onClick={alConversar}>
            <Icono nombre="asistente" />
            Conversar con el asistente
          </button>
        )}
      </section>

      {(ruta.motivos.length > 0 || ruta.alternativas.length > 0) && (
        <section className="rounded-2xl border border-linea bg-white px-4 md:rounded-[22px] md:px-6" aria-label="Más sobre tu ruta">
          {ruta.motivos.length > 0 && (
            <Plegable titulo="Por qué te toca esta ruta">
              <ul className="space-y-1.5 text-sm leading-relaxed text-tinta">
                {ruta.motivos.map(m => (
                  <li key={m} className="flex gap-2">
                    <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-electrico" />
                    <span>{unido(m)}</span>
                  </li>
                ))}
              </ul>
            </Plegable>
          )}
          {ruta.alternativas.length > 0 && (
            <Plegable titulo="Alternativas para comparar" cantidad={ruta.alternativas.length}>
              <ul className="space-y-3">
                {ruta.alternativas.map(({ entrada, porQue }) => (
                  <li key={entrada.id} className="rounded-xl bg-niebla px-3 py-2.5">
                    <h4 className="text-sm font-semibold text-noche">{entrada.titulo}</h4>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-tinta">{unido(porQue)}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-gris">{unido(entrada.condicion)}</p>
                  </li>
                ))}
              </ul>
            </Plegable>
          )}
        </section>
      )}

      <p className="px-1 text-xs leading-relaxed text-gris">{ruta.aviso}</p>
    </div>
  );
}
