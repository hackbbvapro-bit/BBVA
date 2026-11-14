"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { PERFILES } from "@/datos/perfiles";
import { analizar, type Perfil } from "@/motor";
import { avisos } from "@/explica/explica";
import { hablar, callar, desbloquearAudio } from "@/cliente/voz";
import { Hoy } from "@/componentes/hoy";
import { Deudas } from "@/componentes/deudas";
import { Chat } from "@/componentes/chat";
import { HojaAvisos } from "@/componentes/avisos";
import { Icono } from "@/componentes/ui";
type Pestana = "hoy" | "deudas" | "hablar";
/** Un solo perfil en la interfaz: Rosa (independiente), el del guion de la demo. */
const ROSA = PERFILES.find(p => p.id === "independiente") ?? PERFILES[0];
const PESTANAS = [
  ["hoy", "Hoy"],
  ["deudas", "Deudas"],
  ["hablar", "Hablar"],
] as const;
export function Copiloto() {
  return (
    <div
      className="relative mx-auto min-h-dvh w-full max-w-md bg-papel text-base text-tinta [overflow-wrap:anywhere] lg:max-w-none lg:pl-[248px] [&_button]:cursor-pointer [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-4 [&_:focus-visible]:outline-agua-fuerte lg:bg-noche lg:[&_:focus-visible]:outline-agua"
    >
      <Sesion perfil={ROSA} />
    </div>
  );
}
function Sesion({ perfil }: { perfil: Perfil }) {
  const analisis = useMemo(() => analizar(perfil), [perfil]);
  const lista = useMemo(() => avisos(perfil, analisis), [perfil, analisis]);
  const [pestana, setPestana] = useState<Pestana>("hoy"),
    [hoja, setHoja] = useState(false),
    [sonando, setSonando] = useState(false);
  const pendientes = lista.filter(a => a.nivel !== "bien").length;
  const turno = useRef(0);
  useEffect(
    () => () => {
      turno.current += 1;
      callar();
    },
    [],
  );
  function detener() {
    turno.current += 1;
    callar();
    setSonando(false);
  }
  function leer(texto: string) {
    desbloquearAudio();
    const actual = ++turno.current;
    setSonando(true);
    void hablar(texto, () => {
      if (actual === turno.current) setSonando(false);
    }).then(motor => {
      if (motor === "ninguna" && actual === turno.current) setSonando(false);
    });
  }
  function navegar(p: Pestana) {
    detener();
    setPestana(p);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  return (
    <>
      <aside
        aria-label="Navegación principal"
        className="absolute inset-y-0 left-0 z-30 hidden w-[248px] border-r border-white/8 bg-noche-honda text-white lg:block"
      >
        <div className="sticky top-0 flex h-dvh flex-col px-4 py-6">
        <div className="flex items-center gap-2.5 px-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-agua text-noche">
            <Icono nombre="rumbo" />
          </span>
          <span className="text-lg font-semibold tracking-[-0.01em]">Copiloto</span>
        </div>
        <nav className="mt-10 grid gap-1">
          {PESTANAS.map(([id, nombre]) => (
            <button
              key={id}
              aria-current={pestana === id ? "page" : undefined}
              onClick={() => navegar(id)}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors duration-100 ${pestana === id ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/5 hover:text-white"}`}
            >
              <Icono nombre={id} />
              {nombre}
            </button>
          ))}
          <button
            onClick={() => setHoja(true)}
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-white/65 transition-colors duration-100 hover:bg-white/5 hover:text-white"
          >
            <Icono nombre="campana" />
            Avisos
            {pendientes > 0 && (
              <span className="ml-auto flex min-w-6 items-center justify-center rounded-full bg-coral px-1.5 text-xs font-bold text-noche">
                {pendientes}
              </span>
            )}
          </button>
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2">
          <span className="flex size-9 items-center justify-center rounded-full bg-white/10 font-semibold" aria-hidden="true">
            {perfil.nombre.slice(0, 1)}
          </span>
          <span className="text-sm leading-tight">
            {perfil.nombre}
            <span className="block text-white/62">Datos de demostración</span>
          </span>
        </div>
        </div>
      </aside>
      <header className="fixed inset-x-0 top-0 z-30 mx-auto max-w-md border-b border-white/10 bg-noche/75 px-5 pb-3 pt-[calc(.75rem+env(safe-area-inset-top))] text-white backdrop-blur-xl backdrop-saturate-150 lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-agua to-[#1464a5] text-noche shadow-[0_0_20px_rgb(133_200_255/.45)]">
              <Icono nombre="rumbo" />
            </span>
            <span className="text-xl font-bold tracking-tight">Copiloto</span>
          </div>
          <button
            aria-label={`Abrir avisos: ${pendientes} pendientes`}
            onClick={() => setHoja(true)}
            className="vidrio relative flex size-11 items-center justify-center rounded-full transition-transform active:scale-95"
          >
            <Icono nombre="campana" />
            {pendientes > 0 && (
              <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-coral px-1 text-xs font-bold text-white shadow-[0_0_12px_rgb(255_90_95/.7)]">
                {pendientes}
              </span>
            )}
          </button>
        </div>
      </header>
      <main className="px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(5.25rem+env(safe-area-inset-top))] lg:p-0">
        {pestana === "hoy" && (
          <Hoy perfil={perfil} analisis={analisis} leer={leer} detener={detener} sonando={sonando} />
        )}
        {pestana === "deudas" && (
          <div className="lg:mx-auto lg:max-w-3xl lg:py-10">
            <Deudas perfil={perfil} analisis={analisis} />
          </div>
        )}
        {pestana === "hablar" && (
          <div className="lg:mx-auto lg:max-w-3xl lg:py-10">
            <Chat perfil={perfil} analisis={analisis} leer={leer} detener={detener} sonando={sonando} />
          </div>
        )}
      </main>
      <nav
        aria-label="Navegación inferior"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md px-4 pb-[calc(.75rem+env(safe-area-inset-bottom))] lg:hidden"
      >
        <div className="pointer-events-auto grid grid-cols-3 gap-1 rounded-[1.75rem] border border-white/10 bg-noche/85 p-1.5 text-white shadow-[0_18px_40px_-12px_rgb(6_13_24/.65)] backdrop-blur-xl backdrop-saturate-150">
          {PESTANAS.map(([id, nombre]) => (
            <button
              key={id}
              aria-current={pestana === id ? "page" : undefined}
              onClick={() => navegar(id)}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[1.35rem] text-xs font-semibold transition-colors duration-300 active:scale-95 ${pestana === id ? "text-noche" : "text-white/60"}`}
            >
              {pestana === id && (
                <span
                  className="pestana-activa absolute inset-0 rounded-[1.35rem] bg-agua shadow-[0_0_24px_rgb(133_200_255/.45)]"
                  aria-hidden="true"
                />
              )}
              <span className="relative flex flex-col items-center gap-0.5">
                <Icono nombre={id} />
                {nombre}
              </span>
            </button>
          ))}
        </div>
      </nav>
      {hoja && <HojaAvisos lista={lista} perfilId={perfil.id} cerrar={() => setHoja(false)} />}
    </>
  );
}
