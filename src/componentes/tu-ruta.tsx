"use client";

import { Icono, botonPrincipal, tarjeta, unido } from "@/componentes/ui";
import type { Ruta } from "@/ruta/ruta";

/**
 * «Tu ruta»: por dónde empezar según la situación de la persona. Todo el texto y las cifras salen del motor
 * (src/ruta/ruta.ts); aquí solo se pinta. Las alternativas son genéricas: sin entidades, tasas ni rendimientos.
 */
export function TuRuta({ ruta, alConversar }: { ruta: Ruta; alConversar?: () => void }) {
  return (
    <section className={tarjeta} aria-labelledby="tu-ruta">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-electrico">Tu ruta</p>
          <h2 id="tu-ruta" className="mt-1 text-xl font-semibold leading-snug text-noche text-balance">
            {ruta.titulo}
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-tinta">{unido(ruta.resumen)}</p>
        </div>
        {alConversar && (
          <button className={`${botonPrincipal} lg:shrink-0`} onClick={alConversar}>
            <Icono nombre="asistente" />
            Conversar con el asistente
          </button>
        )}
      </div>

      {ruta.motivos.length > 0 && (
        <div className="mt-4 border-t border-linea pt-4">
          <h3 className="text-sm font-semibold text-noche">Por qué te toca esta ruta</h3>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-gris">
            {ruta.motivos.map(m => (
              <li key={m} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-electrico" />
                <span>{unido(m)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 border-t border-linea pt-4">
        <h3 className="text-sm font-semibold text-noche">Tus pasos, en orden</h3>
        <ol className="mt-2 space-y-2">
          {ruta.pasos.map((p, i) => (
            <li key={p} className="flex gap-3 text-[15px] leading-relaxed text-tinta">
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-agua-suave text-xs font-semibold text-electrico"
              >
                {i + 1}
              </span>
              <span>{unido(p)}</span>
            </li>
          ))}
        </ol>
      </div>

      {ruta.alternativas.length > 0 && (
        <div className="mt-4 border-t border-linea pt-4">
          <h3 className="text-sm font-semibold text-noche">Alternativas para comparar</h3>
          <ul className="mt-1">
            {ruta.alternativas.map(({ entrada, porQue }) => (
              <li key={entrada.id} className="border-t border-linea py-3 first:border-t-0">
                <h4 className="font-semibold text-noche">{entrada.titulo}</h4>
                <p className="mt-1 text-sm leading-relaxed text-noche">
                  <span className="font-semibold">Por qué aparece:</span> {unido(porQue)}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-gris">{unido(entrada.condicion)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-2 border-t border-linea pt-3 text-sm leading-relaxed text-gris">{ruta.aviso}</p>
    </section>
  );
}
