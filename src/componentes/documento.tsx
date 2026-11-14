"use client";
import { useRef, useState } from "react";
import { analizarDocumento, prepararArchivo, TIPOS_ACEPTADOS } from "@/cliente/archivo";
import { nuevoId } from "@/datos/repositorio";
import { Fecha, mensajeDeError, Seleccion, Texto } from "@/componentes/formularios";
import { tarjeta, boton } from "@/componentes/ui";
import { useDatos } from "@/componentes/datos";
import type { Extraccion } from "@/documentos/esquema";
import { EXTRACCION_EJEMPLO, RUTA_IMAGEN_EJEMPLO } from "@/documentos/ejemplo";
import { cobroDesdePropuesta, deudaDesdePropuesta, propuestaCobros, propuestaDeudas, type CobroPropuesta, type DeudaPropuesta } from "@/documentos/propuesta";

type Estado = { paso: "inicio" } | { paso: "analizando"; nombre: string } | { paso: "revisar"; ext: Extraccion; deudas: DeudaPropuesta[]; cobros: CobroPropuesta[]; ejemplo: boolean };

const TIPOS_DEUDA = [["tarjeta", "Tarjeta de crédito"], ["prestamo", "Préstamo"], ["personal", "Deuda con una persona"]] as const;

function Marca({ marcado, cambiar, texto }: { marcado: boolean; cambiar: (v: boolean) => void; texto: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold text-noche">
      <input type="checkbox" checked={marcado} onChange={e => cambiar(e.target.checked)} className="size-5 accent-electrico" />
      {texto}
    </label>
  );
}

function RevisarDeuda({ p, cambiar }: { p: DeudaPropuesta; cambiar: (n: Partial<DeudaPropuesta>) => void }) {
  return (
    <li className="rounded-2xl border border-linea p-4">
      <Marca marcado={p.incluir} cambiar={incluir => cambiar({ incluir })} texto={`${p.nombre} · ${p.entidad}`} />
      {p.existenteId && p.incluir && <p className="ml-8 text-sm text-gris">Ya la tenías guardada: se actualiza con estos datos, no se duplica.</p>}
      {p.incluir && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Seleccion etiqueta="Qué tipo es" valor={p.tipo} cambiar={v => cambiar({ tipo: v as DeudaPropuesta["tipo"] })} opciones={TIPOS_DEUDA} />
          <Texto etiqueta="Cuánto debes (S/)" modo="decimal" valor={p.saldo} cambiar={saldo => cambiar({ saldo })} />
          <Texto etiqueta="Pago mínimo del mes (S/)" modo="decimal" valor={p.minimo} cambiar={minimo => cambiar({ minimo })} ayuda={p.minimo ? undefined : "El documento no lo dice: complétalo."} />
          <Texto etiqueta="Día del mes en que pagas" modo="numeric" valor={p.dia} cambiar={dia => cambiar({ dia })} ayuda={p.dia ? undefined : "El documento no lo dice: complétalo."} />
          <Texto etiqueta="Interés anual, TCEA (%)" modo="decimal" valor={p.tcea} cambiar={tcea => cambiar({ tcea })} ayuda="Déjalo vacío si no lo sabes." />
          <Texto etiqueta="Días de atraso" modo="numeric" valor={p.atraso} cambiar={atraso => cambiar({ atraso })} />
        </div>
      )}
    </li>
  );
}

function RevisarCobro({ p, cambiar }: { p: CobroPropuesta; cambiar: (n: Partial<CobroPropuesta>) => void }) {
  return (
    <li className="rounded-2xl border border-linea p-4">
      <Marca marcado={p.incluir} cambiar={incluir => cambiar({ incluir })} texto={`Te debe ${p.quien}`} />
      {p.incluir && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Texto etiqueta="Cuánto (S/)" modo="decimal" valor={p.monto} cambiar={monto => cambiar({ monto })} />
          <Fecha etiqueta="Fecha en que te paga" valor={p.fecha} cambiar={fecha => cambiar({ fecha })} ayuda={p.fecha ? undefined : "El documento no trae fecha: elígela."} />
        </div>
      )}
    </li>
  );
}

/** Subir un documento: la IA solo lee y propone; lo que se guarda lo decide la persona. */
export function Adjuntar({ alGuardar }: { alGuardar: () => void }) {
  const { datos, cambiar } = useDatos();
  const [estado, setEstado] = useState<Estado>({ paso: "inicio" });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const cancelar = useRef<AbortController | null>(null);

  function proponer(ext: Extraccion, ejemplo: boolean) {
    setEstado({ paso: "revisar", ext, deudas: propuestaDeudas(ext, datos.deudas), cobros: propuestaCobros(ext), ejemplo });
  }

  async function elegido(archivo: File | undefined) {
    if (!archivo) return;
    setError(null);
    setEstado({ paso: "analizando", nombre: archivo.name });
    const control = new AbortController();
    cancelar.current = control;
    try {
      const listo = await prepararArchivo(archivo);
      proponer(await analizarDocumento(listo, control.signal), false);
    } catch (e) {
      if (control.signal.aborted) return;
      setError(mensajeDeError(e));
      setEstado({ paso: "inicio" });
    } finally {
      if (entrada.current) entrada.current.value = "";
    }
  }

  async function confirmar() {
    if (estado.paso !== "revisar" || guardando) return;
    setError(null);
    setGuardando(true);
    try {
      const deudas = estado.deudas.filter(d => d.incluir).map(d => deudaDesdePropuesta(d, d.existenteId ?? nuevoId("deuda")));
      const cobros = estado.cobros.filter(c => c.incluir).map(c => cobroDesdePropuesta(c, nuevoId("cobro")));
      await cambiar(async repo => {
        for (const d of deudas) await repo.guardarDeuda(d);
        for (const c of cobros) await repo.guardarCobro(c);
        await repo.guardarDocumento({ id: nuevoId("doc"), tipo: estado.ext.tipo, resumen: estado.ext.resumen, datos: estado.ext, fecha: datos.perfil.hoy });
      });
      setEstado({ paso: "inicio" });
      alGuardar();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  const editarDeuda = (i: number, n: Partial<DeudaPropuesta>) =>
    setEstado(s => (s.paso === "revisar" ? { ...s, deudas: s.deudas.map((d, j) => (j === i ? { ...d, ...n } : d)) } : s));
  const editarCobro = (i: number, n: Partial<CobroPropuesta>) =>
    setEstado(s => (s.paso === "revisar" ? { ...s, cobros: s.cobros.map((c, j) => (j === i ? { ...c, ...n } : c)) } : s));

  return (
    <section className={`${tarjeta} aparecer`} aria-labelledby="adjuntar">
      <h2 id="adjuntar" className="text-lg font-semibold text-noche">
        {estado.paso === "revisar" ? "Esto encontré" : "Súbeme un documento"}
      </h2>

      {estado.paso === "inicio" && (
        <>
          <p className="mt-1 leading-relaxed text-gris">
            Tu reporte de deudas de la SBS, un estado de cuenta o una captura de tu app. Lo leo, te muestro lo que encontré y tú decides qué guardar.
          </p>
          <input ref={entrada} type="file" accept={TIPOS_ACEPTADOS.join(",")} className="sr-only" id="archivo-documento" onChange={e => void elegido(e.target.files?.[0])} />
          <div className="mt-4 flex flex-wrap gap-3">
            <label htmlFor="archivo-documento" className={`${boton} inline-flex cursor-pointer items-center bg-electrico text-white hover:bg-marino focus-within:outline-2`}>
              Elegir foto o PDF
            </label>
            <button onClick={() => proponer(EXTRACCION_EJEMPLO, true)} className={`${boton} border border-linea-fuerte text-noche hover:bg-niebla`}>
              Usar reporte SBS de ejemplo
            </button>
          </div>
          <p className="mt-3 text-sm text-gris">JPG, PNG, WebP o PDF de hasta 3 MB. No guardo el archivo, solo los datos que tú confirmes.</p>
          <p className="mt-2 text-sm text-gris">
            Al elegir un archivo aceptas que se envíe a la IA (Anthropic) solo para leerlo. Es una demo: sube únicamente documentos inventados, no tus datos reales.
          </p>
        </>
      )}

      {estado.paso === "analizando" && (
        <p role="status" className="mt-3 flex items-center gap-3 text-gris">
          <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-linea-fuerte border-t-electrico" />
          Leyendo {estado.nombre}… puede tardar unos segundos.
          <button onClick={() => { cancelar.current?.abort(); setEstado({ paso: "inicio" }); }} className="min-h-11 font-semibold text-electrico">
            Cancelar
          </button>
        </p>
      )}

      {estado.paso === "revisar" && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {estado.ejemplo && <img src={RUTA_IMAGEN_EJEMPLO} alt="Reporte SBS de ejemplo" width={240} className="mt-3 max-h-40 w-auto rounded-xl border border-linea object-contain object-left" />}
          <p className="mt-2 leading-relaxed text-gris">
            {estado.ejemplo ? "Es un reporte de ejemplo, no el tuyo. " : ""}
            {estado.ext.resumen} Corrige lo que esté mal y desmarca lo que no quieras guardar. Todavía no se guardó nada.
          </p>
          {estado.deudas.length === 0 && estado.cobros.length === 0 && <p className="mt-4 font-medium text-noche">No encontré deudas ni cobros en este documento.</p>}
          {estado.deudas.length > 0 && (
            <>
              <h3 className="mt-5 font-semibold text-noche">Deudas ({estado.deudas.length})</h3>
              <ul className="mt-2 space-y-3">{estado.deudas.map((p, i) => <RevisarDeuda key={i} p={p} cambiar={n => editarDeuda(i, n)} />)}</ul>
            </>
          )}
          {estado.cobros.length > 0 && (
            <>
              <h3 className="mt-5 font-semibold text-noche">Te deben ({estado.cobros.length})</h3>
              <ul className="mt-2 space-y-3">{estado.cobros.map((p, i) => <RevisarCobro key={i} p={p} cambiar={n => editarCobro(i, n)} />)}</ul>
            </>
          )}
          {estado.ext.movimientos.length > 0 && <p className="mt-4 text-sm text-gris">También vi {estado.ext.movimientos.length} movimientos; por ahora no los guardo.</p>}
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => void confirmar()} disabled={guardando} className={`${boton} bg-electrico text-white hover:bg-marino`}>
              {guardando ? "Guardando…" : "Guardar lo marcado"}
            </button>
            <button onClick={() => { setError(null); setEstado({ paso: "inicio" }); }} className={`${boton} border border-linea-fuerte text-noche hover:bg-niebla`}>
              Descartar
            </button>
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-coral-suave px-4 py-3 text-[15px] font-medium text-coral-fuerte">
          {error}
        </p>
      )}
    </section>
  );
}
