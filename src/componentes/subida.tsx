"use client";
import { useEffect, useRef, useState } from "react";
import { analizarDocumento, prepararArchivo, TIPOS_ACEPTADOS } from "@/cliente/archivo";
import { consultarEstado } from "@/cliente/estado";
import { salidasPermitidas } from "@/cliente/salidas";
import { nuevoId } from "@/datos/repositorio";
import { Fecha, mensajeDeError, Seleccion, Texto } from "@/componentes/formularios";
import { boton, botonSecundario } from "@/componentes/ui";
import { useDatos } from "@/componentes/datos";
import type { Extraccion } from "@/documentos/esquema";
import { RUTA_IMAGEN_EJEMPLO } from "@/documentos/ejemplo";
import { cobroDesdePropuesta, deudaDesdePropuesta, propuestaCobros, propuestaDeudas, type CobroPropuesta, type DeudaPropuesta } from "@/documentos/propuesta";

/** Pasos de una subida: nada elegido, leyendo el archivo, o lectura lista para que la persona la revise. */
export type Subida = { paso: "inicio" } | { paso: "analizando"; nombre: string } | { paso: "revisar"; ext: Extraccion; ejemplo: boolean };

/** Cuántas cosas se guardaron al confirmar una lectura. */
export interface Guardado {
  deudas: number;
  cobros: number;
}

const TIPOS_DEUDA = [["tarjeta", "Tarjeta de crédito"], ["prestamo", "Préstamo"], ["personal", "Deuda con una persona"]] as const;

/**
 * ¿Se puede ofrecer «elegir archivo»? Solo si IA y voz están permitidas en este caso y el servidor tiene
 * encendida la lectura de documentos (apagada por defecto).
 */
export function useLecturaDisponible(externo: boolean = true): boolean {
  const [lectura, setLectura] = useState(false);
  useEffect(() => {
    if (!externo || !salidasPermitidas()) return;
    let vivo = true;
    void consultarEstado().then(e => {
      if (vivo) setLectura(e.documentos);
    });
    return () => {
      vivo = false;
    };
  }, [externo]);
  return externo && lectura;
}

/** Estado de una subida: elegir un archivo inventado (lo lee la IA) o cargar una lectura ya hecha. */
export function useSubida() {
  const [estado, setEstado] = useState<Subida>({ paso: "inicio" });
  const [error, setError] = useState<string | null>(null);
  const control = useRef<AbortController | null>(null);
  useEffect(() => () => control.current?.abort(), []);

  /** `inventado` es la declaración de la persona: sin ella el archivo no sale de este equipo. */
  async function elegir(archivo: File, inventado: boolean) {
    control.current?.abort();
    const mio = new AbortController();
    control.current = mio;
    setError(null);
    setEstado({ paso: "analizando", nombre: archivo.name });
    try {
      const listo = await prepararArchivo(archivo);
      const ext = await analizarDocumento(listo, inventado, mio.signal);
      if (!mio.signal.aborted) setEstado({ paso: "revisar", ext, ejemplo: false });
    } catch (e) {
      if (mio.signal.aborted) return;
      setError(mensajeDeError(e));
      setEstado({ paso: "inicio" });
    }
  }

  function precargada(ext: Extraccion) {
    setError(null);
    setEstado({ paso: "revisar", ext, ejemplo: true });
  }

  function reiniciar() {
    control.current?.abort();
    setError(null);
    setEstado({ paso: "inicio" });
  }

  return { estado, error, elegir, precargada, reiniciar };
}

function Marca({ marcado, cambiar, texto }: { marcado: boolean; cambiar: (v: boolean) => void; texto: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold text-noche">
      <input type="checkbox" checked={marcado} onChange={e => cambiar(e.target.checked)} className="size-5 shrink-0 accent-electrico" />
      {texto}
    </label>
  );
}

/**
 * Selector de archivo con declaración: el botón solo se habilita cuando la persona marca que el documento es
 * inventado. El servidor vuelve a exigir esa declaración.
 */
export function ElegirArchivo({ id, alElegir }: { id: string; alElegir: (archivo: File, inventado: boolean) => void }) {
  const [inventado, setInventado] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  return (
    <div className="mt-4 rounded-2xl border border-linea p-4">
      <Marca marcado={inventado} cambiar={setInventado} texto="Confirmo que es un documento inventado: no trae datos reales de ninguna persona." />
      <input
        ref={entrada}
        id={id}
        type="file"
        accept={TIPOS_ACEPTADOS.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={e => {
          const archivo = e.target.files?.[0];
          e.target.value = "";
          if (archivo) alElegir(archivo, inventado);
        }}
      />
      <button type="button" disabled={!inventado} onClick={() => entrada.current?.click()} className={`${botonSecundario} mt-3 disabled:opacity-40`}>
        Elegir foto o PDF
      </button>
      <p className="mt-3 text-sm leading-relaxed text-gris">
        JPG, PNG, WebP o PDF de hasta 3 MB. Se envía a un servicio externo de IA solo para leerlo y no se guarda. Nunca subas documentos con datos reales.
      </p>
    </div>
  );
}

/** Aviso mientras la IA lee el archivo, con salida para cancelar. */
export function Leyendo({ nombre, alCancelar }: { nombre: string; alCancelar: () => void }) {
  return (
    <p role="status" className="mt-3 flex flex-wrap items-center gap-3 text-gris">
      <span aria-hidden="true" className="size-4 shrink-0 animate-spin rounded-full border-2 border-linea-fuerte border-t-electrico" />
      <span className="min-w-0 break-words">Leyendo {nombre}… puede tardar unos segundos.</span>
      <button type="button" onClick={alCancelar} className="min-h-11 font-semibold text-electrico">
        Cancelar
      </button>
    </p>
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

/**
 * Lo que se encontró en el documento, para que la persona lo corrija y decida qué guardar. Nada se guarda
 * hasta que confirma; lo que lee la IA nunca entra a las cuentas sin pasar por aquí.
 */
export function Revision({ ext, ejemplo, alGuardar, alDescartar }: { ext: Extraccion; ejemplo: boolean; alGuardar: (g: Guardado) => void; alDescartar: () => void }) {
  const { datos, cambiar } = useDatos();
  const [deudas, setDeudas] = useState(() => propuestaDeudas(ext, datos.deudas));
  const [cobros, setCobros] = useState(() => propuestaCobros(ext));
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function confirmar() {
    if (guardando) return;
    setError(null);
    setGuardando(true);
    try {
      const nuevas = deudas.filter(d => d.incluir).map(d => deudaDesdePropuesta(d, d.existenteId ?? nuevoId("deuda")));
      const porCobrar = cobros.filter(c => c.incluir).map(c => cobroDesdePropuesta(c, nuevoId("cobro")));
      await cambiar(async repo => {
        for (const d of nuevas) await repo.guardarDeuda(d);
        for (const c of porCobrar) await repo.guardarCobro(c);
        await repo.guardarDocumento({ id: nuevoId("doc"), tipo: ext.tipo, resumen: ext.resumen, datos: ext, fecha: datos.perfil.hoy });
      });
      alGuardar({ deudas: nuevas.length, cobros: porCobrar.length });
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {ejemplo && <img src={RUTA_IMAGEN_EJEMPLO} alt="Reporte de deudas de ejemplo, con datos inventados" width={240} className="mt-3 max-h-40 w-auto rounded-xl border border-linea object-contain object-left" />}
      <p className="mt-2 leading-relaxed text-gris">
        {ejemplo ? "Es un reporte de ejemplo con datos inventados. Esta lectura viene precargada: no es una IA leyendo en vivo. " : "Esto lo leyó una IA y puede equivocarse: revisa cada cifra. "}
        {ext.resumen} Corrige lo que esté mal y desmarca lo que no quieras guardar. Todavía no se guardó nada.
      </p>
      {deudas.length === 0 && cobros.length === 0 && <p className="mt-4 font-medium text-noche">No encontré deudas ni cobros en este documento.</p>}
      {deudas.length > 0 && (
        <>
          <h3 className="mt-5 font-semibold text-noche">Deudas ({deudas.length})</h3>
          <ul className="mt-2 space-y-3">
            {deudas.map((p, i) => (
              <RevisarDeuda key={i} p={p} cambiar={n => setDeudas(lista => lista.map((d, j) => (j === i ? { ...d, ...n } : d)))} />
            ))}
          </ul>
        </>
      )}
      {cobros.length > 0 && (
        <>
          <h3 className="mt-5 font-semibold text-noche">Te deben ({cobros.length})</h3>
          <ul className="mt-2 space-y-3">
            {cobros.map((p, i) => (
              <RevisarCobro key={i} p={p} cambiar={n => setCobros(lista => lista.map((c, j) => (j === i ? { ...c, ...n } : c)))} />
            ))}
          </ul>
        </>
      )}
      {ext.movimientos.length > 0 && (
        <p className="mt-4 text-sm text-gris">También vi {ext.movimientos.length} movimientos (ingresos y gastos); por ahora no los guardo: solo deudas y lo que te deben.</p>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={() => void confirmar()} disabled={guardando} className={`${boton} bg-electrico text-white hover:bg-marino`}>
          {guardando ? "Guardando…" : "Guardar lo marcado"}
        </button>
        <button type="button" onClick={alDescartar} disabled={guardando} className={`${boton} border border-linea-fuerte text-noche hover:bg-niebla`}>
          Descartar
        </button>
      </div>
      {error && <Fallo texto={error} />}
    </>
  );
}

export function Fallo({ texto }: { texto: string }) {
  return (
    <p role="alert" className="mt-4 rounded-xl bg-coral-suave px-4 py-3 text-[15px] font-medium text-coral-fuerte">
      {texto}
    </p>
  );
}
