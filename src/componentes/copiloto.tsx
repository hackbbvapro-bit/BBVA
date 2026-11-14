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
      <header className="fixed inset-x-0 top-0 z-30 mx-auto max-w-md border-b border-linea bg-papel px-5 pb-3 pt-[calc(.75rem+env(safe-area-inset-top))]">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-agua-suave text-agua-fuerte">
              <Icono nombre="rumbo" />
            </span>
            <span className="text-xl font-bold tracking-tight">Copiloto</span>
          </div>
          <button
            aria-label={`Abrir avisos: ${pendientes} pendientes`}
            onClick={() => setHoja(true)}
            className="relative flex size-11 items-center justify-center rounded-full border border-linea bg-white"
          >
            <Icono nombre="campana" />
            {pendientes > 0 && (
              <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-tinta px-1 text-xs text-white">
                {pendientes}
              </span>
            )}
          </button>
        </div>
        <div role="group" aria-label="Persona de demostración" className="grid grid-cols-3 gap-2">
          {PERFILES.map(p => (
            <button
              key={p.id}
              aria-pressed={perfil.id === p.id}
              onClick={() => {
                if (perfil.id !== p.id) cambiar(p);
              }}
              className={`min-h-11 rounded-full px-3 font-semibold ${perfil.id === p.id ? "bg-tinta text-white" : "border border-linea bg-white text-gris"}`}
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
        className="fixed inset-x-0 bottom-0 z-30 mx-auto grid max-w-md grid-cols-3 border-t border-linea bg-white px-3 pb-[env(safe-area-inset-bottom)]"
      >
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
            className={`my-2 flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl text-sm font-semibold ${pestana === id ? "bg-agua-suave text-agua-fuerte" : "text-gris"}`}
          >
            <Icono nombre={id} />
            {nombre}
          </button>
        ))}
      </nav>
      {hoja && <HojaAvisos lista={lista} perfilId={perfil.id} cerrar={() => setHoja(false)} />}
    </>
  );
}
