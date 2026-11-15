import { describe, expect, it } from "vitest";
import { aPerfil as perfilDeDatos } from "@/datos/aPerfil";
import { crearRepositorioMemoria } from "@/datos/repositorio";
import { avisos, CAUSA_DIA_A_DIA } from "@/explica/explica";
import { analizar } from "@/motor";
import { datosDeEjemplo } from "@/datos/semilla";
import { generarPerfil } from "@/datos/perfiles";
import { aDatos, casoDeEjemplo, CASOS_FIJOS, clientesDelDataset, elegirCasos } from "./casos-agente";
import { aPerfil } from "./poblacion";

describe("casos del asistente", () => {
  it("la pantalla «Datos de prueba» muestra exactamente los clientes con los que se evaluó al asistente", () => {
    const porReglas = elegirCasos();
    const fijos = clientesDelDataset();
    expect(fijos.map(f => f.cliente.id)).toEqual(porReglas.map(c => c.cliente.id));
    expect(fijos.map(f => f.cliente)).toEqual(porReglas.map(c => c.cliente));
    expect(porReglas.map(c => c.perfil.nombre)).toEqual(CASOS_FIJOS.map(c => c.nombre));
  }, 30_000);

  it("cada cliente trae 90 días de historia y 30 de futuro", () => {
    for (const { cliente } of clientesDelDataset()) {
      const dias = (lista: { fecha: string }[]) => new Set(lista.map(m => m.fecha)).size;
      expect(dias(cliente.historia)).toBeLessThanOrEqual(90);
      expect(dias(cliente.historia)).toBeGreaterThan(60);
      expect(dias(cliente.futuro)).toBeLessThanOrEqual(30);
      expect(cliente.historia.every(m => m.fecha <= cliente.corte)).toBe(true);
      expect(cliente.futuro.every(m => m.fecha > cliente.corte)).toBe(true);
    }
  });

  it("al cargarlo en la app, el copiloto ve lo mismo que vio en la evaluación, salvo una cuota que la historia no deja ver", async () => {
    let sinDetectar = 0;
    for (const caso of clientesDelDataset()) {
      const repo = crearRepositorioMemoria();
      await repo.cargar(aDatos(caso));
      const enLaApp = analizar(perfilDeDatos(await repo.leerTodo()));
      const enLaEvaluacion = analizar(aPerfil(caso.cliente));
      expect(enLaApp.proyeccion.saldoInicial, caso.nombre).toBe(enLaEvaluacion.proyeccion.saldoInicial);
      // La app arma el pago de cada deuda desde la deuda declarada. La evaluación solo lo proyecta si lo reconoce
      // en la historia, y con datos incompletos (falta un pago) no lo reconoce.
      const cuotasVistas = enLaEvaluacion.recurrentes.filter(r => r.deudaId).length;
      if (cuotasVistas === caso.cliente.deudas.length) {
        expect(enLaApp.proyeccion.deficit?.fecha ?? null, caso.nombre).toBe(enLaEvaluacion.proyeccion.deficit?.fecha ?? null);
        expect(enLaApp.proyeccion.deficit?.faltante ?? 0, caso.nombre).toBe(enLaEvaluacion.proyeccion.deficit?.faltante ?? 0);
        expect(enLaApp.proyeccion.saldoMinimo, caso.nombre).toBe(enLaEvaluacion.proyeccion.saldoMinimo);
      } else {
        sinDetectar++;
        expect(caso.cliente.escenarios, caso.nombre).toContain("datos_incompletos");
        // Al contar la cuota, la app es más prudente: nunca proyecta un saldo mínimo mejor que la evaluación.
        expect(enLaApp.proyeccion.saldoMinimo, caso.nombre).toBeLessThanOrEqual(enLaEvaluacion.proyeccion.saldoMinimo);
      }
    }
    expect(sinDetectar).toBe(1);
  });

  it("ningún aviso de estos clientes queda con la causa en blanco", () => {
    for (const caso of clientesDelDataset()) {
      const perfil = perfilDeDatos(aDatos(caso));
      for (const aviso of avisos(perfil, analizar(perfil))) {
        expect(aviso.cuerpo, caso.nombre).not.toMatch(/ sale  y |se juntan  y |undefined|NaN/);
      }
    }
    const ana = perfilDeDatos(aDatos(clientesDelDataset()[0]));
    expect(avisos(ana, analizar(ana))[0].cuerpo).toContain(CAUSA_DIA_A_DIA);
  });

  it("el caso de ejemplo se ve con su historia completa y se carga en la app con sus cifras de siempre", () => {
    const ejemplo = casoDeEjemplo();
    const perfil = generarPerfil("independiente");
    expect(ejemplo.demo).toBe(true);
    expect(ejemplo.nombre).toBe(perfil.nombre);
    expect(ejemplo.cliente.id).toBe(perfil.id);
    expect(ejemplo.cliente.historia).toHaveLength(perfil.movimientos.length);
    expect(ejemplo.cliente.historia.map(m => m.monto)).toEqual(perfil.movimientos.map(m => m.monto));
    expect(ejemplo.cliente.futuro).toEqual([]);
    expect(ejemplo.cliente.saldoCorte).toBe(perfil.saldoActual);
    // Lo marcado como fijo son sus pagos de cada mes: el alquiler y el pago de cada una de sus deudas, entre otros.
    const fijos = new Set(ejemplo.cliente.historia.filter(m => m.recurrente).map(m => m.descripcion));
    expect(fijos.has("Alquiler")).toBe(true);
    for (const deuda of perfil.deudas) expect(fijos.has(`Pago ${deuda.nombre}`), deuda.nombre).toBe(true);
    expect(fijos.has("Mercado")).toBe(false);
    expect(aDatos(ejemplo)).toEqual(datosDeEjemplo());
  });

});
