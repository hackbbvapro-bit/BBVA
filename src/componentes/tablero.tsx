"use client";
import { formatoLargo, formatoSoles, type Analisis, type Jugada, type Perfil, type Proyeccion } from "@/motor";
import { enLista, mejorJugada, type Aviso } from "@/explica/explica";
import { GraficoSiTePagan } from "@/componentes/si-te-pagan";
import { Icono, unido } from "@/componentes/ui";
import type { CobroPendiente } from "@/motor";
import { etiquetaVencimiento, proximoVencimiento } from "@/motor/prioridad";

type Props = {
  cobros: CobroPendiente[];
  perfil: Perfil;
  analisis: Analisis;
  aviso: Aviso;
  jugada?: Jugada;
  despues?: Proyeccion;
  elegir: (j: Jugada) => void;
  sonando: boolean;
  alternarVoz: () => void;
};

/** Lo que el motor dice del déficit, ya en palabras. Sin déficit, el aviso principal manda. */
export function pulso(analisis: Analisis) {
  const d = analisis.proyeccion.deficit;
  if (!d) return undefined;
  return {
    fecha: formatoLargo(d.fecha),
    monto: formatoSoles(d.faltante),
    causa: enLista(d.causas.map(c => c.descripcion.toLowerCase())),
    dias: d.diasRestantes,
  };
}

/** Las cuatro cifras de un vistazo; todas salen del motor o de la suma de lo guardado. */
export function cifras(perfil: Perfil, analisis: Analisis): [string, string][] {
  const p = analisis.proyeccion;
  const barata = mejorJugada(analisis);
  const debes = perfil.deudas.reduce((total, d) => total + d.saldo, 0);
  const cuotas = perfil.deudas.reduce((total, d) => total + d.pagoMinimo, 0);
  return [
    ["Hoy tienes", formatoSoles(perfil.saldoActual)],
    ["Deuda de tarjeta de crédito ", formatoSoles(debes)],
    [etiquetaVencimiento(perfil.hoy, proximoVencimiento(perfil.hoy, perfil.deudas.map(d => d.diaPago))), formatoSoles(cuotas)],
    p.deficit && barata
      ? ["La salida más barata", barata.costo === 0 ? "S/ 0.00" : formatoSoles(barata.costo)]
      : ["Al final del mes", formatoSoles(p.saldoFinal)],
  ];
}

function Ondas() {
  return (
    <span className="flex items-center gap-[3px]" aria-hidden="true">
      {[0, 1, 2, 3].map(i => (
        <span key={i} className="onda h-4 w-[3px] rounded-full bg-current" style={{ animationDelay: `${i * 0.12}s` }} />
      ))}
    </span>
  );
}

function Efecto({ despues }: { despues: Proyeccion }) {
  const d = despues.deficit;
  return (
    <p
      className={`aparecer-heroe mt-4 flex items-center gap-3 rounded-2xl px-4 py-3 font-medium ${d === null ? "bg-verde-suave text-verde-fuerte" : "bg-ambar-suave text-ambar-fuerte"}`}
    >
      <span aria-hidden="true">{d === null ? "✓" : "!"}</span>
      {d === null
        ? unido(`Con esta jugada no llegas a rojo. Tu día más bajo: ${formatoSoles(despues.saldoMinimo)}`)
        : unido(`Con esta jugada te faltarían ${formatoSoles(d.faltanteMaximo)}`)}
    </p>
  );
}

function Etiquetas({ j, barata }: { j: Jugada; barata: boolean }) {
  return (
    <>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${j.resuelve ? "bg-verde-suave text-verde-fuerte" : "bg-ambar-suave text-ambar-fuerte"}`}
      >
        {j.resuelve ? "Resuelve el problema" : "Sola no alcanza"}
      </span>
      {barata && <span className="rounded-full bg-agua-suave px-2.5 py-1 text-xs font-semibold text-electrico">La más barata</span>}
    </>
  );
}

/* «Pulso» (ANCLA): estructura de Flex en claro; el aviso es la única superficie azul grande de la app. */
export function Tablero({ cobros, perfil, analisis, aviso, jugada, despues, elegir, sonando, alternarVoz }: Props) {
  const p = pulso(analisis);
  const barata = mejorJugada(analisis)?.id;
  return (
    <div className="mx-auto max-w-[1360px] px-8 pb-16 pt-8 xl:px-10 2xl:px-14">
      <div className="flex items-center justify-between gap-6">
        <div>
          <p className="text-[15px] text-gris">Datos de demostración al {formatoLargo(analisis.hoy)}</p>
          <h1 className="mt-1 text-[2rem] font-semibold leading-tight tracking-[-0.025em] text-noche">Hola, {perfil.nombre}</h1>
        </div>
        <button
          onClick={alternarVoz}
          className="flex min-h-11 items-center gap-2.5 rounded-full border border-linea-fuerte bg-white px-5 text-[15px] font-medium text-noche transition-colors duration-150 hover:border-electrico hover:text-electrico"
        >
          {sonando ? <Ondas /> : <Icono nombre="voz" />}
          {sonando ? "Detener" : "Escuchar el resumen"}
        </button>
      </div>
      <div className="mt-8 grid grid-cols-12 gap-6">
        <section className="aparecer-heroe col-span-12 flex flex-col rounded-[28px] bg-electrico p-10 text-white xl:col-span-7 2xl:p-12">
          <p className="flex w-fit items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-sm font-medium">
            <span className="size-2 rounded-full bg-[#ffb3b8]" aria-hidden="true" />
            {aviso.nivel === "urgente" ? "Anticípate" : aviso.nivel === "bien" ? "Vas por buen camino" : "Tenlo presente"}
          </p>
          {p ? (
            <>
              <p className="mt-8 text-[1.625rem] font-medium leading-snug tracking-[-0.02em] text-white/85">
                El {p.fecha}, te faltarán
              </p>
              <p className="-ml-[0.04em] mt-1 text-[clamp(4.5rem,6.6vw,8rem)] font-semibold leading-[0.95] tracking-[-0.045em] tabular-nums">
                {unido(p.monto)}
              </p>
              <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-white/85">
                Ese día se juntan {p.causa}. Quedan {p.dias} días: todavía estás a tiempo.
              </p>
            </>
          ) : (
            <>
              <p className="mt-8 text-[2.75rem] font-semibold leading-tight tracking-[-0.03em]">{unido(aviso.titulo)}</p>
              <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-white/85">{unido(aviso.cuerpo)}</p>
            </>
          )}
          {analisis.jugadas.length > 0 && (
            <div className="mt-auto pt-8">
              <a
                href="#jugadas"
                className="flex min-h-12 w-fit items-center rounded-full bg-white px-6 text-[15px] font-semibold text-electrico transition-transform duration-150 active:scale-[.97]"
              >
                Ver cómo evitarlo
              </a>
            </div>
          )}
        </section>
        <section className="aparecer col-span-12 rounded-[28px] border border-linea bg-white p-8 xl:col-span-5" style={{ animationDelay: ".08s" }}>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-semibold tracking-[-0.01em] text-noche">Tus próximos 30 días</h2>
            <p className="text-right text-sm text-gris">{jugada ? "Con la jugada que elegiste" : "Así se movería tu saldo"}</p>
          </div>
          <GraficoSiTePagan base={analisis.proyeccion} despues={despues} cobros={cobros} descripcion={`${aviso.titulo}. ${aviso.cuerpo}`} ancho={460} />
          {despues && <Efecto despues={despues} />}
          {!despues && analisis.proyeccion.deficit && (
            <div className="mt-5 border-t border-linea pt-4">
              <p className="text-sm text-gris">Lo que se junta el {formatoLargo(analisis.proyeccion.deficit.fecha)}</p>
              <ul className="mt-2">
                {analisis.proyeccion.deficit.causas.slice(0, 3).map(c => (
                  <li key={`${c.fecha}-${c.descripcion}`} className="flex justify-between gap-4 py-1.5 text-[15px] text-noche">
                    <span>{c.descripcion}</span>
                    <span className="font-medium tabular-nums">{unido(formatoSoles(Math.abs(c.monto)))}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-6 xl:grid-cols-4">
        {cifras(perfil, analisis).map(([titulo, valor]) => (
          <div key={titulo} className="rounded-[22px] border border-linea bg-white p-6">
            <dt className="text-[15px] text-gris">{titulo}</dt>
            <dd className="mt-2 text-[2rem] font-semibold leading-none tracking-[-0.035em] text-noche tabular-nums">{unido(valor)}</dd>
          </div>
        ))}
      </dl>
      {analisis.jugadas.length > 0 && (
        <section id="jugadas" className="mt-14 scroll-mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[1.75rem] font-semibold tracking-[-0.025em] text-noche">Tres jugadas, con su precio</h2>
            <p className="text-gris">Elige una y mira cómo queda tu mes.</p>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            {analisis.jugadas.map(j => {
              const activa = jugada?.id === j.id;
              return (
                <article
                  key={j.id}
                  className={`aparecer flex flex-col rounded-[22px] border bg-white p-7 transition-[border-color,box-shadow] duration-200 ${activa ? "border-electrico shadow-[0_0_0_1px_var(--color-electrico)]" : "border-linea"}`}
                >
                  <div className="flex flex-wrap gap-2">
                    <Etiquetas j={j} barata={barata === j.id} />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold leading-snug tracking-[-0.015em] text-noche">{j.titulo}</h3>
                  <p className="mb-6 mt-2 leading-relaxed text-gris">{j.detalle}</p>
                  <dl className="mt-auto grid grid-cols-2 gap-4 border-t border-linea pt-5">
                    <div>
                      <dt className="text-sm text-gris">Te libera</dt>
                      <dd className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-noche tabular-nums">{unido(formatoSoles(j.libera))}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gris">Te cuesta</dt>
                      <dd className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-noche tabular-nums">
                        {j.costo === 0 ? "S/ 0.00" : unido(formatoSoles(j.costo))}
                      </dd>
                    </div>
                  </dl>
                  <button
                    aria-pressed={activa}
                    onClick={() => elegir(j)}
                    className={`mt-5 min-h-12 rounded-full text-[15px] font-semibold transition-colors duration-150 ${activa ? "border border-electrico bg-white text-electrico" : "bg-electrico text-white hover:bg-marino"}`}
                  >
                    {activa ? "Quitar comparación" : "Probar esta jugada"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}
      <p className="mt-14 text-sm text-gris">Datos de demostración. No es asesoría financiera.</p>
    </div>
  );
}
