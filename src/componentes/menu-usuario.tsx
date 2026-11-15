"use client";
import { useEffect, useRef, useState } from "react";
import { Icono } from "@/componentes/ui";

const ITEM =
  "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-[15px] font-medium text-noche transition-colors duration-150 hover:bg-niebla";

/** Menú del usuario (avatar): Perfil y Salir. En la barra lateral abre hacia arriba; en la cabecera, hacia abajo. */
export function MenuUsuario({
  nombre,
  variante,
  alPerfil,
  alComoFunciona,
  alCambiarModo,
  alDatos,
  alEvaluacion,
  demo = true,
}: {
  nombre: string;
  variante: "lateral" | "cabecera";
  alPerfil: () => void;
  alComoFunciona: () => void;
  /** Si llega, el menú ofrece pasar del caso de ejemplo a la situación propia (o volver al ejemplo). */
  alCambiarModo?: () => void;
  /** Abre «Datos de prueba»: los clientes sintéticos con los que se evaluó al asistente. */
  alDatos?: () => void;
  /** Abre «Evaluación»: cómo se midió el copiloto y qué salió. */
  alEvaluacion?: () => void;
  /** false cuando la persona usa sus propios datos. */
  demo?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  const inicial = (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-agua-suave font-semibold text-electrico"
      aria-hidden="true"
    >
      {nombre.slice(0, 1)}
    </span>
  );

  return (
    <div ref={raiz} className="relative">
      {variante === "lateral" ? (
        <button
          aria-haspopup="menu"
          aria-expanded={abierto}
          onClick={() => setAbierto(a => !a)}
          className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-linea px-3 py-2.5 text-left transition-colors duration-150 hover:bg-niebla"
        >
          {inicial}
          <span className="min-w-0 flex-1 text-sm leading-tight text-noche">
            {nombre}
            <span className="block text-gris">{demo ? "Caso de ejemplo" : "Tu caso (simulación)"}</span>
          </span>
          <Icono nombre="abajo" />
        </button>
      ) : (
        <button
          aria-label={`Menú de ${nombre}`}
          aria-haspopup="menu"
          aria-expanded={abierto}
          onClick={() => setAbierto(a => !a)}
          className="flex size-11 items-center justify-center rounded-full border border-linea bg-white transition-transform active:scale-95"
        >
          {inicial}
        </button>
      )}
      {abierto && (
        <div
          role="menu"
          aria-label="Menú del usuario"
          className={`absolute z-40 w-56 rounded-2xl border border-linea bg-white p-1.5 ${variante === "lateral" ? "inset-x-0 bottom-full mb-2 w-auto" : "right-0 top-full mt-2"}`}
        >
          {alCambiarModo && (
            <>
              <p className="px-3 pb-1 pt-2 text-xs font-medium text-gris">{demo ? "Estás viendo un caso de ejemplo" : "Estás en tu simulación"}</p>
              <button
                role="menuitem"
                className={`${ITEM} text-electrico`}
                onClick={() => {
                  setAbierto(false);
                  alCambiarModo();
                }}
              >
                <Icono nombre={demo ? "lapiz" : "perfil"} />
                {demo ? "Empezar con mi situación" : "Ver el caso de ejemplo"}
              </button>
              <div className="my-1 h-px bg-linea" aria-hidden="true" />
            </>
          )}
          <button
            role="menuitem"
            className={ITEM}
            onClick={() => {
              setAbierto(false);
              alPerfil();
            }}
          >
            <Icono nombre="perfil" />
            Perfil
          </button>
          <button
            role="menuitem"
            className={ITEM}
            onClick={() => {
              setAbierto(false);
              alComoFunciona();
            }}
          >
            <Icono nombre="rumbo" />
            Cómo funciona
          </button>
          {alDatos && (
            <button
              role="menuitem"
              className={ITEM}
              onClick={() => {
                setAbierto(false);
                alDatos();
              }}
            >
              <Icono nombre="tabla" />
              Datos de prueba
            </button>
          )}
          {alEvaluacion && (
            <button
              role="menuitem"
              className={ITEM}
              onClick={() => {
                setAbierto(false);
                alEvaluacion();
              }}
            >
              <Icono nombre="tendencia" />
              Evaluación
            </button>
          )}
          <form method="post" action="/api/salir">
            <button role="menuitem" type="submit" className={ITEM}>
              <Icono nombre="salir" />
              Salir
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
