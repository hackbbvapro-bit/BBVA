"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatoSoles, type Perfil, type Analisis, type PlanDeudas } from "@/motor";
import { avisos } from "@/explica/explica";
import { tarjeta, TarjetaAviso, unido, Encabezado, Icono, botonPrincipal, botonSecundario, desplazar } from "@/componentes/ui";
import { Adjuntar } from "@/componentes/documento";
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
      <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px] md:text-sm">
        <span className={bueno ? "font-semibold text-noche" : "text-gris"}>{nombre}</span>
        <span className={`tabular-nums ${bueno ? "font-semibold text-electrico" : "text-gris"}`}>
          {plan.noTermina ? "No termina" : <>{plan.meses} meses · {unido(formatoSoles(plan.interesTotal))}</>}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-niebla md:h-3">
        <div
          className={`barra h-full origin-left rounded-full ${bueno ? "bg-electrico" : "bg-linea-fuerte"}`}
          style={{ width: `${ancho}%`, animationName: "estirar" }}
        />
      </div>
    </div>
  );
}

export type PestanaDeudas = "debo" | "medeben" | "sbs";
type Pestana = PestanaDeudas;

function Pestanas({ actual, cambiar, debo, medeben }: { actual: Pestana; cambiar: (p: Pestana) => void; debo: number; medeben: number }) {
  const una = (id: Pestana, texto: ReactNode, n?: number) => (
    <button
      role="tab"
      id={`pestana-${id}`}
      aria-selected={actual === id}
      aria-controls="panel-deudas"
      onClick={() => cambiar(id)}
      className={`min-h-10 min-w-0 whitespace-nowrap rounded-full px-2 text-[13px] font-semibold transition-colors md:min-h-11 md:px-4 md:text-sm xl:text-[15px] ${actual === id ? "bg-electrico text-white" : "text-gris hover:text-noche"}`}
    >
      {texto} {n !== undefined && <span className="tabular-nums opacity-80">({n})</span>}
    </button>
  );
  return (
    <div role="tablist" aria-label="Deudas" className="grid grid-cols-3 gap-1 rounded-full bg-niebla p-1">
      {una("debo", "Debo", debo)}
      {una("medeben", "Me deben", medeben)}
      {una("sbs", <><span className="md:hidden">Clasificación</span><span className="hidden md:inline">Simulación de clasificación</span></>)}
    </div>
  );
}

export type AbrirDeudas = "agregar" | "escanear";

export function Deudas({
  perfil,
  analisis,
  pestanaInicial = "debo",
  abrirAlEntrar,
}: {
  perfil: Perfil;
  analisis: Analisis;
  pestanaInicial?: PestanaDeudas;
  /** Abre al entrar el formulario de nueva deuda o el reporte de ejemplo (desde Inicio o el botón «Agregar» del celular). */
  abrirAlEntrar?: AbrirDeudas;
}) {
  const { datos } = useDatos();
  const [pestana, setPestana] = useState<Pestana>(abrirAlEntrar === "agregar" ? "debo" : pestanaInicial);
  const [aviso, setAviso] = useState("");
  const [abrirNuevo, setAbrirNuevo] = useState(abrirAlEntrar === "agregar" ? 1 : 0);
  const [escaner, setEscaner] = useState(abrirAlEntrar === "escanear");
  const refEscaner = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (escaner) desplazar(refEscaner.current);
  }, [escaner]);
  function agregar() {
    setEscaner(false);
    setPestana("debo");
    setAbrirNuevo(n => n + 1);
  }
  const comparacion = analisis.deudas;
  const debo = totalDebo(datos.deudas);
  const meDeben = totalMeDeben(datos.cobros);
  const avisoDeuda = comparacion ? avisos(perfil, analisis).find(a => a.id === "deuda") : undefined;
  const tope = comparacion ? Math.max(comparacion.avalancha.meses, comparacion.minimos.meses, 1) : 1;

  const resumen = (
    <section className={`${tarjeta} aparecer`} aria-labelledby="resumen-deudas">
      {!comparacion ? (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-gris">Tus deudas</p>
          <h2 id="resumen-deudas" className="mt-1 text-lg font-semibold text-noche md:text-[1.5rem]">Nada pendiente</h2>
          <p className="mt-1.5 text-sm text-gris md:text-base">Tu mes depende solo de tus ingresos y tus gastos. Si debes algo, agrégalo y el copiloto arma tu plan.</p>
        </>
      ) : (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-gris">Que tus deudas bajen</p>
          {comparacion.avalancha.noTermina ? (
            <h2 id="resumen-deudas" className="mt-1 text-lg font-semibold leading-tight text-noche text-balance md:text-[1.375rem]">
              Con lo que pagas hoy, tus deudas no bajan
            </h2>
          ) : (
            <div className="mt-1 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
              <h2 id="resumen-deudas" className="text-sm font-normal text-noche md:text-[15px]">
                Pagando en orden terminas en
                <span className="block text-[2rem] font-semibold leading-none tracking-[-0.03em] tabular-nums md:text-[2.25rem]">
                  {comparacion.avalancha.meses}
                  <span className="ml-1.5 text-base font-medium tracking-normal text-gris md:text-lg">meses</span>
                </span>
              </h2>
              {comparacion.ahorroVsMinimos > 0 && (
                <p className="rounded-xl bg-verde-suave px-3 py-1.5 text-[13px] font-semibold leading-snug text-verde-fuerte md:text-sm">
                  Te ahorrarías cerca de {unido(formatoSoles(comparacion.ahorroVsMinimos))} en intereses (estimado)
                </p>
              )}
            </div>
          )}
          <div className="mt-4 space-y-3 border-t border-linea pt-4 md:mt-6 md:space-y-4 md:pt-5">
            <Carrera nombre="Pagando en orden" plan={comparacion.avalancha} tope={tope} bueno />
            <Carrera nombre="Pagando solo el mínimo" plan={comparacion.minimos} tope={tope} />
          </div>
          <p className="mt-3 text-[11px] leading-snug text-gris md:text-xs">
            Meses e intereses estimados por el código con las tasas y los pagos del caso, si no cambian. Tu entidad puede cobrar distinto.
          </p>
        </>
      )}
    </section>
  );

  const lista = (
    <section className={`${tarjeta} aparecer`}>
      <Pestanas actual={pestana} cambiar={setPestana} debo={debo.n} medeben={meDeben.n} />
      <p className="mt-3 text-sm text-gris md:mt-5 md:text-base">
        {pestana === "sbs"
          ? "Clasificación simulada según los días de atraso del caso y en qué orden conviene pagar."
          : pestana === "debo"
          ? debo.n === 0
            ? "No tienes deudas abiertas."
            : <>Debes en total <span className="font-semibold text-noche tabular-nums">{unido(formatoSoles(debo.total))}</span> en {debo.n} {debo.n === 1 ? "deuda" : "deudas"}.</>
          : meDeben.n === 0
            ? "Nadie te debe por ahora."
            : <>Te deben <span className="font-semibold text-noche tabular-nums">{unido(formatoSoles(meDeben.total))}</span> en {meDeben.n} {meDeben.n === 1 ? "cobro" : "cobros"}.</>}
      </p>
      <div id="panel-deudas" role="tabpanel" aria-labelledby={`pestana-${pestana}`} className="mt-2">
        {pestana === "debo" ? <ListaDebo primeraId={comparacion?.primera?.id ?? null} avisar={setAviso} abrirNuevo={abrirNuevo} /> : pestana === "medeben" ? <ListaMeDeben avisar={setAviso} /> : <ReporteSbs analisis={analisis} />}
      </div>
    </section>
  );

  const orden = prioridadDePagos(datos, analisis);
  // El aviso repite lo que ya dicen el resumen y «Qué pagar primero»: en el celular sobra; en escritorio acompaña.
  const resto = avisoDeuda && (
    <div className="order-4 hidden md:block">
      <TarjetaAviso aviso={avisoDeuda} />
    </div>
  );

  // Dos columnas independientes en escritorio (sin filas compartidas, para que no queden huecos);
  // en celular y iPad vertical, un solo flujo: resumen, lista con «Agregar», orden de pago, aviso y plan.
  return (
    <>
      <Encabezado
        titulo="Deudas"
        bajada="Lo que debes, lo que te deben y en qué orden pagar."
        acciones={
          <div className="grid w-full grid-cols-2 gap-2 lg:flex lg:w-auto">
            <button onClick={agregar} className={botonPrincipal}>
              <Icono nombre="mas" />
              Agregar deuda
            </button>
            <button onClick={() => setEscaner(e => !e)} aria-expanded={escaner} aria-controls="escaner" className={botonSecundario}>
              <Icono nombre="camara" />
              <span className="md:hidden">Ver ejemplo</span>
              <span className="hidden md:inline">Cargar reporte de ejemplo</span>
            </button>
          </div>
        }
      />
      {escaner && (
        <div id="escaner" ref={refEscaner} className="relative mb-4 scroll-mt-6 md:mb-6">
          <button
            onClick={() => setEscaner(false)}
            aria-label="Cerrar el reporte de ejemplo"
            className="absolute right-3 top-3 z-10 flex size-10 items-center justify-center rounded-full text-gris transition-colors hover:bg-niebla hover:text-noche"
          >
            <Icono nombre="cerrar" />
          </button>
          <Adjuntar
            alGuardar={() => {
              setEscaner(false);
              setPestana("debo");
            }}
          />
        </div>
      )}
      <div className="flex flex-col xl:grid xl:grid-cols-12 xl:items-start xl:gap-x-8">
        <div className="contents xl:col-span-7 xl:col-start-1 xl:block">
          <div className="order-2 mb-3 md:mb-6">{lista}</div>
          {comparacion && pestana !== "sbs" && (
            <div className="order-3 mb-3 md:mb-6 xl:mb-0">
              <OrdenDePago r={orden} />
            </div>
          )}
        </div>
        <div className={`contents xl:col-span-5 xl:col-start-8 xl:block ${pestana === "sbs" ? "xl:sticky xl:top-6" : ""}`}>
          <div className="order-1 mb-3 md:mb-6">{resumen}</div>
          {resto}
        </div>
      </div>
      <p role="status" className="sr-only">
        {aviso}
      </p>
    </>
  );
}
