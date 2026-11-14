"use client";
import { formatoSoles, formatoTasa, type Perfil, type Analisis, type PlanDeudas } from "@/motor";
import { avisos } from "@/explica/explica";
import { tarjeta, TarjetaAviso, Icono } from "@/componentes/ui";
function Plan({ titulo, plan, bueno }: { titulo: string; plan: PlanDeudas; bueno?: boolean }) {
  return (
    <div className={`min-w-0 rounded-2xl p-4 ${bueno ? "bg-agua-suave" : "bg-papel"}`}>
      <h3 className="font-semibold">{titulo}</h3>
      {bueno && <p className="mt-1 text-sm text-gris">Lo mismo que ya pagas cada mes</p>}
      {plan.noTermina ? (
        <p className="mt-4 font-bold">Nunca termina</p>
      ) : (
        <>
          <p className="mt-4 text-2xl font-bold tabular-nums">
            {plan.meses}
            <span className="block text-base font-normal">meses</span>
          </p>
          <p className="mt-4 break-words font-semibold tabular-nums">{formatoSoles(plan.interesTotal)}</p>
          <p className="text-sm text-gris">en intereses</p>
        </>
      )}
    </div>
  );
}
export function Deudas({ perfil, analisis }: { perfil: Perfil; analisis: Analisis }) {
  const comparacion = analisis.deudas;
  if (!comparacion)
    return (
      <div className={`${tarjeta} py-12 text-center`}>
        <div className="mb-4 flex justify-center text-agua-fuerte">
          <Icono nombre="deudas" />
        </div>
        <h2 className="text-xl font-bold">No tienes deudas registradas</h2>
        <p className="mt-3 text-gris">Sigue mirando tus próximos pagos para llegar con tranquilidad.</p>
      </div>
    );
  const aviso = avisos(perfil, analisis).find(a => a.id === "deuda");
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Que tus deudas bajen</h1>
      {aviso && <TarjetaAviso aviso={aviso} />}
      <section className={tarjeta}>
        <h2 className="mb-4 text-lg font-bold">La diferencia está en cómo pagas</h2>
        <div className="grid grid-cols-2 gap-3">
          <Plan titulo="Pagando en orden" plan={comparacion.avalancha} bueno />
          <Plan titulo="Pagando solo el mínimo" plan={comparacion.minimos} />
        </div>
        {comparacion.ahorroVsMinimos > 0 && (
          <p className="mt-4 font-semibold text-agua-fuerte">
            Te ahorras {formatoSoles(comparacion.ahorroVsMinimos)} en intereses
          </p>
        )}
      </section>
      <h2 className="text-xl font-bold">Tus deudas, en orden</h2>
      {[...perfil.deudas]
        .sort((a, b) => (a.tceaBp > b.tceaBp ? -1 : a.tceaBp < b.tceaBp ? 1 : 0))
        .map(deuda => (
          <article key={deuda.id} className={tarjeta}>
            {comparacion.primera?.id === deuda.id && (
              <span className="mb-3 inline-block rounded-full bg-agua-suave px-3 py-1 text-sm font-semibold text-agua-fuerte">
                Paga esta primero
              </span>
            )}
            <h3 className="font-bold">{deuda.nombre}</h3>
            <p className="my-2 text-2xl font-bold tabular-nums">Debes {formatoSoles(deuda.saldo)}</p>
            <p>Te cuesta {formatoTasa(deuda.tceaBp)} al año</p>
            <p className="mt-3 text-gris">
              Mínimo {formatoSoles(deuda.pagoMinimo)} · vence el día {deuda.diaPago}
            </p>
          </article>
        ))}
      <p className="text-sm text-gris">Orden recomendado: primero la que más te cuesta al año.</p>
    </div>
  );
}
