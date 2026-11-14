"use client";
import { useState } from "react";
import { useDatos } from "@/componentes/datos";
import { Entrada } from "@/componentes/entrada";
import { mensajeDeError } from "@/componentes/formularios";
import { Icono, Marca } from "@/componentes/ui";
import { borrarSituacion, guardarSituacion } from "@/cliente/situacion";
import { borrarAvances, borrarHistorial } from "@/cliente/memoria";
import { datosDeEjemplo, ID_PROPIO } from "@/datos/semilla";
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
  ["calendario", "Proyecta tu saldo día a día", "Mira tus próximos 30 días y te avisa qué día te faltaría plata, y por qué."],
  ["deudas", "Ordena tus deudas", "Tarjetas y préstamos en el orden de pago que más intereses te ahorra."],
  ["rumbo", "Te propone cómo evitarlo", "2 o 3 jugadas con su costo en soles, calculadas por el código."],
] as const;

/**
 * Ilustración decorativa de una proyección: el saldo baja con los pagos, cruza el cero un día y vuelve a subir
 * cuando entra la plata. No lleva montos: es un dibujo, no un cálculo.
 */
function MiniProyeccion() {
  const linea = "M0 34 L44 38 L62 52 L104 56 L122 70 L168 74 L186 96 L218 99 L232 50 L274 54 L296 64 L320 66";
  return (
    <div aria-hidden="true" className="relative bg-[linear-gradient(180deg,#e9f4ff_0%,#ffffff_100%)] px-5 pb-3 pt-5 md:px-7 md:pt-6">
      <svg viewBox="0 0 320 118" className="block h-auto w-full overflow-visible" fill="none">
        <defs>
          <linearGradient id="mini-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#001391" stopOpacity="0.16" />
            <stop offset="1" stopColor="#001391" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${linea} L320 118 L0 118 Z`} fill="url(#mini-area)" />
        <line x1="0" x2="320" y1="88" y2="88" className="stroke-coral-fuerte/50" strokeDasharray="4 5" strokeWidth="1.25" />
        <rect x="183" y="88" width="38" height="18" rx="3" className="fill-coral-fuerte/10" />
        <path d={linea} className="stroke-electrico" strokeWidth="2.75" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx="0" cy="34" r="4.5" className="fill-electrico" />
        <circle cx="202" cy="97.5" r="9" className="fill-coral-fuerte/15" />
        <circle cx="202" cy="97.5" r="4.5" className="fill-coral-fuerte stroke-white" strokeWidth="2" />
      </svg>
      <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-gris">
        <span>Hoy</span>
        <span className="inline-flex items-center gap-1.5 normal-case tracking-normal text-coral-fuerte">
          <span className="size-1.5 rounded-full bg-coral-fuerte" />
          El día que faltaría
        </span>
        <span>30 días</span>
      </div>
    </div>
  );
}

/**
 * Primera pantalla: ver el caso de Andrea (inventada) o contar la situación propia en unas preguntas cortas.
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
      // Caso nuevo: la conversación y los pasos marcados del caso anterior ya no corresponden.
      borrarHistorial(ID_PROPIO);
      borrarAvances(ID_PROPIO);
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
      // El ejemplo vuelve a sus datos de fábrica: lo anotado antes ya no está, tampoco su conversación.
      const idEjemplo = datosDeEjemplo().perfil.id;
      borrarHistorial(idEjemplo);
      borrarAvances(idEjemplo);
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
        <div className="grid flex-1 items-center gap-5 py-6 md:gap-8 md:py-10 lg:grid-cols-[1fr_1fr] lg:gap-12">
          <section
            aria-label="Qué hace el copiloto"
            className="aparecer overflow-hidden rounded-3xl border border-linea bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-16px_rgb(0_19_145/0.22)]"
          >
            <MiniProyeccion />
            <ol className="divide-y divide-linea px-5 md:px-7">
              {PASOS.map(([icono, titulo, texto], i) => (
                <li key={titulo} className="flex items-start gap-3.5 py-3.5 md:gap-4 md:py-5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-agua-suave md:size-11 text-electrico [&_svg]:size-5">
                    <Icono nombre={icono} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold tabular-nums tracking-[0.08em] text-agua-fuerte">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="block text-base font-semibold leading-snug text-noche md:text-[17px]">{titulo}</span>
                    <span className="mt-0.5 block text-sm leading-snug text-gris md:text-[15px]">{texto}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section aria-label="Empezar" className="aparecer rounded-3xl border border-linea bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-16px_rgb(0_19_145/0.22)] md:p-7">
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
                      <span className="block font-semibold text-noche">Ver el caso de Andrea</span>
                      <span className="block text-sm text-gris">Fisioterapeuta independiente inventada: ingresos que cambian, tres deudas y un mes ajustado. Incluye voz y asistente de IA.</span>
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
              este equipo; solo se envía a servicios externos de IA y de voz si lo aceptas, igual que el caso inventado de Andrea.
              Nunca escribas datos reales: nombres completos, DNI, tarjetas ni contraseñas. Simulación, no asesoría financiera.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
