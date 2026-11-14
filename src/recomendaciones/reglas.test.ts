import { describe, expect, it } from "vitest";
import { analizar, formatoSoles } from "../motor";
import type { Analisis } from "../motor";
import { aPerfil } from "../datos/aPerfil";
import { datosDeRosa } from "../datos/semilla";
import type { Datos } from "../datos/tipos";
import { CATALOGO } from "./catalogo";
import { recomendar } from "./reglas";

const analisisDe = (d: Datos): Analisis => analizar(aPerfil(d));
const sinDeficit = (a: Analisis): Analisis => ({ ...a, proyeccion: { ...a.proyeccion, deficit: null } });
const ids = (d: Datos, a: Analisis) => recomendar(d, a).map(r => r.entrada.id);

/** Rosa sin atraso, con liquidez de sobra y sin déficit: ninguna regla debería activarse salvo la de tarjeta, si no tuviera. */
function rosaHolgada(): { datos: Datos; analisis: Analisis } {
  const datos = datosDeRosa();
  datos.cuentas = [{ id: "c", nombre: "Cuenta", saldo: 900_000_000 }];
  return { datos, analisis: sinDeficit(analisisDe(datos)) };
}

describe("catálogo", () => {
  it("tiene tres entradas genéricas: sin marcas, sin enlaces y sin cifras de mercado", () => {
    expect(CATALOGO.map(e => e.id)).toEqual(["tarjeta-con-garantia", "tarjeta-inicio", "reprogramar"]);
    for (const e of CATALOGO) {
      const texto = `${e.titulo} ${e.paraQuien} ${e.condicion}`;
      expect(texto).not.toMatch(/S\/|\d|%/);
      expect(texto).not.toMatch(/BBVA|bbva|https?:|www\./);
      expect(Object.keys(e).sort()).toEqual(["condicion", "id", "paraQuien", "titulo"]);
    }
  });
});

describe("recomendar", () => {
  it("con la semilla de Rosa es determinista y cada motivo trae su regla sin NaN", () => {
    const datos = datosDeRosa();
    const analisis = analisisDe(datos);
    const r = recomendar(datos, analisis);
    expect(recomendar(datos, analisis)).toEqual(r);
    // Rosa tiene «Tarjeta Azul» abierta y cero días de atraso: ni tarjeta con garantía ni tarjeta de inicio.
    expect(r.map(x => x.entrada.id)).not.toContain("tarjeta-con-garantia");
    expect(r.map(x => x.entrada.id)).not.toContain("tarjeta-inicio");
    for (const x of r) {
      expect(x.porQue.length).toBeGreaterThan(10);
      expect(x.porQue).not.toMatch(/NaN|undefined|Infinity/);
    }
    // Con esta semilla la proyección cae bajo cero: sale reprogramar, citando la fecha y el faltante del motor.
    expect(analisis.proyeccion.deficit).not.toBeNull();
    expect(r.map(x => x.entrada.id)).toEqual(["reprogramar"]);
    expect(r[0].porQue).toContain(formatoSoles(analisis.proyeccion.deficit!.faltante));
  });

  it("no ofrece nada a quien está holgado y ya tiene tarjeta", () => {
    const { datos, analisis } = rosaHolgada();
    expect(ids(datos, analisis)).toEqual([]);
  });

  it("deuda con atraso activa la tarjeta con garantía y cita los días reales", () => {
    const { datos, analisis } = rosaHolgada();
    datos.deudas = datos.deudas.map((d, i) => (i === 0 ? { ...d, diasAtraso: 12 } : d));
    const r = recomendar(datos, analisis).find(x => x.entrada.id === "tarjeta-con-garantia");
    expect(r?.porQue).toBe("Tienes una deuda con 12 días de atraso.");
  });

  it("un atraso corto que aún deja la calificación en Normal no basta para pedir un depósito", () => {
    const { datos, analisis } = rosaHolgada();
    datos.deudas = datos.deudas.map((d, i) => (i === 0 ? { ...d, diasAtraso: 1 } : d));
    expect(ids(datos, analisis)).not.toContain("tarjeta-con-garantia");
  });

  it("con un faltante proyectado no propone productos que piden inmovilizar un depósito", () => {
    const { datos } = rosaHolgada();
    datos.deudas = datos.deudas.map((d, i) => (i === 0 ? { ...d, diasAtraso: 40 } : d));
    const holgado = sinDeficit(analisisDe(datos));
    expect(ids(datos, holgado)).toContain("tarjeta-con-garantia");
    const sinTarjeta = { ...datos, deudas: datos.deudas.filter(d => d.tipo !== "tarjeta") };
    expect(ids(sinTarjeta, holgado)).toContain("tarjeta-inicio");
    const conDeficit: Analisis = {
      ...holgado,
      proyeccion: {
        ...holgado.proyeccion,
        deficit: { fecha: "2026-11-20", faltante: 15050, faltanteMaximo: 15050, fechaFaltanteMaximo: "2026-11-20", causas: [], diasRestantes: 6 },
      },
    };
    expect(ids(datos, conDeficit)).toEqual(["reprogramar"]);
    expect(ids(sinTarjeta, conDeficit)).toEqual(["reprogramar"]);
  });

  it("una calificación no Normal en el último reporte de deudas cargado también la activa", () => {
    const { datos, analisis } = rosaHolgada();
    datos.documentos = [
      {
        id: "d1", tipo: "reporte-sbs", resumen: "Reporte", fecha: "2026-11-01",
        datos: {
          tipo: "reporte-sbs", resumen: "Reporte", movimientos: [], cobros: [],
          deudas: [{ entidad: "Otra entidad", nombre: "Préstamo", producto: "prestamo", saldo: 1000, calificacion: "cpp", diasAtraso: null, pagoMinimo: null, tcea: null, diaPago: null }],
        },
      },
    ];
    const r = recomendar(datos, analisis).find(x => x.entrada.id === "tarjeta-con-garantia");
    expect(r?.porQue).toContain("Tu calificación no es Normal");
  });

  it("sin tarjeta abierta activa la tarjeta de inicio; una tarjeta pagada no cuenta", () => {
    const { datos, analisis } = rosaHolgada();
    datos.deudas = datos.deudas.map(d => (d.tipo === "tarjeta" ? { ...d, pagada: true } : d));
    expect(ids(datos, analisis)).toContain("tarjeta-inicio");
    datos.deudas = datos.deudas.filter(d => d.tipo !== "tarjeta");
    expect(ids(datos, analisis)).toContain("tarjeta-inicio");
  });

  it("un déficit proyectado activa reprogramar con la fecha y el faltante reales", () => {
    const { datos, analisis } = rosaHolgada();
    const base = analisisDe(datosDeRosa());
    const con: Analisis = {
      ...analisis,
      proyeccion: {
        ...base.proyeccion,
        deficit: { fecha: "2026-11-20", faltante: 15050, faltanteMaximo: 15050, fechaFaltanteMaximo: "2026-11-20", causas: [], diasRestantes: 6 },
      },
    };
    const r = recomendar(datos, con).find(x => x.entrada.id === "reprogramar");
    expect(r?.porQue).toContain("S/ 150.50");
    expect(r?.entrada.condicion).not.toMatch(/S\/|\d/);
  });

  it("si los mínimos no alcanzan, reprogramar sale aunque no haya déficit", () => {
    const { datos } = rosaHolgada();
    datos.cuentas = [{ id: "c", nombre: "Cuenta", saldo: 0 }];
    datos.deudas = datos.deudas.map(d => ({ ...d, pagoMinimo: 900_000_000, saldo: 900_000_000 }));
    const analisis = sinDeficit(analisisDe(datos));
    const r = recomendar(datos, analisis).find(x => x.entrada.id === "reprogramar");
    expect(r?.porQue).toMatch(/no alcanzas/);
  });
});
