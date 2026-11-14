"use client";
import { recomendar } from "@/recomendaciones/reglas";
import type { Datos } from "@/datos/tipos";
import type { Analisis } from "@/motor";
import { tarjeta, unido } from "@/componentes/ui";

/** Tarjeta «Alternativas que puedes consultar»: catálogo genérico y educativo activado por reglas de código; sin IA, sin marcas ni cifras. */
export function Recomendaciones({ datos, analisis }: { datos: Datos; analisis: Analisis }) {
  const lista = recomendar(datos, analisis);
  if (lista.length === 0) return null;
  return (
    <section className={tarjeta} aria-labelledby="opciones-generales">
      <h2 id="opciones-generales" className="text-lg font-semibold text-noche">
        Alternativas que puedes consultar
      </h2>
      <ul className="mt-2">
        {lista.map(({ entrada, porQue }) => (
          <li key={entrada.id} className="border-t border-linea py-4 first:border-t-0 first:pt-2">
            <h3 className="font-semibold text-noche">{entrada.titulo}</h3>
            <p className="mt-1 text-sm leading-relaxed text-gris">{entrada.paraQuien}</p>
            <p className="mt-2 text-sm leading-relaxed text-noche">
              <span className="font-semibold">Por qué aparece:</span> {unido(porQue)}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-gris">{unido(entrada.condicion)}</p>
          </li>
        ))}
      </ul>
      <p className="mt-2 border-t border-linea pt-3 text-sm leading-relaxed text-gris">Orientación educativa basada en reglas simples del caso; no es una oferta ni asesoría personalizada. Consulta las condiciones vigentes con tu entidad: la decisión es tuya.</p>
    </section>
  );
}
