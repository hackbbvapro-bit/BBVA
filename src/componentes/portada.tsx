"use client";
/**
 * Portada: lo primero que se ve. Como la vitrina de una tienda: en un vistazo dice qué es, para quién es
 * y cuál es la puerta de entrada (el caso de Andrea o la situación propia), sin prometer nada que no haga.
 *
 * La misma pieza sirve en dos lugares:
 * - /ingresar (sin sesión): los botones envían el formulario de ingreso con la opción elegida.
 * - la bienvenida (con sesión): los botones llaman directo al flujo de ejemplo o al cuestionario.
 */
import Image from "next/image";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icono, type NombreIcono } from "@/componentes/ui";

export const PASOS = [
  ["calendario", "Proyecta tu saldo día a día", "Mira tus próximos 30 días y te avisa qué día te faltaría plata, y por qué."],
  ["deudas", "Ordena tus deudas", "Tarjetas y préstamos en el orden de pago que más intereses te ahorra."],
  ["rumbo", "Te propone cómo evitarlo", "2 o 3 jugadas con su costo en soles, calculadas por el código."],
] as const satisfies readonly (readonly [NombreIcono, string, string])[];

/**
 * Ilustración decorativa de una proyección: el saldo baja con los pagos, cruza el cero un día y vuelve a subir
 * cuando entra la plata. No lleva montos: es un dibujo, no un cálculo.
 */
export function MiniProyeccion() {
  const id = useId();
  const linea = "M0 34 L44 38 L62 52 L104 56 L122 70 L168 74 L186 96 L218 99 L232 50 L274 54 L296 64 L320 66";
  return (
    <div aria-hidden="true" className="relative bg-[linear-gradient(180deg,#e9f4ff_0%,#ffffff_100%)] px-5 pb-3 pt-5 md:px-7 md:pt-6">
      <svg viewBox="0 0 320 118" className="block h-auto w-full overflow-visible" fill="none">
        <defs>
          <linearGradient id={`${id}-area`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#001391" stopOpacity="0.16" />
            <stop offset="1" stopColor="#001391" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${linea} L320 118 L0 118 Z`} fill={`url(#${id}-area)`} />
        <line x1="0" x2="320" y1="88" y2="88" className="stroke-coral-fuerte/50" strokeDasharray="4 5" strokeWidth="1.25" />
        <rect x="183" y="88" width="38" height="18" rx="3" className="fill-coral-fuerte/10" />
        <path d={linea} pathLength={1} className="trazo stroke-electrico" strokeWidth="2.75" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx="0" cy="34" r="4.5" className="fill-electrico" />
        <circle cx="202" cy="97.5" r="9" className="fill-coral-fuerte/15" />
        <circle cx="202" cy="97.5" r="4.5" className="fill-coral-fuerte stroke-white" strokeWidth="2" />
      </svg>
      <div className="mt-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.08em] text-gris">
        <span>Hoy</span>
        <span className="inline-flex items-center gap-1.5 normal-case tracking-normal text-coral-fuerte">
          <span className="size-1.5 rounded-full bg-coral-fuerte" />
          El día que faltaría
        </span>
        <span>30 días</span>
      </div>
    </div>
  );
}

/** Qué hacen los botones: enviar el ingreso (sin sesión) o abrir el flujo directamente (con sesión). */
export type AccionesPortada =
  | { tipo: "formulario"; accion: string }
  | { tipo: "botones"; alEmpezar: () => void; alVerEjemplo: () => void; ocupado?: boolean; error?: string };

const ID_FORMULARIO = "portada-ingreso";

const SECCIONES = [
  ["#como-funciona", "Cómo funciona"],
  ["#aprende", "Qué aprenderás"],
  ["#beneficios", "Beneficios"],
] as const;

const BENEFICIOS = [
  ["libro", "Aprende", "Entiende tu dinero, sin tecnicismos."],
  ["barras", "Mejora tu historial", "Hábitos y decisiones responsables."],
  ["estrella", "Descubre opciones", "Productos sujetos a evaluación bancaria."],
] as const;

const APRENDE = [
  ["Aprende sin miedo", "Comprende tarjetas, intereses, deudas e historial crediticio con explicaciones sencillas."],
  ["Construye tu ruta", "Recibe pasos educativos y ejemplos según la situación que quieras simular."],
  ["Decide con criterio", "Conoce productos bancarios potencialmente relevantes, sin promesas de aprobación."],
] as const;

const AVISO =
  "Prototipo educativo con datos sintéticos. Proyecto independiente para hackathon; no es un producto oficial de BBVA. Simulación, no asesoría financiera. No ingreses información sensible.";

const trazosBeneficio = {
  libro: "M12 6.5C10.4 5 7.9 4.5 3 4.5v14c4.9 0 7.4.5 9 2 1.6-1.5 4.1-2 9-2v-14c-4.9 0-7.4.5-9 2ZM12 6.5v14",
  barras: "M4 20h16M7 16v-3M12 16V9M17 16V5M15 6.5 17 4.5l2 2",
  estrella: "m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9L12 3.5Z",
} as const;

function IconoBeneficio({ nombre }: { nombre: keyof typeof trazosBeneficio }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-6 md:size-7">
      <path d={trazosBeneficio[nombre]} />
    </svg>
  );
}

function Cta({ acciones, valor, variante, className = "" }: {
  acciones: AccionesPortada; valor: "propio" | "demo"; variante: "solida" | "contorno" | "clara" | "contorno-claro"; className?: string;
}) {
  const estilo = {
    solida: "bg-[linear-gradient(105deg,#0744cc,#081fa7)] text-white shadow-[0_8px_18px_rgb(23_68_172/0.24)] hover:shadow-[0_12px_26px_rgb(3_42_154/0.32)]",
    contorno: "border border-[#0d3fb2] bg-white/90 text-[#0a2380] hover:bg-white hover:shadow-[0_10px_22px_rgb(3_42_154/0.14)]",
    // Para fondo oscuro (franja final).
    clara: "bg-white text-[#0a2380] hover:shadow-[0_12px_26px_rgb(0_0_0/0.25)]",
    "contorno-claro": "border border-white/60 text-white hover:bg-white/10",
  }[variante];
  const clase = `inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 text-[15px] font-semibold transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60 ${estilo} ${className}`;
  const contenido: ReactNode =
    valor === "demo" ? (
      <>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current"><path d="M8 5.5v13l10.5-6.5L8 5.5Z" /></svg>
        Ver el caso de Andrea
      </>
    ) : (
      <>
        Empezar con mi situación
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </>
    );
  if (acciones.tipo === "formulario")
    return <button type="submit" form={ID_FORMULARIO} name="empezar" value={valor} className={clase}>{contenido}</button>;
  return (
    <button type="button" onClick={valor === "demo" ? acciones.alVerEjemplo : acciones.alEmpezar} disabled={acciones.ocupado} className={clase}>
      {contenido}
    </button>
  );
}

export function MarcaPortada() {
  return (
    <span className="flex min-w-0 items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/marca/finance-pro-icono.webp" alt="" width={40} height={40} className="size-10 shrink-0 object-contain" />
      <span className="min-w-0 leading-tight">
        <span className="block text-[19px] font-bold tracking-[-0.02em] text-noche">Finance Pro</span>
        <span className="block truncate text-xs font-medium text-gris">Tu copiloto financiero con IA</span>
      </span>
    </span>
  );
}

function Cabecera({ acciones }: { acciones: AccionesPortada }) {
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alTecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setAbierto(false);
      boton.current?.focus();
    };
    const alTocar = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !boton.current?.contains(t)) setAbierto(false);
    };
    document.addEventListener("keydown", alTecla);
    document.addEventListener("pointerdown", alTocar);
    menu.current?.querySelector("a")?.focus();
    return () => {
      document.removeEventListener("keydown", alTecla);
      document.removeEventListener("pointerdown", alTocar);
    };
  }, [abierto]);

  return (
    <header className="relative z-30 border-b border-white/60 bg-white/70 backdrop-blur-md lg:border-transparent lg:bg-white/40">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 pt-[env(safe-area-inset-top)] md:h-20 md:px-8 xl:px-14">
        <a href="#inicio" aria-label="Finance Pro, ir al inicio" className="rounded-xl">
          <MarcaPortada />
        </a>
        <nav aria-label="Secciones" className="hidden items-center gap-8 text-sm font-semibold text-noche lg:flex">
          {SECCIONES.map(([href, texto]) => (
            <a key={href} href={href} className="rounded-md py-2 transition-colors hover:text-[#0a5ce5]">{texto}</a>
          ))}
        </nav>
        <div className="hidden items-center gap-2.5 lg:flex">
          <Cta acciones={acciones} valor="demo" variante="contorno" className="hidden min-h-11 px-4 text-sm xl:inline-flex" />
          <Cta acciones={acciones} valor="propio" variante="solida" className="min-h-11 px-4 text-sm" />
        </div>
        <button
          ref={boton}
          type="button"
          aria-expanded={abierto}
          aria-controls="portada-menu"
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setAbierto(a => !a)}
          className="-mr-2 flex size-11 items-center justify-center rounded-xl text-noche lg:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="size-6">
            {abierto ? <path d="m6 6 12 12M6 18 18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
      <div
        id="portada-menu"
        ref={menu}
        hidden={!abierto}
        className="absolute inset-x-3 top-full mt-2 rounded-2xl border border-linea bg-white p-2 shadow-[0_20px_40px_-12px_rgb(4_28_85/0.28)] lg:hidden"
      >
        <nav aria-label="Secciones">
          {SECCIONES.map(([href, texto]) => (
            <a key={href} href={href} onClick={() => setAbierto(false)} className="flex min-h-12 items-center rounded-xl px-4 font-semibold text-noche hover:bg-niebla">
              {texto}
            </a>
          ))}
        </nav>
        <div className="mt-2 grid gap-2 border-t border-linea p-2 pt-3">
          <Cta acciones={acciones} valor="propio" variante="solida" />
          <Cta acciones={acciones} valor="demo" variante="contorno" />
        </div>
      </div>
    </header>
  );
}

/** Vista del producto: la misma gráfica y los mismos 3 pasos que hace la app, sin cifras inventadas. */
function TarjetaProducto() {
  return (
    <section
      id="como-funciona"
      aria-labelledby="como-funciona-titulo"
      className="aparecer-heroe scroll-mt-24 overflow-hidden rounded-[28px] border border-white/80 bg-white/95 shadow-[0_2px_4px_rgb(7_33_70/0.04),0_28px_60px_-24px_rgb(20_46_107/0.35)] [animation-delay:120ms]"
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-5 md:px-7 md:pt-6">
        <h2 id="como-funciona-titulo" className="text-xl font-bold tracking-[-0.03em] text-noche md:text-[22px]">Así te ayuda Finance Pro</h2>
        <span className="shrink-0 rounded-full bg-agua-suave px-2.5 py-1 text-[11px] font-semibold text-electrico">Ejemplo ilustrativo</span>
      </div>
      <MiniProyeccion />
      <ol className="divide-y divide-linea px-5 pb-1 md:px-7">
        {PASOS.map(([icono, titulo, texto], i) => (
          <li key={titulo} className="flex items-start gap-3.5 py-3.5 md:gap-4 md:py-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-agua-suave text-electrico [&_svg]:size-5">
              <Icono nombre={icono} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold tracking-[0.08em] text-agua-fuerte">{String(i + 1).padStart(2, "0")}</span>
              <span className="block font-semibold leading-snug text-noche">{titulo}</span>
              <span className="mt-0.5 block text-sm leading-snug text-gris">{texto}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Portada({ acciones }: { acciones: AccionesPortada }) {
  const error = acciones.tipo === "botones" ? acciones.error : undefined;
  return (
    <div id="inicio" className="portada min-h-dvh overflow-x-clip bg-white text-tinta [&_:focus-visible]:outline-3 [&_:focus-visible]:outline-offset-3 [&_:focus-visible]:outline-[#2b8cff]">
      {acciones.tipo === "formulario" && <form id={ID_FORMULARIO} method="post" action={acciones.accion} hidden />}
      <Cabecera acciones={acciones} />

      <main>
        {/* Héroe: en el celular, foto arriba y texto abajo; en escritorio, narrativa | foto | producto. */}
        <section aria-labelledby="portada-titulo" className="relative isolate bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_100%)] md:bg-[linear-gradient(112deg,#fcfdff_0%,#f6faff_26%,#deecff_63%,#bad8ff_100%)]">
          <div aria-hidden="true" className="absolute inset-0 -z-20 hidden bg-[radial-gradient(ellipse_at_22%_88%,rgb(255_199_132/0.34),transparent_45%),radial-gradient(ellipse_at_68%_8%,rgb(140_196_255/0.26),transparent_50%)] md:block" />
          {/* Costa al atardecer: fondo suave abajo a la izquierda. */}
          <div aria-hidden="true" className="absolute bottom-0 left-0 -z-10 hidden h-[260px] w-[58%] [mask-image:linear-gradient(to_top,black_30%,transparent_100%),linear-gradient(to_right,black_70%,transparent_100%)] [mask-composite:intersect] md:block">
            <Image src="/copiloto/atardecer.webp" alt="" fill sizes="58vw" className="object-cover object-[50%_70%] opacity-90" />
          </div>
          {/* Ola azul, abajo a la derecha. */}
          <div aria-hidden="true" className="absolute inset-0 -z-10 hidden overflow-hidden lg:block">
            <div className="absolute -bottom-28 -right-[12%] h-[440px] w-[80%] -rotate-[9deg] rounded-[50%] bg-[linear-gradient(135deg,transparent_2%,rgb(0_91_188/0.20)_50%,rgb(4_58_174/0.78)_92%)]" />
          </div>

          <div className="relative mx-auto grid max-w-[1440px] md:grid-cols-12 md:gap-x-6 md:px-8 md:pb-24 md:pt-10 lg:min-h-[min(720px,calc(100svh-80px))] lg:grid-cols-[minmax(0,34fr)_minmax(0,24fr)_minmax(0,42fr)] lg:items-center lg:gap-x-0 lg:pb-32 lg:pt-6 xl:px-14">
            {/* Foto: arriba en el celular, a la derecha en tableta, al centro (detrás) en escritorio. */}
            <div className="relative h-[300px] w-full overflow-hidden [mask-image:linear-gradient(to_bottom,black_72%,transparent_100%)] min-[420px]:h-[330px] md:col-span-5 md:col-start-8 md:row-start-1 md:h-[460px] md:self-center md:rounded-[28px] md:[mask-image:none] md:shadow-[0_24px_50px_-24px_rgb(20_46_107/0.45)] lg:absolute lg:col-auto lg:row-auto lg:self-stretch lg:inset-y-0 lg:left-[30%] lg:h-auto lg:w-[30%] lg:rounded-none lg:shadow-none lg:[mask-image:linear-gradient(to_right,transparent_0%,black_16%,black_80%,transparent_100%),linear-gradient(to_bottom,black_70%,transparent_100%)] lg:[mask-composite:intersect]">
              <Image
                src="/copiloto/persona.webp"
                alt="Ilustración generada con IA: una joven profesional sonríe frente a la costa al atardecer, con su laptop."
                fill
                preload
                fetchPriority="high"
                sizes="(min-width: 1024px) 30vw, (min-width: 768px) 40vw, 100vw"
                className="object-cover object-[50%_4%] md:object-[50%_12%] lg:object-[50%_30%]"
              />
            </div>

            {/* Narrativa */}
            <div className="aparecer-heroe relative z-10 px-4 pb-8 pt-1 md:col-span-7 md:row-start-1 md:self-center md:px-0 md:pb-0 md:pt-0 lg:col-span-1 lg:pr-6">
              <p className="inline-flex items-center gap-2 rounded-full bg-[#d9e9ff] px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[#083a9e] md:text-xs">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-[#1d80ff]" />
                Proyecto · Hackathon BBVA
              </p>
              <h1 id="portada-titulo" className="mt-4 text-balance text-[clamp(2rem,8.4vw,2.6rem)] font-extrabold leading-[1.08] tracking-[-0.045em] text-noche md:mt-6 md:text-[clamp(2.4rem,4.6vw,3rem)] lg:text-[clamp(2.5rem,3.4vw,3rem)]">
                Aprende a manejar tu dinero. <span className="text-[#0a5ce5]">Mejora tu salud financiera.</span>
              </h1>
              <p className="mt-4 max-w-[34rem] text-pretty text-base leading-relaxed text-[#33486a] md:mt-6 md:text-lg lg:text-[clamp(1.05rem,1.3vw,1.3rem)]">
                Un copiloto con IA que te guía para ordenar tus deudas, fortalecer tu historial y descubrir opciones bancarias que se ajusten a ti, paso a paso.
              </p>
              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap md:mt-8 md:gap-3">
                <Cta acciones={acciones} valor="propio" variante="solida" className="w-full sm:w-auto" />
                <Cta acciones={acciones} valor="demo" variante="contorno" className="w-full sm:w-auto" />
              </div>
              {error && <p role="alert" className="mt-4 rounded-xl bg-coral-suave px-4 py-3 text-sm text-coral-fuerte">{error}</p>}
            </div>

            {/* Producto */}
            <div className="relative z-10 px-4 md:col-span-12 md:row-start-2 md:mt-10 md:px-0 lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:mt-0">
              <TarjetaProducto />
            </div>
          </div>

          {/* Curva blanca que separa el héroe de los beneficios. */}
          <svg aria-hidden="true" viewBox="0 0 1440 100" preserveAspectRatio="none" className="absolute inset-x-0 -bottom-px hidden h-[70px] w-full fill-white md:block lg:h-[96px]">
            <path d="M0 100V58C240 18 520 0 720 0s480 18 720 58v42Z" />
          </svg>
        </section>

        {/* Beneficios */}
        <section id="beneficios" aria-labelledby="beneficios-titulo" className="scroll-mt-20 bg-white px-4 pb-2 pt-6 md:px-8 md:pt-2">
          <h2 id="beneficios-titulo" className="sr-only">Beneficios</h2>
          <ul className="mx-auto grid max-w-5xl grid-cols-3 gap-2 rounded-2xl bg-[linear-gradient(165deg,#f0f6ff,#ffffff)] px-2 py-4 md:gap-0 md:bg-none md:p-0">
            {BENEFICIOS.map(([icono, titulo, texto]) => (
              <li key={titulo} className="flex min-w-0 flex-col items-center gap-2 text-center md:border-r md:border-linea md:px-6 md:last:border-r-0 lg:flex-row lg:items-center lg:gap-4 lg:px-9 lg:text-left">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-agua-suave text-[#0a5ce5] md:size-14">
                  <IconoBeneficio nombre={icono} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold leading-tight text-noche md:text-lg">{titulo}</span>
                  <span className="mt-1 hidden text-sm leading-snug text-gris md:block">{texto}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-5 max-w-2xl text-center text-xs leading-relaxed text-gris md:mt-8">{AVISO}</p>
        </section>

        {/* Qué aprenderás */}
        <section id="aprende" aria-labelledby="aprende-titulo" className="scroll-mt-20 bg-white px-4 pb-14 pt-10 md:px-8 md:pb-20 md:pt-14">
          <div className="mx-auto max-w-6xl">
            <h2 id="aprende-titulo" className="text-2xl font-bold tracking-[-0.03em] text-noche md:text-[28px]">Qué aprenderás</h2>
            <p className="mt-2 max-w-2xl text-gris">Aprender, organizarte, mejorar y descubrir oportunidades: a tu ritmo y con ejemplos.</p>
            <ul className="mt-6 grid gap-3 md:mt-8 md:grid-cols-3 md:gap-5">
              {APRENDE.map(([titulo, texto], i) => (
                <li key={titulo} className="rounded-[20px] border border-[#e7eefb] bg-[#f6faff] p-5 md:p-7">
                  <span aria-hidden="true" className="text-xs font-bold tracking-[0.08em] text-agua-fuerte">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-2 text-lg font-bold tracking-[-0.02em] text-noche">{titulo}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#53647c]">{texto}</p>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col items-start gap-5 rounded-[24px] bg-[linear-gradient(120deg,#072146,#0b2f8f)] p-6 text-white md:mt-14 md:p-9 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-[-0.02em] md:text-2xl">Empieza cuando quieras</h2>
                <p className="mt-1.5 max-w-xl text-[15px] text-white/80">Cuenta tu situación con cifras aproximadas o inventadas, o mira primero el caso de Andrea, una persona inventada.</p>
              </div>
              <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
                <Cta acciones={acciones} valor="propio" variante="clara" className="w-full sm:w-auto" />
                <Cta acciones={acciones} valor="demo" variante="contorno-claro" className="w-full sm:w-auto" />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-linea bg-white px-4 py-6 md:px-8">
        <p className="mx-auto max-w-4xl text-center text-xs leading-relaxed text-gris">
          Tu caso se calcula y se guarda en este equipo; solo se envía a servicios externos de IA y de voz si lo aceptas.
          No se piden claves. Nunca escribas datos reales: nombres completos, DNI, tarjetas ni contraseñas.
        </p>
      </footer>
    </div>
  );
}
