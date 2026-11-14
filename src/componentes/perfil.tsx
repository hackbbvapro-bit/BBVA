"use client";
import { useState, type FormEvent } from "react";
import { formatoSoles } from "@/motor";
import { Portada, tarjeta } from "@/componentes/ui";
import { Acciones, Seleccion, Texto, mensajeDeError } from "@/componentes/formularios";
import { ListaEditable, useEnvio } from "@/componentes/lista-editable";
import { useDatos } from "@/componentes/datos";
import { leerDia, leerSoles, solesParaEditar } from "@/datos/formulario";
import { ErrorDatos } from "@/datos/validar";
import type { TipoPerfil } from "@/motor";
import { ID_PROPIO } from "@/datos/semilla";

const TIPOS: readonly (readonly [TipoPerfil, string])[] = [
  ["dependiente", "Sueldo fijo"],
  ["independiente", "Independiente (mis ingresos varían)"],
  ["mixto", "Mixto (sueldo y otros ingresos)"],
];
const NOMBRE_TIPO = Object.fromEntries(TIPOS) as Record<TipoPerfil, string>;

function leerDias(texto: string): number[] {
  if (!texto.trim()) return [];
  return texto.split(/[,\s]+/).filter(Boolean).map(t => leerDia(t, "los días de cobro"));
}

function FormularioDatos({ cerrar }: { cerrar: (guardado: boolean) => void }) {
  const { datos, cambiar } = useDatos();
  const p = datos.perfil;
  const [nombre, setNombre] = useState(p.nombre);
  const [tipo, setTipo] = useState<TipoPerfil>(p.tipo);
  const [ingreso, setIngreso] = useState(solesParaEditar(p.ingresoAprox));
  const [dias, setDias] = useState(p.diasCobro.join(", "));
  const envio = useEnvio(cerrar);
  function enviar(e: FormEvent) {
    e.preventDefault();
    void envio.correr(() =>
      cambiar(r => r.guardarPerfil({ ...p, nombre, tipo, ingresoAprox: ingreso.trim() ? leerSoles(ingreso, "el ingreso del mes") : 0, diasCobro: leerDias(dias) })),
    );
  }
  return (
    <form onSubmit={enviar} noValidate aria-label="Editar tus datos">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 md:col-span-1">
          <Texto etiqueta="Cómo te llamamos" valor={nombre} cambiar={setNombre} enfocar marcador="Andrea" />
        </div>
        <div className="col-span-2 md:col-span-1">
          <Seleccion etiqueta="Cómo ganas tu dinero" valor={tipo} cambiar={v => setTipo(v as TipoPerfil)} opciones={TIPOS} />
        </div>
        <Texto etiqueta="Ingreso del mes, más o menos (S/)" valor={ingreso} cambiar={setIngreso} modo="decimal" marcador="2700" />
        <Texto etiqueta="Día(s) de cobro" ayuda="Hasta 4, separados por coma. Vacío si cobras cuando sale." valor={dias} cambiar={setDias} marcador="5, 20" />
      </div>
      <Acciones
        error={envio.error}
        guardando={envio.guardando}
        confirmandoBorrar={false}
        puedeBorrar={false}
        nombreBorrar=""
        alCancelar={() => cerrar(false)}
        alPedirBorrar={() => undefined}
        alDesistirBorrar={() => undefined}
        alBorrar={() => undefined}
      />
    </form>
  );
}

/** Perfil de la cuenta demo. Solo se guarda lo que la app usa; no se piden ni se guardan DNI, claves ni dirección. */
export function Perfil() {
  const { datos, cambiar } = useDatos();
  const p = datos.perfil;
  const practica = p.id === ID_PROPIO;
  const [aviso, setAviso] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  async function restablecer() {
    if (trabajando) return;
    setTrabajando(true);
    setError(null);
    try {
      await cambiar(r => r.restablecer());
      setConfirmando(false);
      setAviso("Listo: volviste a los datos de la demo.");
    } catch (e) {
      setError(e instanceof ErrorDatos ? e.message : mensajeDeError(e));
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <>
      <Portada>
        <p className="text-[15px] text-gris">Perfil</p>
        <h1 className="mt-1 text-[1.75rem] font-semibold leading-tight tracking-[-0.025em] text-noche md:text-[2rem]">{p.nombre}</h1>
        <p className="mt-2 leading-relaxed text-gris">
          {practica ? "Tu caso · simulación, sin datos reales." : "Caso de ejemplo · datos inventados para la hackathon."}
        </p>
      </Portada>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className={`${tarjeta} aparecer`}>
          <h2 className="text-lg font-semibold text-noche">Datos del caso</h2>
          <p className="mt-1 text-sm text-gris">Con esto el copiloto te habla y entiende cómo te entra la plata.</p>
          <div className="mt-3">
            <ListaEditable
              items={[
                {
                  id: "datos",
                  principal: p.nombre,
                  secundario: `${NOMBRE_TIPO[p.tipo]}${p.diasCobro.length ? ` · cobras el ${p.diasCobro.join(" y ")}` : ""}`,
                  monto: p.ingresoAprox > 0 ? `~ ${formatoSoles(p.ingresoAprox, { sinDecimales: true })}` : "Sin dato",
                },
              ]}
              vacio=""
              textoAgregar="Agregar"
              prefijo="perfil"
              formulario={(_id, cerrar) => <FormularioDatos cerrar={cerrar} />}
              avisar={setAviso}
              ocultarAgregar
              nota="El ingreso es solo una referencia: el copiloto proyecta con tus movimientos."
            />
          </div>
        </section>
        <div className="space-y-6">
          <section className={`${tarjeta} aparecer`}>
            <h2 className="text-lg font-semibold text-noche">Cómo te conoce el copiloto</h2>
            <p className="mt-3 leading-relaxed text-tinta">{p.descripcion}</p>
            <p className="mt-4 text-sm leading-relaxed text-gris">
              Es un prototipo de hackathon, no un producto oficial de ningún banco. Aquí no se piden ni se guardan claves, DNI ni tarjetas.
              Lo que escribes se queda en este equipo.
            </p>
          </section>
          <section className={`${tarjeta} aparecer`}>
            <h2 className="text-lg font-semibold text-noche">Restablecer datos de la demo</h2>
            <p className="mt-2 leading-relaxed text-gris">
              Vuelve a Andrea, con sus cuentas, deudas y gastos de origen. Se borra todo lo que agregaste o cambiaste.
            </p>
            {error && (
              <p role="alert" className="mt-3 rounded-xl bg-coral-suave px-4 py-3 text-[15px] text-coral-fuerte">
                {error}
              </p>
            )}
            {confirmando ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <p className="w-full text-[15px] text-noche">¿Seguro? Perderás lo que agregaste.</p>
                <button type="button" onClick={() => void restablecer()} disabled={trabajando} className="min-h-11 rounded-xl bg-coral-fuerte px-5 text-[15px] font-semibold text-white disabled:opacity-50">
                  {trabajando ? "Restableciendo…" : "Sí, restablecer"}
                </button>
                <button type="button" onClick={() => setConfirmando(false)} className="min-h-11 rounded-xl border border-linea-fuerte bg-white px-4 text-[15px] font-semibold text-noche hover:bg-niebla">
                  No, conservar
                </button>
              </div>
            ) : (
              <button
                id="restablecer"
                type="button"
                onClick={() => setConfirmando(true)}
                className="mt-4 min-h-11 rounded-xl border border-linea-fuerte bg-white px-5 text-[15px] font-semibold text-noche transition-colors hover:bg-niebla"
              >
                Restablecer datos de la demo
              </button>
            )}
          </section>
        </div>
      </div>
      <p role="status" className="sr-only">
        {aviso}
      </p>
    </>
  );
}
