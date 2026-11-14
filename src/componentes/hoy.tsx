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
} from "@/motor";
import { avisos, mejorJugada, proximosPagos, resumenHablado } from "@/explica/explica";
import { consultarEstado, type EstadoServicios } from "@/cliente/estado";
import { Grafico } from "@/componentes/grafico";
import { boton, tarjeta, TarjetaAviso, Icono, desplazar } from "@/componentes/ui";
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
    <div className="space-y-5">
      <section className="rounded-3xl bg-tinta p-6 text-white shadow-lg shadow-tinta/10">
        <p className="text-white/80">Hoy tienes</p>
        <h1 className="mt-2 break-words text-[2.6rem] font-semibold leading-tight tracking-tight tabular-nums">
          {formatoSoles(perfil.saldoActual)}
        </h1>
        <p className="mt-4 text-sm text-white/75">Datos de demostración al {formatoLargo(analisis.hoy)}</p>
        <p className="mt-4 border-t border-white/20 pt-4 leading-relaxed text-white/90">
          {perfil.descripcion}
        </p>
      </section>
      <TarjetaAviso aviso={principal} />
      <section ref={grafico} className={`${tarjeta} scroll-mt-40`}>
        <h2 className="text-lg font-bold">Tus próximos 30 días</h2>
        <p className="mt-1 text-sm text-gris">Así se movería tu saldo</p>
        <Grafico
          base={analisis.proyeccion}
          despues={despues}
          descripcion={`${principal.titulo}. ${principal.cuerpo}`}
        />
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-5 bg-tinta" />
            Como vas
          </span>
          {jugada && (
            <span className="flex items-center gap-2 text-agua-fuerte">
              <span className="h-0.5 w-5 bg-agua" />
              Con esta jugada
            </span>
          )}
        </div>
        {jugada && <p className="mt-3 text-sm text-agua-fuerte">{jugada.titulo}</p>}
      </section>
      {analisis.jugadas.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">Tus jugadas</h2>
            <p className="mt-1 text-gris">Mira qué puedes hacer antes de que falte.</p>
          </div>
          {analisis.jugadas.map(j => (
            <TarjetaJugada
              key={j.id}
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
        className={`${boton} flex w-full items-center justify-center gap-3 bg-tinta text-white`}
        onClick={() => (sonando ? detener() : leer(resumenHablado(perfil, analisis)))}
      >
        <Icono nombre="voz" />
        {sonando ? "Detener" : "Escuchar el resumen"}
      </button>
      <Pie />
    </div>
  );
}
function TarjetaJugada({
  jugada: j,
  barata,
  activa,
  elegir,
}: {
  jugada: Jugada;
  barata: boolean;
  activa: boolean;
  elegir: () => void;
}) {
  return (
    <article className={`${tarjeta} ${activa ? "ring-2 ring-agua-fuerte" : ""}`}>
      {barata && <p className="mb-3 text-sm font-bold text-agua-fuerte">La más barata</p>}
      <h3 className="text-lg font-bold">{j.titulo}</h3>
      <p className="mt-2 leading-relaxed text-gris">{j.detalle}</p>
      <p className="mt-4 font-bold text-agua-fuerte">Libera {formatoSoles(j.libera)}</p>
      <p className="mt-1">{j.costo === 0 ? "No cuesta dinero" : `Cuesta ${formatoSoles(j.costo)}`}</p>
      <p className="mt-2 text-sm text-gris">{j.costoDetalle}</p>
      {j.costoDetalle.includes("TCEA") && <p className="text-sm text-gris">TCEA: lo que te cuesta al año.</p>}
      <span
        className={`mt-4 inline-block rounded-full px-3 py-1 text-sm font-semibold ${j.resuelve ? "bg-agua-suave text-agua-fuerte" : "bg-ambar-suave text-ambar-fuerte"}`}
      >
        {j.resuelve ? "Resuelve el problema" : "Sola no alcanza"}
      </span>
      <button
        aria-pressed={activa}
        onClick={elegir}
        className={`${boton} mt-4 w-full ${activa ? "bg-tinta text-white" : "bg-agua-suave text-agua-fuerte"}`}
      >
        {activa ? "Quitar comparación" : "Ver cómo queda"}
      </button>
    </article>
  );
}
function Pagos({ analisis }: { analisis: Analisis }) {
  const pagos = proximosPagos(analisis, 7);
  return (
    <section className={tarjeta}>
      <h2 className="mb-3 text-xl font-bold">Lo que sale esta semana</h2>
      {pagos.length ? (
        pagos.map((p, i) => (
          <div
            key={`${p.fecha}-${i}`}
            className="flex items-center justify-between gap-3 border-t border-linea py-4"
          >
            <div className="min-w-0">
              <p className="font-medium">{p.descripcion}</p>
              <p className="text-sm text-gris">{formatoCorto(p.fecha)}</p>
            </div>
            <p className="shrink-0 font-semibold tabular-nums">{formatoSoles(p.monto)}</p>
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
      <div className="mb-3 flex justify-center gap-5">
        {(
          [
            ["ia", "IA"],
            ["voz", "Voz"],
            ["push", "Avisos"],
          ] as const
        ).map(([clave, etiqueta]) => (
          <span
            key={clave}
            className="flex items-center gap-1.5"
            title={estado?.[clave] ? "Activo" : "En respaldo"}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${estado?.[clave] ? "bg-agua" : "bg-gris"}`} />
            {etiqueta}
            <span className="sr-only">{estado?.[clave] ? "Activo" : "En respaldo"}</span>
          </span>
        ))}
      </div>
      Datos de demostración. No es asesoría financiera.
    </footer>
  );
}
