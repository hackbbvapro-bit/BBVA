"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { analizar, type Perfil } from "@/motor";
import { avisosDelCentro, pendientesSinLeer, type Destino } from "@/avisos/centro";
import { hablar, callar, desbloquearAudio } from "@/cliente/voz";
import { fijarSalidas } from "@/cliente/salidas";
import { guardarSituacion, leerSituacion } from "@/cliente/situacion";
import { avanceDe, hechosDe, saludoDeRuta, trazarRuta, type IdPaso } from "@/ruta/ruta";
import { guardarAvances, leerAvances } from "@/cliente/memoria";
import { MiRuta } from "@/componentes/tu-ruta";
import { Hoy, type IrDesdeInicio } from "@/componentes/hoy";
import { Deudas, type AbrirDeudas, type PestanaDeudas } from "@/componentes/deudas";
import { MiDinero } from "@/componentes/mi-dinero";
import { Chat } from "@/componentes/chat";
import { HojaAvisos } from "@/componentes/avisos";
import { Icono, Marca, type NombreIcono } from "@/componentes/ui";
import { ProveedorDatos, useDatos } from "@/componentes/datos";
import { MenuUsuario } from "@/componentes/menu-usuario";
import { Perfil as VistaPerfil } from "@/componentes/perfil";
import { ComoFunciona } from "@/componentes/como-funciona";
import { Bienvenida, guardarModo, leerModo, type Modo } from "@/componentes/bienvenida";
import { ID_PROPIO } from "@/datos/semilla";
import { anotarEnRepo, type Deshacer } from "@/datos/anotar";
import type { Accion } from "@/agente/registro";

type Pestana = "hoy" | "ruta" | "dinero" | "deudas" | "asistente" | "perfil" | "como";
type Enlace = [Pestana, string, NombreIcono];

/** Menú lateral agrupado (escritorio y iPad). */
const GRUPOS: { titulo: string; items: Enlace[] }[] = [
  {
    titulo: "Resumen",
    items: [
      ["hoy", "Inicio", "hoy"],
      ["ruta", "Mi ruta", "rumbo"],
    ],
  },
  {
    titulo: "Mi plata",
    items: [
      ["dinero", "Mi dinero", "dinero"],
      ["deudas", "Deudas", "deudas"],
    ],
  },
  {
    titulo: "Ayuda",
    items: [
      ["asistente", "Asistente", "asistente"],
      ["como", "Cómo funciona", "ayuda"],
    ],
  },
];

/** Barra inferior del celular, como las apps del iPhone: cinco destinos; «Agregar» vive arriba, junto a los avisos. */
const MOVIL: Enlace[] = [
  ["hoy", "Inicio", "hoy"],
  ["ruta", "Mi ruta", "rumbo"],
  ["asistente", "Asistente", "asistente"],
  ["dinero", "Mi dinero", "dinero"],
  ["deudas", "Deudas", "deudas"],
];

const OPCIONES_AGREGAR: [string, string, NombreIcono, string][] = [
  ["deuda", "Agregar deuda", "deudas", "Tarjeta, préstamo o a una persona"],
  ["escanear", "Cargar reporte de ejemplo", "camara", "Un reporte inventado, ya leído"],
  ["cobro", "Alguien me debe", "perfil", "Te avisamos cuando venza"],
  ["fijo", "Ingresos y gastos fijos", "dinero", "Sueldo, alquiler, servicios"],
];

export function Copiloto() {
  return (
    <ProveedorDatos>
      <Contenido />
    </ProveedorDatos>
  );
}

function Contenido() {
  const { perfil } = useDatos();
  // Solo se pinta en el navegador (ProveedorDatos espera a abrir la base), así que se puede leer el almacenamiento aquí.
  // Quien ya guardó sus datos entra directo; quien nunca eligió ve la bienvenida.
  const [modo, setModo] = useState<Modo | null>(() => leerModo() ?? (perfil.id === ID_PROPIO ? "propio" : null));
  // Recién armado el caso: la sesión abre en el asistente, que saluda con la ruta.
  const [reciente, setReciente] = useState(false);
  if (modo === null) {
    // Sin caso elegido no hay nada que enviar: la compuerta vuelve a cerrarse al regresar a la bienvenida.
    fijarSalidas(false);
    return (
      <Bienvenida
        alListo={(m, extra) => {
          setReciente(extra?.reciente === true);
          setModo(m);
        }}
      />
    );
  }
  function cambiarModo() {
    if (perfil.id === ID_PROPIO && !window.confirm("Vas a volver a la pantalla de inicio. Si eliges el caso de Rosa o empiezas de nuevo, se reemplaza el caso que armaste, guardado en este equipo. ¿Continuar?")) return;
    guardarModo(null);
    setReciente(false);
    setModo(null);
  }
  return (
    <div className="relative min-h-dvh w-full bg-papel text-base text-tinta [overflow-wrap:anywhere] md:pl-[232px] [&_button]:cursor-pointer [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-4 [&_:focus-visible]:outline-electrico">
      <Sesion key={perfil.id} perfil={perfil} cambiarModo={cambiarModo} reciente={reciente} />
    </div>
  );
}

/** Al pie del menú lateral: deja claro si se ve el caso de ejemplo (Rosa) o el caso que armó la persona, y si algo sale del equipo. */
function TarjetaModo({ demo, externo, cambiar }: { demo: boolean; externo: boolean; cambiar: () => void }) {
  return (
    <div className="rounded-xl border border-linea bg-papel p-3">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-noche">
        <span aria-hidden="true" className={`size-2 rounded-full ${demo ? "bg-ambar" : "bg-verde"}`} />
        {demo ? "Caso de Rosa (ejemplo)" : "Tu caso (simulación)"}
      </p>
      <p className="mt-1 text-xs leading-snug text-gris">{demo ? "Rosa es una persona inventada." : externo ? "IA y voz activadas: tu caso se envía para responderte." : "Sin IA ni voz: nada sale de este equipo."}</p>
      <button onClick={cambiar} className="mt-1 min-h-9 text-[13px] font-semibold text-electrico hover:text-marino">
        {demo ? "Empezar con mi situación" : "Volver al inicio"}
      </button>
    </div>
  );
}

/** Hoja del botón «Agregar» del celular: todo lo que se puede registrar, a un toque. */
function HojaAgregar({ elegir, cerrar }: { elegir: (opcion: string) => void; cerrar: () => void }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogo.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      anterior?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialogo}
      aria-labelledby="titulo-agregar"
      onCancel={e => {
        e.preventDefault();
        cerrar();
      }}
      onClick={e => {
        if (e.target === e.currentTarget) cerrar();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-tinta backdrop:bg-tinta/50"
    >
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-3xl bg-white px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3">
        <div aria-hidden="true" className="mx-auto mb-4 h-1 w-10 rounded-full bg-linea" />
        <div className="mb-2 flex items-center justify-between">
          <h2 id="titulo-agregar" className="text-xl font-semibold text-noche">
            ¿Qué quieres agregar?
          </h2>
          <button autoFocus aria-label="Cerrar" onClick={cerrar} className="flex size-11 items-center justify-center rounded-full ring-1 ring-linea">
            <Icono nombre="cerrar" />
          </button>
        </div>
        <ul className="grid gap-1">
          {OPCIONES_AGREGAR.map(([id, titulo, icono, nota]) => (
            <li key={id}>
              <button onClick={() => elegir(id)} className="-mx-2 flex min-h-14 w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-niebla">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-agua-suave text-electrico [&_svg]:size-5">
                  <Icono nombre={icono} />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-noche">{titulo}</span>
                  <span className="block text-sm text-gris">{nota}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  );
}

function Sesion({ perfil, cambiarModo, reciente }: { perfil: Perfil; cambiarModo: () => void; reciente: boolean }) {
  const analisis = useMemo(() => analizar(perfil), [perfil]);
  const { aviso, datos, cambiar, persistente } = useDatos();
  const lista = useMemo(() => avisosDelCentro(datos, perfil, analisis), [datos, perfil, analisis]);
  const [pestana, setPestana] = useState<Pestana>(reciente ? "asistente" : "hoy"),
    [hoja, setHoja] = useState(false),
    [agregar, setAgregar] = useState(false),
    [deudasInicial, setDeudasInicial] = useState<PestanaDeudas>("debo"),
    [deudasAbrir, setDeudasAbrir] = useState<AbrirDeudas | undefined>(),
    [saltos, setSaltos] = useState(0),
    [sonando, setSonando] = useState(false),
    [nuevos, setNuevos] = useState<string[]>([]);
  const pendientes = pendientesSinLeer(lista, datos.avisosLeidos);
  const demo = perfil.id !== ID_PROPIO;
  // Lo que la persona contó al entrar y no está en sus datos: si tuvo crédito y si aceptó usar IA y voz.
  const [situacion, setSituacion] = useState(() => leerSituacion());
  const externo = demo || situacion.externo;
  // Compuerta de privacidad: se fija en el render (antes que los efectos de los hijos). IA y voz: en el ejemplo,
  // o en un caso propio si la persona lo aceptó (un archivo exige además declarar que es inventado).
  // Avisos remotos: solo en el ejemplo.
  fijarSalidas(externo, demo);
  const hechos = useMemo(() => hechosDe(datos, situacion.tuvoCredito), [datos, situacion.tuvoCredito]);
  const ruta = useMemo(() => trazarRuta(perfil, analisis, hechos), [perfil, analisis, hechos]);
  // Pasos de la ruta que la persona marcó como hechos: se guardan en este equipo, por caso.
  const [avances, setAvances] = useState<IdPaso[]>(() => leerAvances(perfil.id));
  const avance = useMemo(() => avanceDe(ruta, avances), [ruta, avances]);
  const saludo = saludoDeRuta(perfil.nombre, ruta, !demo, avance);
  function marcar(id: IdPaso, hecho: boolean) {
    setAvances(antes => {
      const nuevos = hecho ? [...new Set([...antes, id])] : antes.filter(x => x !== id);
      // En una pestaña de solo mirar no se guarda (la que tiene la base abierta manda).
      if (persistente) guardarAvances(perfil.id, nuevos);
      return nuevos;
    });
  }
  /** Lo que el asistente anotó va a la base como cualquier otro cambio; devuelve cómo deshacerlo. */
  async function anotar(accion: Accion): Promise<() => Promise<void>> {
    let deshacer: Deshacer | undefined;
    await cambiar(async repo => {
      deshacer = await anotarEnRepo(repo, accion);
    });
    const hecho = deshacer;
    if (!hecho) throw new Error("sin_deshacer");
    return () => cambiar(hecho);
  }
  function cambiarExterno(activo: boolean) {
    const nueva = { ...situacion, externo: activo };
    guardarSituacion(nueva);
    setSituacion(nueva);
  }
  const pasos = demo ? undefined : { deudas: datos.deudas.length > 0 || situacion.sinDeudas, fijos: datos.ingresosFijos.length + datos.gastosFijos.length > 0 };
  const turno = useRef(0);
  useEffect(
    () => () => {
      turno.current += 1;
      callar();
    },
    [],
  );
  function detener() {
    turno.current += 1;
    callar();
    setSonando(false);
  }
  function leer(texto: string) {
    desbloquearAudio();
    const actual = ++turno.current;
    setSonando(true);
    void hablar(texto, () => {
      if (actual === turno.current) setSonando(false);
    }).then(motor => {
      if (motor === "ninguna" && actual === turno.current) setSonando(false);
    });
  }
  // Recién armado el caso y con permiso: el asistente saluda en voz alta al entrar.
  const saludoInicial = useRef(reciente && externo ? saludo : undefined);
  useEffect(() => {
    if (saludoInicial.current) leer(saludoInicial.current);
    // Solo al montar: `leer` cambia en cada render y no debe repetir el saludo.
  }, []);
  function navegar(p: Pestana) {
    detener();
    setDeudasInicial("debo");
    setDeudasAbrir(undefined);
    setPestana(p);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function irADeudas(inicial: PestanaDeudas, abrir?: AbrirDeudas) {
    navegar("deudas");
    setDeudasInicial(inicial);
    setDeudasAbrir(abrir);
    setSaltos(n => n + 1);
  }
  function abrirAvisos() {
    const sinLeer = lista.filter(a => !datos.avisosLeidos.includes(a.clave)).map(a => a.clave);
    setNuevos(sinLeer);
    setHoja(true);
    if (sinLeer.length > 0) {
      void cambiar(async repo => {
        for (const clave of sinLeer) await repo.marcarAvisoLeido(clave);
      }).catch(() => undefined);
    }
  }
  function irA(destino: Destino) {
    setHoja(false);
    if (destino === "hoy") navegar("hoy");
    else irADeudas(destino === "cobros" ? "medeben" : destino === "reporte" ? "sbs" : "debo");
  }
  function desdeInicio(a: IrDesdeInicio) {
    if (a === "agregar-deuda") irADeudas("debo", "agregar");
    else navegar(a);
  }
  function elegirAgregar(opcion: string) {
    setAgregar(false);
    if (opcion === "deuda") irADeudas("debo", "agregar");
    else if (opcion === "escanear") irADeudas("debo", "escanear");
    else if (opcion === "cobro") irADeudas("medeben");
    else navegar("dinero");
  }
  const botonMovil = ([id, nombre, icono]: Enlace) => (
    <button
      key={id}
      aria-current={pestana === id ? "page" : undefined}
      onClick={() => navegar(id)}
      className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors duration-150 ${pestana === id ? "font-semibold text-electrico" : "font-medium text-gris"}`}
    >
      {/* Como en iOS: la pestaña activa lleva una cápsula suave detrás del ícono. */}
      <span
        aria-hidden="true"
        className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200 [&_svg]:size-[22px] ${pestana === id ? "bg-agua-suave" : ""}`}
      >
        <Icono nombre={icono} />
      </span>
      {nombre}
    </button>
  );
  return (
    <>
      <aside aria-label="Navegación principal" className="fixed inset-y-0 left-0 z-30 hidden w-[232px] border-r border-linea bg-white md:block">
        <div className="flex h-dvh flex-col overflow-y-auto px-3 py-5">
          <div className="px-3">
            <Marca />
          </div>
          <nav className="mt-8 grid gap-6">
            {GRUPOS.map(g => (
              <div key={g.titulo}>
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-gris">{g.titulo}</p>
                <div className="grid gap-0.5">
                  {g.items.map(([id, nombre, icono]) => (
                    <button
                      key={id}
                      aria-current={pestana === id ? "page" : undefined}
                      onClick={() => navegar(id)}
                      className={`relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors duration-150 ${pestana === id ? "bg-agua-suave text-electrico" : "text-gris hover:bg-niebla hover:text-noche"}`}
                    >
                      {pestana === id && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-electrico" />}
                      <Icono nombre={icono} />
                      {nombre}
                    </button>
                  ))}
                  {g.titulo === "Ayuda" && (
                    <button
                      onClick={abrirAvisos}
                      className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-[15px] font-medium text-gris transition-colors duration-150 hover:bg-niebla hover:text-noche"
                    >
                      <Icono nombre="campana" />
                      Avisos
                      {pendientes > 0 && (
                        <span className="ml-auto flex min-w-6 items-center justify-center rounded-full bg-coral-fuerte px-1.5 text-xs font-semibold text-white">
                          {pendientes}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </nav>
          <div className="mt-auto grid gap-3 pt-6">
            <TarjetaModo demo={demo} externo={externo} cambiar={cambiarModo} />
            <MenuUsuario nombre={perfil.nombre} variante="lateral" alPerfil={() => navegar("perfil")} alComoFunciona={() => navegar("como")} demo={demo} />
          </div>
        </div>
      </aside>
      <header className="fixed inset-x-0 top-0 z-30 border-b border-linea/70 bg-white/75 px-4 pb-3 pt-[calc(.75rem+env(safe-area-inset-top))] backdrop-blur-2xl backdrop-saturate-150 md:hidden">
        <div className="flex items-center justify-between gap-2">
          <Marca />
          <div className="flex items-center gap-2">
            <button
              aria-label="Agregar: deuda, reporte de ejemplo, cobro o gasto"
              onClick={() => setAgregar(true)}
              className="flex size-11 items-center justify-center rounded-full bg-electrico text-white shadow-[0_6px_16px_-6px_rgb(0_19_145/0.6)] transition-transform active:scale-95"
            >
              <Icono nombre="mas" />
            </button>
            <button
              aria-label={`Abrir avisos: ${pendientes} pendientes`}
              onClick={abrirAvisos}
              className="relative flex size-11 items-center justify-center rounded-full border border-linea bg-white text-noche transition-transform active:scale-95"
            >
              <Icono nombre="campana" />
              {pendientes > 0 && (
                <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-coral-fuerte px-1 text-xs font-semibold text-white">
                  {pendientes}
                </span>
              )}
            </button>
            <MenuUsuario nombre={perfil.nombre} variante="cabecera" alPerfil={() => navegar("perfil")} alComoFunciona={() => navegar("como")} alCambiarModo={cambiarModo} demo={demo} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(5.5rem+env(safe-area-inset-top))] md:px-8 md:pb-12 md:pt-8">
        {aviso && (
          <p role="status" className="mb-4 rounded-xl bg-ambar-suave px-4 py-3 text-sm text-ambar-fuerte">
            {aviso}
          </p>
        )}
        {pestana === "hoy" && (
          <Hoy
            perfil={perfil}
            analisis={analisis}
            cobros={datos.cobros}
            leer={leer}
            detener={detener}
            sonando={sonando}
            ir={desdeInicio}
            demo={demo}
            externo={externo}
            pasos={pasos}
          />
        )}
        {pestana === "ruta" && <MiRuta ruta={ruta} avance={avance} alMarcar={marcar} alConversar={() => navegar("asistente")} />}
        {pestana === "dinero" && <MiDinero analisis={analisis} />}
        {pestana === "deudas" && (
          <Deudas
            key={`${deudasInicial}-${deudasAbrir ?? ""}-${saltos}`}
            perfil={perfil}
            analisis={analisis}
            pestanaInicial={deudasInicial}
            abrirAlEntrar={deudasAbrir}
          />
        )}
        {pestana === "perfil" && (
          <div className="max-w-4xl">
            <VistaPerfil />
          </div>
        )}
        {pestana === "como" && (
          <div className="max-w-4xl">
            <ComoFunciona />
          </div>
        )}
        {pestana === "asistente" && (
          <Chat perfil={perfil} analisis={analisis} demo={demo} externo={externo} ruta={ruta} hechos={hechos} apertura={saludo} avance={avance} alCambiarExterno={demo ? undefined : cambiarExterno} leer={leer} detener={detener} sonando={sonando} cobros={datos.cobros} alAnotar={anotar} guardar={persistente} />
        )}
      </main>
      <nav
        aria-label="Navegación inferior"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-linea/70 bg-white/75 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl backdrop-saturate-150 md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">{MOVIL.map(botonMovil)}</div>
      </nav>
      {agregar && <HojaAgregar elegir={elegirAgregar} cerrar={() => setAgregar(false)} />}
      {hoja && <HojaAvisos lista={lista} nuevos={nuevos} perfilId={perfil.id} ir={irA} cerrar={() => setHoja(false)} />}
    </>
  );
}
