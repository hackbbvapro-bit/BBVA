import { describe, expect, it } from "vitest";
import { analizar, soles } from "@/motor";
import { PERFILES } from "./perfiles";
import { aPerfil } from "./aPerfil";
import { datosDeRosa } from "./semilla";
import type { Datos } from "./tipos";

const ROSA = PERFILES.find(p => p.id === "independiente")!;
const clonar = (d: Datos): Datos => structuredClone(d);

describe("aPerfil · test de oro con la semilla de Rosa", () => {
  const analisis = analizar(aPerfil(datosDeRosa()));

  it("da las cifras exactas de siempre", () => {
    expect(aPerfil(datosDeRosa()).saldoActual).toBe(46140);
    expect(analisis.proyeccion.deficit?.faltante).toBe(20000);
    expect(analisis.deudas?.avalancha.meses).toBe(5);
    expect(analisis.deudas?.minimos.meses).toBe(20);
    expect(analisis.deudas?.ahorroVsMinimos).toBe(120637);
    expect(analisis.deudas?.avalancha.interesTotal).toBe(34405);
    expect(analisis.deudas?.minimos.interesTotal).toBe(155042);
    expect(analisis.deudas?.primera?.tceaBp).toBe(10000);
    expect(analisis.deudas?.bolaDeNieve.orden).toHaveLength(2);
  });

  it("el análisis completo coincide con el del perfil sintético original", () => {
    const original = analizar(ROSA);
    expect(analisis.proyeccion.deficit).toEqual(original.proyeccion.deficit);
    expect(analisis.proyeccion.dias).toEqual(original.proyeccion.dias);
    expect(analisis.deudas).toEqual(original.deudas);
    expect(analisis.jugadas).toEqual(original.jugadas);
    expect(analisis.ingresoVariable).toEqual(original.ingresoVariable);
    expect(analisis.gastoVariable).toEqual(original.gastoVariable);
    const porId = (a: typeof analisis) => [...a.recurrentes].sort((x, y) => x.id.localeCompare(y.id));
    expect(porId(analisis)).toEqual(porId(original));
  });

  it("no muta lo guardado", () => {
    const datos = datosDeRosa();
    const copia = clonar(datos);
    aPerfil(datos);
    expect(datos).toEqual(copia);
  });
});

describe("aPerfil · lo que la persona agrega cambia el motor", () => {
  const base = datosDeRosa();
  const deficitBase = analizar(aPerfil(base)).proyeccion.deficit!.faltante;

  it("un gasto fijo nuevo agranda el déficit y se reconoce como recurrente", () => {
    const d = clonar(base);
    d.gastosFijos.push({ id: "f1", descripcion: "Gimnasio", monto: soles(50), dia: 20, categoria: "suscripciones" });
    const a = analizar(aPerfil(d));
    expect(a.recurrentes.find(r => r.descripcion === "Gimnasio")).toMatchObject({ monto: -5000, diaDelMes: 20, frecuencia: "mensual", veces: 3 });
    expect(a.proyeccion.deficit!.faltanteMaximo).toBeGreaterThan(analizar(aPerfil(base)).proyeccion.deficit!.faltanteMaximo);
  });

  it("un ingreso fijo nuevo achica o quita el déficit", () => {
    const d = clonar(base);
    d.ingresosFijos.push({ id: "i1", descripcion: "Pensión de un familiar", monto: soles(600), dia: 14, categoria: "sueldo" });
    const a = analizar(aPerfil(d));
    // el día 14 el calendario de 90 días solo tendría 2 ocurrencias; aquí se generan 3
    expect(a.recurrentes.find(r => r.descripcion === "Pensión de un familiar")).toMatchObject({ monto: 60000, veces: 3 });
    expect(a.proyeccion.deficit?.faltante ?? 0).toBeLessThan(deficitBase);
  });

  it("una deuda nueva entra al plan y sus pagos a la proyección", () => {
    const d = clonar(base);
    d.deudas.push({
      id: "d1", entidad: "Caja Ejemplo", nombre: "Préstamo Caja", tipo: "personal", saldo: soles(1200), tceaBp: null,
      pagoMinimo: soles(100), pagoHabitual: soles(100), diaPago: 28, diasAtraso: 0, pagada: false,
    });
    const perfil = aPerfil(d);
    expect(perfil.deudas.map(x => x.nombre)).toContain("Préstamo Caja");
    expect(perfil.deudas.find(x => x.id === "d1")).toMatchObject({ tipo: "prestamo", tceaBp: 0 });
    const a = analizar(perfil);
    expect(a.recurrentes.find(r => r.deudaId === "d1")?.monto).toBe(-10000);
    expect(a.deudas?.minimos.orden).toContain("d1");
  });

  it("una deuda pagada o con saldo cero sale del plan y de los pagos", () => {
    const d = clonar(base);
    d.deudas[0].pagada = true;
    d.deudas[1].saldo = 0;
    const perfil = aPerfil(d);
    expect(perfil.deudas).toHaveLength(0);
    expect(perfil.movimientos.some(m => m.categoria === "deuda")).toBe(false);
    expect(analizar(perfil).deudas).toBeNull();
  });

  it("el saldo es la suma de las cuentas, en céntimos exactos", () => {
    const d = clonar(base);
    d.cuentas.push({ id: "c2", nombre: "Ahorros", saldo: 10 }, { id: "c3", nombre: "Efectivo", saldo: 20 });
    expect(aPerfil(d).saldoActual).toBe(46170);
  });

  it("editar el monto de un fijo cambia la proyección y el día 31 cae en el último día de los meses cortos", () => {
    const d = clonar(base);
    d.gastosFijos.push({ id: "f31", descripcion: "Seguro", monto: soles(80), dia: 31, categoria: "otros" });
    const perfil = aPerfil(d);
    const fechas = perfil.movimientos.filter(m => m.descripcion === "Seguro").map(m => m.fecha);
    expect(fechas).toEqual(["2026-08-31", "2026-09-30", "2026-10-31"]);
    expect(analizar(perfil).recurrentes.find(r => r.descripcion === "Seguro")?.veces).toBe(3);
  });

  it("sin fijos ni deudas ni cuentas no revienta", () => {
    const d = clonar(base);
    Object.assign(d, { cuentas: [], ingresosFijos: [], gastosFijos: [], deudas: [] });
    const perfil = aPerfil(d);
    expect(perfil.saldoActual).toBe(0);
    expect(() => analizar(perfil)).not.toThrow();
  });
});
