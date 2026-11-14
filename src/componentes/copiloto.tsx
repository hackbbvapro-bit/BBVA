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
export function Copiloto() {
  const [perfil, setPerfil] = useState(PERFILES[0]);
  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-papel text-base text-tinta [overflow-wrap:anywhere] [&_button]:cursor-pointer [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-4 [&_:focus-visible]:outline-agua-fuerte">
      <Sesion
        key={perfil.id}
        perfil={perfil}
        cambiar={p => {
          callar();
          setPerfil(p);
        }}
      />
    </div>
  );
}
function Sesion({ perfil, cambiar }: { perfil: Perfil; cambiar: (p: Perfil) => void }) {
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
      <header className="fixed inset-x-0 top-0 z-30 mx-auto max-w-md border-b border-white/10 bg-noche/75 px-5 pb-3 pt-[calc(.75rem+env(safe-area-inset-top))] text-white backdrop-blur-xl backdrop-saturate-150">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-agua to-[#3d7bff] text-noche shadow-[0_0_20px_rgb(20_200_180/.45)]">
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
        <div role="group" aria-label="Persona de demostración" className="vidrio grid grid-cols-3 gap-1 rounded-full p-1">
          {PERFILES.map(p => (
            <button
              key={p.id}
              aria-pressed={perfil.id === p.id}
              onClick={() => {
                if (perfil.id !== p.id) cambiar(p);
              }}
              className={`min-h-10 rounded-full px-3 text-sm font-semibold transition-colors duration-300 ${perfil.id === p.id ? "bg-white text-noche shadow-[0_4px_14px_-4px_rgb(0_0_0/.5)]" : "text-white/65"}`}
            >
              {p.nombre}
            </button>
          ))}
        </div>
      </header>
      <main className="px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(9rem+env(safe-area-inset-top))]">
        {pestana === "hoy" && (
          <Hoy perfil={perfil} analisis={analisis} leer={leer} detener={detener} sonando={sonando} />
        )}
        {pestana === "deudas" && <Deudas perfil={perfil} analisis={analisis} />}
        {pestana === "hablar" && (
          <Chat perfil={perfil} analisis={analisis} leer={leer} detener={detener} sonando={sonando} />
        )}
      </main>
      <nav
        aria-label="Navegación principal"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md px-4 pb-[calc(.75rem+env(safe-area-inset-bottom))]"
      >
        <div className="pointer-events-auto grid grid-cols-3 gap-1 rounded-[1.75rem] border border-white/10 bg-noche/85 p-1.5 text-white shadow-[0_18px_40px_-12px_rgb(6_13_24/.65)] backdrop-blur-xl backdrop-saturate-150">
          {(
            [
              ["hoy", "Hoy"],
              ["deudas", "Deudas"],
              ["hablar", "Hablar"],
            ] as const
          ).map(([id, nombre]) => (
            <button
              key={id}
              aria-current={pestana === id ? "page" : undefined}
              onClick={() => navegar(id)}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[1.35rem] text-xs font-semibold transition-colors duration-300 active:scale-95 ${pestana === id ? "text-noche" : "text-white/60"}`}
            >
              {pestana === id && (
                <span
                  className="pestana-activa absolute inset-0 rounded-[1.35rem] bg-agua shadow-[0_0_24px_rgb(20_200_180/.45)]"
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
