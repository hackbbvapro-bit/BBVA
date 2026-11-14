"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  formatoSoles,
  formatoLargo,
  formatoCorto,
  proyectar,
  type Perfil,
  type Analisis,
  type Jugada,
  type Proyeccion,
} from "@/motor";
import { avisos, mejorJugada, proximosPagos, resumenHablado, type Aviso } from "@/explica/explica";
import { consultarEstado, type EstadoServicios } from "@/cliente/estado";
import { Grafico } from "@/componentes/grafico";
import { boton, tarjeta, Icono, desplazar, unido } from "@/componentes/ui";

export function Hoy({
  perfil,
  analisis,
  sonando,
  leer,
  detener,
}: {
  perfil: Perfil;
  analisis: Analisis;
  sonando: boolean;
  leer: (texto: string) => void;
  detener: () => void;
}) {
  const [jugada, seleccionar] = useState<Jugada>();
  const grafico = useRef<HTMLElement>(null);
  const despues = useMemo(
    () => (jugada ? proyectar(perfil, { ajustes: jugada.ajustes }) : undefined),
    [perfil, jugada],
  );
  const principal = avisos(perfil, analisis)[0];
  return (
    <div className="space-y-6">
      <Cabina perfil={perfil} analisis={analisis} despues={despues} aviso={principal} />
      <section ref={grafico} className={`${tarjeta} aparecer scroll-mt-36`} style={{ animationDelay: ".15s" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Tus próximos 30 días</h2>
            <p className="mt-0.5 text-sm text-gris">
              {jugada ? "Así cambia con la jugada que elegiste" : "Así se movería tu saldo"}
            </p>
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
        <Grafico
          base={analisis.proyeccion}
          despues={despues}
          descripcion={`${principal.titulo}. ${principal.cuerpo}`}
        />
        {jugada && despues && <Resultado key={jugada.id} jugada={jugada} despues={despues} />}
      </section>
      {analisis.jugadas.length > 0 ? (
        <section className="space-y-4">
          <div className="px-1">
            <p className="text-xs font-bold uppercase tracking-widest text-agua-fuerte">Antes de que falte</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">Tus jugadas</h2>
            <p className="mt-1 text-gris">Toca una y mira cómo queda tu mes.</p>
          </div>
          {analisis.jugadas.map((j, i) => (
            <TarjetaJugada
              key={j.id}
              orden={i}
              jugada={j}
              barata={mejorJugada(analisis)?.id === j.id}
              activa={jugada?.id === j.id}
              elegir={() => {
                seleccionar(jugada?.id === j.id ? undefined : j);
                desplazar(grafico.current);
              }}
            />
          ))}
        </section>
      ) : (
        <Pagos analisis={analisis} />
      )}
      <button
        className={`${boton} flex w-full items-center justify-center gap-3 bg-tinta py-4 text-white shadow-[0_14px_30px_-14px_rgb(11_22_38/.6)]`}
        onClick={() => (sonando ? detener() : leer(resumenHablado(perfil, analisis)))}
      >
        <span className={`flex items-center gap-[3px] ${sonando ? "" : "hidden"}`} aria-hidden="true">
          {[0, 1, 2, 3].map(i => (
            <span
              key={i}
              className="onda h-4 w-[3px] rounded-full bg-agua"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </span>
        {!sonando && <Icono nombre="voz" />}
        {sonando ? "Detener" : "Escuchar el resumen"}
      </button>
      <Pie />
    </div>
  );
}

/* ---------- Cabina: saldo, el mes en barras y el aviso principal ---------- */
function Cabina({
  perfil,
  analisis,
  despues,
  aviso,
}: {
  perfil: Perfil;
  analisis: Analisis;
  despues?: Proyeccion;
  aviso: Aviso;
}) {
  const alerta = analisis.proyeccion.deficit !== null;
  return (
    <section
      data-alerta={alerta ? "si" : "no"}
      className="cabina relative -mx-4 -mt-[calc(9rem+env(safe-area-inset-top))] overflow-hidden rounded-b-[2.5rem] px-5 pb-6 pt-[calc(10.5rem+env(safe-area-inset-top))] text-white"
    >
      <div
        className="aurora"
        style={{ background: alerta ? "rgb(255 90 95 / .55)" : "rgb(20 200 180 / .5)" }}
        aria-hidden="true"
      />
      <div className="relative">
        <p className="text-sm font-medium text-white/70">Hoy tienes</p>
        <Saldo key={perfil.id} monto={perfil.saldoActual} />
        <p className="mt-1 text-xs text-white/55">Datos de demostración al {formatoLargo(analisis.hoy)}</p>
        <Mes proyeccion={despues ?? analisis.proyeccion} />
        <AvisoCabina aviso={aviso} />
        <p className="mt-4 text-sm leading-relaxed text-white/70">{perfil.descripcion}</p>
      </div>
    </section>
  );
}

/** Cuenta desde 0 hasta el saldo exacto que dio el motor. Sin JavaScript se ve el valor final. */
function Saldo({ monto }: { monto: number }) {
  const cifra = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const nodo = cifra.current;
    if (!nodo || !window.matchMedia || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Solo cambia el texto en pantalla; el valor final siempre es el del motor.
    const pintar = (valor: number) => (nodo.textContent = unido(formatoSoles(valor)));
    let cuadro = 0;
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const t = Math.min((ahora - inicio) / 1100, 1);
      pintar(t === 1 ? monto : Math.round(monto * (1 - Math.pow(1 - t, 4))));
      if (t < 1) cuadro = requestAnimationFrame(paso);
    };
    pintar(0);
    cuadro = requestAnimationFrame(paso);
    return () => {
      cancelAnimationFrame(cuadro);
      pintar(monto);
    };
  }, [monto]);
  return (
    <h1 className="mt-1 text-[2.9rem] font-semibold leading-none tracking-tight tabular-nums">
      <span ref={cifra} aria-hidden="true">{unido(formatoSoles(monto))}</span>
      <span className="sr-only">{formatoSoles(monto)}</span>
    </h1>
  );
}

/** Los 30 días como barras: arriba de la línea hay dinero, abajo falta. */
function Mes({ proyeccion }: { proyeccion: Proyeccion }) {
  const saldos = proyeccion.dias.map(d => d.saldo);
  const alto = Math.max(...saldos, 0),
    bajo = Math.min(...saldos, 0);
  const rango = Math.max(alto - bajo, 1);
  const cero = (alto / rango) * 100;
  const rojo = proyeccion.deficit?.fecha;
  return (
    <div className="mt-6" aria-hidden="true">
      <div className="relative flex h-20 items-stretch gap-[3px]">
        {proyeccion.dias.map((d, i) => {
          const h = Math.max((Math.abs(d.saldo) / rango) * 100, 2);
          const negativo = d.saldo < 0;
          return (
            <div key={d.fecha} className="relative flex-1">
              <div
                className={`barra absolute inset-x-0 rounded-full ${negativo ? "bg-coral" : d.fecha === rojo ? "bg-ambar" : "bg-agua/80"} ${d.fecha === rojo ? "shadow-[0_0_12px_rgb(255_90_95/.9)]" : ""}`}
                style={{
                  height: `${h}%`,
                  ...(negativo ? { top: `${cero}%`, transformOrigin: "top" } : { bottom: `${100 - cero}%`, transformOrigin: "bottom" }),
                  animationDelay: `${i * 18}ms`,
                }}
              />
            </div>
          );
        })}
        <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-white/30" style={{ top: `${cero}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-medium text-white/55">
        <span>{formatoCorto(proyeccion.dias[0]?.fecha ?? proyeccion.desde)}</span>
        {rojo && <span className="font-bold text-coral">En rojo el {formatoCorto(rojo)}</span>}
        <span>{formatoCorto(proyeccion.hasta)}</span>
      </div>
    </div>
  );
}

const puntos = { urgente: "text-coral", atencion: "text-ambar", bien: "text-agua" };
function AvisoCabina({ aviso }: { aviso: Aviso }) {
  return (
    <article className="vidrio aparecer mt-5 rounded-3xl p-4" style={{ animationDelay: ".35s" }}>
      <p className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest ${puntos[aviso.nivel]}`}>
        <span className="punto-vivo size-2 rounded-full bg-current" aria-hidden="true" />
        {aviso.nivel === "urgente" ? "Anticípate" : aviso.nivel === "bien" ? "Vas por buen camino" : "Tenlo presente"}
      </p>
      <h2 className="mt-2 text-lg font-bold leading-snug text-balance">{unido(aviso.titulo)}</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/80">{unido(aviso.cuerpo)}</p>
      {aviso.cuerpo.includes("TCEA") && <p className="mt-2 text-xs text-white/60">TCEA: lo que te cuesta al año.</p>}
    </article>
  );
}

/* ---------- Resultado de la jugada (todo sale del motor) ---------- */
function Resultado({ jugada, despues }: { jugada: Jugada; despues: Proyeccion }) {
  const deficit = despues.deficit;
  const sinRojo = deficit === null;
  return (
    <div
      className={`aparecer mt-4 flex items-start gap-3 rounded-2xl p-4 ${sinRojo ? "bg-agua-suave text-agua-fuerte" : "bg-ambar-suave text-ambar-fuerte"}`}
    >
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-white/70 text-sm font-bold" aria-hidden="true">
        {sinRojo ? "✓" : "!"}
      </span>
      <div className="min-w-0">
        <p className="font-bold leading-snug">
          {deficit === null
            ? "Con esta jugada no llegas a rojo"
            : unido(`Con esta jugada te faltarían ${formatoSoles(deficit.faltanteMaximo)}`)}
        </p>
        <p className="mt-0.5 text-sm text-tinta/80">
          {sinRojo ? unido(`Tu día más bajo: ${formatoSoles(despues.saldoMinimo)}`) : jugada.titulo}
        </p>
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
      className={`${tarjeta} aparecer relative overflow-hidden transition-shadow duration-300 ${activa ? "ring-2 ring-agua shadow-[0_18px_40px_-18px_rgb(10_125_116/.55)]" : ""}`}
      style={{ animationDelay: `${0.2 + orden * 0.08}s` }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${j.resuelve ? "bg-agua-suave text-agua-fuerte" : "bg-ambar-suave text-ambar-fuerte"}`}
        >
          {j.resuelve ? "Resuelve el problema" : "Sola no alcanza"}
        </span>
        {barata && (
          <span className="rounded-full bg-tinta px-2.5 py-1 text-xs font-bold text-white">La más barata</span>
        )}
      </div>
      <h3 className="mt-3 text-lg font-bold leading-snug tracking-tight">{j.titulo}</h3>
      <p className="mt-1.5 text-[15px] leading-relaxed text-gris">{j.detalle}</p>
      <dl className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-agua-suave/70 p-3">
          <dt className="text-[11px] font-bold uppercase tracking-wider text-agua-fuerte">Libera</dt>
          <dd className="mt-0.5 text-lg font-bold tabular-nums text-tinta">{unido(formatoSoles(j.libera))}</dd>
        </div>
        <div className="rounded-2xl bg-papel p-3">
          <dt className="text-[11px] font-bold uppercase tracking-wider text-gris">{j.costo === 0 ? "Costo" : "Cuesta"}</dt>
          <dd className="mt-0.5 text-lg font-bold tabular-nums text-tinta">
            {j.costo === 0 ? "No cuesta dinero" : unido(formatoSoles(j.costo))}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-sm leading-relaxed text-gris">{unido(j.costoDetalle)}</p>
      {j.costoDetalle.includes("TCEA") && <p className="text-sm text-gris">TCEA: lo que te cuesta al año.</p>}
      <button
        aria-pressed={activa}
        onClick={elegir}
        className={`${boton} mt-4 flex w-full items-center justify-center gap-2 ${activa ? "bg-tinta text-white" : "bg-agua text-noche"}`}
      >
        {activa ? "Quitar comparación" : "Probar esta jugada"}
      </button>
    </article>
  );
}

function Pagos({ analisis }: { analisis: Analisis }) {
  const pagos = proximosPagos(analisis, 7);
  return (
    <section className={`${tarjeta} aparecer`} style={{ animationDelay: ".2s" }}>
      <p className="text-xs font-bold uppercase tracking-widest text-agua-fuerte">Próximos 7 días</p>
      <h2 className="mt-1 mb-2 text-xl font-bold tracking-tight">Lo que sale esta semana</h2>
      {pagos.length ? (
        pagos.map((p, i) => (
          <div key={`${p.fecha}-${i}`} className="flex items-center gap-3 border-t border-linea py-3.5">
            <span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-2xl bg-papel text-center leading-none">
              <span className="text-[10px] font-bold uppercase text-gris">{formatoCorto(p.fecha).split(" ")[1] ?? ""}</span>
              <span className="mt-0.5 text-base font-bold">{formatoCorto(p.fecha).split(" ")[0]}</span>
            </span>
            <p className="min-w-0 flex-1 font-medium">{p.descripcion}</p>
            <p className="shrink-0 font-semibold tabular-nums">{unido(formatoSoles(p.monto))}</p>
          </div>
        ))
      ) : (
        <p className="text-gris">No hay pagos fijos previstos esta semana.</p>
      )}
    </section>
  );
}

function Pie() {
  const [estado, setEstado] = useState<EstadoServicios>();
  useEffect(() => {
    let activo = true;
    void consultarEstado().then(e => {
      if (activo) setEstado(e);
    });
    return () => {
      activo = false;
    };
  }, []);
  return (
    <footer className="px-3 py-4 text-center text-xs text-gris">
      <div className="mb-3 flex justify-center gap-2">
        {(
          [
            ["ia", "IA"],
            ["voz", "Voz"],
            ["push", "Avisos"],
          ] as const
        ).map(([clave, etiqueta]) => (
          <span
            key={clave}
            className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 ring-1 ring-linea"
            title={estado?.[clave] ? "Activo" : "En respaldo"}
          >
            <span className={`size-1.5 rounded-full ${estado?.[clave] ? "bg-agua" : "bg-gris/50"}`} />
            {etiqueta}
            <span className="sr-only">{estado?.[clave] ? "Activo" : "En respaldo"}</span>
          </span>
        ))}
      </div>
      Datos de demostración. No es asesoría financiera.
    </footer>
  );
}
