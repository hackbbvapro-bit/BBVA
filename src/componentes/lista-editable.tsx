"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icono, unido } from "@/componentes/ui";
import { mensajeDeError } from "@/componentes/formularios";

export interface Fila {
  id: string;
  principal: string;
  secundario?: string;
  monto: string;
  /** Etiqueta corta junto al nombre («Atraso 22 días», «Vencido»). */
  etiqueta?: { texto: string; tono: "urgente" | "atencion" | "bien" | "neutro" | "azul" };
  /** La fila se ve apagada (deuda pagada, cobro cobrado). */
  apagada?: boolean;
}

const TONOS_ETIQUETA = {
  urgente: "bg-coral-suave text-coral-fuerte",
  atencion: "bg-ambar-suave text-ambar-fuerte",
  bien: "bg-verde-suave text-verde-fuerte",
  neutro: "bg-niebla text-gris",
  azul: "bg-agua-suave text-agua-fuerte",
};

/** Al abrirse, el formulario se desplaza a la vista; `scroll-padding-bottom` (globals.css) lo deja por encima de la barra inferior. */
function Abierto({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ref.current?.scrollIntoView({ block: "nearest", behavior: reducido ? "instant" : "smooth" });
  }, []);
  return <div ref={ref}>{children}</div>;
}

/** Lista con filetes; tocar una fila abre su formulario en el mismo lugar, y el botón del pie agrega una nueva. */
export function ListaEditable({
  titulo,
  items,
  vacio,
  nota,
  textoAgregar,
  prefijo,
  formulario,
  avisar,
  ocultarAgregar,
}: {
  titulo?: string;
  items: Fila[];
  vacio: ReactNode;
  nota?: ReactNode;
  textoAgregar: string;
  prefijo: string;
  formulario: (id: string | null, cerrar: (guardado: boolean) => void) => ReactNode;
  avisar: (texto: string) => void;
  /** Para listas de una sola fila editable (Perfil). */
  ocultarAgregar?: boolean;
}) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const [volverA, setVolverA] = useState<string | null>(null);

  useEffect(() => {
    if (abierto === null && volverA) (document.getElementById(volverA) ?? document.getElementById(`${prefijo}-agregar`))?.focus();
  }, [abierto, volverA, prefijo]);

  function cerrar(guardado: boolean) {
    setVolverA(abierto === "nuevo" ? `${prefijo}-agregar` : `${prefijo}-${abierto}`);
    setAbierto(null);
    if (guardado) avisar("Guardado. Tus cifras ya están al día.");
  }

  return (
    <div>
      {titulo && <h2 className="text-lg font-semibold text-noche">{titulo}</h2>}
      {items.length === 0 && abierto !== "nuevo" && <p className="mt-3 leading-relaxed text-gris">{vacio}</p>}
      <ul className={titulo ? "mt-3" : ""}>
        {items.map(f => (
          <li key={f.id} className="border-t border-linea first:border-t-0">
            {abierto === f.id ? (
              <Abierto>
                <div className="py-4">{formulario(f.id, cerrar)}</div>
              </Abierto>
            ) : (
              <button
                id={`${prefijo}-${f.id}`}
                onClick={() => setAbierto(f.id)}
                aria-label={`Editar ${f.principal}, ${f.monto}`}
                className={`-mx-2 flex min-h-14 w-[calc(100%+1rem)] items-center justify-between gap-4 rounded-xl px-2 py-3 text-left transition-colors hover:bg-niebla ${f.apagada ? "opacity-60" : ""}`}
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium text-noche">{f.principal}</span>
                    {f.etiqueta && (
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONOS_ETIQUETA[f.etiqueta.tono]}`}>{f.etiqueta.texto}</span>
                    )}
                  </span>
                  {f.secundario && <span className="block text-sm text-gris">{f.secundario}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="font-semibold text-noche tabular-nums">{unido(f.monto)}</span>
                  <span className="text-gris">
                    <Icono nombre="lapiz" />
                  </span>
                </span>
              </button>
            )}
          </li>
        ))}
      </ul>
      {ocultarAgregar ? null : abierto === "nuevo" ? (
        <Abierto>
          <div className={`py-4 ${items.length ? "border-t border-linea" : ""}`}>{formulario(null, cerrar)}</div>
        </Abierto>
      ) : (
        <button
          id={`${prefijo}-agregar`}
          onClick={() => setAbierto("nuevo")}
          className={`flex min-h-11 items-center gap-2 rounded-xl text-[15px] font-semibold text-electrico transition-colors hover:text-marino ${items.length ? "mt-2" : "mt-4"}`}
        >
          <Icono nombre="mas" />
          {textoAgregar}
        </button>
      )}
      {nota && <p className="mt-4 text-sm leading-relaxed text-gris">{nota}</p>}
    </div>
  );
}

/** Corre el guardado una sola vez por envío, muestra el error en español y deja el formulario abierto si algo falla. */
export function useEnvio(alTerminar: (guardado: boolean) => void) {
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  async function correr(trabajo: () => Promise<void>) {
    if (guardando) return;
    setError(null);
    setGuardando(true);
    try {
      await trabajo();
      alTerminar(true);
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  }
  return { error, guardando, confirmando, setConfirmando, correr, alTerminar };
}
