import { describe, expect, it } from "vitest";
import { analizar, soles, sumar } from "../motor";
import { aPerfil } from "../datos/aPerfil";
import { crearRepositorioMemoria } from "../datos/repositorio";
import { ID_PROPIO } from "../datos/semilla";
import { armarCaso, DIAS_DE_ATRASO, historiaDiaria, repartir, semanalDe, SEMANAS_DE_HISTORIA, tuvoCreditoSegun, type Respuestas } from "./entrada";
import { flujoMensual, hechosDe, trazarRuta } from "./ruta";

const base: Respuestas = {
  nombre: "Lucía", cobro: "fin_de_mes", ingresoMensual: soles(2500), saldo: soles(600),
  fijosMensual: soles(900), diaADiaMensual: soles(800), deuda: null, tuvoCredito: false, hoy: "2026-11-14",
};
const con = (cambios: Partial<Respuestas>): Respuestas => ({ ...base, ...cambios });
const rutaDe = (r: Respuestas) => {
  const datos = armarCaso(r);
  const perfil = aPerfil(datos);
  return trazarRuta(perfil, analizar(perfil), hechosDe(datos, tuvoCreditoSegun(r)));
};

describe("repartir", () => {
  it("parte en céntimos enteros que suman exactamente el total", () => {
    expect(repartir(100, 4)).toEqual([25, 25, 25, 25]);
    expect(repartir(101, 4)).toEqual([26, 25, 25, 25]);
    expect(repartir(250_003, 2)).toEqual([125_002, 125_001]);
    expect(repartir(3, 4)).toEqual([1, 1, 1, 0]);
    for (const total of [0, 1, 99, 80_000, 123_457]) for (const n of [1, 2, 4]) {
      const trozos = repartir(total, n);
      expect(sumar(trozos)).toBe(total);
      expect(trozos.every(Number.isInteger)).toBe(true);
    }
  });
});

describe("armarCaso", () => {
  it("arma un caso propio que el repositorio acepta sin tocar nada", async () => {
    for (const r of [base, con({ cobro: "quincena" }), con({ cobro: "semanal" }),
      con({ deuda: { tipo: "tarjeta", saldo: soles(3000), cuota: soles(250), atraso: "uno_a_dos_meses" } }),
      con({ deuda: { tipo: "personal", saldo: soles(500), cuota: soles(100), atraso: "al_dia" } })]) {
      const datos = armarCaso(r);
      const repo = crearRepositorioMemoria();
      await repo.cargar(datos);
      const guardado = await repo.leerTodo();
      expect(guardado.perfil).toEqual(datos.perfil);
      expect(guardado.ingresosFijos).toHaveLength(datos.ingresosFijos.length);
      expect(guardado.gastosFijos).toHaveLength(datos.gastosFijos.length);
      expect(guardado.deudas).toEqual(datos.deudas);
      expect(datos.perfil.id).toBe(ID_PROPIO);
    }
  });

  it("los ingresos y los gastos suman exactamente lo que dijo la persona, sea cual sea la forma de cobro", () => {
    for (const cobro of ["fin_de_mes", "quincena", "semanal"] as const) {
      const datos = armarCaso(con({ cobro, ingresoMensual: 250_003, diaADiaMensual: 80_001 }));
      expect(sumar(datos.ingresosFijos.map(f => f.monto))).toBe(250_003);
      expect(sumar(datos.gastosFijos.map(f => f.monto))).toBe(soles(900) + 80_001);
      expect(datos.ingresosFijos).toHaveLength(datos.perfil.diasCobro.length);
    }
  });

  it("el motor reconoce cada ingreso y cada gasto como algo que se repite cada mes", () => {
    for (const cobro of ["fin_de_mes", "quincena", "semanal"] as const) {
      const r = con({ cobro });
      const perfil = aPerfil(armarCaso(r));
      const flujo = flujoMensual(perfil, analizar(perfil));
      expect(flujo.ingresos).toBe(r.ingresoMensual);
      expect(flujo.gastos).toBe((r.fijosMensual ?? 0) + (r.diaADiaMensual ?? 0));
      expect(flujo.cuotas).toBe(0);
      expect(flujo.libre).toBe(soles(800));
    }
  });

  it("no crea ingresos ni gastos de monto cero", () => {
    const datos = armarCaso(con({ ingresoMensual: 0, fijosMensual: 0, diaADiaMensual: 2 }));
    expect(datos.ingresosFijos).toEqual([]);
    expect(datos.gastosFijos.map(f => f.monto)).toEqual([1, 1]);
  });

  it("guarda la deuda con su atraso aproximado y sin inventar una tasa", () => {
    const [deuda] = armarCaso(con({ deuda: { tipo: "prestamo", saldo: soles(4000), cuota: soles(350), atraso: "mas_de_dos_meses" } })).deudas;
    expect(deuda).toMatchObject({ tipo: "prestamo", saldo: soles(4000), pagoMinimo: soles(350), pagoHabitual: soles(350), tceaBp: null, diasAtraso: 90, pagada: false });
    expect(DIAS_DE_ATRASO).toEqual({ al_dia: 0, menos_de_un_mes: 20, uno_a_dos_meses: 45, mas_de_dos_meses: 90 });
    expect(armarCaso(con({ deuda: { tipo: "tarjeta", saldo: 0, cuota: 0, atraso: "al_dia" } })).deudas).toEqual([]);
  });

  it("recorta el nombre y elige el tipo de perfil según cómo cobra", () => {
    expect(armarCaso(con({ nombre: `  ${"a".repeat(60)}  ` })).perfil.nombre).toHaveLength(40);
    expect(armarCaso(con({ cobro: "semanal" })).perfil.tipo).toBe("independiente");
    expect(armarCaso(base).perfil.tipo).toBe("dependiente");
  });
});

describe("de las respuestas a la ruta", () => {
  it("sin deudas y sin meta: ahorrar sin imponer crédito", () => {
    expect(rutaDe(base).id).toBe("ahorrar");
  });

  it("sin meta, haber tenido crédito no cambia la elección inicial", () => {
    expect(rutaDe(con({ tuvoCredito: true })).id).toBe("ahorrar");
  });

  it("con una deuda: estar en verde, y la tarjeta cuenta como haber tenido crédito", () => {
    const r = con({ deuda: { tipo: "tarjeta", saldo: soles(3000), cuota: soles(250), atraso: "al_dia" } });
    expect(tuvoCreditoSegun(r)).toBe(true);
    expect(rutaDe(r).id).toBe("estar_en_verde");
  });

  it("una deuda con una persona no cuenta como historial de crédito", () => {
    const r = con({ deuda: { tipo: "personal", saldo: soles(500), cuota: soles(100), atraso: "al_dia" } });
    expect(tuvoCreditoSegun(r)).toBe(false);
    expect(rutaDe(r).id).toBe("ahorrar");
  });

  it("gasta más de lo que gana: estar en verde aunque no deba nada", () => {
    const ruta = rutaDe(con({ ingresoMensual: soles(1200), saldo: soles(100) }));
    expect(ruta.id).toBe("estar_en_verde");
    expect(ruta.flujo.libre).toBe(-soles(500));
  });
});

describe("quien vende o cobra al día", () => {
  const alDia = (flojo?: number) => con({ trabajo: "independiente", cobro: "diario", ingresoMensual: soles(2600), ...(flojo === undefined ? {} : { ingresoFlojo: flojo }) });

  it("no crea un sueldo fijo: el ingreso va como 12 semanas de ventas diarias", () => {
    const r = alDia(soles(1300));
    const datos = armarCaso(r);
    expect(datos.ingresosFijos).toEqual([]);
    expect(datos.perfil.tipo).toBe("independiente");
    expect(datos.movimientos).toEqual(historiaDiaria(r));
    expect(datos.movimientos).toHaveLength(SEMANAS_DE_HISTORIA * 7);
    expect(datos.movimientos.every(m => m.monto > 0 && Number.isInteger(m.monto) && m.categoria === "ingreso_variable" && m.fecha <= r.hoy)).toBe(true);
    // 9 semanas normales y 3 flojas, sin perder un céntimo.
    expect(sumar(datos.movimientos.map(m => m.monto))).toBe(9 * semanalDe(soles(2600)) + 3 * semanalDe(soles(1300)));
  });

  it("el motor proyecta con la semana floja y reconoce la normal como la típica, sin tomarlo por un pago fijo", () => {
    const analisis = analizar(aPerfil(armarCaso(alDia(soles(1300)))));
    expect(analisis.ingresoVariable.semanalPrudente).toBe(semanalDe(soles(1300)));
    expect(analisis.ingresoVariable.semanalTipico).toBe(semanalDe(soles(2600)));
    expect(analisis.ingresoVariable.semanasObservadas).toBe(SEMANAS_DE_HISTORIA);
    expect(analisis.recurrentes.filter(x => x.monto > 0)).toEqual([]);
  });

  it("con peor mes flojo, el día más bajo de la proyección no mejora", () => {
    const minimo = (flojo: number) => analizar(aPerfil(armarCaso(alDia(flojo)))).proyeccion.saldoMinimo;
    expect(minimo(soles(600))).toBeLessThanOrEqual(minimo(soles(1300)));
    expect(minimo(soles(1300))).toBeLessThanOrEqual(minimo(soles(2600)));
  });

  it("sin la cifra del mes flojo se toma igual al mes normal", () => {
    expect(analizar(aPerfil(armarCaso(alDia()))).ingresoVariable.semanalPrudente).toBe(semanalDe(soles(2600)));
  });

  it("el caso se guarda sin errores", async () => {
    const repo = crearRepositorioMemoria();
    await repo.cargar(armarCaso(alDia(soles(1300))));
    expect((await repo.leerTodo()).movimientos).toHaveLength(SEMANAS_DE_HISTORIA * 7);
  });
});


describe("frecuencias del cuestionario sin deriva", () => {
  it("dos quincenas exactas, incluido febrero bisiesto y fin de año", () => {
    for (const hoy of ["2024-03-31", "2027-01-31"]) {
      const perfil = aPerfil(armarCaso(con({ cobro: "quincena", ingresoMensual: 250002, hoy })));
      const ingresos = perfil.movimientos.filter(m => m.monto > 0);
      expect(ingresos.every(m => m.monto === 125001)).toBe(true);
      if (hoy === "2024-03-31") expect(ingresos.map(m => m.fecha)).toEqual(expect.arrayContaining(["2024-01-31", "2024-02-15", "2024-02-29", "2024-03-31"]));
      else expect(ingresos.map(m => m.fecha)).toEqual(expect.arrayContaining(["2026-12-15", "2026-12-31", "2027-01-31"]));
    }
  });
  it("el motor detecta la semana al cruzar de año y proyecta cada siete días", () => {
    const r = con({ cobro: "semanal", ingresoSemanal: 50001, ingresoMensual: 216671, hoy: "2027-01-03" });
    const datos = armarCaso(r);
    expect(datos.ingresosFijos).toEqual([]);
    expect(datos.movimientos.map(m => m.fecha).sort().slice(-2)).toEqual(["2027-01-03", "2026-12-27"].reverse());
  });
  it("la semana floja usa céntimos enteros y no supera el normal", () => {
    const datos = armarCaso(con({ trabajo: "independiente", cobro: "semanal", ingresoSemanal: 50001, ingresoMensual: 216671, ingresoFlojo: 150001 }));
    expect(datos.movimientos.every(m => m.monto === 34615)).toBe(true);
    expect(analizar(aPerfil(datos)).recurrentes.filter(r => r.monto > 0)).toMatchObject([{ monto: 34615, frecuencia: "semanal" }]);
  });
  it("armarCaso acepta solo las nuevas respuestas y no atribuye atraso", () => {
    const datos = armarCaso({ nombre: "Lucho", cobro: "fin_de_mes", ingresoMensual: 250000, saldo: 60000, gastosMensual: 170000, deuda: { cuota: 25000 }, hoy: "2026-11-14" });
    expect(hechosDe(datos).diasAtrasoMax).toBe(0);
    const perfil = aPerfil(datos);
    expect(flujoMensual(perfil, analizar(perfil))).toEqual({ ingresos: 250000, gastos: 170000, cuotas: 25000, libre: 55000 });
  });
});
