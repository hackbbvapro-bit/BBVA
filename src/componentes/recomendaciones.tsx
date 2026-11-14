"use client";
import { recomendar } from "@/recomendaciones/reglas";
import type { Datos } from "@/datos/tipos";
import type { Analisis } from "@/motor";
import { tarjeta, unido } from "@/componentes/ui";

/** Tarjeta «Opciones para ti en BBVA»: catálogo estático activado por reglas de código; sin IA. */
export function Recomendaciones({ datos, analisis }: { datos: Datos; analisis: Analisis }) {
  const lista = recomendar(datos, analisis);
  if (lista.length === 0) return null;
  return (
    <section className={tarjeta} aria-labelledby="opciones-bbva">
      <h2 id="opciones-bbva" className="text-lg font-semibold text-noche">
        Opciones para ti en BBVA
      </h2>
      <ul className="mt-2">
        {lista.map(({ entrada, porQue }) => (
          <li key={entrada.id} className="border-t border-linea py-4 first:border-t-0 first:pt-2">
            <h3 className="font-semibold text-noche">{entrada.titulo}</h3>
            <p className="mt-1 text-sm leading-relaxed text-gris">{entrada.paraQuien}</p>
            <p className="mt-2 text-sm leading-relaxed text-noche">
              <span className="font-semibold">Por qué te lo sugerimos:</span> {unido(porQue)}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-gris">
              {unido(entrada.condicion)}
              {entrada.fuente && (
                <>
                  {" · "}
                  <a
                    className="inline-flex min-h-11 items-center font-semibold text-electrico underline"
                    href={entrada.fuente.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Fuente: bbva.pe
                  </a>
                  {" · "}Consultado el 14 nov 2026
                </>
              )}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-2 border-t border-linea pt-3 text-sm font-medium text-noche">Es una sugerencia, no una oferta: confírmalo con BBVA.</p>
    </section>
  );
}
