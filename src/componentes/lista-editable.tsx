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
  /** En modo tabla: una celda por cada columna de `columnas` (mismo orden). */
  celdas?: string[];
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

/** Rejilla de la tabla en escritorio: nombre ancho, una columna por dato, el monto y el lápiz. */
const columnasDe = (n: number) => `minmax(0,1.7fr) repeat(${n}, minmax(0,1fr)) minmax(7.5rem,auto) 1.5rem`;

/** Una fila en modo tabla: columnas alineadas en escritorio; en celular, nombre y monto arriba y los datos en una rejilla debajo. */
function FilaTabla({ f, prefijo, columnas, abrir }: { f: Fila; prefijo: string; columnas: string[]; abrir: () => void }) {
  return (
    <button
      id={`${prefijo}-${f.id}`}
      onClick={abrir}
      aria-label={`Editar ${f.principal}, ${f.monto}`}
      style={{ ["--cols" as string]: columnasDe(columnas.length) }}
      className={`-mx-2 grid w-[calc(100%+1rem)] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-xl px-2 py-3.5 text-left transition-colors hover:bg-niebla md:[grid-template-columns:var(--cols)] ${f.apagada ? "opacity-60" : ""}`}
    >
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-noche">{f.principal}</span>
          {f.etiqueta && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONOS_ETIQUETA[f.etiqueta.tono]}`}>{f.etiqueta.texto}</span>
          )}
        </span>
        {f.secundario && <span className="mt-0.5 block text-[13px] text-gris">{f.secundario}</span>}
      </span>
      {(f.celdas ?? []).map((c, i) => (
        <span key={columnas[i]} className="hidden text-right text-[15px] text-noche tabular-nums md:block">{unido(c)}</span>
      ))}
      <span className="text-right text-base font-semibold text-noche tabular-nums md:text-[17px]">{unido(f.monto)}</span>
      <span className="hidden text-gris md:block"><Icono nombre="lapiz" /></span>
      <span className="col-span-2 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg bg-niebla/70 px-3 py-2 sm:grid-cols-4 md:hidden">
        {(f.celdas ?? []).map((c, i) => (
          <span key={columnas[i]} className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-wide text-gris">{columnas[i]}</span>
            <span className="block text-sm text-noche tabular-nums">{unido(c)}</span>
          </span>
        ))}
      </span>
    </button>
  );
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
  abrirNuevo,
  tabla,
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
  /** Cada vez que este número sube, se abre el formulario de «agregar» (botón externo de la página). */
  abrirNuevo?: number;
  /** Modo tabla: títulos de las columnas entre el nombre y el monto, y del nombre y el monto mismos. */
  tabla?: { principal: string; columnas: string[]; monto: string };
}) {
  const [abierto, setAbierto] = useState<string | null>(abrirNuevo ? "nuevo" : null);
  const [volverA, setVolverA] = useState<string | null>(null);
  // Si el botón externo vuelve a pedir «agregar», se abre el formulario (ajuste durante el render, sin efecto).
  const [pedidoVisto, setPedidoVisto] = useState(abrirNuevo);
  if (abrirNuevo !== pedidoVisto) {
    setPedidoVisto(abrirNuevo);
    if (abrirNuevo) setAbierto("nuevo");
  }

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
      {tabla && items.length > 0 && (
        <div
          aria-hidden="true"
          style={{ ["--cols" as string]: columnasDe(tabla.columnas.length) }}
          className="hidden gap-x-4 border-b border-linea-fuerte pb-2 text-xs font-semibold uppercase tracking-wide text-gris md:grid md:[grid-template-columns:var(--cols)]"
        >
          <span>{tabla.principal}</span>
          {tabla.columnas.map(c => <span key={c} className="text-right">{c}</span>)}
          <span className="text-right">{tabla.monto}</span>
          <span />
        </div>
      )}
      <ul className={titulo ? "mt-3" : ""}>
        {items.map(f => (
          <li key={f.id} className="border-t border-linea first:border-t-0">
            {abierto === f.id ? (
              <Abierto>
                <div className="py-4">{formulario(f.id, cerrar)}</div>
              </Abierto>
            ) : tabla ? (
              <FilaTabla f={f} prefijo={prefijo} columnas={tabla.columnas} abrir={() => setAbierto(f.id)} />
            ) : (
              <button
                id={`${prefijo}-${f.id}`}
                onClick={() => setAbierto(f.id)}
                aria-label={`Editar ${f.principal}, ${f.monto}`}
                className={`-mx-2 grid min-h-14 w-[calc(100%+1rem)] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-xl px-2 py-3 text-left transition-colors hover:bg-niebla ${f.apagada ? "opacity-60" : ""}`}
              >
                <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium text-noche">{f.principal}</span>
                  {f.etiqueta && (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONOS_ETIQUETA[f.etiqueta.tono]}`}>{f.etiqueta.texto}</span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-3 sm:row-span-2 sm:row-start-1 sm:col-start-2">
                  <span className="font-semibold text-noche tabular-nums">{unido(f.monto)}</span>
                  <span className="text-gris">
                    <Icono nombre="lapiz" />
                  </span>
                </span>
                {f.secundario && <span className="col-span-2 mt-0.5 text-sm text-gris sm:col-span-1 sm:row-start-2">{f.secundario}</span>}
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
