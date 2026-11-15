"use client";
/** Tarjeta bajo la respuesta del asistente: qué anotó en el panel, y el botón para deshacerlo. */
import { describir, type Accion } from "@/agente/registro";
import type { Recibo } from "@/datos/anotar";
import { Icono } from "@/componentes/ui";

export type Nota =
  | { estado: "guardando"; accion: Accion }
  | { estado: "listo"; accion: Accion; recibo: Recibo }
  | { estado: "deshaciendo"; accion: Accion; recibo: Recibo }
  | { estado: "deshecho"; accion: Accion; recibo: Recibo }
  | { estado: "error"; accion: Accion; mensaje: string };

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function TarjetaAnotado({ nota, alDeshacer }: { nota: Nota; alDeshacer: () => void }) {
  const linea = mayuscula(describir(nota.accion));
  if (nota.estado === "error") {
    return (
      <div role="alert" className="mt-2 rounded-2xl border border-coral/40 bg-coral-suave/60 px-4 py-3 text-sm leading-snug text-coral-fuerte">
        <p className="font-semibold">No lo pude guardar en tu panel</p>
        <p className="mt-0.5">{linea}. {nota.mensaje}</p>
      </div>
    );
  }
  const deshecho = nota.estado === "deshecho";
  return (
    <div
      role="status"
      className={`mt-2 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm leading-snug ${deshecho ? "border-linea bg-niebla text-gris" : "border-agua/40 bg-agua-suave/60 text-tinta"}`}
    >
      <span aria-hidden="true" className={`flex size-8 shrink-0 items-center justify-center rounded-full [&_svg]:size-4 ${deshecho ? "bg-white text-gris" : "bg-electrico text-white"}`}>
        <Icono nombre={deshecho ? "cerrar" : "check"} />
      </span>
      <p className="min-w-0 flex-1">
        <span className="font-semibold text-noche">
          {nota.estado === "guardando" ? "Guardando en tu panel…" : deshecho ? "Lo quité de tu panel" : "Anotado en tu panel"}
        </span>
        <span className={`block ${deshecho ? "line-through" : ""}`}>{linea}</span>
      </p>
      {(nota.estado === "listo" || nota.estado === "deshaciendo") && (
        <button
          type="button"
          onClick={alDeshacer}
          disabled={nota.estado === "deshaciendo"}
          className="min-h-11 shrink-0 rounded-full px-3 font-semibold text-electrico hover:bg-white disabled:opacity-50"
        >
          Deshacer
        </button>
      )}
    </div>
  );
}
