"use client";
import { useState, type FormEvent } from "react";
import { formatoCorto, formatoSoles, formatoTasa, sumar } from "@/motor";
import { unido } from "@/componentes/ui";
import { Acciones, Fecha, Seleccion, Texto } from "@/componentes/formularios";
import { ListaEditable, useEnvio, type Fila } from "@/componentes/lista-editable";
import { useDatos } from "@/componentes/datos";
import { nuevoId } from "@/datos/repositorio";
import { leerDia, leerEnteroOCero, leerFecha, leerSoles, leerTasa, solesParaEditar, tasaParaEditar } from "@/datos/formulario";
import type { Cobro, DeudaGuardada, TipoDeudaDebo } from "@/datos/tipos";

const TIPOS: readonly (readonly [TipoDeudaDebo, string])[] = [
  ["tarjeta", "Tarjeta de crédito"],
  ["prestamo", "Préstamo"],
  ["personal", "Personal (a una persona)"],
];

const boton =
  "min-h-11 rounded-xl border border-linea-fuerte bg-white px-4 text-[15px] font-semibold text-noche transition-colors hover:bg-niebla disabled:opacity-50";

function FormularioDeuda({ id, cerrar }: { id: string | null; cerrar: (guardado: boolean) => void }) {
  const { datos, cambiar } = useDatos();
  const inicial = datos.deudas.find(d => d.id === id);
  const [entidad, setEntidad] = useState(inicial?.entidad ?? "");
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [tipo, setTipo] = useState<TipoDeudaDebo>(inicial?.tipo ?? "tarjeta");
  const [saldo, setSaldo] = useState(inicial ? solesParaEditar(inicial.saldo) : "");
  const [tcea, setTcea] = useState(inicial ? tasaParaEditar(inicial.tceaBp) : "");
  const [minimo, setMinimo] = useState(inicial ? solesParaEditar(inicial.pagoMinimo) : "");
  const [habitual, setHabitual] = useState(inicial && inicial.pagoHabitual > inicial.pagoMinimo ? solesParaEditar(inicial.pagoHabitual) : "");
  const [dia, setDia] = useState(inicial ? String(inicial.diaPago) : "");
  const [atraso, setAtraso] = useState(inicial ? String(inicial.diasAtraso) : "0");
  const envio = useEnvio(cerrar);

  function armar(pagada: boolean): DeudaGuardada {
    const pagoMinimo = leerSoles(minimo, "el pago mínimo o la cuota");
    return {
      id: inicial?.id ?? nuevoId("deuda"),
      entidad,
      nombre,
      tipo,
      saldo: leerSoles(saldo, "el saldo"),
      tceaBp: leerTasa(tcea, "la TCEA"),
      pagoMinimo,
      pagoHabitual: habitual.trim() ? leerSoles(habitual, "lo que sueles pagar") : pagoMinimo,
      diaPago: leerDia(dia, "el día de pago"),
      diasAtraso: leerEnteroOCero(atraso, "los días de atraso"),
      pagada,
    };
  }
  function enviar(e: FormEvent) {
    e.preventDefault();
    void envio.correr(() => cambiar(r => r.guardarDeuda(armar(inicial?.pagada ?? false))));
  }
  return (
    <form onSubmit={enviar} noValidate aria-label={inicial ? `Editar ${inicial.nombre}` : "Agregar una deuda"}>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 md:col-span-1">
          <Texto etiqueta="¿Con quién la tienes?" valor={entidad} cambiar={setEntidad} enfocar marcador="Banco Ejemplo, Caja Ejemplo, un familiar…" />
        </div>
        <div className="col-span-2 md:col-span-1">
          <Texto etiqueta="Cómo la llamas" valor={nombre} cambiar={setNombre} marcador="Tarjeta Azul" />
        </div>
        <div className="col-span-2 md:col-span-1">
          <Seleccion etiqueta="Tipo de deuda" valor={tipo} cambiar={v => setTipo(v as TipoDeudaDebo)} opciones={TIPOS} />
        </div>
        <Texto etiqueta="Cuánto debes (S/)" valor={saldo} cambiar={setSaldo} modo="decimal" marcador="2350" />
        <Texto etiqueta="Pago mínimo o cuota (S/)" valor={minimo} cambiar={setMinimo} modo="decimal" marcador="180" />
        <Texto etiqueta="Día de pago" ayuda="Del 1 al 31" valor={dia} cambiar={setDia} modo="numeric" marcador="12" />
        <Texto etiqueta="TCEA, si la sabes (%)" ayuda="Lo que te cuesta al año. Vacío si no la sabes." valor={tcea} cambiar={setTcea} modo="decimal" marcador="55" />
        <Texto etiqueta="Días de atraso" ayuda="0 si estás al día" valor={atraso} cambiar={setAtraso} modo="numeric" marcador="0" />
        <div className="col-span-2 md:col-span-1">
          <Texto etiqueta="Lo que sueles pagar (S/)" ayuda="Solo si pagas más que el mínimo." valor={habitual} cambiar={setHabitual} modo="decimal" marcador="250" />
        </div>
      </div>
      <Acciones
        error={envio.error}
        guardando={envio.guardando}
        confirmandoBorrar={envio.confirmando}
        puedeBorrar={!!inicial}
        nombreBorrar={inicial?.nombre ?? ""}
        alCancelar={() => cerrar(false)}
        alPedirBorrar={() => envio.setConfirmando(true)}
        alDesistirBorrar={() => envio.setConfirmando(false)}
        alBorrar={() => inicial && void envio.correr(() => cambiar(r => r.borrarDeuda(inicial.id)))}
        extra={
          inicial && (
            <button type="button" disabled={envio.guardando} className={boton} onClick={() => void envio.correr(() => cambiar(r => r.guardarDeuda(armar(!inicial.pagada))))}>
              {inicial.pagada ? "Volver a activarla" : "Marcar como pagada"}
            </button>
          )
        }
      />
    </form>
  );
}

function FormularioCobro({ id, cerrar }: { id: string | null; cerrar: (guardado: boolean) => void }) {
  const { datos, cambiar } = useDatos();
  const inicial = datos.cobros.find(c => c.id === id);
  const [quien, setQuien] = useState(inicial?.quien ?? "");
  const [monto, setMonto] = useState(inicial ? solesParaEditar(inicial.monto) : "");
  const [fecha, setFecha] = useState(inicial?.fechaPrometida ?? "");
  const [nota, setNota] = useState(inicial?.nota ?? "");
  const envio = useEnvio(cerrar);

  function armar(cobrado: boolean): Cobro {
    return {
      id: inicial?.id ?? nuevoId("cobro"),
      quien,
      monto: leerSoles(monto, "el monto"),
      fechaPrometida: leerFecha(fecha, "la fecha prometida"),
      nota,
      cobrado,
    };
  }
  function enviar(e: FormEvent) {
    e.preventDefault();
    void envio.correr(() => cambiar(r => r.guardarCobro(armar(inicial?.cobrado ?? false))));
  }
  return (
    <form onSubmit={enviar} noValidate aria-label={inicial ? `Editar lo que te debe ${inicial.quien}` : "Agregar un cobro"}>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 md:col-span-1">
          <Texto etiqueta="¿Quién te debe?" ayuda="Solo el nombre de pila." valor={quien} cambiar={setQuien} enfocar marcador="Juan" />
        </div>
        <div className="col-span-2 md:col-span-1">
          <Texto etiqueta="¿Cuánto? (S/)" valor={monto} cambiar={setMonto} modo="decimal" marcador="50" />
        </div>
        <div className="col-span-2 md:col-span-1">
          <Fecha etiqueta="¿Cuándo te lo prometió?" valor={fecha} cambiar={setFecha} />
        </div>
        <div className="col-span-2 md:col-span-1">
          <Texto etiqueta="Nota (opcional)" valor={nota} cambiar={setNota} marcador="Por la entrada del concierto" />
        </div>
      </div>
      <Acciones
        error={envio.error}
        guardando={envio.guardando}
        confirmandoBorrar={envio.confirmando}
        puedeBorrar={!!inicial}
        nombreBorrar={inicial ? `lo de ${inicial.quien}` : ""}
        alCancelar={() => cerrar(false)}
        alPedirBorrar={() => envio.setConfirmando(true)}
        alDesistirBorrar={() => envio.setConfirmando(false)}
        alBorrar={() => inicial && void envio.correr(() => cambiar(r => r.borrarCobro(inicial.id)))}
        extra={
          inicial && (
            <button type="button" disabled={envio.guardando} className={boton} onClick={() => void envio.correr(() => cambiar(r => r.guardarCobro(armar(!inicial.cobrado))))}>
              {inicial.cobrado ? "Aún no me pagó" : "Ya me pagó"}
            </button>
          )
        }
      />
    </form>
  );
}

/** Cuánto se debe y cuántas deudas siguen abiertas. */
export function totalDebo(deudas: DeudaGuardada[]) {
  const abiertas = deudas.filter(d => !d.pagada && d.saldo > 0);
  return { n: abiertas.length, total: sumar(abiertas.map(d => d.saldo)) };
}

export function ListaDebo({ primeraId, avisar, abrirNuevo }: { primeraId: string | null; avisar: (t: string) => void; abrirNuevo?: number }) {
  const { datos } = useDatos();
  const activas = datos.deudas.filter(d => !d.pagada && d.saldo > 0).sort((a, b) => (b.tceaBp ?? 0) - (a.tceaBp ?? 0) || b.saldo - a.saldo);
  const cerradas = datos.deudas.filter(d => d.pagada || d.saldo <= 0);
  const fila = (d: DeudaGuardada): Fila => {
    const cerrada = d.pagada || d.saldo <= 0;
    const partes = [
      d.entidad,
      d.tceaBp === null ? "sin TCEA" : `TCEA ${formatoTasa(d.tceaBp)}`,
      `mínimo ${formatoSoles(d.pagoMinimo)}`,
      `vence el día ${d.diaPago}`,
    ];
    return {
      id: d.id,
      principal: d.nombre,
      secundario: unido(partes.join(" · ")),
      monto: formatoSoles(d.saldo),
      apagada: cerrada,
      etiqueta: cerrada
        ? { texto: "Pagada", tono: "neutro" }
        : d.diasAtraso > 0
          ? { texto: `Atraso de ${d.diasAtraso} ${d.diasAtraso === 1 ? "día" : "días"}`, tono: d.diasAtraso > 8 ? "urgente" : "atencion" }
          : d.id === primeraId
            ? { texto: "La más cara", tono: "azul" }
            : undefined,
    };
  };
  return (
    <ListaEditable
      items={[...activas, ...cerradas].map(fila)}
      vacio="Aún no registraste deudas. Agrega una con lo que debes y el copiloto la suma a tu plan."
      textoAgregar="Agregar una deuda"
      prefijo="deuda"
      formulario={(id, cerrar) => <FormularioDeuda id={id} cerrar={cerrar} />}
      avisar={avisar}
      abrirNuevo={abrirNuevo}
    />
  );
}

export function totalMeDeben(cobros: Cobro[]) {
  const abiertos = cobros.filter(c => !c.cobrado);
  return { n: abiertos.length, total: sumar(abiertos.map(c => c.monto)) };
}

export function ListaMeDeben({ avisar }: { avisar: (t: string) => void }) {
  const { datos } = useDatos();
  const hoy = datos.perfil.hoy;
  const abiertos = datos.cobros.filter(c => !c.cobrado).sort((a, b) => a.fechaPrometida.localeCompare(b.fechaPrometida));
  const cobrados = datos.cobros.filter(c => c.cobrado);
  const fila = (c: Cobro): Fila => ({
    id: c.id,
    principal: c.quien,
    secundario: [c.cobrado ? "Ya te pagó" : `Prometió el ${formatoCorto(c.fechaPrometida)}`, c.nota].filter(Boolean).join(" · "),
    monto: formatoSoles(c.monto),
    apagada: c.cobrado,
    etiqueta: c.cobrado
      ? { texto: "Cobrado", tono: "bien" }
      : c.fechaPrometida < hoy
        ? { texto: "Vencido", tono: "urgente" }
        : undefined,
  });
  return (
    <ListaEditable
      items={[...abiertos, ...cobrados].map(fila)}
      vacio="Nadie te debe nada por ahora. Si alguien te prometió dinero, anótalo y el copiloto te avisa cuando venza."
      textoAgregar="Agregar un cobro"
      prefijo="cobro"
      nota="Estos cobros no entran a tu proyección base: no son dinero seguro hasta que los recibes."
      formulario={(id, cerrar) => <FormularioCobro id={id} cerrar={cerrar} />}
      avisar={avisar}
    />
  );
}
