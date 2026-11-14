"use client";
import { useState } from "react";
import { formatoSoles, type Perfil, type Analisis, type PlanDeudas } from "@/motor";
import { avisos } from "@/explica/explica";
import { tarjeta, TarjetaAviso, Portada, unido } from "@/componentes/ui";
import { useDatos } from "@/componentes/datos";
import { OrdenDePago } from "@/componentes/orden-pago";
import { ReporteSbs } from "@/componentes/reporte-sbs";
import { prioridadDePagos } from "@/datos/paraPrioridad";
import { ListaDebo, ListaMeDeben, totalDebo, totalMeDeben } from "@/componentes/deudas-editar";
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
        <span className={bueno ? "font-semibold text-noche" : "text-gris"}>{nombre}</span>
        <span className={`font-semibold tabular-nums ${bueno ? "text-electrico" : "text-gris"}`}>
          {plan.noTermina ? "No termina" : `${plan.meses} meses`}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-niebla">
        <div
          className={`barra h-full origin-left rounded-full ${bueno ? "bg-electrico" : "bg-linea-fuerte"}`}
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
export type PestanaDeudas = "debo" | "medeben" | "sbs";
type Pestana = PestanaDeudas;

function Pestanas({ actual, cambiar, debo, medeben }: { actual: Pestana; cambiar: (p: Pestana) => void; debo: number; medeben: number }) {
  const una = (id: Pestana, texto: string, n?: number) => (
    <button
      role="tab"
      id={`pestana-${id}`}
      aria-selected={actual === id}
      aria-controls="panel-deudas"
      onClick={() => cambiar(id)}
      className={`min-h-11 min-w-0 flex-1 whitespace-nowrap rounded-full px-2 text-sm font-semibold transition-colors sm:px-4 sm:text-[15px] ${actual === id ? "bg-electrico text-white" : "text-gris hover:text-noche"}`}
    >
      {texto} {n !== undefined && <span className="tabular-nums opacity-80">({n})</span>}
    </button>
  );
  return (
    <div role="tablist" aria-label="Deudas" className="flex gap-1 rounded-full bg-niebla p-1">
      {una("debo", "Debo", debo)}
      {una("medeben", "Me deben", medeben)}
      {una("sbs", "Reporte SBS")}
    </div>
  );
}

export function Deudas({ perfil, analisis, pestanaInicial = "debo" }: { perfil: Perfil; analisis: Analisis; pestanaInicial?: PestanaDeudas }) {
  const { datos } = useDatos();
  const [pestana, setPestana] = useState<Pestana>(pestanaInicial);
  const [aviso, setAviso] = useState("");
  const comparacion = analisis.deudas;
  const debo = totalDebo(datos.deudas);
  const meDeben = totalMeDeben(datos.cobros);
  const avisoDeuda = comparacion ? avisos(perfil, analisis).find(a => a.id === "deuda") : undefined;
  const tope = comparacion ? Math.max(comparacion.avalancha.meses, comparacion.minimos.meses, 1) : 1;

  const resumen = (
    <Portada>
      {!comparacion ? (
        <>
          <p className="text-[15px] text-gris">Tus deudas</p>
          <h1 className="mt-1 text-[2rem] font-semibold tracking-[-0.025em] text-noche text-balance">Nada pendiente</h1>
          <p className="mt-3 text-gris">Tu mes depende solo de tus ingresos y tus gastos. Si debes algo, agrégalo y el copiloto arma tu plan.</p>
        </>
      ) : (
        <>
          <p className="text-[15px] text-gris">Que tus deudas bajen</p>
          {comparacion.avalancha.noTermina ? (
            <h1 className="mt-1 text-[1.75rem] font-semibold leading-tight tracking-[-0.025em] text-noche text-balance">
              Con lo que pagas hoy, tus deudas no bajan
            </h1>
          ) : (
            <>
              <p className="mt-1 text-lg text-noche">Pagando en orden, quedas libre en</p>
              <h1 className="mt-1 text-[3.5rem] font-semibold leading-none tracking-[-0.045em] text-noche tabular-nums md:text-[4rem]">
                {comparacion.avalancha.meses}
                <span className="ml-2 text-2xl font-medium tracking-normal text-gris">meses</span>
              </h1>
            </>
          )}
          <div className="mt-7 hidden space-y-4 border-t border-linea pt-6 md:block">
            <Carrera nombre="Pagando en orden" plan={comparacion.avalancha} tope={tope} bueno />
            <Carrera nombre="Pagando solo el mínimo" plan={comparacion.minimos} tope={tope} />
          </div>
          {comparacion.ahorroVsMinimos > 0 && (
            <p className="mt-6 inline-flex flex-wrap items-center gap-2 rounded-full bg-verde-suave px-4 py-2 font-semibold text-verde-fuerte">
              Te ahorras {unido(formatoSoles(comparacion.ahorroVsMinimos))} en intereses
            </p>
          )}
        </>
      )}
    </Portada>
  );

  const lista = (
    <section className={`${tarjeta} aparecer`}>
      <Pestanas actual={pestana} cambiar={setPestana} debo={debo.n} medeben={meDeben.n} />
      <p className="mt-5 text-gris">
        {pestana === "sbs"
          ? "Cómo te ve el sistema financiero y en qué orden conviene pagar."
          : pestana === "debo"
          ? debo.n === 0
            ? "No tienes deudas abiertas."
            : <>Debes en total <span className="font-semibold text-noche tabular-nums">{unido(formatoSoles(debo.total))}</span> en {debo.n} {debo.n === 1 ? "deuda" : "deudas"}.</>
          : meDeben.n === 0
            ? "Nadie te debe por ahora."
            : <>Te deben <span className="font-semibold text-noche tabular-nums">{unido(formatoSoles(meDeben.total))}</span> en {meDeben.n} {meDeben.n === 1 ? "cobro" : "cobros"}.</>}
      </p>
      <div id="panel-deudas" role="tabpanel" aria-labelledby={`pestana-${pestana}`} className="mt-2">
        {pestana === "debo" ? <ListaDebo primeraId={comparacion?.primera?.id ?? null} avisar={setAviso} /> : pestana === "medeben" ? <ListaMeDeben avisar={setAviso} /> : <ReporteSbs analisis={analisis} />}
      </div>
    </section>
  );

  const orden = prioridadDePagos(datos, analisis);
  const resto = comparacion && (
    <div className="order-4 space-y-5">
      {avisoDeuda && <TarjetaAviso aviso={avisoDeuda} />}
      <section className={`${tarjeta} aparecer`}>
        <h2 className="mb-4 text-lg font-semibold text-noche">La diferencia está en cómo pagas</h2>
        <div className="grid grid-cols-2 gap-3">
          <Plan titulo="Pagando en orden" plan={comparacion.avalancha} bueno />
          <Plan titulo="Pagando solo el mínimo" plan={comparacion.minimos} />
        </div>
      </section>
    </div>
  );

  // Dos columnas independientes en escritorio (sin filas compartidas, para que no queden huecos);
  // en celular y iPad vertical, un solo flujo: resumen, lista con «Agregar», orden de pago, aviso y plan.
  return (
    <>
      <div className="flex flex-col xl:grid xl:grid-cols-12 xl:items-start xl:gap-x-8">
        <div className="contents xl:col-span-7 xl:col-start-1 xl:block">
          <div className="order-2 mb-6">{lista}</div>
          {comparacion && pestana !== "sbs" && (
            <div className="order-3 mb-6 xl:mb-0">
              <OrdenDePago r={orden} />
            </div>
          )}
        </div>
        <div className={`contents xl:col-span-5 xl:col-start-8 xl:block ${pestana === "sbs" ? "xl:sticky xl:top-6" : ""}`}>
          <div className="order-1">{resumen}</div>
          {resto}
        </div>
      </div>
      <p role="status" className="sr-only">
        {aviso}
      </p>
    </>
  );
}
