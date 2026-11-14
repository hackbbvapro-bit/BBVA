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
export type Direccion = "a" | "b";
/** Un solo perfil en la interfaz: Rosa (independiente), el del guion de la demo. */
const ROSA = PERFILES.find(p => p.id === "independiente") ?? PERFILES[0];
const PESTANAS = [
  ["hoy", "Inicio"],
  ["deudas", "Deudas"],
  ["hablar", "Hablar"],
] as const;
export function Copiloto({ direccion = "a" }: { direccion?: Direccion }) {
  return (
    <div className="relative min-h-dvh w-full bg-papel text-base text-tinta [overflow-wrap:anywhere] md:pl-[232px] [&_button]:cursor-pointer [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-4 [&_:focus-visible]:outline-electrico">
      <Sesion perfil={ROSA} direccion={direccion} />
    </div>
  );
}
function Marca() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-electrico text-white">
        <Icono nombre="rumbo" />
      </span>
      <span className="leading-tight">
        <span className="block text-[17px] font-semibold tracking-[-0.015em] text-noche">Copiloto</span>
        <span className="block text-xs text-gris">exclusivo para clientes BBVA</span>
      </span>
    </span>
  );
}
function Sesion({ perfil, direccion }: { perfil: Perfil; direccion: Direccion }) {
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
        className="fixed inset-y-0 left-0 z-30 hidden w-[232px] border-r border-linea bg-white md:block"
      >
        <div className="flex h-dvh flex-col px-4 py-6">
          <div className="px-2">
            <Marca />
          </div>
          <nav className="mt-10 grid gap-1">
            {PESTANAS.map(([id, nombre]) => (
              <button
                key={id}
                aria-current={pestana === id ? "page" : undefined}
                onClick={() => navegar(id)}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors duration-150 ${pestana === id ? "bg-agua-suave text-electrico" : "text-gris hover:bg-niebla hover:text-noche"}`}
              >
                <Icono nombre={id} />
                {nombre}
              </button>
            ))}
            <button
              onClick={() => setHoja(true)}
              className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-gris transition-colors duration-150 hover:bg-niebla hover:text-noche"
            >
              <Icono nombre="campana" />
              Avisos
              {pendientes > 0 && (
                <span className="ml-auto flex min-w-6 items-center justify-center rounded-full bg-coral-fuerte px-1.5 text-xs font-semibold text-white">
                  {pendientes}
                </span>
              )}
            </button>
          </nav>
          <div className="mt-auto flex items-center gap-3 rounded-xl border border-linea px-3 py-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-agua-suave font-semibold text-electrico" aria-hidden="true">
              {perfil.nombre.slice(0, 1)}
            </span>
            <span className="text-sm leading-tight text-noche">
              {perfil.nombre}
              <span className="block text-gris">Cuenta demo</span>
            </span>
          </div>
        </div>
      </aside>
      <header className="fixed inset-x-0 top-0 z-30 border-b border-linea bg-white/90 px-5 pb-3 pt-[calc(.75rem+env(safe-area-inset-top))] backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-between">
          <Marca />
          <button
            aria-label={`Abrir avisos: ${pendientes} pendientes`}
            onClick={() => setHoja(true)}
            className="relative flex size-11 items-center justify-center rounded-full border border-linea bg-white text-noche transition-transform active:scale-95"
          >
            <Icono nombre="campana" />
            {pendientes > 0 && (
              <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-coral-fuerte px-1 text-xs font-semibold text-white">
                {pendientes}
              </span>
            )}
          </button>
        </div>
      </header>
      <main className="px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(5.5rem+env(safe-area-inset-top))] md:px-0 md:pb-0 md:pt-0">
        {pestana === "hoy" && (
          <Hoy perfil={perfil} analisis={analisis} leer={leer} detener={detener} sonando={sonando} direccion={direccion} />
        )}
        {pestana === "deudas" && (
          <div className="md:mx-auto md:max-w-3xl md:px-8 md:py-10">
            <Deudas perfil={perfil} analisis={analisis} />
          </div>
        )}
        {pestana === "hablar" && (
          <div className="md:mx-auto md:max-w-3xl md:px-8 md:py-10">
            <Chat perfil={perfil} analisis={analisis} leer={leer} detener={detener} sonando={sonando} />
          </div>
        )}
      </main>
      <nav
        aria-label="Navegación inferior"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-3">
          {PESTANAS.map(([id, nombre]) => (
            <button
              key={id}
              aria-current={pestana === id ? "page" : undefined}
              onClick={() => navegar(id)}
              className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-150 ${pestana === id ? "text-electrico" : "text-gris"}`}
            >
              {pestana === id && <span className="absolute inset-x-6 top-0 h-[3px] rounded-b-full bg-electrico" aria-hidden="true" />}
              <Icono nombre={id} />
              {nombre}
            </button>
          ))}
        </div>
      </nav>
      {hoja && <HojaAvisos lista={lista} perfilId={perfil.id} cerrar={() => setHoja(false)} />}
    </>
  );
}
