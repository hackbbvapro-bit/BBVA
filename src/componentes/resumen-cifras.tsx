"use client";

import { useCallback, useId, useState } from "react";
import type { Cuenta } from "@/datos/tipos";
import { saldoDeCuentas } from "@/cliente/cuentas";
import { formatoSoles } from "@/motor/dinero";
import { formatoLargo } from "@/motor/fechas";
import { IconoCifra, type TipoIconoCifra } from "./icono-cifra";
import { SelectorCuentas } from "./selector-cuentas";
import { Icono, unido } from "./ui";
import type { EstadoSaldo } from "./tablero";

const ICONOS: TipoIconoCifra[] = ["saldo", "deuda", "cuotas", "salida"];
const AREAS = ["saldo", "deuda", "fijos"] as const;
/** Líneas del desglose que se ven sin abrirlo: las de mayor monto. */
export const LINEAS_VISIBLES = 3;

/** Detalle de la tercera tarjeta (gastos fijos): qué significa y de qué se compone. */
export type DetalleCifra = { nota: string; lineas: [string, string][] };

function Lineas({ lineas, visibles }: { lineas: [string, string][]; visibles: number }) {
  if (lineas.length === 0) return null;
  return (
    <ul className="cifra-lineas">
      {lineas.slice(0, visibles).map(([descripcion, monto], i) => (
        <li key={`${descripcion}-${i}`}>
          <span title={descripcion}>{descripcion}</span>
          <span className="tabular-nums">{unido(monto)}</span>
        </li>
      ))}
    </ul>
  );
}

function TarjetaEstado({ estado, alAccion }: { estado: EstadoSaldo; alAccion?: () => void }) {
  const lineas = estado.lineas ?? [];
  const resto = lineas.length - 2;
  return (
    <div className="cifra-tarjeta cifra-estado" data-area="estado" data-tono={estado.tono} data-testid={estado.testId}>
      <dt className="cifra-etiqueta">
        <span className="cifra-icono" data-simple aria-hidden="true">
          <Icono nombre={estado.tono === "verde" ? "check" : "campana"} />
        </span>
        <span>{estado.etiqueta}</span>
      </dt>
      <dd className="cifra-dato">
        <span className="cifra-valor tabular-nums">{unido(estado.valor)}</span>
        <p className="cifra-nota">{estado.nota}</p>
        <Lineas lineas={lineas} visibles={2} />
        {resto > 0 && <p className="cifra-mas">y {resto} {resto === 1 ? "pago más" : "pagos más"}</p>}
        {estado.extra && <p className="cifra-extra">{estado.extra}</p>}
        {estado.accion && alAccion && (
          <div className="cifra-pie cifra-pie-fondo">
            <button type="button" className="cifra-gestionar" onClick={alAccion}>
              {estado.accion} <span aria-hidden="true">›</span>
            </button>
          </div>
        )}
      </dd>
    </div>
  );
}

/**
 * Resumen de Inicio: cuatro tarjetas con la misma estructura (ícono y etiqueta, cifra, qué significa, desglose).
 * Dos por dos en el celular y la tableta; una fila de cuatro desde el escritorio. Toda cifra viene del motor.
 */
export function ResumenCifras({
  cifras,
  cuentas,
  alGestionar,
  tarjetas,
  alGestionarTarjetas,
  proximoVencimiento,
  detalle,
  estado,
  alAccionEstado,
}: {
  cifras: [string, string][];
  cuentas?: Cuenta[];
  alGestionar?: () => void;
  tarjetas?: Cuenta[];
  alGestionarTarjetas?: () => void;
  proximoVencimiento?: string;
  detalle?: DetalleCifra;
  estado?: EstadoSaldo;
  alAccionEstado?: () => void;
}) {
  const [verTodo, setVerTodo] = useState(false);
  const idDesglose = useId();
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
            data-area={AREAS[i]}
            data-cifra
            data-cuentas-abiertas={(i === 0 && abierto) || (i === 1 && tarjetasAbiertas) ? "true" : undefined}
            data-tono={i === 1 ? "violeta" : "azul"}
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
              {i === 2 && detalle && (
                <>
                  <p className="cifra-nota">{detalle.nota}</p>
                  <div id={idDesglose}>
                    <Lineas lineas={detalle.lineas} visibles={verTodo ? detalle.lineas.length : LINEAS_VISIBLES} />
                  </div>
                  {detalle.lineas.length > LINEAS_VISIBLES && (
                    <div className="cifra-pie cifra-pie-fondo">
                      <button type="button" className="cifra-gestionar" aria-expanded={verTodo} aria-controls={idDesglose} onClick={() => setVerTodo(v => !v)}>
                        {verTodo ? "Ver menos" : `Ver los ${detalle.lineas.length}`}
                      </button>
                    </div>
                  )}
                </>
              )}
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
        {estado && <TarjetaEstado estado={estado} alAccion={alAccionEstado} />}
      </dl>
    </section>
  );
}
