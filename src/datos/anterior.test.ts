import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recuperarDatosAnteriores } from "./anterior";
import { datosDeEjemplo } from "./semilla";

const anterior = vi.hoisted(() => ({ abrir: vi.fn(), cerrar: vi.fn(), leer: vi.fn() }));
vi.mock("@electric-sql/pglite", () => ({
  PGlite: class {
    constructor(ruta: string) {
      anterior.abrir(ruta);
    }
    close = anterior.cerrar;
  },
}));
vi.mock("./pglite", () => ({ crearRepositorioPGlite: async () => ({ leerTodo: anterior.leer }) }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("indexedDB", new IDBFactory());
  anterior.leer.mockResolvedValue(datosDeEjemplo());
});
afterEach(() => vi.unstubAllGlobals());

describe("recuperación de la base anterior", () => {
  it("un navegador nuevo arranca sin cargar PGlite", async () => {
    expect(await recuperarDatosAnteriores()).toEqual(datosDeEjemplo());
    expect(anterior.abrir).not.toHaveBeenCalled();
  });

  it("recupera la base de PGlite existente y cierra su conexión", async () => {
    await new Promise<void>((resolve, reject) => {
      const solicitud = indexedDB.open("/pglite/copiloto");
      solicitud.onsuccess = () => {
        solicitud.result.close();
        resolve();
      };
      solicitud.onerror = () => reject(solicitud.error);
    });
    const datos = datosDeEjemplo();
    datos.perfil.nombre = "Rosita";
    anterior.leer.mockResolvedValue(datos);
    expect(await recuperarDatosAnteriores()).toEqual(datos);
    expect(anterior.abrir).toHaveBeenCalledWith("idb://copiloto");
    expect(anterior.cerrar).toHaveBeenCalledOnce();
  });

  it("sin listado de bases comprueba la base anterior para no omitir datos", async () => {
    vi.stubGlobal("indexedDB", {});
    expect(await recuperarDatosAnteriores()).toEqual(datosDeEjemplo());
    expect(anterior.abrir).toHaveBeenCalledOnce();
  });

  it("propaga un fallo de lectura para no reemplazar datos anteriores con la demo", async () => {
    vi.stubGlobal("indexedDB", {});
    anterior.leer.mockRejectedValueOnce(new Error("No se pudo leer"));
    await expect(recuperarDatosAnteriores()).rejects.toThrow("No se pudo leer");
    expect(anterior.cerrar).toHaveBeenCalledOnce();
  });
});
