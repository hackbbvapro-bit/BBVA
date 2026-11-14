"use client";
import { formatoSoles, type Analisis } from "@/motor";
import { calificacionPorAtraso, ETIQUETA_CALIFICACION, type Calificacion } from "@/motor/sbs";
import { prioridadDePagos } from "@/datos/paraPrioridad";
import { Extraccion } from "@/documentos/esquema";
import { OrdenDePago } from "@/componentes/orden-pago";
import { Recomendaciones } from "@/componentes/recomendaciones";
import { useDatos } from "@/componentes/datos";
import { unido } from "@/componentes/ui";

const TONO: Record<Calificacion, string> = {
  normal: "bg-verde-suave text-verde-fuerte",
  cpp: "bg-ambar-suave text-ambar-fuerte",
  deficiente: "bg-coral-suave text-coral-fuerte",
  dudoso: "bg-coral-suave text-coral-fuerte",
  perdida: "bg-coral-suave text-coral-fuerte",
};

const clave = (entidad: string, nombre: string) => `${entidad}|${nombre}`.toLowerCase();

/** Pestaña «Simulación de clasificación»: las deudas agrupadas por clasificación simulada y el orden de pago que calcula el motor. No es un reporte oficial. */
export function ReporteSbs({ analisis }: { analisis: Analisis }) {
  const { datos } = useDatos();
  const doc = [...datos.documentos].reverse().map(d => ({ d, e: Extraccion.safeParse(d.datos) })).find(x => x.d.tipo === "reporte-sbs" && x.e.success);
  const delDocumento = new Map<string, Calificacion>();
  if (doc?.e.success) for (const x of doc.e.data.deudas) if (x.calificacion) delDocumento.set(clave(x.entidad, x.nombre), x.calificacion);
  const abiertas = datos.deudas.filter(d => !d.pagada && d.saldo > 0);
  const filas = abiertas.map(d => ({ d, cal: delDocumento.get(clave(d.entidad, d.nombre)) ?? calificacionPorAtraso(d.diasAtraso), delDoc: delDocumento.has(clave(d.entidad, d.nombre)) }));
  const orden = Object.keys(ETIQUETA_CALIFICACION) as Calificacion[];
  filas.sort((a, b) => orden.indexOf(b.cal) - orden.indexOf(a.cal));

  return (
    <div className="space-y-5">
      <p className="leading-relaxed text-gris">
        {doc ? <>Sacado de tu documento del {doc.d.fecha}. {doc.d.resumen}</> : "Simulación: la clasificación sale de los días de atraso registrados en el caso."}{" "}
        En el sistema financiero cada deuda se clasifica según sus días de atraso; con más atraso, la clasificación empeora y suele costar más conseguir crédito.
      </p>
      {filas.length === 0 ? (
        <p className="font-medium text-noche">No tienes deudas abiertas para calificar.</p>
      ) : (
        <ul>
          {filas.map(({ d, cal, delDoc }) => (
            <li key={d.id} className="flex items-start justify-between gap-3 border-t border-linea py-3 first:border-t-0">
              <div className="min-w-0">
                <p className="font-medium text-noche">{d.nombre} <span className="text-sm font-normal text-gris">{d.entidad}</span></p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gris">
                  <span className={`rounded-full px-2.5 py-0.5 font-semibold ${TONO[cal]}`}>{ETIQUETA_CALIFICACION[cal]}</span>
                  {delDoc ? "según tu reporte" : `por ${d.diasAtraso} días de atraso`}
                </p>
              </div>
              <p className="shrink-0 font-semibold text-noche tabular-nums">{unido(formatoSoles(d.saldo))}</p>
            </li>
          ))}
        </ul>
      )}
      <OrdenDePago r={prioridadDePagos(datos, analisis)} />
      <Recomendaciones datos={datos} analisis={analisis} />
      <p className="text-sm leading-relaxed text-gris">
        Lo que ves aquí es una simulación educativa, no un reporte oficial ni tu calificación real. El reporte oficial de deudas se pide gratis en la{" "}
        <a className="font-semibold text-electrico underline" href="https://www.sbs.gob.pe/usuarios/nuestros-servicios/reporte-de-deudas" target="_blank" rel="noreferrer">
          web de la SBS
        </a>
        .
      </p>
    </div>
  );
}
