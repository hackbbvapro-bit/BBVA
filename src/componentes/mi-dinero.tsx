"use client";
import type { ReactNode } from "react";
import { formatoSoles, type Analisis, type Perfil, type Recurrente } from "@/motor";
import { Portada, tarjeta, unido } from "@/componentes/ui";

function Lista({ titulo, vacio, items }: { titulo: string; vacio: ReactNode; items: Recurrente[] }) {
  return (
    <section className={`${tarjeta} aparecer`}>
      <h2 className="text-lg font-semibold text-noche">{titulo}</h2>
      {items.length ? (
        <ul className="mt-3">
          {items.map(r => (
            <li
              key={r.id}
              className="flex items-baseline justify-between gap-4 border-t border-linea py-3.5 first:border-t-0"
            >
              <span className="min-w-0">
                <span className="block font-medium text-noche">{r.descripcion}</span>
                <span className="text-sm text-gris">
                  {r.frecuencia === "mensual" ? `Cada mes, el día ${r.diaDelMes}` : "Cada semana"}
                </span>
              </span>
              <span className="shrink-0 font-semibold text-noche tabular-nums">
                {unido(formatoSoles(Math.abs(r.monto)))}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 leading-relaxed text-gris">{vacio}</p>
      )}
    </section>
  );
}

/** Lo que tienes y lo que entra y sale fijo cada mes. Todo sale del motor (`analizar`). */
export function MiDinero({ perfil, analisis }: { perfil: Perfil; analisis: Analisis }) {
  const ingresos = analisis.recurrentes.filter(r => r.monto > 0);
  const gastos = analisis.recurrentes.filter(r => r.monto < 0);
  const variable = analisis.ingresoVariable;
  return (
    <>
      <Portada>
        <p className="text-[15px] text-gris">Mi dinero</p>
        <p className="mt-1 text-lg text-noche">Hoy tienes</p>
        <h1 className="mt-1 text-[3rem] font-semibold leading-none tracking-[-0.045em] text-noche tabular-nums md:text-[4rem]">
          {unido(formatoSoles(perfil.saldoActual))}
        </h1>
        <p className="mt-4 text-gris">En tu cuenta principal, al cierre del día.</p>
      </Portada>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Lista
          titulo="Lo que te entra"
          vacio={
            variable.semanasObservadas > 0 ? (
              <>
                Tus ingresos varían. En una semana normal te entran{" "}
                <span className="font-semibold text-noche tabular-nums">
                  {unido(formatoSoles(variable.semanalTipico))}
                </span>
                ; para no llevarte sorpresas, el copiloto cuenta con{" "}
                <span className="font-semibold text-noche tabular-nums">
                  {unido(formatoSoles(variable.semanalPrudente))}
                </span>
                .
              </>
            ) : (
              "Aún no hay ingresos fijos."
            )
          }
          items={ingresos}
        />
        <Lista titulo="Lo que te sale fijo" vacio="Aún no hay gastos fijos." items={gastos} />
      </div>
      <p className="mt-6 px-1 text-sm text-gris">
        Los fijos se reconocen solos cuando un pago se repite tres meses el mismo día.
      </p>
    </>
  );
}
