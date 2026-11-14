"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { analizar, type Perfil } from "@/motor";
import { avisosDelCentro, pendientesSinLeer, type Destino } from "@/avisos/centro";
import { hablar, callar, desbloquearAudio } from "@/cliente/voz";
import { Hoy } from "@/componentes/hoy";
import { Adjuntar } from "@/componentes/documento";
import { Deudas, type PestanaDeudas } from "@/componentes/deudas";
import { MiDinero } from "@/componentes/mi-dinero";
import { Chat } from "@/componentes/chat";
import { LoQueSe } from "@/componentes/lo-que-se";
import { HojaAvisos } from "@/componentes/avisos";
import { Icono, Marca } from "@/componentes/ui";
import { ProveedorDatos, useDatos } from "@/componentes/datos";
import { MenuUsuario } from "@/componentes/menu-usuario";
import { Perfil as VistaPerfil } from "@/componentes/perfil";
import { ComoFunciona } from "@/componentes/como-funciona";
type Pestana = "hoy" | "dinero" | "deudas" | "hablar" | "perfil" | "como";
const PESTANAS = [
  ["hoy", "Inicio"],
  ["dinero", "Mi dinero"],
  ["deudas", "Deudas"],
  ["hablar", "Hablar"],
] as const;
export function Copiloto() {
  return (
    <ProveedorDatos>
      <Contenido />
    </ProveedorDatos>
  );
}
function Contenido() {
  const { perfil } = useDatos();
  return (
    <div className="relative min-h-dvh w-full bg-papel text-base text-tinta [overflow-wrap:anywhere] md:pl-[232px] [&_button]:cursor-pointer [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-4 [&_:focus-visible]:outline-electrico">
      <Sesion perfil={perfil} />
    </div>
  );
}
function Sesion({ perfil }: { perfil: Perfil }) {
  const analisis = useMemo(() => analizar(perfil), [perfil]);
  const { aviso, datos, cambiar } = useDatos();
  const lista = useMemo(() => avisosDelCentro(datos, perfil, analisis), [datos, perfil, analisis]);
  const [pestana, setPestana] = useState<Pestana>("hoy"),
    [hoja, setHoja] = useState(false),
    [deudasInicial, setDeudasInicial] = useState<PestanaDeudas>("debo"),
    [saltos, setSaltos] = useState(0),
    [sonando, setSonando] = useState(false),
    [nuevos, setNuevos] = useState<string[]>([]);
  const pendientes = pendientesSinLeer(lista, datos.avisosLeidos);
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
    setDeudasInicial("debo");
    setPestana(p);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function abrirAvisos() {
    const sinLeer = lista.filter(a => !datos.avisosLeidos.includes(a.clave)).map(a => a.clave);
    setNuevos(sinLeer);
    setHoja(true);
    if (sinLeer.length > 0) {
      void cambiar(async repo => {
        for (const clave of sinLeer) await repo.marcarAvisoLeido(clave);
      }).catch(() => undefined);
    }
  }
  function irA(destino: Destino) {
    setHoja(false);
    navegar(destino === "hoy" ? "hoy" : "deudas");
    if (destino === "cobros") setDeudasInicial("medeben");
    if (destino === "reporte") setDeudasInicial("sbs");
    setSaltos(n => n + 1);
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
              onClick={abrirAvisos}
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
          <div className="mt-auto">
            <MenuUsuario nombre={perfil.nombre} variante="lateral" alPerfil={() => navegar("perfil")} alComoFunciona={() => navegar("como")} />
          </div>
        </div>
      </aside>
      <header className="fixed inset-x-0 top-0 z-30 border-b border-linea bg-white/90 px-5 pb-3 pt-[calc(.75rem+env(safe-area-inset-top))] backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-between gap-2">
          <Marca />
          <div className="flex items-center gap-2">
            <button
              aria-label={`Abrir avisos: ${pendientes} pendientes`}
              onClick={abrirAvisos}
              className="relative flex size-11 items-center justify-center rounded-full border border-linea bg-white text-noche transition-transform active:scale-95"
            >
              <Icono nombre="campana" />
              {pendientes > 0 && (
                <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-coral-fuerte px-1 text-xs font-semibold text-white">
                  {pendientes}
                </span>
              )}
            </button>
            <MenuUsuario nombre={perfil.nombre} variante="cabecera" alPerfil={() => navegar("perfil")} alComoFunciona={() => navegar("como")} />
          </div>
        </div>
      </header>
      <main className="px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(5.5rem+env(safe-area-inset-top))] md:px-0 md:pb-0 md:pt-0">
        {aviso && (
          <p role="status" className="mb-4 rounded-2xl bg-ambar-suave px-4 py-3 text-sm text-ambar-fuerte md:mx-8 md:mt-6">
            {aviso}
          </p>
        )}
        {pestana === "hoy" && (
          <Hoy perfil={perfil} analisis={analisis} cobros={datos.cobros} leer={leer} detener={detener} sonando={sonando} />
        )}
        {pestana === "dinero" && (
          <div className="md:mx-auto md:max-w-4xl md:px-8 md:py-10">
            <MiDinero analisis={analisis} />
          </div>
        )}
        {pestana === "deudas" && (
          <div className="md:mx-auto md:max-w-3xl md:px-8 md:py-10 xl:max-w-[1360px] xl:px-10">
            <Deudas key={`${deudasInicial}-${saltos}`}perfil={perfil} analisis={analisis} pestanaInicial={deudasInicial} />
          </div>
        )}
        {pestana === "perfil" && (
          <div className="md:mx-auto md:max-w-4xl md:px-8 md:py-10">
            <VistaPerfil />
          </div>
        )}
        {pestana === "como" && (
          <div className="md:mx-auto md:max-w-4xl md:px-8 md:py-10">
            <ComoFunciona />
          </div>
        )}
        {pestana === "hablar" && (
          <div className="md:mx-auto md:max-w-3xl md:px-8 md:py-10 xl:max-w-[1360px] xl:px-10">
            <Chat perfil={perfil} analisis={analisis} leer={leer} detener={detener} sonando={sonando} lateral={
                <div className="space-y-5">
                  <LoQueSe analisis={analisis} />
                  <Adjuntar alGuardar={() => { detener(); setDeudasInicial("sbs"); setPestana("deudas"); window.scrollTo({ top: 0, behavior: "instant" }); }} />
                </div>
              } />
          </div>
        )}
      </main>
      <nav
        aria-label="Navegación inferior"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-4">
          {PESTANAS.map(([id, nombre]) => (
            <button
              key={id}
              aria-current={pestana === id ? "page" : undefined}
              onClick={() => navegar(id)}
              className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-150 ${pestana === id ? "text-electrico" : "text-gris"}`}
            >
              {pestana === id && (
                <span
                  className="absolute inset-x-6 top-0 h-[3px] rounded-b-full bg-electrico"
                  aria-hidden="true"
                />
              )}
              <Icono nombre={id} />
              {nombre}
            </button>
          ))}
        </div>
      </nav>
      {hoja && <HojaAvisos lista={lista} nuevos={nuevos} perfilId={perfil.id} ir={irA} cerrar={() => setHoja(false)} />}
    </>
  );
}
