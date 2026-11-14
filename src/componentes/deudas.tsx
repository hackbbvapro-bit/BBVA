"use client";
import { formatoSoles, formatoTasa, type Perfil, type Analisis, type PlanDeudas } from "@/motor";
import { avisos } from "@/explica/explica";
import { tarjeta, TarjetaAviso, Icono, Portada, unido } from "@/componentes/ui";
function Carrera({
  nombre,
  plan,
  tope,
  bueno,
}: {
  nombre: string;
  plan: PlanDeudas;
  tope: number;
  bueno?: boolean;
}) {
  // Solo geometría: el ancho de la barra es proporcional a los meses que ya calculó el motor.
  const ancho = plan.noTermina ? 100 : Math.max(8, (plan.meses / tope) * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className={bueno ? "font-semibold text-white" : "text-white/65"}>{nombre}</span>
        <span className={`font-bold tabular-nums ${bueno ? "text-agua" : "text-white/80"}`}>
          {plan.noTermina ? "No termina" : `${plan.meses} meses`}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className={`barra h-full origin-left rounded-full ${bueno ? "bg-agua shadow-[0_0_16px_rgb(20_200_180/.6)]" : "bg-white/35"}`}
          style={{ width: `${ancho}%`, animationName: "estirar" }}
        />
      </div>
    </div>
  );
}
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
          <p className="mt-4 font-semibold tabular-nums">{unido(formatoSoles(plan.interesTotal))}</p>
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
      <>
        <Portada>
          <p className="text-sm font-medium text-white/60">Tus deudas</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-balance">Nada pendiente</h1>
          <p className="mt-3 text-white/70">Tu mes depende solo de tus ingresos y tus gastos.</p>
        </Portada>
        <div className={`${tarjeta} aparecer py-12 text-center`}>
          <div className="mb-4 flex justify-center text-agua-fuerte">
            <Icono nombre="deudas" />
          </div>
          <h2 className="text-xl font-bold">No tienes deudas registradas</h2>
          <p className="mt-3 text-gris">Sigue mirando tus próximos pagos para llegar con tranquilidad.</p>
        </div>
      </>
    );
  const aviso = avisos(perfil, analisis).find(a => a.id === "deuda");
  const { avalancha, minimos } = comparacion;
  const tope = Math.max(avalancha.meses, minimos.meses, 1);
  return (
    <>
      <Portada>
        <p className="text-sm font-medium text-white/60">Que tus deudas bajen</p>
        {avalancha.noTermina ? (
          <h1 className="mt-2 text-3xl font-bold leading-tight text-balance">
            Con lo que pagas hoy, tus deudas no bajan
          </h1>
        ) : (
          <>
            <p className="mt-2 text-white/80">Pagando en orden, quedas libre en</p>
            <h1 className="text-6xl font-bold tracking-tight tabular-nums">
              {avalancha.meses}
              <span className="ml-2 text-2xl font-semibold text-white/70">meses</span>
            </h1>
          </>
        )}
        <div className="vidrio aparecer mt-6 space-y-4 rounded-3xl p-4">
          <Carrera nombre="Pagando en orden" plan={avalancha} tope={tope} bueno />
          <Carrera nombre="Pagando solo el mínimo" plan={minimos} tope={tope} />
        </div>
        {comparacion.ahorroVsMinimos > 0 && (
          <p className="aparecer mt-5 inline-flex items-center gap-2 rounded-full bg-agua px-4 py-2 font-bold text-noche shadow-[0_0_24px_rgb(20_200_180/.45)] [animation-delay:.3s]">
            Te ahorras {unido(formatoSoles(comparacion.ahorroVsMinimos))} en intereses
          </p>
        )}
      </Portada>
      <div className="space-y-5">
        {aviso && <TarjetaAviso aviso={aviso} />}
        <section className={tarjeta}>
          <h2 className="mb-4 text-lg font-bold">La diferencia está en cómo pagas</h2>
          <div className="grid grid-cols-2 gap-3">
            <Plan titulo="Pagando en orden" plan={avalancha} bueno />
            <Plan titulo="Pagando solo el mínimo" plan={minimos} />
          </div>
        </section>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-agua-fuerte">Tu plan</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Tus deudas, en orden</h2>
          <p className="mt-1 text-gris">Primero la que más te cuesta al año.</p>
        </div>
        {[...perfil.deudas]
          .sort((a, b) => (a.tceaBp > b.tceaBp ? -1 : a.tceaBp < b.tceaBp ? 1 : 0))
          .map((deuda, i) => {
            const primera = comparacion.primera?.id === deuda.id;
            return (
              <article
                key={deuda.id}
                className={`${tarjeta} aparecer flex gap-4 ${primera ? "ring-2 ring-agua" : ""}`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span
                  aria-hidden="true"
                  className={`flex size-10 shrink-0 items-center justify-center rounded-2xl text-lg font-bold ${primera ? "bg-agua text-noche" : "bg-papel text-gris"}`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  {primera && (
                    <span className="mb-2 inline-block rounded-full bg-agua-suave px-3 py-1 text-sm font-semibold text-agua-fuerte">
                      Paga esta primero
                    </span>
                  )}
                  <h3 className="font-bold">{deuda.nombre}</h3>
                  <p className="my-1 text-2xl font-bold tabular-nums">Debes {unido(formatoSoles(deuda.saldo))}</p>
                  <p>
                    Te cuesta{" "}
                    <span className={`font-semibold ${primera ? "text-coral-fuerte" : ""}`}>
                      {formatoTasa(deuda.tceaBp)}
                    </span>{" "}
                    al año
                  </p>
                  <p className="mt-3 text-sm text-gris">
                    Mínimo {unido(formatoSoles(deuda.pagoMinimo))} · vence el día {deuda.diaPago}
                  </p>
                </div>
              </article>
            );
          })}
      </div>
    </>
  );
}
