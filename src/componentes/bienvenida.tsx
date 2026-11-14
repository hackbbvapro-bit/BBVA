"use client";
import { useState } from "react";
import { useDatos } from "@/componentes/datos";
import { Entrada } from "@/componentes/entrada";
import { mensajeDeError } from "@/componentes/formularios";
import { Icono, Marca } from "@/componentes/ui";
import { borrarSituacion, guardarSituacion } from "@/cliente/situacion";
import { desbloquearAudio } from "@/cliente/voz";
import { armarCaso, tuvoCreditoSegun, type Respuestas } from "@/ruta/entrada";

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

const PASOS = [
  ["calendario", "Proyecta tu saldo día a día", "Mira los próximos 30 días y te dice qué día te faltaría plata."],
  ["deudas", "Ordena las deudas", "Tarjetas y préstamos del caso, con el orden de pago que más intereses ahorra según el cálculo."],
  ["rumbo", "Te propone cómo evitarlo", "2 o 3 jugadas con su costo en soles, calculadas por el código."],
] as const;

/**
 * Primera pantalla: ver el caso de Rosa (inventada) o contar la situación propia en unas preguntas cortas.
 * El caso propio se guarda en este equipo y solo sale a IA y voz si la persona lo acepta al final.
 */
export function Bienvenida({ alListo }: { alListo: (modo: Modo, extra?: { reciente?: boolean }) => void }) {
  const { cambiar } = useDatos();
  const [paso, setPaso] = useState<"inicio" | "form">("inicio");
  const [error, setError] = useState<string>();
  const [guardando, setGuardando] = useState(false);

  /** Arma el caso con las respuestas. `externo` es el permiso expreso para usar IA y voz. */
  async function terminar(r: Respuestas, externo: boolean) {
    setError(undefined);
    setGuardando(true);
    // Dentro del toque de la persona: así el navegador deja sonar la voz del saludo después.
    if (externo) desbloquearAudio();
    try {
      await cambiar(repo => repo.cargar(armarCaso(r)));
      guardarModo("propio");
      guardarSituacion({ tuvoCredito: tuvoCreditoSegun(r), sinDeudas: !r.deuda || r.deuda.saldo <= 0, externo });
      alListo("propio", { reciente: true });
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  }

  async function verEjemplo() {
    setGuardando(true);
    try {
      await cambiar(r => r.restablecer());
      borrarSituacion();
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
              Prototipo educativo con datos sintéticos. El copiloto proyecta los próximos 30 días de un caso y propone cómo llegar
              sin pagar intereses de más.
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
                  <button onClick={verEjemplo} disabled={guardando} className="group flex items-center gap-4 rounded-xl border-2 border-electrico bg-agua-suave/40 p-4 text-left transition-colors hover:bg-agua-suave disabled:opacity-60">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-electrico text-white">
                      <Icono nombre="dinero" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-noche">Ver el caso de Rosa</span>
                      <span className="block text-sm text-gris">Una persona inventada, con deudas y un mes ajustado. Incluye voz y asistente de IA.</span>
                    </span>
                  </button>
                  <button onClick={() => { setError(undefined); setPaso("form"); }} disabled={guardando} className="flex items-center gap-4 rounded-xl border border-linea p-4 text-left transition-colors hover:bg-niebla">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-niebla text-noche">
                      <Icono nombre="perfil" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-noche">Empezar con mi situación</span>
                      <span className="block text-sm text-gris">Te hago unas preguntas cortas y armo tu ruta. Usa cifras aproximadas o inventadas: es una simulación.</span>
                    </span>
                  </button>
                </div>
                {error && <p role="alert" className="mt-4 rounded-xl bg-coral-suave px-4 py-3 text-sm text-coral-fuerte">{error}</p>}
              </>
            ) : (
              <Entrada alTerminar={(r, externo) => void terminar(r, externo)} volver={() => setPaso("inicio")} guardando={guardando} error={error} />
            )}
            <p className="mt-6 border-t border-linea pt-4 text-[13px] leading-relaxed text-gris">
              Prototipo educativo con datos sintéticos; no es un producto de ningún banco. Tu caso se calcula y se guarda en
              este equipo; solo se envía a servicios externos de IA y de voz si lo aceptas, igual que el caso inventado de Rosa.
              Nunca escribas datos reales: nombres completos, DNI, tarjetas ni contraseñas. Simulación, no asesoría financiera.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
