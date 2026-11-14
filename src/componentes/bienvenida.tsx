"use client";
import { useState } from "react";
import { useDatos } from "@/componentes/datos";
import { Seleccion, Texto, mensajeDeError } from "@/componentes/formularios";
import { Icono, Marca, botonPrincipal, botonSecundario } from "@/componentes/ui";
import { leerSoles } from "@/datos/formulario";
import { ErrorDatos } from "@/datos/validar";
import { datosVacios, hoyEnLima } from "@/datos/semilla";
import type { TipoPerfil } from "@/motor/tipos";

export type Modo = "propio" | "demo";
const CLAVE = "copiloto-modo";

/** Modo elegido en este equipo (null si nunca eligió). Tolera navegadores sin almacenamiento. */
export function leerModo(): Modo | null {
  try {
    const v = window.localStorage.getItem(CLAVE);
    return v === "propio" || v === "demo" ? v : null;
  } catch {
    return null;
  }
}
export function guardarModo(modo: Modo | null) {
  try {
    if (modo) window.localStorage.setItem(CLAVE, modo);
    else window.localStorage.removeItem(CLAVE);
  } catch {
    /* sin almacenamiento: se vuelve a preguntar la próxima vez */
  }
}

const TIPOS = [
  ["dependiente", "Tengo sueldo fijo"],
  ["independiente", "Trabajo por mi cuenta (ingresos variables)"],
  ["mixto", "Las dos cosas"],
] as const;

const PASOS = [
  ["calendario", "Proyecta tu saldo día a día", "Mira los próximos 30 días y te dice qué día te faltaría plata."],
  ["deudas", "Ordena tus deudas", "Agrega tus tarjetas y préstamos, o sube una captura y la IA las lee."],
  ["rumbo", "Te propone cómo evitarlo", "2 o 3 jugadas con su costo en soles, calculadas por el código."],
] as const;

/** Primera pantalla: empezar con datos propios o mirar el ejemplo de Rosa (inventada). */
export function Bienvenida({ alListo }: { alListo: (modo: Modo) => void }) {
  const { cambiar } = useDatos();
  const [paso, setPaso] = useState<"inicio" | "form">("inicio");
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoPerfil>("dependiente");
  const [saldo, setSaldo] = useState("");
  const [ingreso, setIngreso] = useState("");
  const [error, setError] = useState<string>();
  const [guardando, setGuardando] = useState(false);

  async function empezar() {
    setError(undefined);
    setGuardando(true);
    try {
      if (!nombre.trim()) throw new ErrorDatos("Escribe tu nombre o un apodo.");
      const datos = datosVacios({
        nombre,
        tipo,
        saldo: leerSoles(saldo, "cuánto tienes hoy"),
        ingresoAprox: leerSoles(ingreso, "cuánto ganas al mes"),
        hoy: hoyEnLima(),
      });
      await cambiar(r => r.cargar(datos));
      guardarModo("propio");
      alListo("propio");
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  }

  async function verEjemplo() {
    setGuardando(true);
    try {
      await cambiar(r => r.restablecer());
      guardarModo("demo");
      alListo("demo");
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  }

  return (
    <div className="min-h-dvh bg-papel text-tinta">
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 pb-10 pt-[calc(1.25rem+env(safe-area-inset-top))] md:px-8">
        <Marca />
        <div className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <section className="aparecer">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-electrico">Copiloto anticipador</p>
            <h1 className="mt-3 max-w-xl text-[2rem] font-semibold leading-[1.1] tracking-[-0.03em] text-noche text-balance md:text-[2.5rem]">
              Sabe qué día te faltará plata, antes de que pase.
            </h1>
            <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-gris">
              Escribe lo que tienes y lo que debes. El copiloto proyecta tus próximos 30 días y te propone cómo llegar sin pagar
              intereses de más.
            </p>
            <ul className="mt-8 grid max-w-lg gap-4">
              {PASOS.map(([icono, titulo, texto]) => (
                <li key={titulo} className="flex gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-agua-suave text-electrico [&_svg]:size-5">
                    <Icono nombre={icono} />
                  </span>
                  <span>
                    <span className="block font-semibold text-noche">{titulo}</span>
                    <span className="block text-[15px] leading-snug text-gris">{texto}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="Empezar" className="aparecer rounded-2xl border border-linea bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_19_145/0.18)] md:p-7">
            {paso === "inicio" ? (
              <>
                <h2 className="text-xl font-semibold text-noche">¿Cómo quieres empezar?</h2>
                <p className="mt-1 text-[15px] text-gris">Puedes cambiar de opción cuando quieras desde el menú.</p>
                <div className="mt-6 grid gap-3">
                  <button onClick={() => setPaso("form")} className="group flex items-center gap-4 rounded-xl border-2 border-electrico bg-agua-suave/40 p-4 text-left transition-colors hover:bg-agua-suave">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-electrico text-white">
                      <Icono nombre="perfil" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-noche">Empezar con mis datos</span>
                      <span className="block text-sm text-gris">4 datos y listo. Luego agregas tus deudas.</span>
                    </span>
                  </button>
                  <button onClick={verEjemplo} disabled={guardando} className="flex items-center gap-4 rounded-xl border border-linea p-4 text-left transition-colors hover:bg-niebla disabled:opacity-60">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-niebla text-noche">
                      <Icono nombre="dinero" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-noche">Ver con datos de ejemplo</span>
                      <span className="block text-sm text-gris">Rosa, una persona inventada, con deudas y un mes ajustado.</span>
                    </span>
                  </button>
                </div>
                {error && <p role="alert" className="mt-4 rounded-xl bg-coral-suave px-4 py-3 text-sm text-coral-fuerte">{error}</p>}
              </>
            ) : (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  void empezar();
                }}
              >
                <h2 className="text-xl font-semibold text-noche">Tus datos básicos</h2>
                <p className="mt-1 text-[15px] text-gris">Basta con cifras aproximadas. Puedes corregirlas después.</p>
                <div className="mt-5 grid gap-4">
                  <Texto etiqueta="Tu nombre o apodo" valor={nombre} cambiar={setNombre} enfocar marcador="Ej.: Ana" />
                  <Seleccion etiqueta="¿Cómo ganas tu dinero?" valor={tipo} cambiar={v => setTipo(v as TipoPerfil)} opciones={TIPOS} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Texto etiqueta="¿Cuánto tienes hoy? (S/)" ayuda="En tu cuenta, hoy." valor={saldo} cambiar={setSaldo} modo="decimal" marcador="Ej.: 850" />
                    <Texto etiqueta="¿Cuánto ganas al mes? (S/)" ayuda="Aproximado." valor={ingreso} cambiar={setIngreso} modo="decimal" marcador="Ej.: 2500" />
                  </div>
                </div>
                {error && <p role="alert" className="mt-4 rounded-xl bg-coral-suave px-4 py-3 text-sm text-coral-fuerte">{error}</p>}
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setPaso("inicio")} className={botonSecundario}>
                    Volver
                  </button>
                  <button type="submit" disabled={guardando} className={`${botonPrincipal} disabled:opacity-60`}>
                    {guardando ? "Preparando…" : "Empezar"}
                  </button>
                </div>
              </form>
            )}
            <p className="mt-6 border-t border-linea pt-4 text-[13px] leading-relaxed text-gris">
              Tus datos se guardan solo en este equipo. Cuando usas el asistente, las cifras se envían a la IA (Anthropic) para
              explicarlas. Nunca escribas números de tarjeta, DNI ni contraseñas. No es asesoría financiera.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
