"use client";
import { useMemo, useState } from "react";
import { conCobros, formatoLargo, formatoSoles, type CobroPendiente, type EscenarioCobros, type Proyeccion } from "@/motor";
import { Grafico } from "@/componentes/grafico";
import { unido } from "@/componentes/ui";

const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios);

/** La frase del escenario; todas las cifras salen de `conCobros`. */
export function fraseSiTePagan(e: EscenarioCobros): string {
  const tarde = e.llegaronTarde.length;
  const aviso = tarde > 0
    ? ` ${tarde} ${plural(tarde, "cobro llega", "cobros llegan")} después de tu día en rojo: ese día no te ${plural(tarde, "salva", "salvan")}.`
    : "";
  if (e.resuelveElDeficit) return `Si te pagan lo prometido en su fecha, no llegas a rojo. Tu día más bajo: ${formatoSoles(e.saldoMinimo)}.${aviso}`;
  if (e.primerDiaNegativo) {
    return `Aun si te pagan, el ${formatoLargo(e.primerDiaNegativo)} seguirías en rojo y te faltarían hasta ${formatoSoles(e.faltanteMaximo)}.${aviso}`;
  }
  return `No tenías rojo y con estos cobros tu día más bajo sube a ${formatoSoles(e.saldoMinimo)}.`;
}

export function GraficoSiTePagan({
  base,
  despues,
  cobros,
  descripcion,
  ancho,
  fondo,
}: {
  base: Proyeccion;
  despues?: Proyeccion;
  cobros: CobroPendiente[];
  descripcion: string;
  ancho?: number;
  fondo?: string;
}) {
  const [ver, setVer] = useState(false);
  const e = useMemo(() => conCobros(base, cobros), [base, cobros]);
  const hayContados = e.contados.length > 0;
  const mostrar = ver && hayContados && !despues;
  return (
    <>
      <Grafico base={base} despues={despues} siPagan={mostrar ? e.dias : undefined} descripcion={descripcion} ancho={ancho} fondo={fondo} />
      {hayContados && !despues && (
        <div className="mt-4">
          <button
            type="button"
            aria-pressed={ver}
            onClick={() => setVer(v => !v)}
            className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-full border px-5 text-[15px] font-semibold transition-colors duration-150 sm:w-auto ${ver ? "border-verde-fuerte bg-verde-suave text-verde-fuerte" : "border-linea-fuerte bg-white text-noche hover:border-verde-fuerte hover:text-verde-fuerte"}`}
          >
            {ver ? "Quitar «si te pagan»" : unido(`Ver si te pagan ${formatoSoles(e.totalContado)}`)}
          </button>
          {ver && (
            <p className="mt-3 text-[15px] leading-relaxed text-noche">
              <span className="mr-2 inline-block h-0 w-6 border-t-[3px] border-dotted border-verde-fuerte align-middle" aria-hidden="true" />
              {unido(fraseSiTePagan(e))}
            </p>
          )}
          <p className="mt-1.5 text-sm text-gris">Estos cobros no están en tu proyección: cuentan solo si te pagan en la fecha prometida.</p>
        </div>
      )}
      {e.vencidos.length > 0 && !despues && (
        <p className="mt-3 text-sm text-gris">
          {unido(`${e.vencidos.length} ${plural(e.vencidos.length, "cobro vencido", "cobros vencidos")} (${formatoSoles(e.vencidos.reduce((s, c) => s + c.monto, 0))}) no ${plural(e.vencidos.length, "se cuenta", "se cuentan")}: no sé cuándo llegarán.`)}
        </p>
      )}
    </>
  );
}
