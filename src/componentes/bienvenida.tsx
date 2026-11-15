"use client";
import { useEffect, useRef, useState } from "react";
import { useDatos } from "@/componentes/datos";
import { Entrada } from "@/componentes/entrada";
import { mensajeDeError } from "@/componentes/formularios";
import { Icono } from "@/componentes/ui";
import { MarcaPortada, MiniProyeccion, PASOS, Portada } from "@/componentes/portada";
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

/**
 * Primera pantalla: ver el caso de Andrea (inventada) o contar la situación propia en unas preguntas cortas.
 * El caso propio se guarda en este equipo y solo sale a IA y voz si la persona lo acepta al final.
 */
export function Bienvenida({ alListo, empezar }: {
  alListo: (modo: Modo, extra?: { reciente?: boolean }) => void;
  /** Opción ya elegida en la portada de ingreso: abre directo el cuestionario o el caso de Andrea. */
  empezar?: Modo;
}) {
  const { cambiar } = useDatos();
  const [paso, setPaso] = useState<"inicio" | "form">(empezar === "propio" ? "form" : "inicio");
  const [respuestas, setRespuestas] = useState<Respuestas>();
  const [externo, setExterno] = useState(false);
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
      guardarSituacion({ tuvoCredito: tuvoCreditoSegun(r), sinDeudas: !r.deuda, externo, meta: r.meta });
      alListo("propio", { reciente: true });
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  }

  async function verEjemplo() {
    setError(undefined);
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

  // Si en la portada de ingreso ya eligió el caso de Andrea, se abre solo (una vez, aunque React monte dos veces).
  const [abriendoEjemplo, setAbriendoEjemplo] = useState(empezar === "demo");
  const ejemploPedido = useRef(false);
  useEffect(() => {
    if (empezar !== "demo" || ejemploPedido.current) return;
    ejemploPedido.current = true;
    void verEjemplo().finally(() => setAbriendoEjemplo(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, []);

  if (paso === "inicio" && abriendoEjemplo && !error)
    return (
      <div role="status" className="flex min-h-dvh items-center justify-center bg-papel px-6 text-center text-gris">
        <p className="aparecer text-[15px]">Abriendo el caso de Andrea…</p>
      </div>
    );

  if (paso === "inicio")
    return (
      <Portada
        acciones={{
          tipo: "botones",
          alEmpezar: () => { setError(undefined); setPaso("form"); },
          alVerEjemplo: () => void verEjemplo(),
          ocupado: guardando,
          error,
        }}
      />
    );

  return (
    <div className="min-h-dvh bg-papel text-tinta">
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 pb-10 pt-[calc(1.25rem+env(safe-area-inset-top))] md:px-8">
        <div className="flex items-center justify-between gap-3">
          <MarcaPortada />
          <button type="button" onClick={() => { setError(undefined); setPaso("inicio"); }} disabled={guardando}
            className="min-h-11 shrink-0 rounded-xl px-3 text-sm font-semibold text-electrico hover:bg-agua-suave disabled:opacity-60">
            Volver al inicio
          </button>
        </div>
        <div className="grid flex-1 items-center gap-5 py-6 md:gap-8 md:py-10 lg:grid-cols-[1fr_1fr] lg:gap-12">
          <section
            aria-label="Qué hace Finance Pro"
            className="aparecer hidden overflow-hidden lg:block rounded-3xl border border-linea bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-16px_rgb(0_19_145/0.22)]"
          >
            <MiniProyeccion />
            <ol className="divide-y divide-linea px-5 md:px-7">
              {PASOS.map(([icono, titulo, texto], i) => (
                <li key={titulo} className="flex items-start gap-3.5 py-3.5 md:gap-4 md:py-5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-agua-suave md:size-11 text-electrico [&_svg]:size-5">
                    <Icono nombre={icono} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold tabular-nums tracking-[0.08em] text-agua-fuerte">
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
            {respuestas && (
              <ConfirmarPlan externo={externo} alCambiarExterno={setExterno} guardando={guardando}
                alVerPlan={() => void terminar(respuestas, externo)}
                alVolver={() => { setRespuestas(undefined); setExterno(false); }} error={error} />
            )}
            {/* Oculta, no desmontada: al «Revisar mis respuestas» se conserva lo contestado. */}
            <div hidden={!!respuestas}>
              <Entrada alTerminar={r => { setExterno(false); setRespuestas(r); }} volver={() => setPaso("inicio")} guardando={guardando} error={error} />
            </div>
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

/** Consentimiento separado de las respuestas y siempre iniciado desmarcado. */
export function ConfirmarPlan({ externo, alCambiarExterno, guardando, alVerPlan, alVolver, error }: {
  externo: boolean; alCambiarExterno: (valor: boolean) => void; guardando: boolean;
  alVerPlan: () => void; alVolver: () => void; error?: string;
}) {
  return <div className="space-y-4">
    <h2 className="text-xl font-semibold text-noche">Tu plan está listo</h2>
    <button type="button" onClick={alVerPlan} disabled={guardando} className="min-h-12 w-full rounded-xl bg-electrico px-4 py-3 font-semibold text-white disabled:opacity-60">{guardando ? "Armando tu caso…" : "Ver mi plan"}</button>
    <label className="flex items-start gap-3 text-sm text-noche">
      <input type="checkbox" checked={externo} onChange={e => alCambiarExterno(e.target.checked)} disabled={guardando} className="mt-1 size-5 shrink-0 accent-electrico" />
      <span><span className="block font-semibold">Usar asistente con IA y voz</span><span className="mt-1 block text-gris">Tus respuestas de simulación se envían a un servicio de IA para conversar.</span></span>
    </label>
    {error && <p role="alert" className="text-sm text-coral-fuerte">{error}</p>}
    <button type="button" onClick={alVolver} disabled={guardando} className="min-h-11 text-sm font-semibold text-electrico">Revisar mis respuestas</button>
  </div>;
}
