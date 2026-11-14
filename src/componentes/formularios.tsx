"use client";
import { useId, type ReactNode } from "react";
import { ErrorDatos } from "@/datos/validar";

const caja =
  "min-h-11 w-full rounded-xl border border-linea-fuerte bg-white px-3.5 text-base text-tinta placeholder:text-gris focus-visible:border-electrico";

export function Campo({
  etiqueta,
  ayuda,
  children,
}: {
  etiqueta: string;
  ayuda?: string;
  children: (id: string, describe: string | undefined) => ReactNode;
}) {
  const id = useId();
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[15px] font-medium text-noche">
        {etiqueta}
      </label>
      {children(id, idAyuda)}
      {ayuda && (
        <p id={idAyuda} className="mt-1.5 text-sm text-gris">
          {ayuda}
        </p>
      )}
    </div>
  );
}

export function Texto({
  etiqueta,
  ayuda,
  valor,
  cambiar,
  enfocar,
  modo,
  marcador,
}: {
  etiqueta: string;
  ayuda?: string;
  valor: string;
  cambiar: (v: string) => void;
  enfocar?: boolean;
  modo?: "decimal" | "numeric" | "text";
  marcador?: string;
}) {
  return (
    <Campo etiqueta={etiqueta} ayuda={ayuda}>
      {(id, describe) => (
        <input
          id={id}
          aria-describedby={describe}
          value={valor}
          onChange={e => cambiar(e.target.value)}
          autoFocus={enfocar}
          inputMode={modo}
          placeholder={marcador}
          autoComplete="off"
          className={caja}
        />
      )}
    </Campo>
  );
}

export function Seleccion({
  etiqueta,
  valor,
  cambiar,
  opciones,
}: {
  etiqueta: string;
  valor: string;
  cambiar: (v: string) => void;
  opciones: readonly (readonly [string, string])[];
}) {
  return (
    <Campo etiqueta={etiqueta}>
      {id => (
        <select id={id} value={valor} onChange={e => cambiar(e.target.value)} className={caja}>
          {opciones.map(([v, nombre]) => (
            <option key={v} value={v}>
              {nombre}
            </option>
          ))}
        </select>
      )}
    </Campo>
  );
}

/** Pie común de los formularios en línea: error visible, guardar, cancelar y borrar con confirmación. */
export function Acciones({
  error,
  guardando,
  confirmandoBorrar,
  puedeBorrar,
  nombreBorrar,
  alCancelar,
  alPedirBorrar,
  alBorrar,
  alDesistirBorrar,
}: {
  error: string | null;
  guardando: boolean;
  confirmandoBorrar: boolean;
  puedeBorrar: boolean;
  nombreBorrar: string;
  alCancelar: () => void;
  alPedirBorrar: () => void;
  alBorrar: () => void;
  alDesistirBorrar: () => void;
}) {
  const secundario =
    "min-h-11 rounded-xl border border-linea-fuerte bg-white px-4 text-[15px] font-semibold text-noche transition-colors hover:bg-niebla disabled:opacity-50";
  return (
    <div className="mt-5">
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-coral-suave px-4 py-3 text-[15px] text-coral-fuerte">
          {error}
        </p>
      )}
      {confirmandoBorrar ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="w-full text-[15px] text-noche">
            ¿Borrar <span className="font-semibold">{nombreBorrar}</span>? Esto cambia tus cifras.
          </p>
          <button type="button" onClick={alBorrar} disabled={guardando} className="min-h-11 rounded-xl bg-coral-fuerte px-5 text-[15px] font-semibold text-white disabled:opacity-50">
            Sí, borrar
          </button>
          <button type="button" onClick={alDesistirBorrar} className={secundario}>
            No, conservar
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={guardando} className="min-h-11 rounded-xl bg-electrico px-6 text-[15px] font-semibold text-white transition-colors hover:bg-marino disabled:opacity-50">
            {guardando ? "Guardando…" : "Guardar"}
          </button>
          <button type="button" onClick={alCancelar} className={secundario}>
            Cancelar
          </button>
          {puedeBorrar && (
            <button type="button" onClick={alPedirBorrar} className="ml-auto min-h-11 rounded-xl px-3 text-[15px] font-semibold text-coral-fuerte transition-colors hover:bg-coral-suave">
              Borrar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Texto que se puede mostrar al usuario, venga el error de donde venga. */
export function mensajeDeError(e: unknown): string {
  return e instanceof ErrorDatos ? e.message : "No pudimos guardar. Inténtalo otra vez.";
}
