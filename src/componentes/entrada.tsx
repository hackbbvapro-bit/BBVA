"use client";
import { useEffect, useRef, useState } from "react";
import { mensajeDeError } from "@/componentes/formularios";
import { boton, botonPrincipal, botonSecundario, desplazar } from "@/componentes/ui";
import { hoyEnLima } from "@/datos/semilla";
import type { Respuestas } from "@/ruta/entrada";
import { aRespuestas, avance, pregunta, proximoPaso, responder, type Borrador } from "@/ruta/guion";

interface Turno {
  /** Lo respondido antes de esta pregunta: sirve para deshacerla con «Atrás». */
  antes: Borrador;
  pregunta: string;
  dicho: string;
}

const caja =
  "min-h-11 w-full rounded-xl border border-linea-fuerte bg-white px-3.5 text-base text-tinta placeholder:text-gris focus-visible:border-electrico";
const burbujaCopiloto = "aparecer max-w-[92%] rounded-2xl rounded-tl-md border border-linea bg-niebla/60 px-4 py-3 leading-relaxed text-noche";
const burbujaPersona = "aparecer ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-agua-suave px-4 py-2.5 font-medium text-tinta";

/**
 * Entrada conversada: una pregunta a la vez, con botones o un campo corto.
 * Solo pinta lo que decide el guion (ruta/guion.ts): el orden, los textos y la validación viven allí.
 * La última pregunta pide permiso expreso para usar IA y voz; nada sale del equipo antes de eso.
 */
export function Entrada({
  alTerminar,
  volver,
  guardando,
  error,
}: {
  alTerminar: (respuestas: Respuestas, externo: boolean) => void;
  volver: () => void;
  guardando: boolean;
  error?: string;
}) {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [actual, setActual] = useState<Borrador>({});
  const [texto, setTexto] = useState("");
  const [fallo, setFallo] = useState<string>();
  const fin = useRef<HTMLDivElement>(null);

  const paso = proximoPaso(actual);
  const p = pregunta(paso, actual);
  const { actual: numero, total } = avance(actual);

  useEffect(() => {
    if (turnos.length > 0) desplazar(fin.current);
  }, [turnos.length]);

  function contestar(valor: string) {
    if (guardando) return;
    try {
      const r = responder(actual, paso, valor);
      setFallo(undefined);
      if (paso === "permiso") {
        alTerminar(aRespuestas(actual, hoyEnLima()), valor === "si");
        return;
      }
      setTurnos(t => [...t, { antes: actual, pregunta: p.texto, dicho: r.dicho }]);
      setActual(r.borrador);
      setTexto("");
    } catch (e) {
      setFallo(mensajeDeError(e));
    }
  }

  function atras() {
    if (guardando) return;
    const ultimo = turnos[turnos.length - 1];
    if (!ultimo) return volver();
    setTurnos(turnos.slice(0, -1));
    setActual(ultimo.antes);
    setTexto("");
    setFallo(undefined);
  }

  const aviso = fallo ?? error;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold text-noche">Cuéntame tu situación</h2>
        <p className="shrink-0 text-sm tabular-nums text-gris">
          Pregunta {numero} de {total}
        </p>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-niebla"
        role="progressbar"
        aria-label="Avance de las preguntas"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={numero}
      >
        <div className="h-full rounded-full bg-electrico transition-[width] duration-300" style={{ width: `${Math.round((numero / total) * 100)}%` }} />
      </div>

      <div role="log" aria-live="polite" aria-label="Preguntas y respuestas" className="mt-5 grid max-h-[46vh] gap-2.5 overflow-y-auto pr-1">
        {turnos.map((t, i) => (
          <div key={i} className="grid gap-2">
            <p className="max-w-[92%] rounded-2xl rounded-tl-md border border-linea bg-white px-4 py-2.5 text-[15px] leading-snug text-gris">{t.pregunta}</p>
            <p className={burbujaPersona}>{t.dicho}</p>
          </div>
        ))}
        <div key={paso} className={burbujaCopiloto}>
          <p className="font-medium">{p.texto}</p>
          {p.ayuda && <p className="mt-1.5 text-sm leading-relaxed text-gris">{p.ayuda}</p>}
        </div>
        <div ref={fin} />
      </div>

      {p.clase === "opciones" ? (
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={p.texto}>
          {p.opciones?.map(o => (
            <button
              key={o.valor}
              type="button"
              disabled={guardando}
              onClick={() => contestar(o.valor)}
              className={`${boton} rounded-full border border-agua/40 bg-agua-suave/60 py-2.5 text-left text-[15px] text-agua-fuerte hover:bg-agua-suave`}
            >
              {o.texto}
            </button>
          ))}
        </div>
      ) : (
        <form
          className="mt-4 flex gap-2"
          onSubmit={e => {
            e.preventDefault();
            contestar(texto);
          }}
        >
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">{p.texto}</span>
            {p.clase === "soles" && (
              <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-gris">
                S/
              </span>
            )}
            <input
              key={paso}
              autoFocus
              value={texto}
              onChange={e => setTexto(e.target.value)}
              inputMode={p.clase === "soles" ? "decimal" : "text"}
              autoComplete="off"
              maxLength={p.clase === "soles" ? 14 : 60}
              placeholder={p.marcador}
              className={`${caja} ${p.clase === "soles" ? "pl-10 tabular-nums" : ""}`}
            />
          </label>
          <button type="submit" className={botonPrincipal}>
            Seguir
          </button>
        </form>
      )}

      {aviso && (
        <p role="alert" className="mt-3 rounded-xl bg-coral-suave px-4 py-3 text-sm text-coral-fuerte">
          {aviso}
        </p>
      )}
      {guardando && <p className="mt-3 text-sm text-gris">Armando tu caso…</p>}

      <div className="mt-5">
        <button type="button" onClick={atras} disabled={guardando} className={`${botonSecundario} disabled:opacity-60`}>
          {turnos.length === 0 ? "Volver" : "Atrás"}
        </button>
      </div>
    </div>
  );
}
