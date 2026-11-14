"use client";
import type { Aviso } from "@/explica/explica";
export const boton =
  "min-h-11 rounded-2xl px-4 py-3 font-semibold transition-transform active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed";
export const tarjeta = "rounded-3xl border border-linea bg-white p-5";
const trazos = {
  hoy: "M3 11 12 3l9 8M5 10v11h14V10M9 21v-7h6v7",
  deudas: "M3 6h18v14H3zM3 10h18M7 15h4",
  hablar: "M21 11a9 9 0 0 1-9 9H4l-2 2v-11a9 9 0 0 1 19 0ZM7 10h10M7 14h6",
  campana: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  cerrar: "m6 6 12 12M6 18 18 6",
  micro: "M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0ZM5 10v2a7 7 0 0 0 14 0v-2M12 19v3M9 22h6",
  enviar: "m3 3 18 9-18 9 4-9-4-9ZM7 12h14",
  voz: "m3 9 5 0 5-5v16l-5-5H3ZM17 8a6 6 0 0 1 0 8M20 5a10 10 0 0 1 0 14",
  rumbo: "m12 3 8 18-8-5-8 5 8-18Z",
};
export function Icono({ nombre }: { nombre: keyof typeof trazos }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={trazos[nombre]} />
    </svg>
  );
}
export const tonos = {
  urgente: "bg-coral-suave text-coral-fuerte",
  atencion: "bg-ambar-suave text-ambar-fuerte",
  bien: "bg-agua-suave text-agua-fuerte",
};
export function TarjetaAviso({ aviso }: { aviso: Aviso }) {
  return (
    <article className={`rounded-3xl p-5 ${tonos[aviso.nivel]}`}>
      <p className="mb-2 text-xs font-bold uppercase tracking-widest">
        {aviso.nivel === "urgente"
          ? "Anticípate"
          : aviso.nivel === "bien"
            ? "Vas por buen camino"
            : "Tenlo presente"}
      </p>
      <h2 className="text-xl font-bold leading-snug">{aviso.titulo}</h2>
      <p className="mt-3 leading-relaxed text-tinta">{aviso.cuerpo}</p>
      {aviso.cuerpo.includes("TCEA") && <p className="mt-2 text-sm">TCEA: lo que te cuesta al año.</p>}
    </article>
  );
}
export function desplazar(elemento: HTMLElement | null) {
  elemento?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    block: "nearest",
  });
}
