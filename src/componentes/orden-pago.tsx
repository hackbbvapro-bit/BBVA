"use client";
import { formatoSoles, formatoCorto, formatoLargo } from "@/motor";
import { REGLA_DEUDAS_EN_ROJO } from "@/ruta/ruta";
import { ETIQUETA_CALIFICACION } from "@/motor/sbs";
import type { DecisionPago, GrupoPago, ResultadoPrioridad } from "@/motor/prioridad";
import { tarjeta, unido } from "@/componentes/ui";

const GRUPOS: readonly { id: GrupoPago; titulo: string; ayuda: string; chip: string }[] = [
  { id: "pagar-ya", titulo: "Pagar ya", ayuda: "Vencen pronto o ya tienen atraso", chip: "bg-coral-suave text-coral-fuerte" },
  { id: "pagar-este-mes", titulo: "Pagar este mes", ayuda: "Cabe en tu mes sin apretarte", chip: "bg-agua-suave text-agua-fuerte" },
  { id: "negociar", titulo: "Hablar con la entidad", ayuda: "No alcanza: reprograma antes de caer en atraso", chip: "bg-ambar-suave text-ambar-fuerte" },
];

function Decision({ d, n }: { d: DecisionPago; n: number }) {
  const conAtraso = d.calificacion !== "normal";
  return (
    <li className="flex items-start gap-3 border-t border-linea py-3 first:border-t-0">
      <span aria-label={`Paso ${n}`} className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-noche text-xs font-semibold text-white md:size-7 md:text-sm">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate font-semibold text-noche">{d.nombre}</p>
          <p className="shrink-0 font-semibold text-noche tabular-nums">{d.grupo === "negociar" ? "Negociar" : unido(formatoSoles(d.monto))}</p>
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-gris">
          <span>{d.entidad}</span>
          {d.proximoPago && <span>· vence {formatoCorto(d.proximoPago)}</span>}
          {conAtraso && (
            <span className="rounded-full bg-coral-suave px-2 py-0.5 font-semibold text-coral-fuerte">{ETIQUETA_CALIFICACION[d.calificacion]}</span>
          )}
        </p>
        <p className="mt-1 text-[13px] leading-snug text-gris">{unido(d.motivo)}</p>
      </div>
    </li>
  );
}

/**
 * Qué pagar y en qué orden, tal como lo decide el motor; la IA no interviene.
 * Si la proyección tiene un día en rojo, no reparte extra y repite la misma regla que Mi ruta y el asistente,
 * nombrando la jugada que Inicio muestra como «Salida más barata».
 */
export function OrdenDePago({ r, jugada }: { r: ResultadoPrioridad; jugada?: string }) {
  if (r.decisiones.length === 0) return null;
  return (
    <section className={`${tarjeta} aparecer`} aria-labelledby="orden-pago">
      <h2 id="orden-pago" className="text-base font-semibold text-noche md:text-lg">
        Qué pagar primero este mes
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-gris md:text-base">
        {r.alcanzaParaTodo ? (
          <>
            Tienes <span className="font-semibold text-noche tabular-nums">{unido(formatoSoles(r.disponible))}</span> para tus deudas: alcanza para todos los mínimos
            {r.sobrante > 0 ? <> y sobran <span className="font-semibold text-noche tabular-nums">{unido(formatoSoles(r.sobrante))}</span>.</> : r.rojoEl ? "." : " y el resto va a la deuda más cara."}
          </>
        ) : (
          <>
            Tienes <span className="font-semibold text-noche tabular-nums">{unido(formatoSoles(r.disponible))}</span> para tus deudas y no alcanza: faltan{" "}
            <span className="font-semibold text-coral-fuerte tabular-nums">{unido(formatoSoles(r.faltante))}</span> para cubrir los mínimos.
          </>
        )}
      </p>
      {r.alcanzaParaTodo && r.rojoEl && (
        <div className="mt-3 rounded-xl border border-ambar/40 bg-ambar-suave px-3 py-2.5 text-[13px] leading-relaxed text-noche md:px-4 md:text-sm">
          <p className="font-semibold text-ambar-fuerte">Ojo: si pagas lo de siempre, tu saldo queda en rojo el {formatoLargo(r.rojoEl)}.</p>
          <p className="mt-1">{REGLA_DEUDAS_EN_ROJO(formatoLargo(r.rojoEl))}</p>
          {jugada && <p className="mt-1">Para tapar el hueco: «{jugada}», la salida más barata que ves en Inicio.</p>}
        </div>
      )}
      <div className="mt-3 space-y-4 md:mt-5 md:space-y-5">
        {GRUPOS.map(g => {
          const items = r.decisiones.filter(d => d.grupo === g.id);
          if (items.length === 0) return null;
          return (
            <div key={g.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold md:px-3 md:py-1 md:text-sm ${g.chip}`}>{g.titulo}</span>
                <span className="text-xs text-gris md:text-sm">{g.ayuda}</span>
              </div>
              <ul className="mt-1 md:mt-2">
                {items.map((d, i) => (
                  <Decision key={d.id} d={d} n={i + 1} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
