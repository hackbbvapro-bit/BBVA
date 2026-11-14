import { describe, expect, it } from "vitest";
import { aPerfil } from "../datos/aPerfil";
import { datosDeRosa } from "../datos/semilla";
import type { Datos } from "../datos/tipos";
import { analizar } from "../motor";
import { EsquemaAccion, aplicar, efectoDe, frase, interpretarRegistro, leerFecha, responderRegistro, type Situacion } from "./registro";

// «Hoy» de la demo de Rosa: viernes 13 de noviembre de 2026.
const HOY = "2026-11-13";

function rosa(): { datos: Datos; situacion: Situacion } {
  const datos = datosDeRosa();
  return { datos, situacion: { perfil: aPerfil(datos), cobros: [] } };
}

describe("leerFecha", () => {
  it("entiende hoy, mañana, pasado mañana y «en N días»", () => {
    expect(leerFecha("hoy", HOY)).toBe("2026-11-13");
    expect(leerFecha("mañana", HOY)).toBe("2026-11-14");
    expect(leerFecha("pasado mañana", HOY)).toBe("2026-11-15");
    expect(leerFecha("en 5 días", HOY)).toBe("2026-11-18");
    expect(leerFecha("en tres dias", HOY)).toBe("2026-11-16");
    expect(leerFecha("la próxima semana", HOY)).toBe("2026-11-20");
  });

  it("un día de la semana es el próximo; el mismo día de hoy es dentro de 7", () => {
    expect(leerFecha("el lunes", HOY)).toBe("2026-11-16");
    expect(leerFecha("el viernes", HOY)).toBe("2026-11-20");
    expect(leerFecha("el sábado", HOY)).toBe("2026-11-14");
  });

  it("«el 20» es de este mes si no pasó; si ya pasó, del siguiente; con año que cambia en diciembre", () => {
    expect(leerFecha("el 20", HOY)).toBe("2026-11-20");
    expect(leerFecha("el 13", HOY)).toBe("2026-11-13");
    expect(leerFecha("el 5", HOY)).toBe("2026-12-05");
    expect(leerFecha("el día 10", "2026-12-20")).toBe("2027-01-10");
    expect(leerFecha("el 20 de diciembre", HOY)).toBe("2026-12-20");
    expect(leerFecha("el 2 de enero", HOY)).toBe("2027-01-02");
  });

  it("fin de mes va al último día real del mes (sin deriva)", () => {
    expect(leerFecha("a fin de mes", HOY)).toBe("2026-11-30");
    expect(leerFecha("a fin de mes", "2028-02-10")).toBe("2028-02-29");
    expect(leerFecha("el 31", "2026-11-05")).toBe("2026-11-30");
    expect(leerFecha("el 31", "2027-02-05")).toBe("2027-02-28");
  });

  it("sin fecha devuelve null", () => {
    expect(leerFecha("me van a pagar 100", HOY)).toBeNull();
  });
});

describe("interpretarRegistro: qué se anota con cada frase", () => {
  it("«me van a dar 100 soles por limpiar» sin fecha: pide el día y muestra el efecto si llegara mañana", () => {
    const l = interpretarRegistro("me van a dar 100 soles por limpiar ¿cómo cambia mi situación esto?", HOY);
    expect(l).toMatchObject({ tipo: "falta_fecha", vistaPrevia: { tipo: "cobro", monto: 10_000, quien: "Limpiar", fecha: "2026-11-14" } });
  });

  it("la respuesta siguiente «el viernes» completa el pago por llegar", () => {
    const l = interpretarRegistro("el viernes", HOY, "me van a dar 100 soles por limpiar");
    expect(l).toEqual({ tipo: "accion", accion: { tipo: "cobro", quien: "Limpiar", monto: 10_000, fecha: "2026-11-20" } });
  });

  it("una fecha suelta sin mensaje previo que la necesite no anota nada", () => {
    expect(interpretarRegistro("el viernes", HOY)).toBeNull();
    expect(interpretarRegistro("el viernes", HOY, "¿cómo voy este mes?")).toBeNull();
  });

  it("«me acaban de pagar 1.000 soles» suma hoy a la cuenta", () => {
    expect(interpretarRegistro("me acaban de pagar 1.000 soles", HOY)).toEqual({
      tipo: "accion", accion: { tipo: "saldo", monto: 100_000, descripcion: "Ingreso extra" },
    });
  });

  it("plata encontrada es un ingreso de una vez, sin juicios: «me encontré 1500 soles en un descampado»", () => {
    expect(interpretarRegistro("me encontré 1500 soles en un descampado", HOY)).toEqual({
      tipo: "accion", accion: { tipo: "saldo", monto: 150_000, descripcion: "Dinero encontrado" },
    });
    expect(interpretarRegistro("hallé cincuenta soles tirados en la calle", HOY)).toEqual({
      tipo: "accion", accion: { tipo: "saldo", monto: 5_000, descripcion: "Dinero encontrado" },
    });
  });

  it("un regalo es un ingreso de una vez: «me regalaron 200 por mi cumpleaños»", () => {
    expect(interpretarRegistro("me regalaron 200 por mi cumpleaños", HOY)).toEqual({
      tipo: "accion", accion: { tipo: "saldo", monto: 20_000, descripcion: "Regalo" },
    });
  });

  it("«¿y si me encontrara 100?» es una pregunta, no se anota", () => {
    expect(interpretarRegistro("y si me encontrara 100 soles", HOY)).toBeNull();
  });

  it("acepta montos en palabras: «me pagaron cien lucas por un trabajo»", () => {
    expect(interpretarRegistro("me pagaron cien lucas por un trabajo", HOY)).toEqual({
      tipo: "accion", accion: { tipo: "saldo", monto: 10_000, descripcion: "Ingreso: Trabajo" },
    });
  });

  it("un gasto ya hecho resta: «gasté 80 en el mercado»", () => {
    expect(interpretarRegistro("gasté 80 en el mercado", HOY)).toEqual({
      tipo: "accion", accion: { tipo: "saldo", monto: -8_000, descripcion: "Gasto: Mercado" },
    });
  });

  it("«pago 50 de luz cada mes el 15» es un gasto fijo de servicios", () => {
    expect(interpretarRegistro("pago 50 de luz cada mes el 15", HOY)).toEqual({
      tipo: "accion", accion: { tipo: "fijo", sentido: "gasto", monto: 5_000, dia: 15, categoria: "servicios", descripcion: "Luz" },
    });
  });

  it("un ingreso mensual sin día pregunta el día; con «el 30» lo anota", () => {
    expect(interpretarRegistro("gano 500 al mes", HOY)).toMatchObject({ tipo: "falta_dia" });
    expect(interpretarRegistro("los 30", HOY, "gano 500 al mes")).toEqual({
      tipo: "accion", accion: { tipo: "fijo", sentido: "ingreso", monto: 50_000, dia: 30, categoria: "ingreso_variable", descripcion: "Ingreso mensual" },
    });
  });

  it("dinero que le deben a la persona es un pago por llegar", () => {
    expect(interpretarRegistro("me deben 300 a fin de mes", HOY)).toMatchObject({
      tipo: "accion", accion: { tipo: "cobro", monto: 30_000, fecha: "2026-11-30" },
    });
    expect(interpretarRegistro("voy a ganar mil soles el viernes", HOY)).toMatchObject({
      tipo: "accion", accion: { tipo: "cobro", monto: 100_000, fecha: "2026-11-20" },
    });
  });

  it("una deuda sin sus datos no se anota a ciegas: explica qué falta", () => {
    expect(interpretarRegistro("debo 2000 a mi primo", HOY)).toMatchObject({ tipo: "guia" });
  });

  it("las preguntas «¿y si…?» y «¿me alcanza…?» no anotan nada", () => {
    for (const f of ["¿me alcanza para gastar 200?", "y si gasto 100 en ropa", "¿puedo comprar algo de 300?", "¿qué pasa si me pagan 500?"]) {
      expect(interpretarRegistro(f, HOY), f).toBeNull();
    }
  });

  it("sin monto no anota", () => {
    expect(interpretarRegistro("me pagaron", HOY)).toBeNull();
    expect(interpretarRegistro("hola", HOY)).toBeNull();
  });
});

describe("efecto calculado por el motor", () => {
  it("+S/ 1,000 hoy saca a Rosa del rojo: el punto más bajo sube exactamente S/ 1,000", () => {
    const { situacion } = rosa();
    const accion = EsquemaAccion.parse({ tipo: "saldo", monto: 100_000, descripcion: "Ingreso extra" });
    const e = efectoDe(accion, situacion);
    expect(e.despues.saldoHoy - e.antes.saldoHoy).toBe(100_000);
    expect(e.despues.saldoMasBajo - e.antes.saldoMasBajo).toBe(100_000);
    expect(e.antes.enRojoDesde).not.toBeNull();
    expect(e.despues.enRojoDesde).toBeNull();
    const texto = frase(accion, e, true);
    expect(texto).toContain("+S/ 1,000.00");
    expect(texto).toContain("ya no quedas en rojo");
  });

  it("un pago por llegar no toca el saldo de hoy ni el plan prudente; solo el escenario «si te pagan»", () => {
    const { situacion } = rosa();
    const accion = EsquemaAccion.parse({ tipo: "cobro", quien: "Limpiar", monto: 10_000, fecha: "2026-11-20" });
    const e = efectoDe(accion, situacion);
    expect(e.despues.saldoHoy).toBe(e.antes.saldoHoy);
    expect(e.despues.saldoMasBajo).toBe(e.antes.saldoMasBajo);
    expect(e.despues.siTePagan.saldoMasBajo - e.antes.siTePagan.saldoMasBajo).toBe(10_000);
    expect(frase(accion, e, true)).toContain("no lo sumo a tu saldo hasta que llegue");
  });

  it("una deuda nueva con su cuota no se confunde con un gasto fijo ni con un ingreso", () => {
    for (const texto of [
      "oye mira, agrega que saqué un préstamo de dos mil en una caja, pago doscientos al mes el día 10",
      "me dieron un préstamo de 500",
      "pedí un crédito de 3 mil, la cuota es 300 cada mes",
    ]) {
      expect(interpretarRegistro(texto, HOY)?.tipo, texto).toBe("guia");
    }
    // Pagar la cuota de una deuda que ya existe sí es un gasto.
    expect(interpretarRegistro("pagué 200 de la cuota del préstamo", HOY)).toMatchObject({ tipo: "accion", accion: { tipo: "saldo", monto: -20_000 } });
  });

  it("si ya le debían otros pagos, la frase avisa que la cifra los cuenta (para que no choque con el inicio)", () => {
    const { situacion } = rosa();
    const accion = EsquemaAccion.parse({ tipo: "cobro", quien: "Limpiar", monto: 10_000, fecha: "2026-11-20" });
    expect(frase(accion, efectoDe(accion, situacion), true)).not.toContain("lo que ya te deben");
    const conOtro: Situacion = {
      ...situacion,
      cobros: [{ id: "c1", quien: "Vecina", monto: 50_000, fechaPrometida: "2026-11-15", cobrado: false }],
    };
    expect(frase(accion, efectoDe(accion, conOtro), true)).toContain("contando también lo que ya te deben");
  });

  it("un pago que llega después del día en rojo lo dice: ese día no lo salva", () => {
    const { situacion } = rosa();
    const accion = EsquemaAccion.parse({ tipo: "cobro", quien: "Cliente", monto: 30_000, fecha: "2026-11-30" });
    expect(frase(accion, efectoDe(accion, situacion), true)).toContain("no lo salva");
  });

  it("un pago prometido para hoy no se cuenta hasta que llegue", () => {
    const { situacion } = rosa();
    const accion = EsquemaAccion.parse({ tipo: "cobro", quien: "Cliente", monto: 30_000, fecha: HOY });
    const e = efectoDe(accion, situacion);
    expect(e.despues.siTePagan.saldoMasBajo).toBe(e.antes.siTePagan.saldoMasBajo);
    expect(frase(accion, e, true)).toContain("ya me pagaron");
  });

  it("el chat calcula lo mismo que el panel: un gasto fijo aplicado al vuelo = el mismo gasto guardado", () => {
    const { datos, situacion } = rosa();
    const accion = EsquemaAccion.parse({ tipo: "fijo", sentido: "gasto", descripcion: "Luz", monto: 5_000, dia: 15, categoria: "servicios" });
    const alVuelo = analizar(aplicar(accion, situacion).perfil).proyeccion;
    const guardado = analizar(aPerfil({
      ...datos, gastosFijos: [...datos.gastosFijos, { id: "g-luz", descripcion: "Luz", monto: 5_000, dia: 15, categoria: "servicios" }],
    })).proyeccion;
    expect(alVuelo.saldoMinimo).toBe(guardado.saldoMinimo);
    expect(alVuelo.fechaSaldoMinimo).toBe(guardado.fechaSaldoMinimo);
    expect(alVuelo.deficit?.fecha).toBe(guardado.deficit?.fecha);
  });

  it("y una deuda aplicada al vuelo = la misma deuda guardada", () => {
    const { datos, situacion } = rosa();
    const accion = EsquemaAccion.parse({
      tipo: "deuda", entidad: "Caja", nombre: "Préstamo moto", tipoDeuda: "prestamo", saldo: 300_000, pagoMensual: 25_000, dia: 18, tceaBp: 4_500,
    });
    const alVuelo = analizar(aplicar(accion, situacion).perfil);
    const guardado = analizar(aPerfil({
      ...datos,
      deudas: [...datos.deudas, {
        id: "d-moto", entidad: "Caja", nombre: "Préstamo moto", tipo: "prestamo", saldo: 300_000, tceaBp: 4_500,
        pagoMinimo: 25_000, pagoHabitual: 25_000, diaPago: 18, diasAtraso: 0, pagada: false,
      }],
    }));
    expect(alVuelo.proyeccion.saldoMinimo).toBe(guardado.proyeccion.saldoMinimo);
    expect(alVuelo.proyeccion.saldoFinal).toBe(guardado.proyeccion.saldoFinal);
    // Mismo plan de deudas (solo cambia el id interno de la deuda nueva).
    const sinId = (x: unknown) => JSON.stringify(x).replace(/"chat-[\w-]+"|"d-moto"/g, '"nueva"');
    expect(sinId(alVuelo.deudas)).toBe(sinId(guardado.deudas));
  });

  it("el esquema rechaza montos imposibles, fechas inválidas y descripciones sin letras", () => {
    expect(EsquemaAccion.safeParse({ tipo: "saldo", monto: 0, descripcion: "x" }).success).toBe(false);
    expect(EsquemaAccion.safeParse({ tipo: "saldo", monto: 10.5, descripcion: "x" }).success).toBe(false);
    expect(EsquemaAccion.safeParse({ tipo: "cobro", quien: "Ana", monto: 100, fecha: "2026-02-30" }).success).toBe(false);
    expect(EsquemaAccion.safeParse({ tipo: "fijo", sentido: "gasto", descripcion: "123", monto: 100, dia: 5, categoria: "otros" }).success).toBe(false);
    expect(EsquemaAccion.safeParse({ tipo: "fijo", sentido: "gasto", descripcion: "Luz", monto: 100, dia: 32, categoria: "otros" }).success).toBe(false);
  });
});

describe("responderRegistro: respuesta sin IA", () => {
  it("la conversación de Rosa: primero pregunta el día, luego anota con el efecto calculado", () => {
    const { situacion } = rosa();
    const primero = responderRegistro([{ rol: "usuario", texto: "me van a dar 100 soles por limpiar ¿cómo cambia mi situación esto?" }], situacion);
    expect(primero?.accion).toBeUndefined();
    expect(primero?.texto).toContain("¿Qué día te pagan");
    expect(primero?.texto).toContain("S/ 100.00");

    const segundo = responderRegistro([
      { rol: "usuario", texto: "me van a dar 100 soles por limpiar ¿cómo cambia mi situación esto?" },
      { rol: "asistente", texto: primero!.texto },
      { rol: "usuario", texto: "el viernes" },
    ], situacion);
    expect(segundo?.accion).toEqual({ tipo: "cobro", quien: "Limpiar", monto: 10_000, fecha: "2026-11-20" });
    expect(segundo?.texto).toContain("Anotado como pago por llegar");
  });

  it("no responde si el último mensaje no es de la persona o no hay nada que anotar", () => {
    const { situacion } = rosa();
    expect(responderRegistro([], situacion)).toBeNull();
    expect(responderRegistro([{ rol: "usuario", texto: "me pagaron 100" }, { rol: "asistente", texto: "ok" }], situacion)).toBeNull();
    expect(responderRegistro([{ rol: "usuario", texto: "¿cómo voy?" }], situacion)).toBeNull();
  });
});
