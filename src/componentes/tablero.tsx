"use client";
import { formatoLargo, formatoSoles, type Analisis, type Jugada, type Perfil, type Proyeccion } from "@/motor";
import { enLista, mejorJugada, type Aviso } from "@/explica/explica";
import { Grafico } from "@/componentes/grafico";
import { Icono, unido } from "@/componentes/ui";

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

function BotonVoz({ sonando, alternarVoz }: { sonando: boolean; alternarVoz: () => void }) {
  return (
    <button
      onClick={alternarVoz}
      className="flex min-h-11 items-center gap-2.5 rounded-full bg-white/10 px-5 text-sm font-semibold text-white ring-1 ring-white/15 transition-colors duration-150 hover:bg-white/15"
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

function Efecto({ despues }: { despues: Proyeccion }) {
  const d = despues.deficit;
  return (
    <p
      className={`aparecer mt-3 flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold ${d === null ? "bg-verde/12 text-verde" : "bg-ambar/15 text-ambar"}`}
    >
      <span aria-hidden="true">{d === null ? "✓" : "!"}</span>
      {d === null
        ? unido(`Con esta jugada no llegas a rojo. Tu día más bajo: ${formatoSoles(despues.saldoMinimo)}`)
        : unido(`Con esta jugada te faltarían ${formatoSoles(d.faltanteMaximo)}`)}
    </p>
  );
}

/* ---------- Tablero de escritorio: titular editorial sobre marino BBVA, sin tarjetas ---------- */
export function Tablero({ perfil, analisis, aviso, jugada, despues, elegir, sonando, alternarVoz }: Props) {
  const p = pulso(analisis);
  const barata = mejorJugada(analisis)?.id;
  const cifras: [string, string][] = [
    ["Hoy tienes", formatoSoles(perfil.saldoActual)],
    [segunda(analisis).titulo, segunda(analisis).valor],
  ];
  return (
    <div className="mx-auto max-w-[1560px] px-12 pb-20 pt-7 text-white 2xl:px-16">
      <div className="flex items-center justify-between border-b border-white/12 pb-4 text-sm">
        <p className="text-white/70">
          {perfil.nombre} · datos de demostración al {formatoLargo(analisis.hoy)}
        </p>
        <BotonVoz sonando={sonando} alternarVoz={alternarVoz} />
      </div>
      <div className="grid grid-cols-12 gap-x-12 pt-10 2xl:pt-14">
        <section className="aparecer col-span-7">
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-coral">
            <span className="punto-vivo size-2 rounded-full bg-current" aria-hidden="true" />
            Pulso de hoy
          </p>
          {p ? (
            <>
              <h1 className="mt-6 text-[clamp(2.25rem,2.9vw,3.5rem)] font-medium leading-[1.04] tracking-[-0.035em]">
                El {p.fecha},<br />
                <span className="text-white/70">te faltarán</span>
              </h1>
              <p className="-ml-[0.06em] mt-1 text-[clamp(6rem,8.4vw,10.5rem)] font-medium leading-[0.92] tracking-[-0.05em] text-coral tabular-nums">
                {unido(p.monto)}
              </p>
              <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-white/75 2xl:text-xl">
                Ese día se juntan {p.causa}. Quedan {p.dias} días: todavía estás a tiempo.
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-6 text-[3.5rem] font-medium leading-[1.04] tracking-[-0.035em]">{unido(aviso.titulo)}</h1>
              <p className="mt-6 max-w-[46ch] text-xl leading-relaxed text-white/75">{unido(aviso.cuerpo)}</p>
            </>
          )}
          <dl className="mt-8 flex gap-14 border-t border-white/12 pt-5">
            {cifras.map(([titulo, valor]) => (
              <div key={titulo}>
                <dt className="text-sm text-white/70">{titulo}</dt>
                <dd className="mt-1 text-[2.5rem] font-medium leading-tight tracking-[-0.04em] tabular-nums">{unido(valor)}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="aparecer col-span-5 self-end" style={{ animationDelay: ".1s" }}>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="shrink-0 text-lg font-medium tracking-[-0.01em]">Tus próximos 30 días</h2>
            <p className="text-right text-sm text-white/70">{jugada ? "Blanco: como vas · Celeste: con la jugada" : "Así se movería tu saldo"}</p>
          </div>
          <Grafico base={analisis.proyeccion} despues={despues} descripcion={`${aviso.titulo}. ${aviso.cuerpo}`} ancho={460} oscuro />
          {despues && <Efecto despues={despues} />}
        </section>
      </div>
      {analisis.jugadas.length > 0 && (
        <section className="mt-12 2xl:mt-16">
          <div className="flex items-baseline justify-between border-b border-white/12 pb-4">
            <h2 className="text-[2rem] font-medium tracking-[-0.03em]">Tres jugadas, con su precio</h2>
            <p className="text-white/70">Elige una y mira cómo queda tu mes.</p>
          </div>
          <div role="table" aria-label="Jugadas para evitar el déficit">
            <div role="row" className="grid grid-cols-[1fr_10rem_10rem_12rem] gap-8 py-3 font-mono text-xs uppercase tracking-[0.14em] text-white/70">
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
                  className={`aparecer grid grid-cols-[1fr_10rem_10rem_12rem] items-center gap-8 border-t border-white/12 py-6 transition-colors duration-150 ${activa ? "bg-white/[.05] shadow-[inset_3px_0_0_var(--color-agua)]" : ""}`}
                  style={{ animationDelay: `${0.2 + i * 0.06}s` }}
                >
                  <div role="cell" className={activa ? "pl-5" : ""}>
                    <p className="flex flex-wrap items-center gap-3 text-xl font-medium tracking-[-0.01em]">
                      {j.titulo}
                      <span className={`font-mono text-xs uppercase tracking-[0.1em] ${j.resuelve ? "text-verde" : "text-ambar"}`}>
                        {j.resuelve ? "Resuelve" : "Sola no alcanza"}
                      </span>
                      {barata === j.id && <span className="font-mono text-xs uppercase tracking-[0.1em] text-agua">· La más barata</span>}
                    </p>
                    <p className="mt-1.5 max-w-[60ch] text-white/70">{j.detalle}</p>
                  </div>
                  <p role="cell" className="text-right text-3xl font-medium tracking-[-0.04em] tabular-nums">{unido(formatoSoles(j.libera))}</p>
                  <p role="cell" className="text-right text-3xl font-medium tracking-[-0.04em] tabular-nums">
                    {j.costo === 0 ? "S/ 0.00" : unido(formatoSoles(j.costo))}
                  </p>
                  <div role="cell" className="text-right">
                    <button
                      aria-pressed={activa}
                      onClick={() => elegir(j)}
                      className={`min-h-11 rounded-full px-5 text-sm font-semibold transition-colors duration-150 ${activa ? "bg-white text-tinta" : "bg-agua text-tinta hover:bg-[#a6d6ff]"}`}
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
      <p className="mt-16 text-sm text-white/70">Datos de demostración. No es asesoría financiera.</p>
    </div>
  );
}
