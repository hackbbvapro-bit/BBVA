"use client";
import { useEffect, useRef, useState } from "react";
import type { Aviso } from "@/explica/explica";
import { estadoAvisos, activarAvisos, enviarAvisoDePrueba, type EstadoAvisos } from "@/cliente/avisos";
import { boton, Icono, tonos, unido } from "@/componentes/ui";
const instrucciones = {
  falta_instalar:
    "En iPhone: toca Compartir y luego “Añadir a pantalla de inicio”. Abre la app desde ahí y vuelve aquí.",
  denegado: "Los avisos están bloqueados. Actívalos en los ajustes del navegador.",
  no_soportado: "Este navegador no permite avisos. Los verás aquí dentro.",
};
export function HojaAvisos({
  lista,
  perfilId,
  cerrar,
}: {
  lista: Aviso[];
  perfilId: string;
  cerrar: () => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogo.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      anterior?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialogo}
      aria-labelledby="titulo-avisos"
      onCancel={e => {
        e.preventDefault();
        cerrar();
      }}
      onClick={e => {
        if (e.target === e.currentTarget) cerrar();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-tinta backdrop:bg-tinta/50"
    >
      <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[85dvh] max-w-md overflow-y-auto rounded-t-3xl bg-papel px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3">
        <div aria-hidden="true" className="mx-auto mb-4 h-1 w-10 rounded-full bg-linea" />
        <div className="mb-5 flex items-center justify-between">
          <h2 id="titulo-avisos" className="text-2xl font-semibold tracking-[-0.025em] text-noche">
            Tus avisos
          </h2>
          <button
            autoFocus
            aria-label="Cerrar avisos"
            onClick={cerrar}
            className="flex size-11 items-center justify-center rounded-full bg-white ring-1 ring-linea"
          >
            <Icono nombre="cerrar" />
          </button>
        </div>
        <div className="space-y-4">
          {lista.map(a => (
            <article key={a.id} className="aparecer rounded-2xl bg-white p-4 ring-1 ring-linea/80">
              <h3 className="flex items-start gap-3 font-semibold text-noche">
                <span
                  aria-label={a.nivel}
                  className={`mt-2 size-2 shrink-0 rounded-full ${a.nivel === "urgente" ? "bg-coral" : a.nivel === "bien" ? "bg-verde-fuerte" : "bg-ambar"}`}
                />
                {unido(a.titulo)}
              </h3>
              <p className="mt-2 leading-relaxed text-gris">{unido(a.cuerpo)}</p>
              {a.cuerpo.includes("TCEA") && (
                <p className="mt-2 text-sm text-gris">TCEA: lo que te cuesta al año.</p>
              )}
            </article>
          ))}
        </div>
        <AvisosCelular perfilId={perfilId} aviso={lista[0]} />
      </div>
    </dialog>
  );
}
function AvisosCelular({ perfilId, aviso }: { perfilId: string; aviso: Aviso }) {
  const [estado, setEstado] = useState<EstadoAvisos>(),
    [resultado, setResultado] = useState(""),
    [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    const temporizador = setTimeout(() => setEstado(estadoAvisos()), 0);
    return () => clearTimeout(temporizador);
  }, []);
  async function activar() {
    setOcupado(true);
    setEstado(await activarAvisos());
    setOcupado(false);
  }
  async function probar() {
    setOcupado(true);
    const resultado = await enviarAvisoDePrueba(perfilId, { titulo: aviso.titulo, cuerpo: aviso.cuerpo });
    setResultado(
      {
        enviado: "Listo: revisa tus notificaciones",
        local: "Aviso mostrado desde este celular",
        fallo: "No se pudo enviar el aviso",
      }[resultado],
    );
    setOcupado(false);
  }
  return (
    <section className="mt-6 border-t border-linea pt-5">
      <h3 className="mb-3 text-lg font-semibold text-noche">Avisos en tu celular</h3>
      {!estado && <p className="text-gris">Comprobando disponibilidad…</p>}
      {estado === "sin_permiso" && (
        <button disabled={ocupado} className={`${boton} w-full ${tonos.bien}`} onClick={() => void activar()}>
          Activar avisos en este celular
        </button>
      )}
      {estado === "activo" && (
        <button
          disabled={ocupado}
          className={`${boton} w-full rounded-full bg-electrico text-white hover:bg-marino`}
          onClick={() => void probar()}
        >
          Enviarme un aviso de prueba
        </button>
      )}
      {estado && estado in instrucciones && (
        <p className="leading-relaxed text-gris">{instrucciones[estado as keyof typeof instrucciones]}</p>
      )}
      <p role="status" className="mt-3 text-sm text-gris">
        {resultado}
      </p>
    </section>
  );
}
