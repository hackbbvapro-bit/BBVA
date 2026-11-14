import { hayGastoLlamadoComoPagoDe, nombreFijoRepetido } from "./nombres";
import { datosDeRosa } from "./semilla";
import type { Cobro, Cuenta, Datos, DatosPerfil, DeudaGuardada, DocumentoAnalizado, Fijo, Sentido } from "./tipos";
import {
  ErrorDatos, validarCobro, validarCuenta, validarDeuda, validarDocumento, validarFijo, validarPerfil,
} from "./validar";

/** Todo lo que la app lee y escribe. Hay una implementación en PGlite (navegador) y otra en memoria (tests y respaldo). */
export interface Repositorio {
  /** Foto completa y ordenada de lo guardado. */
  leerTodo(): Promise<Datos>;
  guardarPerfil(perfil: DatosPerfil): Promise<void>;
  guardarCuenta(cuenta: Cuenta): Promise<void>;
  borrarCuenta(id: string): Promise<void>;
  guardarFijo(sentido: Sentido, fijo: Fijo): Promise<void>;
  borrarFijo(id: string): Promise<void>;
  guardarDeuda(deuda: DeudaGuardada): Promise<void>;
  borrarDeuda(id: string): Promise<void>;
  guardarCobro(cobro: Cobro): Promise<void>;
  borrarCobro(id: string): Promise<void>;
  guardarDocumento(documento: DocumentoAnalizado): Promise<void>;
  marcarAvisoLeido(clave: string): Promise<void>;
  /** Reemplaza todo lo guardado por estos datos (empezar con datos propios o con la demo). */
  cargar(datos: Datos): Promise<void>;
  /** Vuelve a los datos de la demo (Rosa). */
  restablecer(): Promise<void>;
}

/** Valida cada escritura con las mismas reglas, sea cual sea la implementación de abajo. */
export function validado(base: Repositorio): Repositorio {
  return {
    ...base,
    guardarPerfil: async p => base.guardarPerfil(validarPerfil(p)),
    guardarCuenta: async c => base.guardarCuenta(validarCuenta(c)),
    guardarFijo: async (s, f) => {
      const fijo = validarFijo(f);
      if (nombreFijoRepetido(await base.leerTodo(), s, fijo.descripcion, fijo.id)) {
        throw new ErrorDatos(
          `Ya tienes ${s === "ingreso" ? "un ingreso" : "un gasto"} llamado así. Edítalo o ponle otro nombre: si no, el copiloto los contaría como uno solo.`,
        );
      }
      return base.guardarFijo(s, fijo);
    },
    guardarDeuda: async d => {
      const deuda = validarDeuda(d);
      const datos = await base.leerTodo();
      if (!deuda.pagada && deuda.saldo > 0 && hayGastoLlamadoComoPagoDe(datos, deuda.nombre)) {
        throw new ErrorDatos(
          "Ya tienes un gasto fijo que se llama como el pago de esta deuda. Cámbiale el nombre al gasto o a la deuda: si no, el copiloto los contaría como uno solo.",
        );
      }
      return base.guardarDeuda(deuda);
    },
    guardarCobro: async c => base.guardarCobro(validarCobro(c)),
    guardarDocumento: async d => base.guardarDocumento(validarDocumento(d)),
    cargar: async d =>
      base.cargar({
        ...d,
        perfil: validarPerfil(d.perfil),
        cuentas: d.cuentas.map(validarCuenta),
        ingresosFijos: d.ingresosFijos.map(validarFijo),
        gastosFijos: d.gastosFijos.map(validarFijo),
        deudas: d.deudas.map(validarDeuda),
        cobros: d.cobros.map(validarCobro),
      }),
  };
}

/** Un id corto y único para filas nuevas. */
export function nuevoId(prefijo: string): string {
  return `${prefijo}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
}

function reemplazar<T extends { id: string }>(lista: T[], item: T): T[] {
  return lista.some(x => x.id === item.id) ? lista.map(x => (x.id === item.id ? item : x)) : [...lista, item];
}

/** Implementación en memoria: no persiste. Sirve para tests y como respaldo visible si el navegador no deja guardar. */
export function crearRepositorioMemoria(inicial: Datos = datosDeRosa()): Repositorio {
  let datos: Datos = structuredClone(inicial);
  const sin = <T extends { id: string }>(lista: T[], id: string) => lista.filter(x => x.id !== id);
  const base: Repositorio = {
    leerTodo: async () => structuredClone(datos),
    guardarPerfil: async perfil => { datos = { ...datos, perfil: structuredClone(perfil) }; },
    guardarCuenta: async c => { datos = { ...datos, cuentas: reemplazar(datos.cuentas, structuredClone(c)) }; },
    borrarCuenta: async id => { datos = { ...datos, cuentas: sin(datos.cuentas, id) }; },
    guardarFijo: async (sentido, f) => {
      // Un id vive en una sola lista: si cambia de sentido, sale de la otra.
      const ingresos = sin(datos.ingresosFijos, f.id), gastos = sin(datos.gastosFijos, f.id);
      datos = sentido === "ingreso"
        ? { ...datos, ingresosFijos: reemplazar(datos.ingresosFijos, structuredClone(f)), gastosFijos: gastos }
        : { ...datos, gastosFijos: reemplazar(datos.gastosFijos, structuredClone(f)), ingresosFijos: ingresos };
    },
    borrarFijo: async id => { datos = { ...datos, ingresosFijos: sin(datos.ingresosFijos, id), gastosFijos: sin(datos.gastosFijos, id) }; },
    guardarDeuda: async d => { datos = { ...datos, deudas: reemplazar(datos.deudas, structuredClone(d)) }; },
    borrarDeuda: async id => { datos = { ...datos, deudas: sin(datos.deudas, id) }; },
    guardarCobro: async c => { datos = { ...datos, cobros: reemplazar(datos.cobros, structuredClone(c)) }; },
    borrarCobro: async id => { datos = { ...datos, cobros: sin(datos.cobros, id) }; },
    guardarDocumento: async d => { datos = { ...datos, documentos: reemplazar(datos.documentos, structuredClone(d)) }; },
    marcarAvisoLeido: async clave => { if (!datos.avisosLeidos.includes(clave)) datos = { ...datos, avisosLeidos: [...datos.avisosLeidos, clave] }; },
    cargar: async nuevos => { datos = structuredClone(nuevos); },
    restablecer: async () => { datos = datosDeRosa(); },
  };
  return validado(base);
}
