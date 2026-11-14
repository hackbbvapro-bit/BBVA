"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatoSoles,
  formatoLargo,
  formatoCorto,
  proyectar,
  type Perfil,
  type Analisis,
  type Jugada,
  type Proyeccion,
  type CobroPendiente,
} from "@/motor";
import { avisos, mejorJugada, proximosPagos, resumenHablado } from "@/explica/explica";
import { consultarEstado, type EstadoServicios } from "@/cliente/estado";
import { GraficoSiTePagan } from "@/componentes/si-te-pagan";
import { Encabezado, Icono, Kpi, botonPrincipal, botonSecundario, desplazar, unido, type NombreIcono } from "@/componentes/ui";
import { cifras, pulso } from "@/componentes/tablero";

/** A dónde puede mandar el Inicio (lo resuelve el armazón). */
export type IrDesdeInicio = "agregar-deuda" | "dinero" | "deudas" | "asistente";

const ICONOS_KPI: NombreIcono[] = ["dinero", "deudas", "calendario", "tendencia"];

export function Hoy({
  perfil,
  analisis,
  cobros = [],
  sonando,
  leer,
  detener,
  ir,
  demo = true,
  pasos,
}: {
  cobros?: CobroPendiente[];
  perfil: Perfil;
  analisis: Analisis;
  sonando: boolean;
  leer: (texto: string) => void;
  detener: () => void;
  ir?: (a: IrDesdeInicio) => void;
  /** Caso de ejemplo (Rosa, inventada) o caso de práctica (simulación que no sale del equipo). */
  demo?: boolean;
  /** Solo en el caso de práctica: qué pasos de la guía ya hizo. La guía se muestra hasta completar los dos. */
  pasos?: { deudas: boolean; fijos: boolean };
}) {
  const [jugada, seleccionar] = useState<Jugada>();
  const grafico = useRef<HTMLElement>(null);
  const despues = useMemo(() => (jugada ? proyectar(perfil, { ajustes: jugada.ajustes }) : undefined), [perfil, jugada]);
  const principal = avisos(perfil, analisis)[0];
  const alternarVoz = () => (sonando ? detener() : leer(resumenHablado(perfil, analisis)));
  const barata = mejorJugada(analisis);
  const kpis = cifras(perfil, analisis);
  const d = analisis.proyeccion.deficit;

  return (
    <div className="space-y-6">
      <Encabezado
        titulo={`Hola, ${perfil.nombre}`}
        bajada={demo ? `Caso de ejemplo (datos sintéticos) al ${formatoLargo(analisis.hoy)}` : `Caso de práctica al ${formatoLargo(analisis.hoy)}`}
        acciones={demo ? (
          <button className={botonSecundario} onClick={alternarVoz} aria-pressed={sonando}>
            {sonando ? (
              <span className="flex items-center gap-[3px]" aria-hidden="true">
                {[0, 1, 2, 3].map(i => (
                  <span key={i} className="onda h-4 w-[3px] rounded-full bg-electrico" style={{ animationDelay: `${i * 0.12}s` }} />
                ))}
              </span>
            ) : (
              <Icono nombre="voz" />
            )}
            {sonando ? "Detener" : "Escuchar resumen"}
          </button>
        ) : undefined}
      />

      {pasos && !(pasos.deudas && pasos.fijos) && <Empezar ir={ir} hechos={pasos} />}

      {/* Alerta principal: compacta, blanca, con un filo de color según la urgencia. */}
      <section
        aria-label="Alerta principal"
        className={`aparecer rounded-2xl border border-linea border-l-4 bg-white p-5 md:p-6 ${principal.nivel === "urgente" ? "border-l-coral-fuerte" : principal.nivel === "bien" ? "border-l-verde-fuerte" : "border-l-ambar-fuerte"}`}
      >
        <p
          className={`flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.06em] ${principal.nivel === "urgente" ? "text-coral-fuerte" : principal.nivel === "bien" ? "text-verde-fuerte" : "text-ambar-fuerte"}`}
        >
          <span className="size-2 rounded-full bg-current" aria-hidden="true" />
          {principal.nivel === "urgente" ? "Anticípate" : principal.nivel === "bien" ? "Vas por buen camino" : "Tenlo presente"}
        </p>
        {d ? (
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[15px] text-gris">El {formatoLargo(d.fecha)} te faltarán</p>
              <p className="mt-1 text-[2rem] font-semibold leading-none tracking-[-0.03em] text-noche tabular-nums md:text-[2.25rem]">
                {unido(formatoSoles(d.faltante))}
              </p>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-tinta">
                Ese día se juntan {pulso(analisis)?.causa}. Quedan {d.diasRestantes} días: todavía estás a tiempo.
              </p>
            </div>
            {analisis.jugadas.length > 0 && (
              <button className={`${botonPrincipal} lg:shrink-0`} onClick={() => desplazar(document.getElementById("como-evitarlo"))}>
                <Icono nombre="rumbo" />
                Ver cómo evitarlo
              </button>
            )}
          </div>
        ) : (
          <>
            <h2 className="mt-2 text-xl font-semibold leading-snug text-noche text-balance">{unido(principal.titulo)}</h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-tinta">{unido(principal.cuerpo)}</p>
          </>
        )}
      </section>

      {/* Cifras de un vistazo. */}
      <section aria-label="Cifras del mes" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(([titulo, valor], i) => (
          <Kpi
            key={titulo}
            icono={ICONOS_KPI[i]}
            etiqueta={titulo}
            valor={valor}
            tono={i === 3 ? (d ? "ambar" : "verde") : "azul"}
            nota={i === 3 && d && barata ? barata.titulo : undefined}
          />
        ))}
      </section>

      {/* Proyección (2/3) + lo que sale esta semana (1/3). */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section ref={grafico} className="aparecer scroll-mt-24 rounded-2xl border border-linea bg-white p-5 md:p-6 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-noche">Tus próximos 30 días</h2>
              <p className="mt-0.5 text-sm text-gris">{jugada ? "Así cambia con la jugada que elegiste" : "Así se movería tu saldo"}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5 pt-1 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-gris">
                <span className="h-0.5 w-4 rounded-full bg-tinta" />
                Como vas
              </span>
              {jugada && (
                <span className="aparecer flex items-center gap-1.5 text-agua-fuerte">
                  <span className="h-1 w-4 rounded-full bg-agua" />
                  Con esta jugada
                </span>
              )}
            </div>
          </div>
          {/* Dos proporciones: angosta en celular, ancha en escritorio (el SVG escala con su viewBox). */}
          <div className="lg:hidden">
            <GraficoSiTePagan base={analisis.proyeccion} despues={despues} cobros={cobros} descripcion={`${principal.titulo}. ${principal.cuerpo}`} fondo="white" />
          </div>
          <div className="hidden lg:block">
            <GraficoSiTePagan base={analisis.proyeccion} despues={despues} cobros={cobros} descripcion={`${principal.titulo}. ${principal.cuerpo}`} ancho={640} fondo="white" />
          </div>
          {jugada && despues && <Resultado key={jugada.id} jugada={jugada} despues={despues} />}
        </section>
        <Pagos analisis={analisis} />
      </div>

      {analisis.jugadas.length > 0 && (
        <section id="como-evitarlo" aria-labelledby="titulo-evitar" className="scroll-mt-24 space-y-4">
          <div>
            <h2 id="titulo-evitar" className="text-xl font-semibold tracking-[-0.015em] text-noche">Cómo evitarlo</h2>
            <p className="mt-1 text-[15px] text-gris">Cada opción con su costo en soles. Prueba una y mira cómo queda tu mes.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {analisis.jugadas.map((j, i) => (
              <TarjetaJugada
                key={j.id}
                orden={i}
                jugada={j}
                barata={barata?.id === j.id}
                activa={jugada?.id === j.id}
                elegir={() => {
                  seleccionar(jugada?.id === j.id ? undefined : j);
                  desplazar(grafico.current);
                }}
              />
            ))}
          </div>
        </section>
      )}
      <Pie demo={demo} />
    </div>
  );
}

/* ---------- Guía para quien recién puso sus datos ---------- */
function Empezar({ ir, hechos }: { ir?: (a: IrDesdeInicio) => void; hechos: { deudas: boolean; fijos: boolean } }) {
  const pasos: [NombreIcono, string, string, string, IrDesdeInicio, boolean][] = [
    ["deudas", "Agrega tus deudas", "Tarjetas, préstamos o lo que debas a alguien. Usa cifras inventadas: es una simulación.", "Agregar deuda", "agregar-deuda", hechos.deudas],
    ["dinero", "Agrega tu sueldo y gastos fijos", "Con su día de cobro o de pago. Hasta entonces, la proyección no cuenta tu sueldo.", "Ingresos y gastos", "dinero", hechos.fijos],
  ];
  const faltan = pasos.filter(p => !p[5]).length;
  return (
    <section aria-label="Primeros pasos" className="aparecer rounded-2xl border border-linea bg-white p-5 md:p-6">
      <h2 className="text-lg font-semibold text-noche">{faltan === 2 ? "Completa tu mes en 2 pasos" : "Te falta 1 paso para completar tu mes"}</h2>
      <p className="mt-1 text-[15px] text-gris">Con el saldo ya proyecto 30 días. Con las deudas y los gastos fijos del caso, el aviso sale completo.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {pasos.map(([icono, titulo, texto, accion, destino, hecho]) => (
          <div key={titulo} className={`flex flex-col gap-3 rounded-xl border p-4 ${hecho ? "border-verde/40 bg-verde-suave/40" : "border-linea"}`}>
            <div className="flex gap-3">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5 ${hecho ? "bg-verde-suave text-verde-fuerte" : "bg-agua-suave text-electrico"}`}>
                {hecho ? <span aria-hidden="true" className="text-lg font-bold">✓</span> : <Icono nombre={icono} />}
              </span>
              <span>
                <span className="block font-semibold text-noche">
                  {titulo}
                  {hecho && <span className="sr-only"> (hecho)</span>}
                </span>
                <span className="block text-sm leading-snug text-gris">{hecho ? "Listo. Puedes agregar más cuando quieras." : texto}</span>
              </span>
            </div>
            {ir && (
              <button className={`${hecho ? botonSecundario : botonPrincipal} mt-auto self-start`} onClick={() => ir(destino)}>
                <Icono nombre="mas" />
                {accion}
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Resultado de la jugada (todo sale del motor) ---------- */
function Resultado({ jugada, despues }: { jugada: Jugada; despues: Proyeccion }) {
  const deficit = despues.deficit;
  const sinRojo = deficit === null;
  return (
    <div className={`aparecer mt-4 flex items-start gap-3 rounded-xl p-4 ${sinRojo ? "bg-verde-suave text-verde-fuerte" : "bg-ambar-suave text-ambar-fuerte"}`}>
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-white/70 text-sm font-bold" aria-hidden="true">
        {sinRojo ? "✓" : "!"}
      </span>
      <div className="min-w-0">
        <p className="font-semibold leading-snug">
          {deficit === null ? "Con esta jugada no llegas a rojo" : unido(`Con esta jugada te faltarían ${formatoSoles(deficit.faltanteMaximo)}`)}
        </p>
        <p className="mt-0.5 text-sm text-tinta/80">{sinRojo ? unido(`Tu día más bajo: ${formatoSoles(despues.saldoMinimo)}`) : jugada.titulo}</p>
      </div>
    </div>
  );
}

function TarjetaJugada({
  jugada: j,
  orden,
  barata,
  activa,
  elegir,
}: {
  jugada: Jugada;
  orden: number;
  barata: boolean;
  activa: boolean;
  elegir: () => void;
}) {
  return (
    <article
      className={`aparecer flex flex-col rounded-2xl border bg-white p-5 transition-shadow duration-200 ${activa ? "border-electrico ring-1 ring-electrico" : "border-linea"}`}
      style={{ animationDelay: `${orden * 0.04}s` }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${j.resuelve ? "bg-verde-suave text-verde-fuerte" : "bg-ambar-suave text-ambar-fuerte"}`}>
          {j.resuelve ? "Resuelve el problema" : "Sola no alcanza"}
        </span>
        {barata && <span className="rounded-full bg-agua-suave px-2.5 py-1 text-xs font-semibold text-electrico">La más barata</span>}
      </div>
      <h3 className="mt-3 text-base font-semibold leading-snug text-noche">{j.titulo}</h3>
      <p className="mt-1 text-sm leading-relaxed text-gris">{j.detalle}</p>
      <dl className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-agua-suave/60 p-3">
          <dt className="text-xs font-medium text-agua-fuerte">Te libera</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-noche">{unido(formatoSoles(j.libera))}</dd>
        </div>
        <div className="rounded-xl bg-papel p-3">
          <dt className="text-xs font-medium text-gris">Te cuesta</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-noche">{j.costo === 0 ? "No cuesta dinero" : unido(formatoSoles(j.costo))}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[13px] leading-relaxed text-gris">{unido(j.costoDetalle)}</p>
      {j.costoDetalle.includes("TCEA") && <p className="text-[13px] text-gris">TCEA: lo que te cuesta al año.</p>}
      <div className="mt-auto pt-4">
        <button aria-pressed={activa} onClick={elegir} className={`${activa ? botonSecundario : botonPrincipal} w-full`}>
          {activa ? "Quitar comparación" : "Probar esta jugada"}
        </button>
      </div>
    </article>
  );
}

function Pagos({ analisis }: { analisis: Analisis }) {
  const pagos = proximosPagos(analisis, 7);
  return (
    <section className="aparecer rounded-2xl border border-linea bg-white p-5 md:p-6" style={{ animationDelay: ".1s" }}>
      <p className="text-[13px] font-medium text-agua-fuerte">Próximos 7 días</p>
      <h2 className="mt-0.5 mb-2 text-lg font-semibold tracking-tight text-noche">Lo que sale esta semana</h2>
      {pagos.length ? (
        pagos.map((p, i) => (
          <div key={`${p.fecha}-${i}`} className="flex items-center gap-3 border-t border-linea py-3">
            <span className="flex size-10 shrink-0 flex-col items-center justify-center rounded-xl bg-papel text-center leading-none">
              <span className="text-[10px] font-semibold uppercase text-gris">{formatoCorto(p.fecha).split(" ")[1] ?? ""}</span>
              <span className="mt-0.5 text-[15px] font-semibold text-noche">{formatoCorto(p.fecha).split(" ")[0]}</span>
            </span>
            <p className="min-w-0 flex-1 text-[15px] font-medium text-noche">{p.descripcion}</p>
            <p className="shrink-0 text-[15px] font-semibold tabular-nums text-noche">{unido(formatoSoles(p.monto))}</p>
          </div>
        ))
      ) : (
        <p className="border-t border-linea pt-3 text-[15px] text-gris">No hay pagos fijos previstos esta semana.</p>
      )}
    </section>
  );
}

function Pie({ demo }: { demo: boolean }) {
  const [estado, setEstado] = useState<EstadoServicios>();
  useEffect(() => {
    // En el caso de práctica no se consulta nada al servidor: los servicios externos no se usan.
    if (!demo) return;
    let activo = true;
    void consultarEstado().then(e => {
      if (activo) setEstado(e);
    });
    return () => {
      activo = false;
    };
  }, [demo]);
  return (
    <footer className="flex flex-col items-center gap-3 border-t border-linea pt-5 text-xs text-gris sm:flex-row sm:justify-between">
      <div className="flex gap-2">
        {!demo && <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-linea">Sin servicios externos</span>}
        {demo && (
          [
            ["ia", "IA"],
            ["voz", "Voz"],
            ["push", "Avisos"],
          ] as const
        ).map(([clave, etiqueta]) => (
          <span key={clave} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 ring-1 ring-linea" title={estado?.[clave] ? "Activo" : "En respaldo"}>
            <span className={`size-1.5 rounded-full ${estado?.[clave] ? "bg-agua" : "bg-gris/50"}`} />
            {etiqueta}
            <span className="sr-only">{estado?.[clave] ? "Activo" : "En respaldo"}</span>
          </span>
        ))}
      </div>
      <p>{demo ? "Datos sintéticos de ejemplo. " : "Caso de práctica: nada sale de este equipo. "}Simulación educativa, no asesoría financiera.</p>
    </footer>
  );
}
