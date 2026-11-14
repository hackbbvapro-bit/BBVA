"use client";
import { formatoCorto, formatoSoles, type Analisis } from "@/motor";
import { tarjeta, unido } from "@/componentes/ui";
import { useDatos } from "@/componentes/datos";
import { totalDebo, totalMeDeben } from "@/componentes/deudas-editar";

function Dato({ etiqueta, valor, detalle, tono }: { etiqueta: string; valor: string; detalle?: string; tono?: "urgente" }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-linea py-2 first:border-t-0 md:py-3 first:pt-0">
      <div className="min-w-0">
        <dt className="text-sm text-noche md:text-[15px]">{etiqueta}</dt>
        {detalle && <dd className="text-xs text-gris md:text-sm">{detalle}</dd>}
      </div>
      <p className={`shrink-0 font-semibold tabular-nums ${tono === "urgente" ? "text-coral-fuerte" : "text-noche"}`}>{unido(valor)}</p>
    </div>
  );
}

/** Lo que el copiloto tiene guardado y usa para contestar, a la vista. Cada cifra sale de la base y del motor, no de la IA. */
export function LoQueSe({ analisis }: { analisis: Analisis }) {
  const { datos, perfil } = useDatos();
  const debo = totalDebo(datos.deudas);
  const meDeben = totalMeDeben(datos.cobros);
  const deficit = analisis.proyeccion.deficit;
  return (
    <section className={`${tarjeta} aparecer`} aria-labelledby="lo-que-se">
      <h2 id="lo-que-se" className="text-base font-semibold text-noche md:text-lg">
        Lo que sé de tu plata
      </h2>
      <p className="mt-1 hidden text-sm text-gris md:block">Esto es lo que uso para contestarte. Si algo está viejo, corrígelo y respondo con lo nuevo.</p>
      <dl className="mt-2 md:mt-5">
        <Dato etiqueta="Dinero hoy" valor={formatoSoles(perfil.saldoActual)} detalle={`${datos.cuentas.length} ${datos.cuentas.length === 1 ? "cuenta" : "cuentas"}`} />
        <Dato
          etiqueta="Tu próximo faltante"
          valor={deficit ? formatoSoles(deficit.faltante) : "Ninguno"}
          detalle={deficit ? `El ${formatoCorto(deficit.fecha)}, en los próximos 30 días` : "Tu saldo no baja de cero en 30 días"}
          tono={deficit ? "urgente" : undefined}
        />
        <Dato etiqueta="Debes" valor={formatoSoles(debo.total)} detalle={`${debo.n} ${debo.n === 1 ? "deuda abierta" : "deudas abiertas"}`} />
        <Dato etiqueta="Te deben" valor={formatoSoles(meDeben.total)} detalle={`${meDeben.n} ${meDeben.n === 1 ? "cobro pendiente" : "cobros pendientes"}`} />
        <Dato etiqueta="Documentos analizados" valor={String(datos.documentos.length)} detalle="Solo guardo lo que confirmaste, nunca el archivo" />
      </dl>
    </section>
  );
}
