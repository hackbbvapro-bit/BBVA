"use client";
import type { ReactNode } from "react";
import type { Aviso } from "@/explica/explica";
export const boton =
  "min-h-11 rounded-2xl px-4 py-3 font-semibold transition-[transform,background-color,color] duration-200 active:scale-[.97] disabled:opacity-50 disabled:cursor-not-allowed";
export const tarjeta =
  "rounded-2xl border border-linea bg-white p-4 md:rounded-[22px] md:p-6";
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
  check: "m5 12.5 4.5 4.5L19 7.5",
  micro: "M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0ZM5 10v2a7 7 0 0 0 14 0v-2M12 19v3M9 22h6",
  enviar: "m3 3 18 9-18 9 4-9-4-9ZM7 12h14",
  voz: "m3 9 5 0 5-5v16l-5-5H3ZM17 8a6 6 0 0 1 0 8M20 5a10 10 0 0 1 0 14",
  rumbo: "m12 3 8 18-8-5-8 5 8-18Z",
  perfil: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0",
  salir: "M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10",
  abajo: "m6 9 6 6 6-6",
  lapiz: "M4 20h4L19 9l-4-4L4 16v4ZM13 7l4 4",
  mas: "M12 5v14M5 12h14",
  calendario: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  tendencia: "m3 17 6-6 4 4 8-8M15 7h6v6",
  camara: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7",
  subir: "M12 16V4M7 9l5-5 5 5M4 20h16",
  ayuda: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01",
  asistente: "M12 3v2M7 8h10a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3ZM9.5 13h.01M14.5 13h.01M2 13v2M22 13v2",
  manos: "M7 11V6a2 2 0 0 1 4 0v5M11 10V4a2 2 0 0 1 4 0v7M15 9a2 2 0 0 1 4 0v4a8 8 0 0 1-8 8h-1a7 7 0 0 1-6-3l-2-4a2 2 0 0 1 3-2l2 2",
};
export type NombreIcono = keyof typeof trazos;
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
        <span className="block text-xs text-gris">prototipo · datos sintéticos</span>
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
    <article className={`aparecer rounded-2xl p-4 md:rounded-[22px] md:p-5 ${tonos[aviso.nivel]}`}>
      <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold md:text-sm">
        <span className="size-2 rounded-full bg-current" aria-hidden="true" />
        {aviso.nivel === "urgente"
          ? "Anticípate"
          : aviso.nivel === "bien"
            ? "Vas por buen camino"
            : "Tenlo presente"}
      </p>
      <h2 className="text-lg font-bold leading-snug text-balance md:text-xl">{unido(aviso.titulo)}</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-tinta md:mt-3 md:text-base">{unido(aviso.cuerpo)}</p>
      {aviso.cuerpo.includes("TCEA") && <p className="mt-1.5 text-xs md:text-sm">TCEA: lo que te cuesta al año.</p>}
    </article>
  );
}
/** Cabecera clara de cada pestaña: tarjeta blanca con borde, nunca una superficie azul (ANCLA). */
export function Portada({ children }: { children: ReactNode }) {
  return <section className="aparecer mb-4 rounded-2xl border border-linea bg-white p-4 md:mb-6 md:rounded-[22px] md:p-8">{children}</section>;
}
/** Encabezado de página: título a escala de producto (no de cartel), bajada y acciones a la derecha. */
export function Encabezado({ titulo, bajada, acciones }: { titulo: string; bajada?: ReactNode; acciones?: ReactNode }) {
  return (
    <header className="aparecer mb-4 flex flex-col gap-3 md:mb-6 md:gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 lg:flex-1">
        <h1 className="text-[1.375rem] font-semibold leading-tight tracking-[-0.02em] text-noche md:text-[1.875rem]">{titulo}</h1>
        {bajada && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gris md:mt-1.5 md:text-[15px]">{bajada}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2 lg:shrink-0">{acciones}</div>}
    </header>
  );
}
const chips = {
  azul: "bg-agua-suave text-electrico",
  verde: "bg-verde-suave text-verde-fuerte",
  ambar: "bg-ambar-suave text-ambar-fuerte",
  coral: "bg-coral-suave text-coral-fuerte",
};
export type Cifra = {
  icono: NombreIcono;
  etiqueta: string;
  valor: string;
  nota?: string;
  tono?: keyof typeof chips;
  /** Si existe, la celda es un botón que lleva a la sección de esa cifra. */
  ir?: () => void;
  /** A dónde lleva, para lectores de pantalla (p. ej. «Ir a Deudas»). */
  accion?: string;
};
/**
 * Franja de cifras: una sola tarjeta dividida en celdas con filetes finos (2 por fila en el celular,
 * todas en fila desde tableta). Ocupa una cuarta parte del alto que tenían las tarjetas sueltas.
 */
export function Cifras({ items, etiqueta }: { items: Cifra[]; etiqueta: string }) {
  const columnas = items.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";
  return (
    <section aria-label={etiqueta} className={`aparecer grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-linea bg-linea ${columnas}`}>
      {items.map(({ icono, etiqueta, valor, nota, tono = "azul", ir, accion }, i) => {
        const clase = `flex min-w-0 flex-col bg-white px-4 py-3 text-left md:px-5 md:py-4 ${items.length % 2 === 1 && i === items.length - 1 ? "col-span-2 lg:col-span-1" : ""}`;
        const contenido = (
          <>
            <span className="flex items-start gap-1.5 text-xs font-medium leading-tight text-gris">
              <span className={`flex size-5 shrink-0 items-center justify-center rounded-md [&_svg]:size-3.5 ${chips[tono]}`}>
                <Icono nombre={icono} />
              </span>
              <span className="min-w-0 self-center">{etiqueta}</span>
              {ir && (
                <span aria-hidden="true" className="ml-auto shrink-0 text-gris/70 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-electrico">›</span>
              )}
            </span>
            <span className="mt-1.5 text-lg font-semibold leading-tight tracking-[-0.015em] text-noche tabular-nums md:text-xl">{unido(valor)}</span>
            {nota && <span className="mt-0.5 line-clamp-3 text-xs md:line-clamp-2 leading-snug text-gris" title={nota}>{unido(nota)}</span>}
          </>
        );
        return ir ? (
          <button
            key={etiqueta}
            type="button"
            onClick={ir}
            aria-label={`${etiqueta}: ${valor}. ${nota ? `${nota}. ` : ""}${accion ?? ""}`.trim()}
            className={`${clase} group cursor-pointer transition-colors duration-150 hover:bg-niebla focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-electrico`}
          >
            {contenido}
          </button>
        ) : (
          <div key={etiqueta} className={clase}>
            {contenido}
          </div>
        );
      })}
    </section>
  );
}
/** Botones de acción de página. */
export const botonPrincipal =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-electrico px-3.5 text-sm font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-marino active:scale-[.97] md:min-h-11 md:px-4 md:text-[15px] [&_svg]:size-[18px] md:[&_svg]:size-5";
export const botonSecundario =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-linea-fuerte bg-white px-3.5 text-sm font-semibold text-noche transition-[transform,background-color] duration-150 hover:bg-niebla active:scale-[.97] md:min-h-11 md:px-4 md:text-[15px] [&_svg]:size-[18px] md:[&_svg]:size-5";
export function desplazar(elemento: HTMLElement | null, bloque: ScrollLogicalPosition = "nearest") {
  elemento?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    block: bloque,
  });
}
