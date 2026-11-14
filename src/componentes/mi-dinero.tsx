"use client";
import { useState, type FormEvent } from "react";
import { formatoSoles, sumar, type Analisis, type Categoria } from "@/motor";
import { Cifras, Encabezado, tarjeta, unido } from "@/componentes/ui";
import { ListaEditable, useEnvio, type Fila } from "@/componentes/lista-editable";
import { Acciones, Seleccion, Texto } from "@/componentes/formularios";
import { useDatos } from "@/componentes/datos";
import { nuevoId } from "@/datos/repositorio";
import { leerDia, leerSoles, solesParaEditar } from "@/datos/formulario";
import type { Cuenta, Fijo, Sentido } from "@/datos/tipos";

const TIPOS_GASTO: readonly (readonly [Categoria, string])[] = [
  ["alquiler", "Alquiler o vivienda"],
  ["servicios", "Servicios (luz, agua, internet)"],
  ["suscripciones", "Suscripción"],
  ["educacion", "Educación"],
  ["salud", "Salud"],
  ["transporte", "Transporte"],
  ["familia", "Familia"],
  ["otros", "Otro"],
];

function FormularioCuenta({ id, cerrar }: { id: string | null; cerrar: (guardado: boolean) => void }) {
  const { datos, cambiar } = useDatos();
  const inicial = datos.cuentas.find(c => c.id === id);
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [saldo, setSaldo] = useState(inicial ? solesParaEditar(inicial.saldo) : "");
  const envio = useEnvio(cerrar);
  function enviar(e: FormEvent) {
    e.preventDefault();
    void envio.correr(async () => {
      const cuenta: Cuenta = { id: inicial?.id ?? nuevoId("cuenta"), nombre, saldo: leerSoles(saldo, "el saldo") };
      await cambiar(r => r.guardarCuenta(cuenta));
    });
  }
  return (
    <form onSubmit={enviar} noValidate aria-label={inicial ? `Editar ${inicial.nombre}` : "Agregar una cuenta"}>
      <div className="grid gap-4 md:grid-cols-2">
        <Texto etiqueta="Nombre de la cuenta" valor={nombre} cambiar={setNombre} enfocar marcador="Cuenta sueldo" />
        <Texto etiqueta="Saldo de hoy (S/)" valor={saldo} cambiar={setSaldo} modo="decimal" marcador="461.40" />
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
        alBorrar={() => inicial && void envio.correr(() => cambiar(r => r.borrarCuenta(inicial.id)))}
      />
    </form>
  );
}

function FormularioFijo({ sentido, id, cerrar }: { sentido: Sentido; id: string | null; cerrar: (guardado: boolean) => void }) {
  const { datos, cambiar } = useDatos();
  const inicial = (sentido === "ingreso" ? datos.ingresosFijos : datos.gastosFijos).find(f => f.id === id);
  const [nombre, setNombre] = useState(inicial?.descripcion ?? "");
  const [monto, setMonto] = useState(inicial ? solesParaEditar(inicial.monto) : "");
  const [dia, setDia] = useState(inicial ? String(inicial.dia) : "");
  const [categoria, setCategoria] = useState<Categoria>(inicial?.categoria ?? (sentido === "ingreso" ? "sueldo" : "otros"));
  const envio = useEnvio(cerrar);
  const opciones: readonly (readonly [string, string])[] = TIPOS_GASTO.some(([c]) => c === categoria)
    ? TIPOS_GASTO
    : [...TIPOS_GASTO, [categoria, categoria]];
  function enviar(e: FormEvent) {
    e.preventDefault();
    void envio.correr(async () => {
      const fijo: Fijo = {
        id: inicial?.id ?? nuevoId("fijo"),
        descripcion: nombre,
        monto: leerSoles(monto, "el monto"),
        dia: leerDia(dia, "el día"),
        categoria,
      };
      await cambiar(r => r.guardarFijo(sentido, fijo));
    });
  }
  const que = sentido === "ingreso" ? "ingreso fijo" : "gasto fijo";
  return (
    <form onSubmit={enviar} noValidate aria-label={inicial ? `Editar ${inicial.descripcion}` : `Agregar un ${que}`}>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Texto etiqueta="Nombre" valor={nombre} cambiar={setNombre} enfocar marcador={sentido === "ingreso" ? "Clases particulares" : "Gimnasio"} />
        </div>
        <Texto etiqueta="Monto (S/)" valor={monto} cambiar={setMonto} modo="decimal" marcador="180" />
        <Texto etiqueta="Día del mes" ayuda="Del 1 al 31" valor={dia} cambiar={setDia} modo="numeric" marcador="15" />
      </div>
      {sentido === "gasto" && (
        <div className="mt-4 md:max-w-sm">
          <Seleccion etiqueta="Tipo de gasto" valor={categoria} cambiar={v => setCategoria(v as Categoria)} opciones={opciones} />
        </div>
      )}
      <Acciones
        error={envio.error}
        guardando={envio.guardando}
        confirmandoBorrar={envio.confirmando}
        puedeBorrar={!!inicial}
        nombreBorrar={inicial?.descripcion ?? ""}
        alCancelar={() => cerrar(false)}
        alPedirBorrar={() => envio.setConfirmando(true)}
        alDesistirBorrar={() => envio.setConfirmando(false)}
        alBorrar={() => inicial && void envio.correr(() => cambiar(r => r.borrarFijo(inicial.id)))}
      />
    </form>
  );
}

const filaFijo = (f: Fijo): Fila => ({
  id: f.id,
  principal: f.descripcion,
  secundario: `Cada mes, el día ${f.dia}`,
  monto: formatoSoles(f.monto),
});

/** Lo que tienes y lo que entra y sale fijo cada mes, con altas, cambios y bajas. Todo recalcula Inicio al instante. */
export function MiDinero({ analisis }: { analisis: Analisis }) {
  const { datos, perfil } = useDatos();
  const [aviso, setAviso] = useState("");
  const variable = analisis.ingresoVariable;
  const entran = sumar(datos.ingresosFijos.map(f => f.monto));
  const salen = sumar(datos.gastosFijos.map(f => f.monto));
  const n = datos.cuentas.length;

  return (
    <>
      <Encabezado
        titulo="Mi dinero"
        bajada="Lo que tienes hoy y lo que entra y sale fijo cada mes. Cada cambio recalcula tu proyección al instante."
      />
      <div className="mb-6">
        <Cifras
          etiqueta="Tu dinero de un vistazo"
          items={[
            {
              icono: "dinero",
              etiqueta: "Hoy tienes",
              valor: formatoSoles(perfil.saldoActual),
              nota: n === 0 ? "Agrega una cuenta" : n === 1 ? "Al cierre del día" : `Sumando tus ${n} cuentas`,
            },
            { icono: "tendencia", etiqueta: "Te entra al mes", valor: formatoSoles(entran), tono: "verde", nota: `${datos.ingresosFijos.length} ${datos.ingresosFijos.length === 1 ? "ingreso" : "ingresos"}` },
            { icono: "calendario", etiqueta: "Te sale al mes", valor: formatoSoles(salen), tono: "ambar", nota: `${datos.gastosFijos.length} ${datos.gastosFijos.length === 1 ? "gasto" : "gastos"}` },
          ]}
        />
      </div>
      <section className={`${tarjeta} aparecer mb-6`}>
        <ListaEditable
          titulo="Tus cuentas"
          items={datos.cuentas.map(c => ({ id: c.id, principal: c.nombre, monto: formatoSoles(c.saldo) }))}
          vacio="Agrega una cuenta con su saldo de hoy para que el copiloto pueda calcular."
          textoAgregar="Agregar una cuenta"
          prefijo="cuenta"
          formulario={(id, cerrar) => <FormularioCuenta id={id} cerrar={cerrar} />}
          avisar={setAviso}
        />
      </section>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className={`${tarjeta} aparecer`}>
          <ListaEditable
            titulo="Lo que te entra"
            items={datos.ingresosFijos.map(filaFijo)}
            vacio={
              variable.semanasObservadas > 0
                ? "Aún no tienes ingresos fijos. Agrégalos si cobras el mismo monto el mismo día cada mes."
                : "Aún no hay ingresos fijos."
            }
            nota={
              variable.semanasObservadas > 0 && (
                <>
                  Además, tus ingresos varían: en una semana normal te entran{" "}
                  <span className="font-semibold text-noche tabular-nums">{unido(formatoSoles(variable.semanalTipico))}</span>; para no llevarte
                  sorpresas, el copiloto cuenta con{" "}
                  <span className="font-semibold text-noche tabular-nums">{unido(formatoSoles(variable.semanalPrudente))}</span>.
                </>
              )
            }
            textoAgregar="Agregar un ingreso fijo"
            prefijo="ingreso"
            formulario={(id, cerrar) => <FormularioFijo sentido="ingreso" id={id} cerrar={cerrar} />}
            avisar={setAviso}
          />
        </section>
        <section className={`${tarjeta} aparecer`}>
          <ListaEditable
            titulo="Lo que te sale fijo"
            items={datos.gastosFijos.map(filaFijo)}
            vacio="Aún no hay gastos fijos."
            textoAgregar="Agregar un gasto fijo"
            prefijo="gasto"
            formulario={(id, cerrar) => <FormularioFijo sentido="gasto" id={id} cerrar={cerrar} />}
            avisar={setAviso}
          />
        </section>
      </div>
      <p className="mt-6 px-1 text-sm leading-relaxed text-gris">
        {entran > 0 && <>Cada mes entran {unido(formatoSoles(entran))} fijos y salen </>}
        {entran === 0 && <>Cada mes salen </>}
        {unido(formatoSoles(salen))} fijos, sin contar tus pagos de deudas. Lo que cambies aquí actualiza Inicio, Deudas y los avisos al instante.
      </p>
      <p role="status" className="sr-only">
        {aviso}
      </p>
    </>
  );
}
