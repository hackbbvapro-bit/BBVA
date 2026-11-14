"use client";
import type { ReactNode } from "react";
import type { Aviso } from "@/explica/explica";
export const boton =
  "min-h-11 rounded-2xl px-4 py-3 font-semibold transition-[transform,background-color,color] duration-200 active:scale-[.97] disabled:opacity-50 disabled:cursor-not-allowed";
export const tarjeta =
  "rounded-[22px] border border-linea bg-white p-5 md:p-6";
/** Evita que «S/» quede en una línea y el monto en la siguiente. Solo cambia el espacio. */
export function unido(texto: string) {
  return texto.replace(/S\/ /g, "S/ ");
}
const trazos = {
  hoy: "M3 11 12 3l9 8M5 10v11h14V10M9 21v-7h6v7",
  dinero: "M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4ZM4 7V5h12v2M16 13.5h1",
  deudas: "M3 6h18v14H3zM3 10h18M7 15h4",
  hablar: "M21 11a9 9 0 0 1-9 9H4l-2 2v-11a9 9 0 0 1 19 0ZM7 10h10M7 14h6",
  campana: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  cerrar: "m6 6 12 12M6 18 18 6",
  micro: "M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0ZM5 10v2a7 7 0 0 0 14 0v-2M12 19v3M9 22h6",
  enviar: "m3 3 18 9-18 9 4-9-4-9ZM7 12h14",
  voz: "m3 9 5 0 5-5v16l-5-5H3ZM17 8a6 6 0 0 1 0 8M20 5a10 10 0 0 1 0 14",
  rumbo: "m12 3 8 18-8-5-8 5 8-18Z",
  perfil: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0",
  salir: "M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10",
  abajo: "m6 9 6 6 6-6",
  lapiz: "M4 20h4L19 9l-4-4L4 16v4ZM13 7l4 4",
  mas: "M12 5v14M5 12h14",
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
export function Marca() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-electrico text-white">
        <Icono nombre="rumbo" />
      </span>
      <span className="leading-tight">
        <span className="block text-[17px] font-semibold tracking-[-0.015em] text-noche">Copiloto</span>
        <span className="block text-xs text-gris">exclusivo para clientes BBVA</span>
      </span>
    </span>
  );
}
export const tonos = {
  urgente: "bg-coral-suave text-coral-fuerte",
  atencion: "bg-ambar-suave text-ambar-fuerte",
  bien: "bg-verde-suave text-verde-fuerte",
};
export function TarjetaAviso({ aviso }: { aviso: Aviso }) {
  return (
    <article className={`aparecer rounded-[22px] p-5 ${tonos[aviso.nivel]}`}>
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <span className="size-2 rounded-full bg-current" aria-hidden="true" />
        {aviso.nivel === "urgente"
          ? "Anticípate"
          : aviso.nivel === "bien"
            ? "Vas por buen camino"
            : "Tenlo presente"}
      </p>
      <h2 className="text-xl font-bold leading-snug text-balance">{unido(aviso.titulo)}</h2>
      <p className="mt-3 leading-relaxed text-tinta">{unido(aviso.cuerpo)}</p>
      {aviso.cuerpo.includes("TCEA") && <p className="mt-2 text-sm">TCEA: lo que te cuesta al año.</p>}
    </article>
  );
}
/** Cabecera clara de cada pestaña: tarjeta blanca con borde, nunca una superficie azul (ANCLA). */
export function Portada({ children }: { children: ReactNode }) {
  return <section className="aparecer mb-6 rounded-[22px] border border-linea bg-white p-6 md:p-8">{children}</section>;
}
export function desplazar(elemento: HTMLElement | null) {
  elemento?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    block: "nearest",
  });
}
