"use client";

import { useCallback, useId, useState, type ReactNode } from "react";
import type { Cuenta } from "@/datos/tipos";
import { saldoDeCuentas } from "@/cliente/cuentas";
import { formatoSoles } from "@/motor/dinero";
import { formatoLargo } from "@/motor/fechas";
import { IconoCifra, type TipoIconoCifra } from "./icono-cifra";
import { SelectorCuentas } from "./selector-cuentas";
import { unido } from "./ui";

const ICONOS: TipoIconoCifra[] = ["saldo", "deuda", "cuotas", "salida"];

/** Resumen móvil de dos por dos; las cuatro cifras conservan los valores calculados por el motor. */
export function ResumenCifras({
  cifras,
  deficit,
  nota,
  cuentas,
  alGestionar,
  tarjetas,
  alGestionarTarjetas,
  proximoVencimiento,
  alerta,
  ambar = false,
}: {
  cifras: [string, string][];
  deficit: boolean;
  nota?: string;
  cuentas?: Cuenta[];
  alGestionar?: () => void;
  tarjetas?: Cuenta[];
  alGestionarTarjetas?: () => void;
  proximoVencimiento?: string;
  alerta?: ReactNode;
  /** Tarjeta de estado en ámbar (sin déficit a 30 días, pero el mes cierra en negativo). */
  ambar?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const idSelector = useId();
  const saldo = saldoDeCuentas(cuentas ?? [], seleccion);
  const cerrar = useCallback(() => setAbierto(false), []);
  const [tarjetasAbiertas, setTarjetasAbiertas] = useState(false);
  const [tarjetaElegida, setTarjetaElegida] = useState<string | null>(null);
  const idTarjetas = useId();
  const deuda = saldoDeCuentas(tarjetas ?? [], tarjetaElegida);
  const cerrarTarjetas = useCallback(() => setTarjetasAbiertas(false), []);
  return (
    <section aria-label="Cifras del mes">
      <dl className="cifras-mes" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        {cifras.map(([etiqueta, valor], i) => (
          <div
            key={etiqueta}
            className="cifra-tarjeta"
            style={i === 2 ? { gridColumn: 2, gridRow: 2, width: "100%", justifySelf: "stretch" } : undefined}
            data-cifra
            data-cuota={i === 2 ? "true" : undefined}
            data-cuentas-abiertas={(i === 0 && abierto) || (i === 1 && tarjetasAbiertas) ? "true" : undefined}
            data-tono={i === 3 ? (deficit ? "ambar" : "verde") : i === 1 ? "violeta" : "azul"}
          >
            <dt className="cifra-etiqueta">
              {i === 0 && cuentas !== undefined ? (
                <button
                  type="button"
                  className="cifra-selector"
                  aria-label={`Elegir cuenta. Actual: ${saldo.nombre}`}
                  aria-expanded={abierto}
                  aria-controls={idSelector}
                  title="Ver mis cuentas"
                  onClick={() => setAbierto(a => !a)}
                >
                  <span className="cifra-icono">
                    <IconoCifra tipo="cartera" orden={0} selector cantidad={cuentas.length} />
                  </span>
                </button>
              ) : i === 1 && tarjetas !== undefined ? (
                <button type="button" className="cifra-selector" aria-label={`Elegir deuda. Actual: ${deuda.nombre}`} aria-expanded={tarjetasAbiertas} aria-controls={idTarjetas} title="Ver mis deudas" onClick={() => setTarjetasAbiertas(a => !a)}>
                  <span className="cifra-icono"><IconoCifra tipo="deuda" orden={1} /></span>
                </button>
              ) : (
                <span className="cifra-icono" title={i === 2 && proximoVencimiento ? `Próximo vencimiento: ${formatoLargo(proximoVencimiento)}` : undefined}>
                  <IconoCifra tipo={ICONOS[i]} orden={i} fecha={i === 2 ? proximoVencimiento : undefined} />
                </span>
              )}
              <span>{etiqueta}</span>
              {i === 2 && proximoVencimiento && <span className="sr-only">Próximo vencimiento: {formatoLargo(proximoVencimiento)}</span>}
            </dt>
            <dd className="cifra-dato">
              <span className="cifra-valor tabular-nums">
                {unido(i === 0 && cuentas !== undefined ? formatoSoles(saldo.saldo) : i === 1 && tarjetas !== undefined ? formatoSoles(deuda.saldo) : valor)}
              </span>
              {i === 0 && cuentas !== undefined && (
                <div className="cifra-pie">
                  {cuentas.length > 1 ? <p className="cifra-cuenta" title={saldo.nombre} aria-live="polite">{saldo.nombre}</p> : <span className="min-w-0 flex-1" />}
                  {alGestionar && <button type="button" className="cifra-gestionar" aria-label="Administrar cuentas" onClick={() => { setAbierto(false); alGestionar(); }}>Administrar ↗</button>}
                </div>
              )}
              {i === 3 && nota && <p className="cifra-nota">{nota}</p>}
              {i === 1 && tarjetas !== undefined && (
                <div className="cifra-pie">
                  {tarjetas.length > 1 ? <p className="cifra-cuenta" title={deuda.nombre} aria-live="polite">{deuda.nombre}</p> : <span className="min-w-0 flex-1" />}
                  {alGestionarTarjetas && <button type="button" className="cifra-gestionar" aria-label="Administrar deudas" onClick={() => { setTarjetasAbiertas(false); alGestionarTarjetas(); }}>Administrar ↗</button>}
                </div>
              )}
              {i === 1 && tarjetas !== undefined && <SelectorCuentas id={idTarjetas} abierto={tarjetasAbiertas} cuentas={tarjetas} seleccion={deuda.seleccion} tarjetasCredito elegir={id => { setTarjetaElegida(id); setTarjetasAbiertas(false); }} cerrar={cerrarTarjetas} />}
              {i === 0 && cuentas !== undefined && (
                <SelectorCuentas
                  id={idSelector}
                  abierto={abierto}
                  cuentas={cuentas}
                  seleccion={saldo.seleccion}
                  elegir={id => {
                    setSeleccion(id);
                    setAbierto(false);
                  }}
                  cerrar={cerrar}
                />
              )}
            </dd>
          </div>
        ))}
        {alerta && <div style={{ gridColumn: 1, gridRow: 2, minWidth: 0, padding: 10, border: `1px solid ${deficit ? "#f4dfe2" : ambar ? "#f0dca8" : "#ccebd8"}`, borderRadius: 17, background: deficit ? "#fceff0" : ambar ? "#fff6e0" : "#edf8f1" }}><dt className="sr-only">Estado del saldo</dt><dd style={{ display: "flex", flexDirection: "column", height: "100%" }}>{alerta}</dd></div>}
      </dl>
    </section>
  );
}
