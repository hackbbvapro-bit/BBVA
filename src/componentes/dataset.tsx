"use client";
import { useMemo, useState } from "react";
import { analizar, formatoCorto, formatoSoles, formatoTasa, sumar, sumarDias } from "@/motor";
import type { Categoria } from "@/motor";
import { aDatos, casoDeEjemplo, clientesDelDataset, SEMILLA_AGENTE } from "@/evaluacion/casos-agente";
import type { Datos } from "@/datos/tipos";
import { aPerfil, saldosReales, type MovimientoEtiquetado } from "@/evaluacion/poblacion";
import { porSemana, saldoDiario } from "@/evaluacion/series";
import { GraficoSaldo, GraficoSemanas } from "@/componentes/dataset-graficos";
import { Encabezado, Icono, botonPrincipal, botonSecundario, tarjeta, unido } from "@/componentes/ui";

type Periodo = "historia" | "futuro" | "oculto";
type Fila = MovimientoEtiquetado & { periodo: Periodo };

const PERIODOS: [Periodo | "", string][] = [
  ["historia", "Historia: lo que ve el copiloto"],
  ["futuro", "Futuro: los 30 días siguientes"],
  ["oculto", "Ocultos: datos que faltan"],
  ["", "Todos"],
];
/** Movimientos por página en la tabla. */
const POR_PAGINA = 10;
const TIPO = { dependiente: "Dependiente", independiente: "Independiente", mixto: "Mixto" } as const;
const campo = "min-h-11 rounded-xl border border-linea-fuerte bg-white px-3 text-[15px] text-tinta";
const celda = "whitespace-nowrap border-t border-linea px-3 py-2";
const lindo = (texto: string) => texto.replaceAll("_", " ");
/** Las billeteras digitales se muestran sin nombre de marca, igual que en los CSV. */
const canal = (c: MovimientoEtiquetado["canal"]) => (c === "yape" || c === "plin" ? "billetera digital" : c);

/**
 * «Datos de prueba»: los seis clientes sintéticos con los que se evaluó al asistente con IA, con sus 90 días
 * de historia y sus 30 días siguientes. Se generan aquí mismo con la semilla fija: no se descarga nada.
 */
export function Dataset({
  alProbar,
  viendo,
}: {
  /** Carga al cliente elegido como caso del copiloto. Sin esta función, la pantalla es solo de lectura. */
  alProbar?: (datos: Datos) => Promise<void>;
  /** Id del caso que el copiloto tiene cargado ahora, para marcar si ya es este cliente. */
  viendo?: string;
} = {}) {
  const casos = useMemo(() => [casoDeEjemplo(), ...clientesDelDataset()], []);
  // Lo que el copiloto proyecta para cada uno con su historia: si avisa de un día en negativo o no.
  const avisa = useMemo(() => casos.map(c => analizar(aPerfil(c.cliente)).proyeccion.deficit !== null), [casos]);
  const [cargando, setCargando] = useState(false);
  const [fallo, setFallo] = useState("");
  const [elegido, setElegido] = useState(0);
  const [periodo, setPeriodo] = useState<Periodo | "">("historia");
  const [categoria, setCategoria] = useState<Categoria | "">("");
  const [sentido, setSentido] = useState<"" | "entra" | "sale">("");
  const [texto, setTexto] = useState("");
  // Página de la tabla (desde 0). Cualquier cambio de cliente o de filtro vuelve a la primera.
  const [pagina, setPagina] = useState(0);
  // Fechas del filtro (AAAA-MM-DD); vacío = sin límite por ese lado.
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const { cliente, nombre, motivo, demo: esEjemplo = false } = casos[elegido];
  const todos = useMemo<Fila[]>(
    () =>
      [
        ...cliente.historia.map(m => ({ ...m, periodo: "historia" as const })),
        ...cliente.ocultos.map(m => ({ ...m, periodo: "oculto" as const })),
        ...cliente.futuro.map(m => ({ ...m, periodo: "futuro" as const })),
      ].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [cliente],
  );
  const categorias = useMemo(() => [...new Set(todos.map(m => m.categoria))].sort(), [todos]);
  const conFechas = desde !== "" || hasta !== "";
  const enRango = (fecha: string) => (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
  const primera = todos[0]?.fecha ?? cliente.corte;
  const ultima = todos[todos.length - 1]?.fecha ?? cliente.corte;
  // Sin fechas, el gráfico es el de la historia (lo que ve el copiloto). Con fechas, todo lo que pasó en ese rango.
  const gasto = useMemo(() => {
    const dentro = (fecha: string) => (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
    const base = desde !== "" || hasta !== "" ? todos.filter(m => dentro(m.fecha)) : cliente.historia;
    const porCategoria = new Map<Categoria, number>();
    for (const m of base) if (m.monto < 0) porCategoria.set(m.categoria, (porCategoria.get(m.categoria) ?? 0) - m.monto);
    return [...porCategoria.entries()].sort((a, b) => b[1] - a[1]);
  }, [cliente, todos, desde, hasta]);
  const rangoDicho = conFechas ? `del ${formatoCorto(desde || primera)} al ${formatoCorto(hasta || ultima)}` : "de los 90 días de historia";
  const ATAJOS: [string, string, string][] = [
    ["Todo", "", ""],
    ["Último mes de historia", sumarDias(cliente.corte, -29), cliente.corte],
    // El caso de ejemplo no tiene días siguientes guardados: ese atajo no se le ofrece.
    ...(cliente.futuro.length > 0 ? [["Los 30 días siguientes", sumarDias(cliente.corte, 1), sumarDias(cliente.corte, 30)] as [string, string, string]] : []),
  ];
  function fijarFechas(d: string, h: string) {
    setDesde(d);
    setHasta(h);
    setPagina(0);
    // Un rango fuera de la historia no se vería con el periodo «Historia» puesto: se abre a todos.
    if (d !== "" || h !== "") setPeriodo("");
  }
  // Series de los gráficos: se calculan una vez por cliente y se recortan al rango de fechas elegido.
  const serieSaldo = useMemo(() => saldoDiario(cliente), [cliente]);
  const serieSemanas = useMemo(() => porSemana(cliente), [cliente]);
  const saldoVisible = serieSaldo.filter(p => enRango(p.fecha));
  const semanasVisibles = serieSemanas.filter(w => (!desde || w.hasta >= desde) && (!hasta || w.desde <= hasta));
  const reales = useMemo(() => saldosReales(cliente), [cliente]);
  const diaDeficit = reales.findIndex(s => s < 0);
  const faltante = Math.max(0, -Math.min(...reales));

  const buscado = texto.trim().toLowerCase();
  const filas = todos.filter(
    m =>
      enRango(m.fecha) &&
      (!periodo || m.periodo === periodo) &&
      (!categoria || m.categoria === categoria) &&
      (!sentido || (sentido === "entra" ? m.monto > 0 : m.monto < 0)) &&
      (!buscado || `${m.descripcion} ${m.comercio}`.toLowerCase().includes(buscado)),
  );
  const paginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));
  // Si un filtro deja menos páginas, no se queda en una que ya no existe.
  const actual = Math.min(pagina, paginas - 1);
  const entra = sumar(filas.filter(m => m.monto > 0).map(m => m.monto));
  const sale = sumar(filas.filter(m => m.monto < 0).map(m => m.monto));

  async function probar() {
    if (!alProbar || cargando) return;
    setCargando(true);
    setFallo("");
    try {
      await alProbar(aDatos(casos[elegido]));
    } catch {
      setFallo("No pude cargar este cliente. Inténtalo otra vez.");
    } finally {
      setCargando(false);
    }
  }
  function elegir(i: number) {
    setElegido(i);
    setCategoria("");
    setPagina(0);
  }
  function filtrar<T>(fijar: (valor: T) => void) {
    return (valor: T) => {
      fijar(valor);
      setPagina(0);
    };
  }

  const ficha: [string, string][] = [
    ["Fecha de corte («hoy»)", cliente.corte],
    ["Saldo ese día", formatoSoles(cliente.saldoCorte)],
    [esEjemplo ? "Ingreso de un mes típico (aprox.)" : "Ingreso mensual de diseño", formatoSoles(cliente.ingresoMensual)],
    ["Movimientos de historia", String(cliente.historia.length)],
    ["Movimientos de futuro", esEjemplo ? "No tiene" : String(cliente.futuro.length)],
    ["Movimientos ocultos", String(cliente.ocultos.length)],
    ["Lo que pasó de verdad", esEjemplo ? "No se sabe: no hay días siguientes guardados" : diaDeficit === -1 ? "No cayó en déficit" : `Déficit el día ${diaDeficit + 1}; llegó a faltar ${formatoSoles(faltante)}`],
  ];

  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Datos de prueba"
        bajada={`${casos[0].nombre}, el caso de ejemplo, con sus 90 días de movimientos, y seis clientes inventados más, que además traen los 30 días siguientes que el copiloto no ve. Con esos seis se probó al asistente con IA (semilla ${SEMILLA_AGENTE}). Datos 100 % sintéticos; los comercios no existen.`}
      />

      <div role="group" aria-label="Clientes" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {casos.map((c, i) => {
          const activo = i === elegido;
          const deudas = c.cliente.deudas.length;
          return (
            <button
              key={c.cliente.id}
              type="button"
              aria-pressed={activo}
              onClick={() => elegir(i)}
              className={`group relative flex min-w-0 flex-col items-start gap-2.5 rounded-2xl border p-3.5 text-left transition-[background-color,border-color,box-shadow] duration-150 ${
                activo
                  ? "border-electrico bg-agua-suave shadow-[0_6px_18px_-10px_rgb(0_19_145/0.55)]"
                  : "border-linea bg-white hover:border-linea-fuerte hover:bg-niebla"
              }`}
            >
              <span className="flex w-full min-w-0 items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold ${activo ? "bg-electrico text-white" : "bg-agua-suave text-electrico"}`}
                >
                  {c.nombre.slice(0, 1)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold leading-tight text-noche">{c.nombre}</span>
                  <span className="block truncate text-xs leading-tight text-gris">{c.demo ? "Caso de la demo" : c.cliente.id}</span>
                </span>
              </span>
              <span className="flex flex-wrap gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${activo ? "bg-white text-noche" : "bg-niebla text-noche"}`}>{TIPO[c.cliente.tipo]}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${activo ? "bg-white text-noche" : "bg-niebla text-noche"}`}>
                  {deudas === 0 ? "Sin deudas" : deudas === 1 ? "1 deuda" : `${deudas} deudas`}
                </span>
              </span>
              <span className={`flex items-center gap-1.5 text-xs font-medium ${avisa[i] ? "text-ambar-fuerte" : "text-verde-fuerte"}`}>
                <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${avisa[i] ? "bg-ambar" : "bg-verde"}`} />
                {avisa[i] ? "El copiloto avisa déficit" : "Sin aviso de déficit"}
              </span>
            </button>
          );
        })}
      </div>

      <section aria-label="Filtro de fechas" className="flex flex-wrap items-end gap-3 rounded-2xl border border-linea bg-white p-4">
        <label className="grid gap-1 text-[13px] text-gris">
          Desde
          <input className={campo} type="date" value={desde} min={primera} max={hasta || ultima} onChange={e => fijarFechas(e.target.value, hasta)} />
        </label>
        <label className="grid gap-1 text-[13px] text-gris">
          Hasta
          <input className={campo} type="date" value={hasta} min={desde || primera} max={ultima} onChange={e => fijarFechas(desde, e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-2">
          {ATAJOS.map(([etiqueta, d, h]) => (
            <button
              key={etiqueta}
              type="button"
              aria-pressed={desde === d && hasta === h}
              onClick={() => fijarFechas(d, h)}
              className={`min-h-11 rounded-xl border px-3 text-sm font-medium transition-colors duration-150 ${desde === d && hasta === h ? "border-electrico bg-agua-suave text-electrico" : "border-linea-fuerte bg-white text-noche hover:bg-niebla"}`}
            >
              {etiqueta}
            </button>
          ))}
        </div>
        <p className="basis-full text-[13px] leading-snug text-gris">
          Hay movimientos del {formatoCorto(primera)} al {formatoCorto(ultima)}. Las fechas filtran los gráficos y la tabla de movimientos.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${tarjeta} min-w-0`} aria-labelledby="ficha-cliente">
          <h2 id="ficha-cliente" className="text-lg font-semibold text-noche">
            {nombre} · {cliente.tipo}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-gris">
            {esEjemplo
              ? "Es el caso de ejemplo de la app. Su historia es regular a propósito: no trae gastos atípicos, datos que falten ni cobros duplicados."
              : `Elegido por: ${motivo}. Escenarios del generador: ${cliente.escenarios.length ? cliente.escenarios.map(lindo).join(", ") : "ninguno"}.`}
          </p>
          {alProbar && (
            <div className="mt-4 rounded-xl bg-niebla p-4">
              {viendo === cliente.id ? (
                <p className="text-sm font-medium text-noche">El copiloto está mostrando a {nombre}.{esEjemplo ? "" : ` Para volver a ${casos[0].nombre}: elige su ficha aquí arriba y cárgala, o ve a Perfil, «Restablecer datos de la demo».`}</p>
              ) : (
                <>
                  <button type="button" className={botonPrincipal} onClick={() => void probar()} disabled={cargando}>
                    <Icono nombre="rumbo" />
                    {cargando ? "Cargando…" : `Probar el copiloto con ${nombre}`}
                  </button>
                  <p className="mt-2 text-[13px] leading-snug text-gris">
                    Carga sus 90 días de historia en Inicio, Deudas y el Asistente, y reemplaza el caso que ves ahora. Se guarda solo en este equipo.
                  </p>
                </>
              )}
              {fallo && (
                <p role="alert" className="mt-2 text-sm text-coral-fuerte">
                  {fallo}
                </p>
              )}
            </div>
          )}
          <dl className="mt-4">
            {ficha.map(([etiqueta, valor]) => (
              <div key={etiqueta} className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 border-t border-linea py-2 text-[15px]">
                <dt className="shrink-0 text-gris">{etiqueta}</dt>
                <dd className="ml-auto text-right font-medium tabular-nums text-noche">{unido(valor)}</dd>
              </div>
            ))}
          </dl>
          {cliente.deudas.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="pb-1 text-left text-sm font-semibold text-noche">Deudas</caption>
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gris">
                    <th className="px-3 py-2 font-medium">Nombre</th>
                    <th className="px-3 py-2 text-right font-medium">Saldo</th>
                    <th className="px-3 py-2 text-right font-medium">TCEA</th>
                    <th className="px-3 py-2 text-right font-medium">Mínimo</th>
                    <th className="px-3 py-2 text-right font-medium">Día</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {cliente.deudas.map(d => (
                    <tr key={d.id}>
                      <td className={celda}>{d.nombre}</td>
                      <td className={`${celda} text-right`}>{unido(formatoSoles(d.saldo))}</td>
                      <td className={`${celda} text-right`}>{formatoTasa(d.tceaBp)}</td>
                      <td className={`${celda} text-right`}>{unido(formatoSoles(d.pagoMinimo))}</td>
                      <td className={`${celda} text-right`}>{d.diaPago}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gris">Sin deudas.</p>
          )}
        </section>

        <section className={`${tarjeta} min-w-0`} aria-labelledby="gasto-categoria">
          <h2 id="gasto-categoria" className="text-lg font-semibold text-noche">
            En qué se le va la plata
          </h2>
          <p className="mt-1 text-sm text-gris">Gasto {rangoDicho}, por categoría.</p>
          {gasto.length === 0 && <p className="mt-4 text-sm text-gris">No hay gastos en esas fechas.</p>}
          <ul className="mt-4 space-y-2.5">
            {gasto.map(([nombreCategoria, monto]) => (
              <li key={nombreCategoria} className="grid grid-cols-[6.5rem_minmax(0,1fr)_6.5rem] items-center gap-3 text-sm">
                <span className="text-noche">{lindo(nombreCategoria)}</span>
                <span className="h-2.5 rounded-full bg-niebla" aria-hidden="true">
                  <span className="block h-full rounded-full bg-electrico" style={{ width: `${Math.max(1, Math.round((monto / gasto[0][1]) * 100))}%` }} />
                </span>
                <span className="text-right tabular-nums text-noche">{unido(formatoSoles(monto))}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${tarjeta} min-w-0`} aria-labelledby="grafico-saldo">
          <h2 id="grafico-saldo" className="text-lg font-semibold text-noche">
            Cómo se movió su saldo
          </h2>
          <p className="mt-1 text-sm text-gris">
            Saldo real de la cuenta al cierre de cada día{conFechas ? `, ${rangoDicho}` : ""}.{cliente.futuro.length > 0 ? " La línea punteada son los días siguientes al corte." : ""} Pasa el
            cursor o toca el gráfico para ver cada día.
          </p>
          <GraficoSaldo puntos={saldoVisible} corte={cliente.corte} />
        </section>
        <section className={`${tarjeta} min-w-0`} aria-labelledby="grafico-semanas">
          <h2 id="grafico-semanas" className="text-lg font-semibold text-noche">
            Lo que entra y lo que sale, por semana
          </h2>
          <p className="mt-1 text-sm text-gris">
            Lo que movió la cuenta cada semana{conFechas ? `, ${rangoDicho}` : ""}. No cuenta lo pagado con tarjeta de crédito. Pasa el cursor o toca el gráfico para ver cada semana.
          </p>
          <GraficoSemanas semanas={semanasVisibles} />
        </section>
      </div>

      <section className={tarjeta} aria-labelledby="movimientos-dataset">
        <h2 id="movimientos-dataset" className="text-lg font-semibold text-noche">
          Movimientos
        </h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <label className="grid gap-1 text-[13px] text-gris">
            Periodo
            <select className={campo} value={periodo} onChange={e => filtrar(setPeriodo)(e.target.value as Periodo | "")}>
              {PERIODOS.map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[13px] text-gris">
            Categoría
            <select className={campo} value={categoria} onChange={e => filtrar(setCategoria)(e.target.value as Categoria | "")}>
              <option value="">Todas</option>
              {categorias.map(c => (
                <option key={c} value={c}>
                  {lindo(c)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[13px] text-gris">
            Tipo
            <select className={campo} value={sentido} onChange={e => filtrar(setSentido)(e.target.value as "" | "entra" | "sale")}>
              <option value="">Todos</option>
              <option value="entra">Entradas</option>
              <option value="sale">Salidas</option>
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-[13px] text-gris">
            Buscar
            <input className={campo} type="search" value={texto} placeholder="Mercado, alquiler…" onChange={e => filtrar(setTexto)(e.target.value)} />
          </label>
        </div>
        <p className="mt-3 text-sm tabular-nums text-gris" role="status">
          {filas.length} movimientos · entradas {unido(formatoSoles(entra))} · salidas {unido(formatoSoles(sale))}
        </p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gris">
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Descripción</th>
                <th className="px-3 py-2 font-medium">Categoría</th>
                <th className="px-3 py-2 font-medium">Canal</th>
                <th className="px-3 py-2 text-right font-medium">Monto</th>
                <th className="px-3 py-2 font-medium">Etiquetas</th>
              </tr>
            </thead>
            <tbody>
              {filas.slice(actual * POR_PAGINA, (actual + 1) * POR_PAGINA).map(m => (
                <tr key={`${m.periodo}-${m.id}`}>
                  <td className={`${celda} tabular-nums`}>{m.fecha}</td>
                  <td className={celda}>
                    {m.descripcion}
                    {m.comercio !== m.descripcion && <span className="text-gris"> · {m.comercio}</span>}
                  </td>
                  <td className={celda}>{lindo(m.categoria)}</td>
                  <td className={celda}>{canal(m.canal)}</td>
                  <td className={`${celda} text-right font-medium tabular-nums ${m.monto > 0 ? "text-verde-fuerte" : "text-noche"}`}>{unido(formatoSoles(m.monto))}</td>
                  <td className={celda}>
                    <span className="flex gap-1.5">
                      {m.recurrente && <span className="rounded-full bg-agua-suave px-2 py-0.5 text-xs text-electrico">fijo{m.serie ? ` ${m.serie}` : ""}</span>}
                      {m.duplicado && <span className="rounded-full bg-ambar-suave px-2 py-0.5 text-xs text-ambar-fuerte">{m.tipoDuplicado ? lindo(m.tipoDuplicado) : "duplicado"}</span>}
                      {m.atipico && <span className="rounded-full bg-ambar-suave px-2 py-0.5 text-xs text-ambar-fuerte">atípico</span>}
                    </span>
                  </td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={6} className={`${celda} text-gris`}>
                    Ningún movimiento con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {paginas > 1 && (
          <nav aria-label="Páginas de movimientos" className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm tabular-nums text-gris">
              Del {actual * POR_PAGINA + 1} al {Math.min((actual + 1) * POR_PAGINA, filas.length)} de {filas.length}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" className={`${botonSecundario} disabled:cursor-not-allowed disabled:opacity-50`} disabled={actual === 0} onClick={() => setPagina(actual - 1)}>
                Anterior
              </button>
              <span className="min-w-24 text-center text-sm tabular-nums text-noche" aria-live="polite">
                Página {actual + 1} de {paginas}
              </span>
              <button type="button" className={`${botonSecundario} disabled:cursor-not-allowed disabled:opacity-50`} disabled={actual >= paginas - 1} onClick={() => setPagina(actual + 1)}>
                Siguiente
              </button>
            </div>
          </nav>
        )}
      </section>

      <section className="max-w-3xl space-y-2 text-sm leading-relaxed text-gris">
        <p>
          <span className="font-semibold text-noche">Historia</span> son los 90 días que el copiloto recibe. <span className="font-semibold text-noche">Futuro</span> son los 30 días
          siguientes, que solo sirven para comprobar si acertó. <span className="font-semibold text-noche">Ocultos</span> son movimientos que ocurrieron pero no le llegaron.
        </p>
        <p>
          Las etiquetas (fijo, duplicado, atípico) son la hoja de respuestas del generador: el copiloto no las ve. Lo pagado con tarjeta de crédito no baja el saldo de la
          cuenta; se paga después con el pago de la tarjeta.
        </p>
      </section>
    </div>
  );
}
