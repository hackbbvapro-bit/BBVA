import { crearRepositorioMemoria, type Repositorio } from "./repositorio";
import { datosDeEjemplo } from "./semilla";
import { completarCuentasDemo } from "./cuentas-demo";
import type { Datos } from "./tipos";

const TABLA = "estado";
const CLAVE = "actual";

/** Una foto del caso en IndexedDB: no necesita descargar ni arrancar un motor SQL. */
export function abrirBaseLocal(nombre = "copiloto-datos-v1"): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(nombre, 1);
    let bloqueada = false;
    solicitud.onupgradeneeded = () => solicitud.result.createObjectStore(TABLA);
    solicitud.onerror = () => reject(solicitud.error);
    solicitud.onblocked = () => {
      bloqueada = true;
      reject(new Error("Otra pestaña está actualizando la base local"));
    };
    solicitud.onsuccess = () => {
      const db = solicitud.result;
      if (bloqueada) return db.close();
      db.onversionchange = () => db.close();
      resolve(db);
    };
  });
}

function leer(db: IDBDatabase): Promise<Datos | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TABLA, "readonly");
    const solicitud = tx.objectStore(TABLA).get(CLAVE);
    tx.oncomplete = () => resolve(solicitud.result as Datos | undefined);
    tx.onabort = () => reject(tx.error ?? new Error("No se pudieron leer los datos"));
  });
}

function guardar(db: IDBDatabase, datos: Datos): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TABLA, "readwrite");
    tx.objectStore(TABLA).put(datos, CLAVE);
    // Solo confirmamos el cambio cuando la transacción completa, no al terminar el put.
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("No se pudieron guardar los datos"));
  });
}

export async function crearRepositorioIndexedDB(
  db: IDBDatabase,
  inicial: () => Promise<Datos> = async () => datosDeEjemplo(),
): Promise<Repositorio> {
  let datos = await leer(db);
  if (!datos) {
    datos = await inicial();
    datos = completarCuentasDemo(datos);
    await guardar(db, datos);
  } else {
    const actualizado = completarCuentasDemo(datos);
    if (actualizado !== datos) {
      await guardar(db, actualizado);
      datos = actualizado;
    }
  }
  let confirmado = crearRepositorioMemoria(datos);
  let pendiente: Promise<void> = Promise.resolve();

  function escribir(accion: (repo: Repositorio) => Promise<void>): Promise<void> {
    const cambio = pendiente.then(async () => {
      // Validar y guardar sobre una copia: una escritura fallida no cambia lo visible.
      const candidato = crearRepositorioMemoria(await confirmado.leerTodo());
      await accion(candidato);
      await guardar(db, await candidato.leerTodo());
      confirmado = candidato;
    });
    // Un error no bloquea las escrituras posteriores. Cada llamada conserva su rechazo.
    pendiente = cambio.catch(() => undefined);
    return cambio;
  }

  return {
    leerTodo: async () => {
      await pendiente;
      return confirmado.leerTodo();
    },
    guardarPerfil: p => escribir(r => r.guardarPerfil(p)),
    guardarCuenta: c => escribir(r => r.guardarCuenta(c)),
    borrarCuenta: id => escribir(r => r.borrarCuenta(id)),
    guardarFijo: (sentido, f) => escribir(r => r.guardarFijo(sentido, f)),
    borrarFijo: id => escribir(r => r.borrarFijo(id)),
    guardarDeuda: d => escribir(r => r.guardarDeuda(d)),
    borrarDeuda: id => escribir(r => r.borrarDeuda(id)),
    guardarCobro: c => escribir(r => r.guardarCobro(c)),
    borrarCobro: id => escribir(r => r.borrarCobro(id)),
    guardarDocumento: d => escribir(r => r.guardarDocumento(d)),
    marcarAvisoLeido: clave => escribir(r => r.marcarAvisoLeido(clave)),
    cargar: nuevos => escribir(r => r.cargar(nuevos)),
    restablecer: () => escribir(r => r.restablecer()),
  };
}
