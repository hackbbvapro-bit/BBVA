"use client";
import { formatoSoles, type Centimos } from "@/motor";
import { tarjeta, unido } from "@/componentes/ui";
import type { DetalleDelMes, LineaDelMes } from "@/ruta/mes";

/** Ancho relativo de una barra, en %, solo para dibujar (no es una cifra de dinero). */
const ancho = (parte: Centimos, total: Centimos) => (total > 0 ? Math.max(2, Math.round((parte / total) * 100)) : 0);

function Lineas({ lineas, total, color }: { lineas: LineaDelMes[]; total: Centimos; color: string }) {
  return (
    <ul className="divide-y divide-linea">
      {lineas.map(l => (
        <li key={l.nombre} className="py-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 text-[15px] font-medium text-noche">{l.nombre}</span>
            <span className="shrink-0 text-[15px] font-semibold text-noche tabular-nums">{unido(formatoSoles(l.monto))}</span>
          </div>
          <p className="mt-0.5 text-xs leading-snug text-gris">{l.detalle}</p>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-niebla" aria-hidden="true">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${ancho(l.monto, total)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Grupo({ titulo, total, children }: { titulo: string; total?: Centimos; children: React.ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="flex items-baseline justify-between border-b border-linea-fuerte pb-1.5">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gris">{titulo}</h4>
        {total !== undefined && <span className="text-xs font-semibold text-gris tabular-nums">{unido(formatoSoles(total))}</span>}
      </div>
      {children}
    </div>
  );
}

function Columna({ titulo, bajada, total, tono, children }: {
  titulo: string; bajada: string; total: Centimos; tono: "verde" | "ambar" | "coral"; children: React.ReactNode;
}) {
  const borde = { verde: "border-t-verde", ambar: "border-t-ambar", coral: "border-t-coral" }[tono];
  return (
    <section className={`${tarjeta} aparecer flex flex-col border-t-4 ${borde}`}>
      <header className="mb-3">
        <h3 className="text-base font-semibold text-noche">{titulo}</h3>
        <p className="mt-0.5 text-sm leading-snug text-gris">{bajada}</p>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="mt-4 flex items-baseline justify-between border-t border-linea-fuerte pt-3">
        <span className="text-sm font-semibold text-noche">Total al mes</span>
        <span className="text-xl font-semibold tracking-[-0.015em] text-noche tabular-nums">{unido(formatoSoles(total))}</span>
      </footer>
    </section>
  );
}

/** Tu mes en dos barras: lo que entra contra lo que sale (gastos + cuotas). El hueco o el sobrante se ve a simple vista. */
export function BalanceDelMes({ detalle }: { detalle: DetalleDelMes }) {
  const { entra, sale, cuotas, libre } = detalle;
  const sumaSale = sale.total + cuotas.total;
  const tope = Math.max(entra.total, sumaSale);
  const falta = libre < 0;
  const tramos = [
    { nombre: "Gastos fijos", monto: sale.subtotalFijos, color: "bg-ambar" },
    { nombre: "Día a día", monto: sale.subtotalDiaADia, color: "bg-ambar/60" },
    { nombre: "Cuotas de deudas", monto: cuotas.total, color: "bg-coral" },
  ].filter(t => t.monto > 0);
  return (
    <section className={`${tarjeta} aparecer`} aria-label="Tu mes en una línea">
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-noche">Tu mes en una línea</h2>
          <p className="text-sm text-gris">Lo que entra contra todo lo que sale, cuotas de deudas incluidas.</p>
        </div>
        <p className={`text-sm font-semibold ${falta ? "text-coral-fuerte" : "text-verde-fuerte"}`}>
          {falta ? "Cada mes te faltan " : "Cada mes te quedan "}
          <span className="text-2xl tabular-nums">{unido(formatoSoles(Math.abs(libre)))}</span>
        </p>
      </div>
      <div className="mt-4 space-y-3">
        <div>
          <div className="mb-1 flex justify-between text-sm"><span className="font-medium text-noche">Entra</span><span className="font-semibold tabular-nums text-noche">{unido(formatoSoles(entra.total))}</span></div>
          <div className="h-5 overflow-hidden rounded-lg bg-niebla" aria-hidden="true">
            <div className="h-full rounded-lg bg-verde" style={{ width: `${ancho(entra.total, tope)}%` }} />
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-sm"><span className="font-medium text-noche">Sale</span><span className="font-semibold tabular-nums text-noche">{unido(formatoSoles(sumaSale))}</span></div>
          <div className="flex h-5 overflow-hidden rounded-lg bg-niebla" aria-hidden="true">
            {tramos.map(t => <div key={t.nombre} className={`h-full ${t.color}`} style={{ width: `${tope > 0 ? (t.monto / tope) * 100 : 0}%` }} />)}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gris">
            {tramos.map(t => (
              <li key={t.nombre} className="flex items-center gap-1.5">
                <span className={`size-2.5 rounded-sm ${t.color}`} aria-hidden="true" />
                {t.nombre} <span className="font-semibold text-noche tabular-nums">{unido(formatoSoles(t.monto))}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** De dónde viene cada sol que entra y a dónde va cada sol que sale, en tres columnas que ocupan todo el ancho. */
export function DetalleMes({ detalle, semanaTipica, semanaPrudente }: {
  detalle: DetalleDelMes; semanaTipica: Centimos; semanaPrudente: Centimos;
}) {
  const { entra, sale, cuotas } = detalle;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-3 lg:gap-6">
      <Columna titulo="Lo que te entra" bajada="De dónde viene tu dinero cada mes." total={entra.total} tono="verde">
        {entra.fijos.length > 0 && (
          <Grupo titulo="Fijo"><Lineas lineas={entra.fijos} total={entra.total} color="bg-verde" /></Grupo>
        )}
        {entra.variables.length > 0 && (
          <Grupo titulo="Variable">
            <Lineas lineas={entra.variables} total={entra.total} color="bg-verde" />
            <p className="mt-2 rounded-xl bg-verde-suave px-3 py-2 text-xs leading-relaxed text-verde-fuerte">
              En una semana normal te entran {unido(formatoSoles(semanaTipica))}. Para no ilusionarte, el copiloto cuenta con{" "}
              {unido(formatoSoles(semanaPrudente))} por semana: la cifra que alcanzaste o superaste en 3 de cada 4 semanas.
            </p>
          </Grupo>
        )}
        {entra.total === 0 && <p className="text-sm text-gris">Aún no hay ingresos. Agrégalos abajo.</p>}
      </Columna>

      <Columna titulo="Lo que te sale" bajada="Tus gastos del mes, sin contar deudas." total={sale.total} tono="ambar">
        {sale.fijos.length > 0 && (
          <Grupo titulo="Gastos fijos" total={sale.subtotalFijos}><Lineas lineas={sale.fijos} total={sale.total} color="bg-ambar" /></Grupo>
        )}
        {sale.diaADia.length > 0 && (
          <Grupo titulo="Día a día (promedio)" total={sale.subtotalDiaADia}><Lineas lineas={sale.diaADia} total={sale.total} color="bg-ambar/60" /></Grupo>
        )}
        {sale.total === 0 && <p className="text-sm text-gris">Aún no hay gastos registrados.</p>}
      </Columna>

      <Columna titulo="Cuotas de tus deudas" bajada="Lo que pagas cada mes a quien le debes." total={cuotas.total} tono="coral">
        {cuotas.lineas.length > 0
          ? <Lineas lineas={cuotas.lineas} total={cuotas.total} color="bg-coral" />
          : <p className="text-sm text-gris">No tienes deudas registradas.</p>}
      </Columna>
    </div>
  );
}
