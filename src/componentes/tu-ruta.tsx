"use client";

import { ClimaRuta } from "@/componentes/clima-ruta";
import { Encabezado, Icono, botonPrincipal, tarjeta, unido } from "@/componentes/ui";
import { formatoSoles } from "@/motor";
import { contadorDeAvance, type Avance, type IdPaso, type IdRuta, type Ruta } from "@/ruta/ruta";
import { productosDeLaRuta, type Partida, type PlanDelMes, type ProductoDeRuta } from "@/ruta/presupuesto";

/**
 * «Mi ruta»: por dónde empezar según la situación de la persona y cómo va. Todo el texto y las cifras salen
 * del motor (src/ruta/ruta.ts); aquí solo se pinta. Las alternativas son genéricas: sin entidades, tasas ni
 * rendimientos. Marcar un paso solo guarda su identificador en este equipo.
 */

function Barra({ avance }: { avance: Avance }) {
  const pct = avance.total === 0 ? 0 : Math.round((avance.cumplidos / avance.total) * 100);
  return (
    <div
      role="progressbar"
      aria-label="Avance de tu ruta"
      aria-valuemin={0}
      aria-valuemax={avance.total}
      aria-valuenow={avance.cumplidos}
      aria-valuetext={contadorDeAvance(avance)}
      className="h-2 w-full overflow-hidden rounded-full bg-niebla"
    >
      <div
        className="h-full rounded-full bg-electrico transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Tarjeta corta del Inicio: la ruta, cuánto lleva y el paso que sigue. El detalle vive en «Mi ruta». */
export function SiguientePaso({
  ruta,
  avance,
  alAbrir,
}: {
  ruta: Ruta;
  avance: Avance;
  alAbrir: () => void;
}) {
  return (
    <section
      className="aparecer rounded-2xl border border-linea bg-white px-4 py-3.5 md:px-5 md:py-4"
      aria-labelledby="siguiente-paso"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-xs font-semibold uppercase tracking-wide text-electrico">
          Tu ruta{" "}
          <span className="font-medium normal-case tracking-normal text-gris tabular-nums">
            · {contadorDeAvance(avance)}
          </span>
        </p>
        <button
          className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-electrico transition-colors duration-150 hover:bg-agua-suave [&_svg]:size-4"
          onClick={alAbrir}
        >
          Ver mi ruta
          <span aria-hidden="true" className="-rotate-90">
            <Icono nombre="abajo" />
          </span>
        </button>
      </div>
      <h2 id="siguiente-paso" className="mt-0.5 text-base font-semibold leading-snug text-noche text-balance">
        {ruta.titulo}
      </h2>
      <div className="mt-2.5">
        <Barra avance={avance} />
      </div>
      <p className="mt-2.5 text-sm leading-relaxed text-tinta">
        {avance.siguiente ? (
          <>
            <span className="font-semibold text-noche">Siguiente paso: </span>
            {unido(avance.siguiente)}
          </>
        ) : (
          "Marcaste todos los pasos. Si cambian tus datos, la ruta se vuelve a calcular."
        )}
      </p>
    </section>
  );
}

/** Una cifra del mes en la cabecera de la ruta. */
function Dato({
  etiqueta,
  valor,
  nota,
  tono = "text-noche",
}: {
  etiqueta: string;
  valor: string;
  nota: string;
  tono?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-niebla px-3 py-2.5 md:px-4 md:py-3">
      <p className="text-xs font-medium text-gris">{etiqueta}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums md:text-xl ${tono}`}>{unido(valor)}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-gris">{nota}</p>
    </div>
  );
}

const TONO_PARTIDA: Record<Partida["id"], string> = {
  suscripciones: "bg-agua-fuerte",
  "solo-minimos": "bg-ambar",
  "aun-falta": "bg-coral",
  hueco: "bg-ambar",
  colchon: "bg-electrico",
  deuda: "bg-coral",
  "uso-credito": "bg-agua-fuerte",
  "plazo-largo": "bg-verde",
};

/** «Tu presupuesto este mes»: qué hacer con lo libre o de dónde sacar lo que falta. Cifras de planDelMes. */
function Presupuesto({ plan }: { plan: PlanDelMes }) {
  const total = plan.alcanza ? plan.libre : 0;
  return (
    <section className={tarjeta} aria-labelledby="presupuesto">
      <p className="text-xs font-semibold uppercase tracking-wide text-electrico">Tu presupuesto este mes</p>
      <h2
        id="presupuesto"
        className={`mt-1 text-lg font-semibold tabular-nums leading-snug md:text-xl ${plan.alcanza ? "text-noche" : "text-coral-fuerte"}`}
      >
        {unido(plan.titulo)}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-gris">
        {plan.alcanza
          ? "Así se reparte, según tu ruta:"
          : plan.partidas.length > 0
            ? "De dónde puedes sacar plata cada mes:"
            : ""}
      </p>
      {total > 0 && plan.partidas.length > 1 && (
        <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-niebla" aria-hidden="true">
          {plan.partidas.map(p => (
            <span
              key={p.id}
              className={TONO_PARTIDA[p.id]}
              style={{ width: `${(p.monto / total) * 100}%` }}
            />
          ))}
        </div>
      )}
      {plan.partidas.length > 0 && (
        <ul className="mt-3 space-y-3">
          {plan.partidas.map(p => (
            <li key={p.id} className="flex gap-3">
              <span
                aria-hidden="true"
                className={`mt-1.5 size-2.5 shrink-0 rounded-full ${TONO_PARTIDA[p.id]}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 text-sm font-semibold text-noche md:text-[15px]">{unido(p.titulo)}</p>
                  <p
                    className={`shrink-0 text-sm font-semibold tabular-nums md:text-[15px] ${p.id === "aun-falta" ? "text-coral-fuerte" : "text-noche"}`}
                  >
                    {unido(formatoSoles(p.monto))}
                  </p>
                </div>
                <p className="mt-0.5 text-[13px] leading-snug text-gris">{unido(p.detalle)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 rounded-xl bg-niebla px-3 py-2 text-[13px] leading-relaxed text-tinta">
        {unido(plan.nota)}
      </p>
    </section>
  );
}

/** Tarjeta de un tipo de producto: por qué encaja, cuándo y qué preguntar antes de contratar. */
function Producto({ p }: { p: ProductoDeRuta }) {
  const ahora = p.cuando === "ahora";
  return (
    <li className="flex flex-col rounded-2xl border border-linea bg-white p-4 md:p-5">
      <span
        className={`self-start rounded-full px-2.5 py-0.5 text-xs font-semibold ${ahora ? "bg-agua-suave text-agua-fuerte" : "bg-niebla text-gris"}`}
      >
        {ahora ? "Para ahora" : "Más adelante"}
      </span>
      <h3 className="mt-2 text-base font-semibold leading-snug text-noche">{p.entrada.titulo}</h3>
      <p className="mt-1 text-sm leading-relaxed text-tinta">{unido(p.porQue)}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-gris">
        <span className="font-semibold">Para quién: </span>
        {unido(p.entrada.paraQuien)}
      </p>
      <p className="mt-0.5 text-xs leading-relaxed text-gris">
        <span className="font-semibold">Ojo: </span>
        {unido(p.entrada.condicion)}
      </p>
      <div className="mt-3 border-t border-linea pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gris">Qué preguntar en tu banco</p>
        <ul className="mt-1.5 space-y-1">
          {p.preguntas.map(q => (
            <li key={q} className="flex gap-2 text-[13px] leading-snug text-tinta">
              <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-electrico" />
              <span>{q}</span>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

/**
 * Página «Mi ruta» a todo el ancho: cabecera con la ruta y las cifras del mes; pasos a la izquierda y el
 * presupuesto y los motivos a la derecha; abajo, los tipos de producto con lo que conviene preguntar.
 */
export function MiRuta({
  ruta,
  avance,
  alMarcar,
  alConversar,
  plan,
  opciones = [ruta],
  recomendada,
  alElegir,
}: {
  ruta: Ruta;
  avance: Avance;
  alMarcar: (id: IdPaso, hecho: boolean) => void;
  alConversar?: () => void;
  plan?: PlanDelMes;
  opciones?: Ruta[];
  recomendada?: IdRuta;
  alElegir?: (id: IdRuta) => void;
}) {
  const siguiente = avance.pasos.findIndex(p => !p.hecho);
  const { flujo } = ruta;
  const productos = productosDeLaRuta(ruta);
  return (
    <div className="space-y-3 md:space-y-5">
      <Encabezado
        titulo="Mi ruta"
        bajada="Tu plan según tu presupuesto: qué hacer primero, con qué plata y qué productos te sirven."
      />

      <section className={tarjeta} aria-labelledby="elige-ruta">
        <h2 id="elige-ruta" className="text-lg font-semibold text-noche">Elige tu ruta</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {opciones.map(opcion => (
            <button key={opcion.id} type="button" aria-pressed={ruta.id === opcion.id}
              onClick={() => alElegir?.(opcion.id)}
              className={`min-w-0 rounded-xl border-2 p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electrico ${ruta.id === opcion.id ? "border-electrico bg-agua-suave/60" : "border-linea bg-white hover:bg-niebla"}`}>
              {recomendada === opcion.id && <span className="mb-2 block text-xs font-semibold text-electrico">{opcion.id === "estar_en_verde" ? "Recomendada por tu saldo" : "Recomendada"}</span>}
              <span className="block font-semibold text-noche">{opcion.titulo}</span>
              <span className="mt-1 block text-sm leading-relaxed text-gris">{opcion.motivos[0]}</span>
            </button>
          ))}
        </div>
      </section>
      <section
        className={`${tarjeta} grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-8`}
        aria-labelledby="tu-ruta"
      >
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-electrico">Tu ruta</p>
            <p className="text-xs font-semibold text-gris tabular-nums">{contadorDeAvance(avance)}</p>
          </div>
          <h2
            id="tu-ruta"
            className="mt-1 text-xl font-semibold leading-snug text-noche text-balance md:text-2xl"
          >
            {ruta.titulo}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-tinta md:text-[15px]">{unido(ruta.resumen)}</p>
          <div className="mt-3">
            <Barra avance={avance} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 self-center sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <Dato
            etiqueta="Te entra al mes"
            valor={formatoSoles(flujo.ingresos)}
            nota="Sueldo y otros ingresos"
          />
          <Dato
            etiqueta="Te sale al mes"
            valor={formatoSoles(flujo.gastos + flujo.cuotas)}
            nota={`Gastos ${formatoSoles(flujo.gastos)} + cuotas ${formatoSoles(flujo.cuotas)}`}
          />
          <Dato
            etiqueta={flujo.libre < 0 ? "Te falta al mes" : "Te queda al mes"}
            valor={formatoSoles(Math.abs(flujo.libre))}
            nota={flujo.libre < 0 ? "Sale más de lo que entra" : "Lo que puedes mover"}
            tono={flujo.libre < 0 ? "text-coral-fuerte" : "text-verde-fuerte"}
          />
        </div>
      </section>

      <div className="grid gap-3 md:gap-5 lg:grid-cols-3">
        <div className="space-y-3 md:space-y-5 lg:col-span-2">
          <section className={tarjeta} aria-labelledby="tus-pasos">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 id="tus-pasos" className="text-base font-semibold text-noche md:text-lg">
                  Tus pasos, en orden
                </h2>
                <p className="mt-0.5 text-sm text-gris">
                  Toca un paso cuando lo hayas hecho; el asistente sigue desde ahí.
                </p>
              </div>
              <ClimaRuta cumplidos={avance.cumplidos} total={avance.total} />
            </div>
            <ol className="mt-3 space-y-1" aria-labelledby="tus-pasos">
              {avance.pasos.map((p, i) => {
                const toca = i === siguiente;
                return (
                  <li key={p.id}>
                    <label
                      className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl px-3 py-3 transition-colors duration-150 ${toca ? "bg-agua-suave/70" : "hover:bg-niebla"}`}
                    >
                      <input
                        type="checkbox"
                        checked={p.hecho}
                        onChange={e => alMarcar(p.id, e.target.checked)}
                        aria-label={`Paso ${i + 1}: ${p.texto}`}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={`mt-px flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-electrico [&_svg]:size-4 ${p.hecho ? "check-pop border-electrico bg-electrico text-white" : toca ? "border-electrico bg-white text-electrico" : "border-linea bg-white text-gris"}`}
                      >
                        {p.hecho ? <Icono nombre="check" /> : i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        {toca && (
                          <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-electrico">
                            Siguiente
                          </span>
                        )}
                        <span
                          className={`paso-texto block text-sm leading-relaxed md:text-[15px] ${p.hecho ? "text-gris line-through" : "text-tinta"}`}
                        >
                          {unido(p.texto)}
                        </span>
                        {p.hecho && (
                          <span className="mt-0.5 block text-[11px] font-medium text-gris">
                            Hecho · toca para desmarcar
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ol>
            {alConversar && (
              <button className={`${botonPrincipal} mt-4 w-full sm:w-auto`} onClick={alConversar}>
                <Icono nombre="asistente" />
                Conversar con el asistente
              </button>
            )}
          </section>
          {ruta.motivos.length > 0 && (
            <section className={tarjeta} aria-labelledby="motivos">
              <h2 id="motivos" className="text-base font-semibold text-noche">
                Por qué te sirve esta ruta
              </h2>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-tinta">
                {ruta.motivos.map(m => (
                  <li key={m} className="flex gap-2">
                    <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-electrico" />
                    <span>{unido(m)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="space-y-3 md:space-y-5">{plan && <Presupuesto plan={plan} />}</div>
      </div>

      {productos.length > 0 && (
        <section aria-labelledby="productos">
          <div className="px-1">
            <h2 id="productos" className="text-base font-semibold text-noche md:text-lg">
              Productos para tu ruta
            </h2>
            <p className="mt-0.5 text-sm text-gris">
              Tipos de producto que encajan con tu situación. Antes de contratar, compara con estas preguntas.
            </p>
          </div>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {productos.map(p => (
              <Producto key={p.entrada.id} p={p} />
            ))}
          </ul>
        </section>
      )}

      <p className="px-1 text-xs leading-relaxed text-gris">{ruta.aviso}</p>
    </div>
  );
}
