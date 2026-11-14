"use client";
import { formatoLargo, formatoSoles, type Analisis, type Jugada, type Perfil, type Proyeccion } from "@/motor";
import { enLista, mejorJugada, type Aviso } from "@/explica/explica";
import { Grafico } from "@/componentes/grafico";
import { Icono, unido } from "@/componentes/ui";

export type Direccion = "a" | "b";

type Props = {
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
function pulso(analisis: Analisis) {
  const d = analisis.proyeccion.deficit;
  if (!d) return undefined;
  return {
    fecha: formatoLargo(d.fecha),
    monto: formatoSoles(d.faltante),
    causa: enLista(d.causas.map(c => c.descripcion.toLowerCase())),
    dias: d.diasRestantes,
  };
}

/** Segunda cifra clave: con déficit, lo que cuesta la salida más barata; sin él, el día más bajo. */
function segunda(analisis: Analisis) {
  const barata = mejorJugada(analisis);
  if (analisis.proyeccion.deficit && barata)
    return { titulo: "La salida más barata te cuesta", valor: formatoSoles(barata.costo) };
  const p = analisis.proyeccion;
  return { titulo: `Tu día más bajo · ${formatoLargo(p.fechaSaldoMinimo)}`, valor: formatoSoles(p.saldoMinimo) };
}

function BotonVoz({ sonando, alternarVoz, claro }: { sonando: boolean; alternarVoz: () => void; claro: boolean }) {
  return (
    <button
      onClick={alternarVoz}
      className={`flex min-h-11 items-center gap-2.5 rounded-full px-5 text-sm font-semibold transition-colors duration-150 ${claro ? "bg-tinta text-white hover:bg-tinta-suave" : "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15"}`}
    >
      {sonando ? (
        <span className="flex items-center gap-[3px]" aria-hidden="true">
          {[0, 1, 2, 3].map(i => (
            <span key={i} className="onda h-4 w-[3px] rounded-full bg-agua" style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </span>
      ) : (
        <Icono nombre="voz" />
      )}
      {sonando ? "Detener" : "Escuchar el resumen"}
    </button>
  );
}

function Efecto({ despues, oscuro }: { despues: Proyeccion; oscuro: boolean }) {
  const d = despues.deficit;
  return (
    <p
      className={`aparecer mt-4 flex items-center gap-3 rounded-2xl px-5 py-4 font-semibold ${d === null ? (oscuro ? "bg-agua/15 text-agua" : "bg-agua-suave text-agua-fuerte") : oscuro ? "bg-ambar/15 text-ambar" : "bg-ambar-suave text-ambar-fuerte"}`}
    >
      <span aria-hidden="true">{d === null ? "✓" : "!"}</span>
      {d === null
        ? unido(`Con esta jugada no llegas a rojo. Tu día más bajo: ${formatoSoles(despues.saldoMinimo)}`)
        : unido(`Con esta jugada te faltarían ${formatoSoles(d.faltanteMaximo)}`)}
    </p>
  );
}

/* ---------- Dirección A: tablero claro con cabina oscura (Copilot Money + barra de Linear) ---------- */
export function TableroA({ perfil, analisis, aviso, jugada, despues, elegir, sonando, alternarVoz }: Props) {
  const p = pulso(analisis);
  const barata = mejorJugada(analisis)?.id;
  return (
    <div className="mx-auto grid max-w-[1440px] grid-cols-12 gap-6 px-10 py-10 2xl:px-14">
      <header className="col-span-12 flex items-end justify-between gap-6">
        <div>
          <p className="text-sm font-medium text-gris">Datos de demostración al {formatoLargo(analisis.hoy)}</p>
          <h1 className="mt-1 text-[2rem] font-semibold leading-tight tracking-[-0.02em]">Hola, {perfil.nombre}</h1>
        </div>
        <BotonVoz sonando={sonando} alternarVoz={alternarVoz} claro />
      </header>
      <section
        data-alerta={p ? "si" : "no"}
        className="cabina aparecer relative col-span-8 overflow-hidden rounded-[1.75rem] p-10 text-white"
      >
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-coral">
          <span className="punto-vivo size-2 rounded-full bg-current" aria-hidden="true" />
          Pulso de hoy
        </p>
        {p ? (
          <>
            <p className="mt-6 text-2xl font-medium text-white/80">El {p.fecha} te faltarán</p>
            <p className="mt-2 text-[5.5rem] font-medium leading-none tracking-[-0.045em] text-coral tabular-nums">
              {unido(p.monto)}
            </p>
            <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-white/75">
              Porque ese día se juntan {p.causa}. Te quedan {p.dias} días para evitarlo.
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-6 text-[2.5rem] font-semibold leading-tight tracking-[-0.02em]">{unido(aviso.titulo)}</h2>
            <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-white/75">{unido(aviso.cuerpo)}</p>
          </>
        )}
      </section>
      <dl className="col-span-4 grid gap-6">
        <div className="aparecer rounded-[1.75rem] bg-white p-8 ring-1 ring-linea">
          <dt className="text-sm font-semibold text-gris">Hoy tienes</dt>
          <dd className="mt-2 text-5xl font-medium tracking-[-0.04em] tabular-nums">{unido(formatoSoles(perfil.saldoActual))}</dd>
        </div>
        <div className="aparecer rounded-[1.75rem] bg-white p-8 ring-1 ring-linea" style={{ animationDelay: ".08s" }}>
          <dt className="text-sm font-semibold text-gris">{segunda(analisis).titulo}</dt>
          <dd className="mt-2 text-5xl font-medium tracking-[-0.04em] tabular-nums">{unido(segunda(analisis).valor)}</dd>
        </div>
      </dl>
      <section className="aparecer col-span-12 rounded-[1.75rem] bg-white p-8 ring-1 ring-linea" style={{ animationDelay: ".15s" }}>
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.01em]">Tus próximos 30 días</h2>
            <p className="mt-1 text-gris">{jugada ? "Así cambia con la jugada que elegiste" : "Así se movería tu saldo"}</p>
          </div>
          <div className="flex gap-5 text-sm font-semibold">
            <span className="flex items-center gap-2 text-gris"><span className="h-0.5 w-5 rounded-full bg-tinta" />Como vas</span>
            {jugada && <span className="flex items-center gap-2 text-agua-fuerte"><span className="h-1 w-5 rounded-full bg-agua" />Con esta jugada</span>}
          </div>
        </div>
        <Grafico base={analisis.proyeccion} despues={despues} descripcion={`${aviso.titulo}. ${aviso.cuerpo}`} ancho={1000} />
        {despues && <Efecto despues={despues} oscuro={false} />}
      </section>
      {analisis.jugadas.length > 0 && (
        <section className="col-span-12">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.02em]">Tus jugadas para evitarlo</h2>
              <p className="mt-1 text-gris">Elige una y mira cómo queda tu mes.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {analisis.jugadas.map((j, i) => {
              const activa = jugada?.id === j.id;
              return (
                <article
                  key={j.id}
                  className={`aparecer flex flex-col rounded-[1.75rem] bg-white p-7 ring-1 transition-shadow duration-200 ${activa ? "ring-2 ring-agua-fuerte" : "ring-linea"}`}
                  style={{ animationDelay: `${0.2 + i * 0.06}s` }}
                >
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${j.resuelve ? "bg-agua-suave text-agua-fuerte" : "bg-ambar-suave text-ambar-fuerte"}`}>
                      {j.resuelve ? "Resuelve el problema" : "Sola no alcanza"}
                    </span>
                    {barata === j.id && <span className="rounded-full bg-tinta px-2.5 py-1 text-xs font-bold text-white">La más barata</span>}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold leading-snug">{j.titulo}</h3>
                  <p className="mt-2 flex-1 leading-relaxed text-gris">{j.detalle}</p>
                  <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-linea pt-5">
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[0.1em] text-gris">Te libera</dt>
                      <dd className="mt-1 text-2xl font-medium tabular-nums">{unido(formatoSoles(j.libera))}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[0.1em] text-gris">Te cuesta</dt>
                      <dd className="mt-1 text-2xl font-medium tabular-nums">{j.costo === 0 ? "S/ 0.00" : unido(formatoSoles(j.costo))}</dd>
                    </div>
                  </dl>
                  <button
                    aria-pressed={activa}
                    onClick={() => elegir(j)}
                    className={`mt-6 min-h-11 rounded-2xl px-4 py-3 font-semibold transition-colors duration-150 ${activa ? "bg-tinta text-white" : "bg-agua text-noche hover:bg-agua/85"}`}
                  >
                    {activa ? "Quitar comparación" : "Probar esta jugada"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}
      <p className="col-span-12 text-center text-sm text-gris">Datos de demostración. No es asesoría financiera.</p>
    </div>
  );
}

/* ---------- Dirección B: titular editorial a oscuras, sin tarjetas (Linear + Monarch) ---------- */
export function TableroB({ perfil, analisis, aviso, jugada, despues, elegir, sonando, alternarVoz }: Props) {
  const p = pulso(analisis);
  const barata = mejorJugada(analisis)?.id;
  return (
    <div className="mx-auto max-w-[1440px] px-14 pb-20 pt-12 text-white">
      <div className="flex items-center justify-between border-b border-white/10 pb-5 text-sm">
        <p className="text-white/62">
          {perfil.nombre} · datos de demostración al {formatoLargo(analisis.hoy)}
        </p>
        <BotonVoz sonando={sonando} alternarVoz={alternarVoz} claro={false} />
      </div>
      <div className="grid grid-cols-12 gap-x-10 pt-16">
        <section className="aparecer col-span-8">
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-coral">
            <span className="punto-vivo size-2 rounded-full bg-current" aria-hidden="true" />
            Pulso de hoy
          </p>
          {p ? (
            <>
              <h1 className="mt-8 text-[3.5rem] font-medium leading-[1.02] tracking-[-0.035em]">
                El {p.fecha},<br />
                <span className="text-white/55">te faltarán</span>
              </h1>
              <p className="-ml-[0.06em] mt-2 text-[clamp(6rem,9.4vw,10.5rem)] font-medium leading-[0.9] tracking-[-0.05em] text-coral tabular-nums">
                {unido(p.monto)}
              </p>
              <p className="mt-10 max-w-[46ch] text-xl leading-relaxed text-white/70">
                Ese día se juntan {p.causa}. Quedan {p.dias} días: todavía estás a tiempo.
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-8 text-[3.5rem] font-medium leading-[1.04] tracking-[-0.035em]">{unido(aviso.titulo)}</h1>
              <p className="mt-8 max-w-[46ch] text-xl leading-relaxed text-white/70">{unido(aviso.cuerpo)}</p>
            </>
          )}
        </section>
        <dl className="col-span-4 self-end border-l border-white/10 pl-10">
          {[
            ["Hoy tienes", formatoSoles(perfil.saldoActual), false],
            [segunda(analisis).titulo, segunda(analisis).valor, false],
          ].map(([titulo, valor, rojo], i) => (
            <div key={String(titulo)} className={`py-7 ${i ? "border-t border-white/10" : ""}`}>
              <dt className="text-sm text-white/62">{titulo}</dt>
              <dd className={`mt-2 text-5xl font-medium tracking-[-0.045em] tabular-nums ${rojo ? "text-coral" : ""}`}>{unido(String(valor))}</dd>
            </div>
          ))}
        </dl>
      </div>
      <section className="mt-20 border-t border-white/10 pt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-medium tracking-[-0.01em]">Tus próximos 30 días</h2>
          <p className="text-sm text-white/62">{jugada ? "Blanco: como vas · Agua: con la jugada" : "Así se movería tu saldo"}</p>
        </div>
        <Grafico base={analisis.proyeccion} despues={despues} descripcion={`${aviso.titulo}. ${aviso.cuerpo}`} ancho={1200} oscuro />
        {despues && <Efecto despues={despues} oscuro />}
      </section>
      {analisis.jugadas.length > 0 && (
        <section className="mt-16">
          <div className="flex items-baseline justify-between border-b border-white/10 pb-4">
            <h2 className="text-[2rem] font-medium tracking-[-0.03em]">Tres jugadas, con su precio</h2>
            <p className="text-white/62">Elige una y mira cómo queda tu mes.</p>
          </div>
          <div role="table" aria-label="Jugadas para evitar el déficit">
            <div role="row" className="grid grid-cols-[1fr_10rem_10rem_12rem] gap-8 py-3 font-mono text-xs uppercase tracking-[0.14em] text-white/62">
              <span role="columnheader">Jugada</span>
              <span role="columnheader" className="text-right">Te libera</span>
              <span role="columnheader" className="text-right">Te cuesta</span>
              <span role="columnheader" className="sr-only">Acción</span>
            </div>
            {analisis.jugadas.map((j, i) => {
              const activa = jugada?.id === j.id;
              return (
                <div
                  role="row"
                  key={j.id}
                  className={`aparecer grid grid-cols-[1fr_10rem_10rem_12rem] items-center gap-8 border-t border-white/10 py-7 transition-colors duration-150 ${activa ? "bg-white/[.04] shadow-[inset_3px_0_0_var(--color-agua)]" : ""}`}
                  style={{ animationDelay: `${0.2 + i * 0.06}s` }}
                >
                  <div role="cell" className={activa ? "pl-5" : ""}>
                    <p className="flex flex-wrap items-center gap-3 text-xl font-medium tracking-[-0.01em]">
                      {j.titulo}
                      <span className={`font-mono text-xs uppercase tracking-[0.1em] ${j.resuelve ? "text-agua" : "text-ambar"}`}>
                        {j.resuelve ? "Resuelve" : "Sola no alcanza"}
                      </span>
                      {barata === j.id && <span className="font-mono text-xs uppercase tracking-[0.1em] text-white/62">· La más barata</span>}
                    </p>
                    <p className="mt-1.5 max-w-[60ch] text-white/62">{j.detalle}</p>
                  </div>
                  <p role="cell" className="text-right text-3xl font-medium tracking-[-0.04em] tabular-nums">{unido(formatoSoles(j.libera))}</p>
                  <p role="cell" className="text-right text-3xl font-medium tracking-[-0.04em] tabular-nums">
                    {j.costo === 0 ? "S/ 0.00" : unido(formatoSoles(j.costo))}
                  </p>
                  <div role="cell" className="text-right">
                    <button
                      aria-pressed={activa}
                      onClick={() => elegir(j)}
                      className={`min-h-11 rounded-full px-5 text-sm font-semibold transition-colors duration-150 ${activa ? "bg-white text-noche" : "bg-agua text-noche hover:bg-agua/85"}`}
                    >
                      {activa ? "Quitar" : "Probar jugada"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
      <p className="mt-16 text-sm text-white/62">Datos de demostración. No es asesoría financiera.</p>
    </div>
  );
}
