"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatoSoles,
  formatoLargo,
  formatoCorto,
  proyectar,
  type Perfil,
  type Analisis,
  type Jugada,
  type Proyeccion,
  type CobroPendiente,
} from "@/motor";
import { avisos, costoCorto, mejorJugada, proximosPagos, resumenHablado } from "@/explica/explica";
import { compararEscenario } from "@/explica/comparar";
import { consultarEstado, type EstadoServicios } from "@/cliente/estado";
import { GraficoSiTePagan } from "@/componentes/si-te-pagan";
import { Cifras, Icono, botonPrincipal, botonSecundario, desplazar, unido, type NombreIcono } from "@/componentes/ui";
import { alertaPrincipal, cifras, type DestinoCifra } from "@/componentes/tablero";

/** A dónde puede mandar el Inicio (lo resuelve el armazón). */
export type IrDesdeInicio = "agregar-deuda" | "ruta" | "dinero" | "deudas" | "asistente";

const ICONOS_KPI: NombreIcono[] = ["dinero", "deudas", "calendario", "tendencia"];
const TONO_ALERTA = {
  urgente: "border-coral-fuerte/20 bg-coral-suave/70 [&>div>span:first-child]:text-coral-fuerte",
  atencion: "border-ambar-fuerte/20 bg-ambar-suave/70 [&>div>span:first-child]:text-ambar-fuerte",
  bien: "border-verde-fuerte/20 bg-verde-suave/70 [&>div>span:first-child]:text-verde-fuerte",
};

export function Hoy({
  perfil,
  analisis,
  cobros = [],
  sonando,
  leer,
  detener,
  ir,
  demo = true,
  externo = demo,
  pasos,
}: {
  cobros?: CobroPendiente[];
  perfil: Perfil;
  analisis: Analisis;
  sonando: boolean;
  leer: (texto: string) => void;
  detener: () => void;
  ir?: (a: IrDesdeInicio) => void;
  /** Caso de ejemplo (Andrea, inventada) o caso propio (simulación armada por la persona). */
  demo?: boolean;
  /** Hay permiso para IA y voz: siempre en el ejemplo; en un caso propio, solo si la persona lo aceptó. */
  externo?: boolean;
  /** Solo en el caso propio: qué pasos de la guía ya hizo. La guía se muestra hasta completar los dos. */
  pasos?: { deudas: boolean; fijos: boolean };
}) {
  const [jugada, seleccionar] = useState<Jugada>();
  const grafico = useRef<HTMLElement>(null);
  const despues = useMemo(() => (jugada ? proyectar(perfil, { ajustes: jugada.ajustes }) : undefined), [perfil, jugada]);
  const principal = avisos(perfil, analisis)[0];
  const alternarVoz = () => (sonando ? detener() : leer(resumenHablado(perfil, analisis)));
  const barata = mejorJugada(analisis);
  const kpis = cifras(perfil, analisis);
  /** Cada indicador lleva a donde se puede actuar sobre él. Sin `ir` (pruebas), los de otras pestañas no son botones. */
  const irA = (destino: DestinoCifra): (() => void) | undefined => {
    if (destino === "dinero" || destino === "deudas") return ir ? () => ir(destino) : undefined;
    if (destino === "como-evitarlo") return () => desplazar(document.getElementById("como-evitarlo") ?? grafico.current, "start");
    return () => desplazar(grafico.current, "start");
  };
  const d = analisis.proyeccion.deficit;
  const alerta = alertaPrincipal(analisis);

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Cabecera compacta: saludo, fecha y, si hay permiso, el resumen hablado. */}
      <header className="aparecer flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold leading-tight tracking-[-0.02em] text-noche md:text-2xl">Hola, {perfil.nombre}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-tight text-gris md:text-sm">
            <span>Tu mes al {formatoLargo(analisis.hoy)}</span>
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-gris ring-1 ring-linea">
              {demo ? "Caso de ejemplo" : "Simulación"}
            </span>
          </p>
        </div>
        {externo && (
          <button
            onClick={alternarVoz}
            aria-pressed={sonando}
            aria-label={sonando ? "Detener" : "Escuchar resumen"}
            title={sonando ? "Detener" : "Escuchar resumen"}
            className="inline-flex size-11 shrink-0 items-center justify-center gap-2 rounded-full border border-linea bg-white text-electrico transition-[transform,background-color] duration-150 hover:bg-agua-suave active:scale-[.97] md:w-auto md:rounded-xl md:px-4 [&_svg]:size-5"
          >
            {sonando ? (
              <span className="flex items-center gap-[3px]" aria-hidden="true">
                {[0, 1, 2, 3].map(i => (
                  <span key={i} className="onda h-4 w-[3px] rounded-full bg-electrico" style={{ animationDelay: `${i * 0.12}s` }} />
                ))}
              </span>
            ) : (
              <Icono nombre="voz" />
            )}
            <span aria-hidden="true" className="hidden text-sm font-semibold text-noche md:inline">
              {sonando ? "Detener" : "Escuchar resumen"}
            </span>
          </button>
        )}
      </header>

      {pasos && !(pasos.deudas && pasos.fijos) && <Empezar ir={ir} hechos={pasos} />}

      {/* Alerta principal: una franja corta con el día, el monto y la causa. */}
      <section
        aria-label="Alerta principal"
        className={`aparecer flex flex-col gap-2 rounded-2xl border px-3.5 py-3 md:flex-row md:items-center md:gap-5 md:px-5 md:py-4 ${TONO_ALERTA[principal.nivel === "urgente" ? "urgente" : principal.nivel === "bien" ? "bien" : "atencion"]}`}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-[0_1px_2px_rgb(0_0_0/0.06)] [&_svg]:size-[18px]" aria-hidden="true">
            <Icono nombre={principal.nivel === "bien" ? "check" : "campana"} />
          </span>
          <div className="min-w-0">
            <p className="sr-only">{principal.nivel === "urgente" ? "Anticípate" : principal.nivel === "bien" ? "Vas por buen camino" : "Tenlo presente"}</p>
            {d ? (
              <>
                <p className="text-[15px] font-semibold leading-snug text-noche md:text-base">
                  El {alerta?.fecha} te faltarían{" "}
                  <span className="whitespace-nowrap text-coral-fuerte tabular-nums">{unido(alerta?.monto ?? "")}</span>
                </p>
                <p className="mt-0.5 text-[13px] leading-snug text-tinta/80 md:text-sm">{unido(alerta?.detalle ?? "")}</p>
                {barata && (
                  <p className="mt-1 text-[13px] font-semibold leading-snug text-noche md:text-sm">
                    La salida más barata: {barata.titulo.charAt(0).toLowerCase() + barata.titulo.slice(1)}.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-[15px] font-semibold leading-snug text-noche text-balance md:text-base">{unido(principal.titulo)}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-tinta/80 md:text-sm">{unido(principal.cuerpo)}</p>
              </>
            )}
          </div>
        </div>
        {d && analisis.jugadas.length > 0 && (
          <button
            className="ml-12 inline-flex min-h-9 items-center gap-1.5 self-start rounded-lg bg-white px-3 text-sm font-semibold text-electrico ring-1 ring-linea transition-colors duration-150 hover:bg-agua-suave md:ml-0 md:min-h-10 md:shrink-0 md:self-center md:px-4 [&_svg]:size-4"
            onClick={() => {
              // Con una salida que resuelve sola, un clic la simula y muestra el antes y el después.
              // La comparación se lleva a la vista sola al aparecer.
              if (barata) seleccionar(barata);
              else desplazar(document.getElementById("como-evitarlo"), "start");
            }}
          >
            {barata ? "Ver qué cambia" : "Ver cómo evitarlo"}
            <span aria-hidden="true" className="-rotate-90">
              <Icono nombre="abajo" />
            </span>
          </button>
        )}
      </section>

      {/* Cifras de un vistazo: una franja compacta. */}
      <Cifras
        etiqueta="Cifras del mes"
        items={kpis.map(({ etiqueta, valor, nota, destino, accion }, i) => ({
          icono: ICONOS_KPI[i],
          etiqueta,
          valor,
          nota,
          accion,
          tono: i === 3 ? (d ? "ambar" : "verde") : "azul",
          ir: irA(destino),
        }))}
      />

      {/* Proyección (2/3) + lo que sale esta semana (1/3). */}
      <div className="grid gap-3 md:gap-6 lg:grid-cols-3">
        <section ref={grafico} className="aparecer scroll-mt-24 rounded-2xl border border-linea bg-white p-4 md:p-6 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-noche md:text-lg">Tus próximos 30 días</h2>
              <p className="mt-0.5 text-xs text-gris md:text-sm">{jugada ? "Así cambia con la jugada que elegiste" : "Así se movería tu saldo"}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5 pt-1 text-xs font-semibold" aria-label="Leyenda">
              <span className="flex items-center gap-1.5 text-gris">
                <span aria-hidden="true" className={`h-0.5 w-4 rounded-full ${jugada ? "bg-tinta/35" : "bg-tinta"}`} />
                Como vas
              </span>
              {jugada && (
                <span className="aparecer flex items-center gap-1.5 text-electrico">
                  <span aria-hidden="true" className="h-1 w-4 rounded-full bg-electrico" />
                  Con esta jugada
                </span>
              )}
            </div>
          </div>
          {/* Dos proporciones: angosta en celular, ancha en escritorio (el SVG escala con su viewBox). */}
          <div className="lg:hidden">
            <GraficoSiTePagan base={analisis.proyeccion} despues={despues} cobros={cobros} descripcion={`${principal.titulo}. ${principal.cuerpo}`} fondo="white" />
          </div>
          <div className="hidden lg:block">
            <GraficoSiTePagan base={analisis.proyeccion} despues={despues} cobros={cobros} descripcion={`${principal.titulo}. ${principal.cuerpo}`} ancho={640} fondo="white" />
          </div>
          <p className="mt-2 text-[11px] leading-snug text-gris md:text-xs">
            Proyección referencial basada en los movimientos registrados. Tus ingresos y gastos pueden variar.
          </p>
          {jugada && despues && (
            <Comparacion key={jugada.id} jugada={jugada} antes={analisis.proyeccion} despues={despues} reiniciar={() => seleccionar(undefined)} />
          )}
        </section>
        <Pagos analisis={analisis} />
      </div>

      {analisis.jugadas.length > 0 && (
        <section id="como-evitarlo" aria-labelledby="titulo-evitar" className="scroll-mt-24 space-y-3 md:space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-agua-fuerte">Opciones calculadas</p>
              <h2 id="titulo-evitar" className="mt-0.5 text-lg font-semibold tracking-[-0.015em] text-noche md:text-xl">Cómo evitarlo</h2>
              <p className="mt-0.5 text-sm text-gris md:text-[15px]">Cada opción con su costo en soles. Simula una y mira cómo queda tu mes.</p>
            </div>
            <span className="hidden shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-gris ring-1 ring-linea tabular-nums sm:inline">
              {analisis.jugadas.length} {analisis.jugadas.length === 1 ? "opción" : "opciones"}
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
            {analisis.jugadas.map((j, i) => (
              <TarjetaJugada
                key={j.id}
                orden={i}
                jugada={j}
                barata={barata?.id === j.id}
                activa={jugada?.id === j.id}
                elegir={() => {
                  seleccionar(jugada?.id === j.id ? undefined : j);
                  desplazar(grafico.current);
                }}
              />
            ))}
          </div>
        </section>
      )}
      <Pie demo={demo} externo={externo} />
    </div>
  );
}

/* ---------- Guía para quien recién puso sus datos ---------- */
function Empezar({ ir, hechos }: { ir?: (a: IrDesdeInicio) => void; hechos: { deudas: boolean; fijos: boolean } }) {
  const pasos: [NombreIcono, string, string, string, IrDesdeInicio, boolean][] = [
    ["deudas", "Agrega tus deudas", "Tarjetas, préstamos o lo que debas a alguien. Usa cifras inventadas: es una simulación.", "Agregar deuda", "agregar-deuda", hechos.deudas],
    ["dinero", "Agrega tu sueldo y gastos fijos", "Con su día de cobro o de pago. Hasta entonces, la proyección no cuenta tu sueldo.", "Ingresos y gastos", "dinero", hechos.fijos],
  ];
  const faltan = pasos.filter(p => !p[5]).length;
  return (
    <section aria-label="Primeros pasos" className="aparecer rounded-2xl border border-linea bg-white p-4 md:p-6">
      <h2 className="text-base font-semibold text-noche md:text-lg">{faltan === 2 ? "Completa tu mes en 2 pasos" : "Te falta 1 paso para completar tu mes"}</h2>
      <p className="mt-0.5 text-[13px] leading-snug text-gris md:mt-1 md:text-[15px]">Con el saldo ya proyecto 30 días. Con las deudas y los gastos fijos del caso, el aviso sale completo.</p>
      <div className="mt-3 grid gap-2 md:mt-5 md:grid-cols-2 md:gap-3">
        {pasos.map(([icono, titulo, texto, accion, destino, hecho]) => (
          <div key={titulo} className={`flex items-center gap-3 rounded-xl border p-3 md:flex-col md:items-stretch md:p-4 ${hecho ? "border-verde/40 bg-verde-suave/40" : "border-linea"}`}>
            <div className="flex min-w-0 flex-1 gap-3">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5 ${hecho ? "bg-verde-suave text-verde-fuerte" : "bg-agua-suave text-electrico"}`}>
                {hecho ? <span aria-hidden="true" className="text-lg font-bold">✓</span> : <Icono nombre={icono} />}
              </span>
              <span>
                <span className="block font-semibold text-noche">
                  {titulo}
                  {hecho && <span className="sr-only"> (hecho)</span>}
                </span>
                <span className="block text-[13px] leading-snug text-gris md:text-sm">{hecho ? "Listo." : texto}</span>
              </span>
            </div>
            {ir && (
              <button className={`${hecho ? botonSecundario : botonPrincipal} shrink-0 md:mt-auto md:self-start`} onClick={() => ir(destino)} aria-label={accion}>
                <Icono nombre="mas" />
                <span className="hidden md:inline">{accion}</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Antes y después de la opción simulada (todo sale del motor) ---------- */
function Comparacion({ jugada, antes, despues, reiniciar }: { jugada: Jugada; antes: Proyeccion; despues: Proyeccion; reiniciar: () => void }) {
  const c = compararEscenario(antes, despues, jugada);
  const caja = useRef<HTMLElement>(null);
  // Al simular, el antes y el después quedan a la vista (con el final del gráfico encima), también en móvil.
  useEffect(() => desplazar(caja.current), []);
  // Verde solo si evita el rojo sin costo; si cuesta, ámbar como su insignia.
  const bien = c.conclusion === "evitado" && jugada.costo === 0;
  const celdas = [
    ["Antes", c.antes.etiqueta, c.antes.monto, c.antes.saldo < 0 ? "text-coral-fuerte" : "text-noche"],
    ["Después", c.despues.etiqueta, c.despues.monto, c.despues.saldo < 0 ? "text-ambar-fuerte" : "text-verde-fuerte"],
    ["Cambio", c.cambio > 0 ? "Mejora" : c.cambio < 0 ? "Empeora" : "Igual", c.cambioTexto, c.cambio < 0 ? "text-coral-fuerte" : "text-electrico"],
  ] as const;
  return (
    <section ref={caja} aria-label="Antes y después" aria-live="polite" className={`aparecer mt-3 scroll-mb-24 rounded-xl p-3 md:mt-4 md:p-4 ${bien ? "bg-verde-suave/70" : "bg-ambar-suave/70"}`}>
      <div className="flex items-start gap-2.5">
        <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white/80 text-xs font-bold ${bien ? "text-verde-fuerte" : "text-ambar-fuerte"}`} aria-hidden="true">
          {bien ? "✓" : "!"}
        </span>
        <div className="min-w-0">
          <p className="font-semibold leading-snug text-noche">{c.titulo}</p>
          <p className="text-xs text-gris md:text-[13px]">{jugada.titulo} · tu día más bajo del mes</p>
        </div>
      </div>
      <dl className="mt-2.5 grid grid-cols-3 divide-x divide-linea rounded-lg bg-white">
        {celdas.map(([titulo, etiqueta, monto, tono]) => (
          <div key={titulo} className="min-w-0 px-2 py-2 md:px-3">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gris">{titulo}</dt>
            <dd className="text-[11px] leading-tight text-gris md:text-xs">{etiqueta}</dd>
            <dd className={`mt-0.5 text-[15px] font-semibold leading-tight tabular-nums md:text-base ${tono}`}>{unido(monto)}</dd>
          </div>
        ))}
      </dl>
      {c.nota && <p className="mt-2 text-xs leading-snug text-tinta/80 md:text-[13px]">{unido(c.nota)}</p>}
      <button onClick={reiniciar} className="mt-2.5 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-semibold text-electrico ring-1 ring-linea transition-colors duration-150 hover:bg-agua-suave [&_svg]:size-4">
        <Icono nombre="cerrar" />
        Reiniciar comparación
      </button>
    </section>
  );
}

/** Qué le hace la jugada al día en rojo. Sacar un pago de la ventana no es «resolver». */
const INSIGNIA_EFECTO: Record<Jugada["efecto"], string> = {
  elimina: "Resuelve el problema",
  reduce: "Lo reduce, sola no alcanza",
  posterga: "Solo lo aplaza",
  no_mejora: "Sola no alcanza",
};

function TarjetaJugada({
  jugada: j,
  orden,
  barata,
  activa,
  elegir,
}: {
  jugada: Jugada;
  orden: number;
  barata: boolean;
  activa: boolean;
  elegir: () => void;
}) {
  return (
    <article
      className={`aparecer relative flex flex-col overflow-hidden rounded-2xl border bg-white transition-[box-shadow,border-color] duration-200 ${activa ? "border-electrico shadow-[0_0_0_1px_#001391,0_14px_30px_-18px_rgb(0_19_145/0.45)]" : barata ? "border-electrico/35 shadow-[0_10px_26px_-20px_rgb(0_19_145/0.5)]" : "border-linea hover:border-linea-fuerte"}`}
      style={{ animationDelay: `${orden * 0.04}s` }}
    >
      {(barata || activa) && <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-electrico" />}
      <div className="flex flex-1 flex-col p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gris tabular-nums">Opción {orden + 1}</span>
          <div className="flex flex-wrap gap-1.5">
            {barata && <span className="rounded-full bg-agua-suave px-2 py-0.5 text-[11px] font-semibold text-electrico">La más barata</span>}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${j.efecto === "elimina" && j.costo === 0 ? "bg-verde-suave text-verde-fuerte" : "bg-ambar-suave text-ambar-fuerte"}`}
            >
              <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
              {j.efecto === "elimina" && j.costo > 0 ? "Evita el rojo, pero cuesta" : INSIGNIA_EFECTO[j.efecto]}
            </span>
          </div>
        </div>
        <h3 className="mt-2.5 text-base font-semibold leading-snug text-noche text-balance md:text-[17px]">{j.titulo}</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-gris md:text-sm">{unido(j.detalle)}</p>
        <dl className="mt-4 grid grid-cols-2 divide-x divide-linea rounded-xl border border-linea">
          <div className="min-w-0 px-3 py-2.5">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-verde-fuerte">Te libera</dt>
            <dd className="mt-1 text-lg font-semibold leading-tight tracking-[-0.01em] text-noche tabular-nums">{unido(formatoSoles(j.libera))}</dd>
          </div>
          <div className="min-w-0 px-3 py-2.5">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gris">Te cuesta</dt>
            <dd className={`mt-1 text-lg font-semibold leading-tight tracking-[-0.01em] tabular-nums ${j.costo === 0 && j.certezaCosto === "conocido" ? "text-verde-fuerte" : "text-noche"}`}>
              {unido(costoCorto(j))}
            </dd>
          </div>
        </dl>
        <p className="mt-2.5 text-xs leading-relaxed text-gris md:text-[13px]">
          {unido(j.costoDetalle)}
          {j.costoDetalle.includes("TCEA") && " (TCEA: lo que te cuesta al año)."}
        </p>
        <div className="mt-auto pt-4">
          <button aria-pressed={activa} onClick={elegir} className={`${activa ? botonSecundario : botonPrincipal} w-full`}>
            <Icono nombre={activa ? "cerrar" : "tendencia"} />
            {activa ? "Quitar de la proyección" : "Simular en mi proyección"}
          </button>
        </div>
      </div>
    </article>
  );
}

function Pagos({ analisis }: { analisis: Analisis }) {
  const pagos = proximosPagos(analisis, 7);
  return (
    <section className="aparecer rounded-2xl border border-linea bg-white p-4 md:p-6" style={{ animationDelay: ".1s" }}>
      <p className="text-xs font-medium text-agua-fuerte md:text-[13px]">Próximos 7 días</p>
      <h2 className="mt-0.5 mb-1 text-base font-semibold md:mb-2 md:text-lg tracking-tight text-noche">Lo que sale esta semana</h2>
      {pagos.length ? (
        pagos.map((p, i) => (
          <div key={`${p.fecha}-${i}`} className="flex items-center gap-3 border-t border-linea py-2 md:py-3">
            <span className="flex size-9 md:size-10 shrink-0 flex-col items-center justify-center rounded-xl bg-papel text-center leading-none">
              <span className="text-[10px] font-semibold uppercase text-gris">{formatoCorto(p.fecha).split(" ")[1] ?? ""}</span>
              <span className="mt-0.5 text-[15px] font-semibold text-noche">{formatoCorto(p.fecha).split(" ")[0]}</span>
            </span>
            <p className="min-w-0 flex-1 text-sm font-medium text-noche md:text-[15px]">{p.descripcion}</p>
            <p className="shrink-0 text-sm font-semibold md:text-[15px] tabular-nums text-noche">{unido(formatoSoles(p.monto))}</p>
          </div>
        ))
      ) : (
        <p className="border-t border-linea pt-3 text-[15px] text-gris">No hay pagos fijos previstos esta semana.</p>
      )}
    </section>
  );
}

function Pie({ demo, externo }: { demo: boolean; externo: boolean }) {
  const [estado, setEstado] = useState<EstadoServicios>();
  useEffect(() => {
    // Sin permiso para IA y voz no se consulta nada al servidor: los servicios externos no se usan.
    if (!externo) return;
    let activo = true;
    void consultarEstado().then(e => {
      if (activo) setEstado(e);
    });
    return () => {
      activo = false;
    };
  }, [externo]);
  return (
    <footer className="flex flex-col items-center gap-2 border-t border-linea pt-4 text-center text-[11px] md:gap-3 md:pt-5 md:text-xs text-gris sm:flex-row sm:justify-between">
      <div className="flex gap-2">
        {!externo && <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-linea">Sin servicios externos</span>}
        {externo && (
          [
            ["ia", "IA"],
            ["voz", "Voz"],
            ["push", "Avisos"],
          ] as const
        )
          // Los avisos remotos solo existen en el caso de ejemplo.
          .filter(([clave]) => demo || clave !== "push")
          .map(([clave, etiqueta]) => (
          <span key={clave} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 ring-1 ring-linea" title={estado?.[clave] ? "Activo" : "En respaldo"}>
            <span className={`size-1.5 rounded-full ${estado?.[clave] ? "bg-agua" : "bg-gris/50"}`} />
            {etiqueta}
            <span className="sr-only">{estado?.[clave] ? "Activo" : "En respaldo"}</span>
          </span>
        ))}
      </div>
      <p>{demo ? "Datos sintéticos de ejemplo. " : externo ? "Tu caso de simulación: IA y voz activadas con tu permiso. " : "Tu caso de simulación: nada sale de este equipo. "}Simulación educativa, no asesoría financiera.</p>
    </footer>
  );
}
