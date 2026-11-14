"use client";
import { formatoSoles, leccionesMinimo, type Deuda, type LeccionMinimo } from "@/motor";
import { NOTA_MINIMO, PARA_SALIR, SI_NO_PAGAS, SI_PAGAS_EL_MINIMO } from "@/explica/educacion";
import { tarjeta, unido } from "@/componentes/ui";

const soles = (c: number) => unido(formatoSoles(c));

/** Barra partida: cuánto del mínimo se va en intereses y cuánto baja la deuda. Solo geometría. */
function Reparto({ l }: { l: LeccionMinimo }) {
  const pagado = l.interesPrimerMes + l.abonoPrimerMes;
  const pctInteres = pagado > 0 ? Math.min(100, (l.interesPrimerMes / pagado) * 100) : 100;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-niebla md:h-3.5" aria-hidden="true">
        <div className="h-full bg-coral-fuerte" style={{ width: `${pctInteres}%` }} />
        <div className="h-full bg-verde-fuerte" style={{ width: `${100 - pctInteres}%` }} />
      </div>
      <dl className="mt-2.5 grid grid-cols-2 gap-3 text-[13px] md:text-sm">
        <div>
          <dt className="flex items-center gap-1.5 text-gris">
            <span aria-hidden="true" className="size-2 rounded-full bg-coral-fuerte" />
            Se va en intereses
          </dt>
          <dd className="mt-0.5 text-base font-semibold text-coral-fuerte tabular-nums md:text-lg">{soles(l.interesPrimerMes)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-gris">
            <span aria-hidden="true" className="size-2 rounded-full bg-verde-fuerte" />
            Baja tu deuda
          </dt>
          <dd className="mt-0.5 text-base font-semibold text-verde-fuerte tabular-nums md:text-lg">{soles(l.abonoPrimerMes)}</dd>
        </div>
      </dl>
    </div>
  );
}

function Comparar({ l }: { l: LeccionMinimo }) {
  const solo = l.soloMinimo;
  const otro = l.conLoQuePaga;
  return (
    <div className={`mt-4 grid gap-2 ${otro ? "grid-cols-2" : "grid-cols-1"}`}>
      <div className="rounded-xl bg-coral-suave/60 px-3 py-2.5">
        <p className="text-xs font-semibold text-coral-fuerte">Solo el mínimo</p>
        {solo.noTermina ? (
          <p className="mt-0.5 text-sm font-semibold text-noche">La deuda no baja nunca</p>
        ) : (
          <>
            <p className="mt-0.5 text-lg font-semibold leading-tight text-noche tabular-nums">{solo.meses} meses</p>
            <p className="text-xs text-tinta tabular-nums">{soles(solo.interesTotal)} de intereses</p>
          </>
        )}
      </div>
      {otro && (
        <div className="rounded-xl bg-verde-suave px-3 py-2.5">
          <p className="text-xs font-semibold text-verde-fuerte">Pagando {soles(l.pagoHabitual)}</p>
          {otro.noTermina ? (
            <p className="mt-0.5 text-sm font-semibold text-noche">Tampoco termina</p>
          ) : (
            <>
              <p className="mt-0.5 text-lg font-semibold leading-tight text-noche tabular-nums">{otro.meses} meses</p>
              <p className="text-xs text-tinta tabular-nums">{soles(otro.interesTotal)} de intereses</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const MARCAS = ["Lo bueno", "Lo que cuesta", "Si no te alcanza para más"] as const;

/**
 * «¿Y si solo pago el mínimo?»: enseña con las cifras del motor qué gana y qué cuesta pagar solo el
 * mínimo, qué pasa si no se paga nada y cómo salir. Los textos son fijos (explica/educacion.ts).
 */
export function EducacionMinimo({ deudas }: { deudas: readonly Deuda[] }) {
  const lecciones = leccionesMinimo(deudas);
  if (lecciones.length === 0) return null;
  const [l, ...otras] = lecciones;
  return (
    <section className={`${tarjeta} aparecer`} aria-labelledby="educacion-minimo">
      <p className="text-xs font-semibold uppercase tracking-wide text-electrico">Aprende</p>
      <h2 id="educacion-minimo" className="mt-1 text-lg font-semibold leading-tight text-noche md:text-[1.375rem]">
        ¿Y si solo pago el mínimo?
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-gris md:text-[15px]">
        De los <span className="font-semibold text-noche tabular-nums">{soles(l.pagoMinimo)}</span> del mínimo de {l.nombre}, este mes:
      </p>
      <div className="mt-3">
        <Reparto l={l} />
      </div>
      <Comparar l={l} />
      {otras.length > 0 && (
        <ul className="mt-3 space-y-1 text-[13px] text-gris">
          {otras.map(o => (
            <li key={o.id}>
              {o.nombre}: de {soles(o.pagoMinimo)} de mínimo, {soles(o.interesPrimerMes)} se van en intereses.
            </li>
          ))}
        </ul>
      )}

      <ul className="mt-5 space-y-3 border-t border-linea pt-4">
        {SI_PAGAS_EL_MINIMO.map((texto, i) => (
          <li key={i} className="text-sm leading-relaxed text-tinta md:text-[15px]">
            <span className={`mr-1 font-semibold ${i === 1 ? "text-coral-fuerte" : i === 0 ? "text-verde-fuerte" : "text-noche"}`}>{MARCAS[i]}:</span>
            {texto}
          </li>
        ))}
      </ul>

      <details className="group mt-4 rounded-xl border border-linea px-3 py-2.5 open:bg-niebla/40">
        <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-noche">
          ¿Y si no pago nada?
          <span aria-hidden="true" className="text-gris transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-tinta md:text-sm">
          {SI_NO_PAGAS.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      </details>

      <div className="mt-4">
        <p className="text-sm font-semibold text-noche">Para salir, en este orden</p>
        <ol className="mt-2 space-y-2">
          {PARA_SALIR.map((t, i) => (
            <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-tinta md:text-sm">
              <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded-full bg-electrico text-[11px] font-semibold text-white">
                {i + 1}
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-4 text-[11px] leading-snug text-gris md:text-xs">{NOTA_MINIMO}</p>
    </section>
  );
}
