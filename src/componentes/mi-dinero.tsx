"use client";
import { useState, type FormEvent } from "react";
import { formatoSoles, type Analisis, type Categoria } from "@/motor";
import { Cifras, Encabezado, tarjeta } from "@/componentes/ui";
import { BalanceDelMes, DetalleMes } from "@/componentes/detalle-mes";
import { ListaEditable, useEnvio, type Fila } from "@/componentes/lista-editable";
import { Acciones, Seleccion, Texto } from "@/componentes/formularios";
import { useDatos } from "@/componentes/datos";
import { resumenDelMes } from "@/ruta/ruta";
import { detalleDelMes } from "@/ruta/mes";
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
        <Texto etiqueta="Dónde está (banco, billetera, efectivo)" valor={nombre} cambiar={setNombre} enfocar marcador="Cuenta de ahorros" />
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

const sinParentesis = (nombre: string) => nombre.replace(/\s*\(.*\)\s*/g, "").trim();

/**
 * Tu dinero, sin cajas negras: dónde está hoy, de dónde viene lo que entra y a dónde va cada sol que sale.
 * Los totales son los mismos de Inicio y Mi ruta; abajo se editan lo fijo y las cuentas, y todo recalcula al instante.
 */
export function MiDinero({ analisis }: { analisis: Analisis }) {
  const { datos, perfil } = useDatos();
  const [aviso, setAviso] = useState("");
  const variable = analisis.ingresoVariable;
  const mes = resumenDelMes(perfil, analisis);
  const detalle = detalleDelMes(perfil, analisis);
  const n = datos.cuentas.length;
  const total = perfil.saldoActual;
  const fuente = [...detalle.entra.fijos, ...detalle.entra.variables][0];
  const lugares = datos.cuentas.map(c => sinParentesis(c.nombre)).join(", ");

  return (
    <>
      <Encabezado
        titulo="Mi dinero"
        bajada="Dónde está tu dinero hoy, de dónde viene lo que te entra y a dónde se va cada sol. Cada cambio recalcula tu proyección al instante."
      />
      <div className="mb-6">
        <Cifras
          etiqueta="Tu dinero de un vistazo"
          items={[
            {
              icono: "dinero",
              etiqueta: "Dinero hoy",
              valor: formatoSoles(total),
              nota: n === 0 ? "Agrega dónde tienes tu dinero" : n === 1 ? `En ${lugares}` : `En ${n} lugares: ${lugares}`,
            },
            {
              icono: "tendencia", etiqueta: "Te entra al mes", valor: formatoSoles(mes.entra), tono: "verde",
              nota: fuente ? `${fuente.nombre}${detalle.entra.variables.length > 0 && detalle.entra.fijos.length === 0 ? " (varía cada semana)" : ""}` : mes.notaEntra,
            },
            { icono: "calendario", etiqueta: "Te sale al mes", valor: formatoSoles(mes.sale), tono: "ambar", nota: mes.notaSale },
            {
              icono: "rumbo",
              etiqueta: detalle.libre < 0 ? "Te falta al mes" : "Te queda al mes",
              valor: formatoSoles(Math.abs(detalle.libre)),
              tono: detalle.libre < 0 ? "coral" : "verde",
              nota: `Después de pagar ${formatoSoles(detalle.cuotas.total)} de cuotas de deudas`,
            },
          ]}
        />
      </div>

      <div className="mb-6 grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-6">
        <BalanceDelMes detalle={detalle} />
        <section className={`${tarjeta} aparecer`} aria-label="Dónde está tu dinero hoy">
          <ListaEditable
            titulo="Dónde está tu dinero hoy"
            items={datos.cuentas.map(c => ({
              id: c.id,
              principal: c.nombre,
              secundario: total > 0 ? `${Math.round((c.saldo / total) * 100)} % de tu dinero` : undefined,
              monto: formatoSoles(c.saldo),
            }))}
            vacio="Agrega dónde tienes tu dinero (banco, billetera digital, efectivo) para que el copiloto pueda calcular."
            textoAgregar="Agregar un lugar"
            prefijo="cuenta"
            formulario={(id, cerrar) => <FormularioCuenta id={id} cerrar={cerrar} />}
            avisar={setAviso}
          />
        </section>
      </div>

      <h2 className="aparecer mb-3 text-lg font-semibold text-noche md:text-xl">Tu mes, línea por línea</h2>
      <div className="mb-8">
        <DetalleMes detalle={detalle} semanaTipica={variable.semanalTipico} semanaPrudente={variable.semanalPrudente} />
      </div>

      <h2 className="aparecer mb-1 text-lg font-semibold text-noche md:text-xl">Edita lo que se repite cada mes</h2>
      <p className="mb-3 text-sm text-gris">Lo variable (día a día y cobros que cambian) lo calcula el copiloto con tus movimientos; aquí van solo los montos fijos.</p>
      <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-6">
        <section className={`${tarjeta} aparecer`}>
          <ListaEditable
            titulo="Ingresos fijos"
            items={datos.ingresosFijos.map(filaFijo)}
            vacio={
              variable.semanasObservadas > 0
                ? "No tienes ingresos fijos: todo lo que te entra varía. Agrega aquí un sueldo o pago que llegue igual cada mes."
                : "Aún no hay ingresos fijos."
            }
            textoAgregar="Agregar un ingreso fijo"
            prefijo="ingreso"
            formulario={(id, cerrar) => <FormularioFijo sentido="ingreso" id={id} cerrar={cerrar} />}
            avisar={setAviso}
          />
        </section>
        <section className={`${tarjeta} aparecer`}>
          <ListaEditable
            titulo="Gastos fijos"
            items={datos.gastosFijos.map(filaFijo)}
            vacio="Aún no hay gastos fijos."
            textoAgregar="Agregar un gasto fijo"
            prefijo="gasto"
            formulario={(id, cerrar) => <FormularioFijo sentido="gasto" id={id} cerrar={cerrar} />}
            avisar={setAviso}
          />
        </section>
      </div>
      <p role="status" className="sr-only">
        {aviso}
      </p>
    </>
  );
}
