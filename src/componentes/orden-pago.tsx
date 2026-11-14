"use client";
import { formatoSoles, formatoCorto } from "@/motor";
import { ETIQUETA_CALIFICACION } from "@/motor/sbs";
import type { DecisionPago, GrupoPago, ResultadoPrioridad } from "@/motor/prioridad";
import { tarjeta, unido } from "@/componentes/ui";

const GRUPOS: readonly { id: GrupoPago; titulo: string; ayuda: string; chip: string }[] = [
  { id: "pagar-ya", titulo: "Pagar ya", ayuda: "Vencen pronto o ya tienen atraso", chip: "bg-coral-suave text-coral-fuerte" },
  { id: "pagar-este-mes", titulo: "Pagar este mes", ayuda: "Cabe en tu mes sin apretarte", chip: "bg-agua-suave text-agua-fuerte" },
  { id: "negociar", titulo: "Hablar con la entidad", ayuda: "No alcanza: reprograma antes de caer en atraso", chip: "bg-ambar-suave text-ambar-fuerte" },
];

function Decision({ d }: { d: DecisionPago }) {
  return (
    <li className="flex items-start gap-3 border-t border-linea py-3 first:border-t-0">
      <span aria-hidden="true" className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-niebla text-sm font-semibold text-noche">
        {d.orden}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-noche">
          {d.nombre}
          <span className="ml-2 text-sm font-normal text-gris">{d.entidad}</span>
        </p>
        <p className="mt-0.5 text-sm leading-relaxed text-gris">{unido(d.motivo)}</p>
        <p className="mt-1 text-xs text-gris">
          Calificación: {ETIQUETA_CALIFICACION[d.calificacion]}
          {d.proximoPago ? ` · próximo pago ${formatoCorto(d.proximoPago)}` : ""}
        </p>
      </div>
      <p className="shrink-0 font-semibold text-noche tabular-nums">{d.grupo === "negociar" ? "—" : unido(formatoSoles(d.monto))}</p>
    </li>
  );
}

/** Qué pagar y en qué orden, tal como lo decide el motor; la IA no interviene. */
export function OrdenDePago({ r }: { r: ResultadoPrioridad }) {
  if (r.decisiones.length === 0) return null;
  return (
    <section className={`${tarjeta} aparecer`} aria-labelledby="orden-pago">
      <h2 id="orden-pago" className="text-lg font-semibold text-noche">
        Qué pagar primero
      </h2>
      <p className="mt-1 leading-relaxed text-gris">
        {r.alcanzaParaTodo ? (
          <>
            Con <span className="font-semibold text-noche tabular-nums">{unido(formatoSoles(r.disponible))}</span> disponibles este mes cubres todos los mínimos
            {r.sobrante > 0 ? <> y aún te sobran <span className="font-semibold text-noche tabular-nums">{unido(formatoSoles(r.sobrante))}</span></> : " y el resto va a la deuda más cara"}.
          </>
        ) : (
          <>
            Con <span className="font-semibold text-noche tabular-nums">{unido(formatoSoles(r.disponible))}</span> disponibles este mes no alcanza para todo: te
            faltarían <span className="font-semibold text-coral-fuerte tabular-nums">{unido(formatoSoles(r.faltante))}</span> para cubrir los mínimos.
          </>
        )}
      </p>
      <div className="mt-5 space-y-5">
        {GRUPOS.map(g => {
          const items = r.decisiones.filter(d => d.grupo === g.id);
          if (items.length === 0) return null;
          return (
            <div key={g.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${g.chip}`}>{g.titulo}</span>
                <span className="text-sm text-gris">{g.ayuda}</span>
              </div>
              <ul className="mt-2">
                {items.map(d => (
                  <Decision key={d.id} d={d} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
