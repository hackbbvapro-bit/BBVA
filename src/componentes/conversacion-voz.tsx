"use client";
import { estaActiva, textoEstado, type EstadoConversacion } from "@/cliente/conversacion";
import type { Soporte } from "@/cliente/manos-libres";
import { Icono } from "@/componentes/ui";

export const SIN_SOPORTE =
  "Este navegador no permite hablar con el copiloto. Puedes escribir tu pregunta aquí abajo.";

/** Controles de la conversación por voz «manos libres». Solo presenta; la lógica vive en useManosLibres. */
export function ConversacionVoz({
  estado,
  soporte,
  parcial,
  bloqueado,
  alActivar,
  alTerminar,
  alInterrumpir,
}: {
  estado: EstadoConversacion;
  soporte: Soporte;
  parcial: string;
  /** Por ejemplo, mientras se responde una pregunta escrita. */
  bloqueado?: boolean;
  alActivar: () => void;
  alTerminar: () => void;
  alInterrumpir: () => void;
}) {
  if (soporte === "no") {
    return (
      <p role="status" className="mb-2 rounded-2xl bg-ambar-suave px-4 py-3 text-sm text-ambar-fuerte">
        {SIN_SOPORTE}
      </p>
    );
  }
  const activa = estaActiva(estado);
  const texto = textoEstado(estado.fase);
  return (
    <div className="mb-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!activa && (bloqueado || soporte === "desconocido")}
          onClick={activa ? alTerminar : alActivar}
          className={`flex min-h-14 min-w-14 items-center justify-center gap-2 rounded-full border-2 px-6 text-base font-semibold disabled:opacity-40 ${activa ? "border-coral-fuerte bg-white text-coral-fuerte" : "border-electrico bg-agua-suave text-electrico"}`}
        >
          <Icono nombre="micro" />
          {activa ? "Terminar conversación" : "Hablar con el copiloto"}
        </button>
        {estado.fase === "hablando" && (
          <button
            type="button"
            onClick={alInterrumpir}
            className="min-h-11 rounded-full border-2 border-agua-fuerte bg-white px-5 text-sm font-semibold text-agua-fuerte"
          >
            Interrumpir
          </button>
        )}
      </div>
      <p aria-live="polite" className="mt-2 min-h-6 text-sm font-medium text-agua-fuerte">
        {texto}
        {estado.fase === "escuchando" && parcial ? ` «${parcial}»` : ""}
      </p>
      {estado.fase === "error" && (
        <p role="alert" className="text-sm text-coral-fuerte">
          {estado.mensaje}
        </p>
      )}
    </div>
  );
}
