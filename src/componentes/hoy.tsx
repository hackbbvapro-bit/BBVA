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
} from "@/motor";
import { avisos, mejorJugada, proximosPagos, resumenHablado, type Aviso } from "@/explica/explica";
import { consultarEstado, type EstadoServicios } from "@/cliente/estado";
import { Grafico } from "@/componentes/grafico";
import { boton, tarjeta, Icono, desplazar, unido } from "@/componentes/ui";
import { Tablero, cifras, pulso } from "@/componentes/tablero";

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
  const alternarVoz = () => (sonando ? detener() : leer(resumenHablado(perfil, analisis)));
  return (
    <>
    <div className="hidden lg:block">
      <Tablero
        perfil={perfil}
        analisis={analisis}
        aviso={principal}
        jugada={jugada}
        despues={despues}
        elegir={j => seleccionar(jugada?.id === j.id ? undefined : j)}
        sonando={sonando}
        alternarVoz={alternarVoz}
      />
    </div>
    <div className="space-y-6 md:mx-auto md:max-w-xl md:px-6 md:py-10 lg:hidden">
      <Pulso perfil={perfil} analisis={analisis} despues={despues} aviso={principal} />
      <section
        ref={grafico}
        className={`${tarjeta} aparecer scroll-mt-36`}
        style={{ animationDelay: ".15s" }}
      >
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
          fondo="white"
        />
        {jugada && despues && <Resultado key={jugada.id} jugada={jugada} despues={despues} />}
      </section>
      {analisis.jugadas.length > 0 ? (
        <section className="space-y-4">
          <div className="px-1">
            <h2 className="text-2xl font-semibold tracking-[-0.025em] text-noche">Tus jugadas</h2>
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
        className={`${boton} flex w-full items-center justify-center gap-3 rounded-full border border-linea-fuerte bg-white py-4 text-noche`}
        onClick={alternarVoz}
      >
        <span className={`flex items-center gap-[3px] ${sonando ? "" : "hidden"}`} aria-hidden="true">
          {[0, 1, 2, 3].map(i => (
            <span
              key={i}
              className="onda h-4 w-[3px] rounded-full bg-electrico"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </span>
        {!sonando && <Icono nombre="voz" />}
        {sonando ? "Detener" : "Escuchar el resumen"}
      </button>
      <Pie />
    </div>
    </>
  );
}

/* ---------- Celular e iPad: la tarjeta del pulso (única superficie azul) y la franja compacta de cifras ---------- */
function Pulso({
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
  const d = analisis.proyeccion.deficit;
  return (
    <>
      <header className="px-1">
        <h1 className="text-[1.625rem] font-semibold leading-tight tracking-[-0.025em] text-noche">Hola, {perfil.nombre}</h1>
        <p className="mt-1 text-sm text-gris">Datos de demostración al {formatoLargo(analisis.hoy)}</p>
      </header>
      <section className="aparecer rounded-[28px] bg-electrico p-6 text-white">
        <p className="flex w-fit items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-sm font-medium">
          <span className="size-2 rounded-full bg-[#ffb3b8]" aria-hidden="true" />
          {aviso.nivel === "urgente" ? "Anticípate" : aviso.nivel === "bien" ? "Vas por buen camino" : "Tenlo presente"}
        </p>
        {d ? (
          <>
            <p className="mt-5 text-lg font-medium leading-snug text-white/85">El {formatoLargo(d.fecha)}, te faltarán</p>
            <p className="mt-1 text-[3.5rem] font-semibold leading-none tracking-[-0.045em] tabular-nums">{unido(formatoSoles(d.faltante))}</p>
          </>
        ) : (
          <h2 className="mt-4 text-2xl font-semibold leading-snug text-balance">{unido(aviso.titulo)}</h2>
        )}
        <p className="mt-4 leading-relaxed text-white/85">
          {d ? `Ese día se juntan ${pulso(analisis)?.causa}. Quedan ${d.diasRestantes} días: todavía estás a tiempo.` : unido(aviso.cuerpo)}
        </p>
        <Mes proyeccion={despues ?? analisis.proyeccion} />
      </section>
      <dl className="aparecer grid grid-cols-2 rounded-[22px] border border-linea bg-white" style={{ animationDelay: ".08s" }}>
        {cifras(perfil, analisis).map(([titulo, valor], i) => (
          <div key={titulo} className={`px-4 py-4 ${i % 2 ? "border-l border-linea" : ""} ${i > 1 ? "border-t border-linea" : ""}`}>
            <dt className="text-sm leading-snug text-gris">{titulo}</dt>
            <dd className="mt-1.5 text-[1.5rem] font-semibold leading-none tracking-[-0.03em] text-noche tabular-nums">{unido(valor)}</dd>
          </div>
        ))}
      </dl>
    </>
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
                className={`barra absolute inset-x-0 rounded-full ${negativo ? "bg-[#ffb3b8]" : d.fecha === rojo ? "bg-ambar" : "bg-agua"}`}
                style={{
                  height: `${h}%`,
                  ...(negativo ? { top: `${cero}%`, transformOrigin: "top" } : { bottom: `${100 - cero}%`, transformOrigin: "bottom" }),
                  animationDelay: `${i * 18}ms`,
                }}
              />
            </div>
          );
        })}
        <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-white/40" style={{ top: `${cero}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs font-medium text-white/80">
        <span>{formatoCorto(proyeccion.dias[0]?.fecha ?? proyeccion.desde)}</span>
        {rojo && <span className="font-semibold text-white">En rojo el {formatoCorto(rojo)}</span>}
        <span>{formatoCorto(proyeccion.hasta)}</span>
      </div>
    </div>
  );
}

/* ---------- Resultado de la jugada (todo sale del motor) ---------- */
function Resultado({ jugada, despues }: { jugada: Jugada; despues: Proyeccion }) {
  const deficit = despues.deficit;
  const sinRojo = deficit === null;
  return (
    <div
      className={`aparecer mt-4 flex items-start gap-3 rounded-2xl p-4 ${sinRojo ? "bg-verde-suave text-verde-fuerte" : "bg-ambar-suave text-ambar-fuerte"}`}
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
      className={`${tarjeta} aparecer relative overflow-hidden transition-shadow duration-300 ${activa ? "ring-2 ring-electrico" : ""}`}
      style={{ animationDelay: `${0.2 + orden * 0.08}s` }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${j.resuelve ? "bg-verde-suave text-verde-fuerte" : "bg-ambar-suave text-ambar-fuerte"}`}
        >
          {j.resuelve ? "Resuelve el problema" : "Sola no alcanza"}
        </span>
        {barata && (
          <span className="rounded-full bg-agua-suave px-2.5 py-1 text-xs font-semibold text-electrico">La más barata</span>
        )}
      </div>
      <h3 className="mt-3 text-lg font-bold leading-snug tracking-tight">{j.titulo}</h3>
      <p className="mt-1.5 text-[15px] leading-relaxed text-gris">{j.detalle}</p>
      <dl className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-agua-suave/70 p-3">
          <dt className="text-sm font-medium text-agua-fuerte">Te libera</dt>
          <dd className="mt-0.5 text-lg font-bold tabular-nums text-tinta">{unido(formatoSoles(j.libera))}</dd>
        </div>
        <div className="rounded-2xl bg-papel p-3">
          <dt className="text-sm font-medium text-gris">Te cuesta</dt>
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
        className={`${boton} mt-4 flex w-full items-center justify-center gap-2 rounded-full ${activa ? "border border-electrico bg-white text-electrico" : "bg-electrico text-white"}`}
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
      <p className="text-sm font-medium text-agua-fuerte">Próximos 7 días</p>
      <h2 className="mt-1 mb-2 text-xl font-bold tracking-tight">Lo que sale esta semana</h2>
      {pagos.length ? (
        pagos.map((p, i) => (
          <div key={`${p.fecha}-${i}`} className="flex items-center gap-3 border-t border-linea py-3.5">
            <span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-2xl bg-papel text-center leading-none">
              <span className="text-[11px] font-semibold text-gris">{formatoCorto(p.fecha).split(" ")[1] ?? ""}</span>
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
