"use client";

import { useCallback, useId, useState } from "react";
import type { Cuenta } from "@/datos/tipos";
import { saldoDeCuentas } from "@/cliente/cuentas";
import { formatoSoles } from "@/motor/dinero";
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
}: {
  cifras: [string, string][];
  deficit: boolean;
  nota?: string;
  cuentas?: Cuenta[];
  alGestionar?: () => void;
  tarjetas?: Cuenta[];
  alGestionarTarjetas?: () => void;
  proximoVencimiento?: string;
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
      <dl className="cifras-mes">
        {cifras.map(([etiqueta, valor], i) => (
          <div
            key={etiqueta}
            className="cifra-tarjeta"
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
                <button type="button" className="cifra-selector" aria-label={`Elegir tarjeta de crédito. Actual: ${deuda.nombre}`} aria-expanded={tarjetasAbiertas} aria-controls={idTarjetas} title="Ver tarjetas de crédito" onClick={() => setTarjetasAbiertas(a => !a)}>
                  <span className="cifra-icono"><IconoCifra tipo="deuda" orden={1} /></span>
                </button>
              ) : (
                <span className="cifra-icono" title={i === 2 && proximoVencimiento ? `Próximo vencimiento: ${proximoVencimiento}` : undefined}>
                  <IconoCifra tipo={ICONOS[i]} orden={i} fecha={i === 2 ? proximoVencimiento : undefined} />
                </span>
              )}
              <span>{etiqueta}</span>
              {i === 2 && proximoVencimiento && <span className="sr-only">Próximo vencimiento: {proximoVencimiento}</span>}
            </dt>
            <dd className="cifra-dato">
              <span className="cifra-valor tabular-nums">
                {unido(i === 0 && cuentas !== undefined ? formatoSoles(saldo.saldo) : i === 1 && tarjetas !== undefined ? formatoSoles(deuda.saldo) : valor)}
              </span>
              {i === 0 && cuentas !== undefined && (
                <div className="cifra-pie">
                  <p className="cifra-cuenta" title={saldo.nombre} aria-live="polite">{saldo.nombre}</p>
                  {alGestionar && <button type="button" className="cifra-gestionar" aria-label="Administrar cuentas" onClick={() => { setAbierto(false); alGestionar(); }}>Administrar ↗</button>}
                </div>
              )}
              {i === 3 && nota && <p className="cifra-nota">{nota}</p>}
              {i === 1 && tarjetas !== undefined && (
                <div className="cifra-pie">
                  <p className="cifra-cuenta" title={deuda.nombre} aria-live="polite">{deuda.nombre}</p>
                  {alGestionarTarjetas && <button type="button" className="cifra-gestionar" aria-label="Administrar tarjetas de crédito" onClick={() => { setTarjetasAbiertas(false); alGestionarTarjetas(); }}>Administrar ↗</button>}
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
      </dl>
    </section>
  );
}
