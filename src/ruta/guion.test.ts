import { describe, expect, it } from "vitest";
import { analizar, soles } from "../motor";
import { aPerfil } from "../datos/aPerfil";
import { ErrorDatos } from "../datos/validar";
import { armarCaso, tuvoCreditoSegun } from "./entrada";
import { aRespuestas, avance, pasosPrevistos, pregunta, proximoPaso, responder, MONTO_MAXIMO, type Borrador, type Paso } from "./guion";
import { hechosDe, trazarRuta } from "./ruta";

/** Recorre el guion contestando cada pregunta con lo que diga `respuestas`. Devuelve el borrador y el orden seguido. */
function recorrer(respuestas: Partial<Record<Paso, string>>): { borrador: Borrador; orden: Paso[] } {
  let borrador: Borrador = {};
  const orden: Paso[] = [];
  for (let i = 0; i < 30; i++) {
    const paso = proximoPaso(borrador);
    orden.push(paso);
    if (paso === "permiso") return { borrador, orden };
    const valor = respuestas[paso];
    if (valor === undefined) throw new Error(`falta respuesta para ${paso}`);
    borrador = responder(borrador, paso, valor).borrador;
  }
  throw new Error("el guion no termina");
}

const comunes = { nombre: "Lucho", trabajo: "dependiente", cobro: "fin_de_mes", diaPago: "30", ingreso: "2500", extra: "0", gratificacion: "si", saldo: "600", fijos: "900", diaADia: "800", familia: "no", estudios: "0" };
const rutaDe = (b: Borrador) => {
  const r = aRespuestas(b, "2026-11-14");
  const datos = armarCaso(r);
  const perfil = aPerfil(datos);
  return trazarRuta(perfil, analizar(perfil), hechosDe(datos, tuvoCreditoSegun(r))).id;
};

describe("orden de las preguntas", () => {
  it("sin deudas pregunta si alguna vez tuvo crédito y termina en el permiso", () => {
    const { orden } = recorrer({ ...comunes, deudas: "no", tuvoCredito: "no" });
    expect(orden).toEqual(["nombre", "trabajo", "cobro", "diaPago", "ingreso", "extra", "gratificacion", "saldo", "fijos", "diaADia", "familia", "estudios", "deudas", "tuvoCredito", "permiso"]);
  });
  it("con una tarjeta al día no pregunta el atraso ni si tuvo crédito", () => {
    const { orden } = recorrer({ ...comunes, deudas: "al_dia", tipoDeuda: "tarjeta", saldoDeuda: "3000", cuotaDeuda: "250" });
    expect(orden).toEqual(["nombre", "trabajo", "cobro", "diaPago", "ingreso", "extra", "gratificacion", "saldo", "fijos", "diaADia", "familia", "estudios", "deudas", "tipoDeuda", "saldoDeuda", "cuotaDeuda", "permiso"]);
  });
  it("con una deuda personal atrasada pregunta el atraso y si tuvo crédito", () => {
    const { orden } = recorrer({ ...comunes, deudas: "atraso", tipoDeuda: "personal", saldoDeuda: "500", cuotaDeuda: "100", atraso: "uno_a_dos_meses", tuvoCredito: "no" });
    expect(orden).toEqual(["nombre", "trabajo", "cobro", "diaPago", "ingreso", "extra", "gratificacion", "saldo", "fijos", "diaADia", "familia", "estudios", "deudas", "tipoDeuda", "saldoDeuda", "cuotaDeuda", "atraso", "tuvoCredito", "permiso"]);
  });
  it("la pregunta que toca siempre está entre las previstas, y el avance no se pasa del total", () => {
    let b: Borrador = {};
    const respuestas: Partial<Record<Paso, string>> = { ...comunes, deudas: "atraso", tipoDeuda: "prestamo", saldoDeuda: "8000", cuotaDeuda: "400", atraso: "mas_de_dos_meses" };
    for (let i = 0; i < 30; i++) {
      const paso = proximoPaso(b);
      expect(pasosPrevistos(b)).toContain(paso);
      const a = avance(b);
      expect(a.actual).toBeGreaterThanOrEqual(1);
      expect(a.actual).toBeLessThanOrEqual(a.total);
      if (paso === "permiso") { expect(a.actual).toBe(a.total); return; }
      b = responder(b, paso, respuestas[paso]!).borrador;
    }
    throw new Error("no terminó");
  });
});

describe("preguntas", () => {
  it("cada paso tiene texto, y las de opciones traen opciones", () => {
    const pasos: Paso[] = ["nombre", "trabajo", "cobro", "diaPago", "ingreso", "flojo", "extra", "gratificacion", "gastosTrabajo", "seguro", "saldo", "fijos", "diaADia", "familia", "estudios", "deudas", "tipoDeuda", "saldoDeuda", "cuotaDeuda", "atraso", "tuvoCredito", "permiso"];
    for (const paso of pasos) {
      const p = pregunta(paso, { nombre: "Lucho" });
      expect(p.texto.length).toBeGreaterThan(10);
      if (p.clase === "opciones") expect(p.opciones!.length).toBeGreaterThanOrEqual(2);
      expect(`${p.texto} ${p.ayuda ?? ""}`).not.toMatch(/BBVA/i);
    }
  });
  it("saluda por el apodo y el permiso avisa que el caso sale a servicios externos", () => {
    expect(pregunta("trabajo", { nombre: "Lucho" }).texto).toContain("Lucho");
    const permiso = pregunta("permiso", {});
    expect(permiso.ayuda).toMatch(/servicios externos de IA y de voz/);
    expect(permiso.ayuda).toMatch(/No pongas datos reales/);
  });
});

describe("validación de respuestas", () => {
  const falla = (b: Borrador, paso: Paso, valor: string) => expect(() => responder(b, paso, valor)).toThrow(ErrorDatos);
  it("el apodo es obligatorio, corto y sin números", () => {
    falla({}, "nombre", "   ");
    falla({}, "nombre", "x".repeat(41));
    falla({}, "nombre", "Lucho 987654321");
    expect(responder({}, "nombre", "  Lucho   Pe ").borrador.nombre).toBe("Lucho Pe");
  });
  it("los montos se guardan en céntimos enteros y se muestran en soles", () => {
    const r = responder({}, "ingreso", "2500.50");
    expect(r.borrador.ingreso).toBe(250_050);
    expect(r.dicho).toContain("2");
    expect(Number.isInteger(responder({}, "diaADia", "0.1").borrador.diaADia)).toBe(true);
    expect(responder({}, "saldo", "0").borrador.saldo).toBe(0);
  });
  it("rechaza montos vacíos, negativos, absurdos o que no son números", () => {
    falla({}, "ingreso", "");
    falla({}, "ingreso", "0");
    falla({}, "ingreso", "-100");
    falla({}, "saldo", "-1");
    falla({}, "saldo", "mucho");
    falla({}, "fijos", String(MONTO_MAXIMO / 100 + 1));
    falla({}, "saldoDeuda", "0");
    falla({ saldoDeuda: soles(500) }, "cuotaDeuda", "600");
    falla({ saldoDeuda: soles(500) }, "cuotaDeuda", "0");
  });
  it("en las preguntas de opciones solo acepta las opciones del guion", () => {
    falla({}, "cobro", "mensual");
    falla({}, "deudas", "si");
    falla({}, "tipoDeuda", "hipoteca");
    falla({}, "atraso", "al_dia");
    falla({}, "tuvoCredito", "tal vez");
    falla({}, "permiso", "");
    expect(responder({}, "tuvoCredito", "si").borrador.tuvoCredito).toBe(true);
    expect(responder({}, "tuvoCredito", "no").borrador.tuvoCredito).toBe(false);
  });
  it("responder el permiso no cambia el borrador: el permiso no forma parte del caso", () => {
    const b: Borrador = { nombre: "Lucho" };
    expect(responder(b, "permiso", "si").borrador).toEqual(b);
  });
});

describe("del guion al caso y a la ruta", () => {
  it("no arma respuestas si todavía faltan preguntas", () => {
    expect(() => aRespuestas({ nombre: "Lucho" }, "2026-11-14")).toThrow(ErrorDatos);
  });
  it("arma las respuestas con los montos en céntimos", () => {
    const { borrador } = recorrer({ ...comunes, deudas: "atraso", tipoDeuda: "tarjeta", saldoDeuda: "3000", cuotaDeuda: "250", atraso: "menos_de_un_mes" });
    expect(aRespuestas(borrador, "2026-11-14")).toEqual({
      nombre: "Lucho", trabajo: "dependiente", cobro: "fin_de_mes", diaPago: 30, ingresoMensual: soles(2500), gratificacion: true, saldo: soles(600), fijosMensual: soles(900), diaADiaMensual: soles(800),
      ingresoExtra: 0, apoyoFamilia: 0, estudios: 0,
      deuda: { tipo: "tarjeta", saldo: soles(3000), cuota: soles(250), atraso: "menos_de_un_mes" }, tuvoCredito: true, hoy: "2026-11-14",
    });
  });
  it("una deuda al día queda sin atraso, y una personal no cuenta como crédito", () => {
    const { borrador } = recorrer({ ...comunes, deudas: "al_dia", tipoDeuda: "personal", saldoDeuda: "500", cuotaDeuda: "100", tuvoCredito: "no" });
    const r = aRespuestas(borrador, "2026-11-14");
    expect(r.deuda?.atraso).toBe("al_dia");
    expect(r.tuvoCredito).toBe(false);
  });
  it("lleva a las tres rutas según lo que se responde", () => {
    expect(rutaDe(recorrer({ ...comunes, deudas: "atraso", tipoDeuda: "tarjeta", saldoDeuda: "3000", cuotaDeuda: "250", atraso: "uno_a_dos_meses" }).borrador)).toBe("estar_en_verde");
    expect(rutaDe(recorrer({ ...comunes, deudas: "no", tuvoCredito: "no" }).borrador)).toBe("construir_historial");
    expect(rutaDe(recorrer({ ...comunes, saldo: "20000", deudas: "no", tuvoCredito: "si" }).borrador)).toBe("hacer_crecer");
  });
});

describe("dependiente o independiente: cada uno con sus preguntas", () => {
  const cola = { extra: "0", gastosTrabajo: "0", seguro: "0", saldo: "600", fijos: "900", diaADia: "800", familia: "0", estudios: "0", deudas: "no", tuvoCredito: "no" };
  it("la segunda pregunta es cómo trabaja, justo después del apodo", () => {
    expect(proximoPaso({ nombre: "Lucho" })).toBe("trabajo");
  });
  it("dependiente a fin de mes: día de depósito, sueldo y gratificación; nunca el mes flojo", () => {
    const { orden } = recorrer({ nombre: "Ana", trabajo: "dependiente", cobro: "fin_de_mes", diaPago: "15", ingreso: "3000", gratificacion: "no", ...cola });
    expect(orden).toEqual(["nombre", "trabajo", "cobro", "diaPago", "ingreso", "extra", "gratificacion", "saldo", "fijos", "diaADia", "familia", "estudios", "deudas", "tuvoCredito", "permiso"]);
  });
  it("dependiente por quincenas: no pregunta el día, porque ya son el 15 y el fin de mes", () => {
    const { orden } = recorrer({ nombre: "Ana", trabajo: "dependiente", cobro: "quincena", ingreso: "3000", gratificacion: "si", ...cola });
    expect(orden).toEqual(["nombre", "trabajo", "cobro", "ingreso", "extra", "gratificacion", "saldo", "fijos", "diaADia", "familia", "estudios", "deudas", "tuvoCredito", "permiso"]);
  });
  it("independiente: mes normal y mes flojo; nunca el día de depósito ni la gratificación", () => {
    const { orden } = recorrer({ nombre: "Beto", trabajo: "independiente", cobro: "variable", ingreso: "2500", flojo: "1200", ...cola });
    expect(orden).toEqual(["nombre", "trabajo", "cobro", "ingreso", "flojo", "gastosTrabajo", "seguro", "saldo", "fijos", "diaADia", "familia", "deudas", "tuvoCredito", "permiso"]);
  });
  it("las opciones de cobro cambian según cómo trabaja", () => {
    const dep = pregunta("cobro", { trabajo: "dependiente" }).opciones!.map(o => o.valor);
    const ind = pregunta("cobro", { trabajo: "independiente" }).opciones!.map(o => o.valor);
    expect(dep).toEqual(["fin_de_mes", "quincena"]);
    expect(ind).toEqual(["diario", "semanal", "quincena", "fin_de_mes", "variable"]);
    expect(() => responder({ trabajo: "dependiente" }, "cobro", "variable")).toThrow(ErrorDatos);
    expect(() => responder({ trabajo: "dependiente" }, "cobro", "semanal")).toThrow(ErrorDatos);
    expect(responder({ trabajo: "independiente" }, "cobro", "variable").borrador.cobro).toBe("variable");
  });
  it("el día de depósito es un entero del 1 al 31", () => {
    for (const malo of ["0", "32", "", "15.5", "quince", "-3", "100"]) {
      expect(() => responder({ trabajo: "dependiente", cobro: "fin_de_mes" }, "diaPago", malo)).toThrow(ErrorDatos);
    }
    expect(responder({}, "diaPago", " 31 ").borrador.diaPago).toBe(31);
    expect(responder({}, "diaPago", "1").borrador.diaPago).toBe(1);
  });
  it("el mes flojo puede ser cero, pero no más que un mes normal", () => {
    const b: Borrador = { trabajo: "independiente", ingreso: soles(2500) };
    expect(responder(b, "flojo", "0").borrador.flojo).toBe(0);
    expect(responder(b, "flojo", "2500").borrador.flojo).toBe(soles(2500));
    expect(() => responder(b, "flojo", "2500.01")).toThrow(ErrorDatos);
    expect(() => responder(b, "flojo", "-1")).toThrow(ErrorDatos);
  });
  it("independiente: el caso proyecta con el mes flojo, en céntimos exactos", () => {
    const { borrador } = recorrer({ nombre: "Beto", trabajo: "independiente", cobro: "semanal", ingreso: "2500", flojo: "1200.40", ...cola });
    const r = aRespuestas(borrador, "2026-11-14");
    expect(r).toMatchObject({ trabajo: "independiente", ingresoMensual: soles(2500), ingresoFlojo: 120_040 });
    expect(r.diaPago).toBeUndefined();
    expect(r.gratificacion).toBeUndefined();
    const caso = armarCaso(r);
    expect(caso.ingresosFijos.reduce((suma, i) => suma + i.monto, 0)).toBe(120_040);
    expect(caso.perfil.tipo).toBe("independiente");
    expect(caso.perfil.descripcion).toMatch(/mes flojo/);
  });
  it("dependiente: el sueldo cae el día que dijo, y el 31 se ajusta en meses cortos", () => {
    const { borrador } = recorrer({ nombre: "Ana", trabajo: "dependiente", cobro: "fin_de_mes", diaPago: "31", ingreso: "3000", gratificacion: "si", ...cola });
    const r = aRespuestas(borrador, "2026-11-14");
    expect(r).toMatchObject({ trabajo: "dependiente", diaPago: 31, gratificacion: true });
    expect(r.ingresoFlojo).toBeUndefined();
    const caso = armarCaso(r);
    expect(caso.perfil.tipo).toBe("dependiente");
    expect(caso.perfil.diasCobro).toEqual([31]);
    expect(caso.ingresosFijos.map(i => i.dia)).toEqual([31]);
    expect(caso.ingresosFijos.reduce((suma, i) => suma + i.monto, 0)).toBe(soles(3000));
    const fechas = aPerfil(caso).movimientos.filter(m => m.monto > 0).map(m => m.fecha);
    // Septiembre tiene 30 días: el depósito del «31» cae el 30, sin correrse a octubre.
    expect(fechas).toContain("2026-09-30");
    expect(fechas).toContain("2026-10-31");
  });
});

describe("montos aproximados: para quien no sabe la cifra exacta", () => {
  const ind: Borrador = { nombre: "Beto", trabajo: "independiente", cobro: "variable" };
  it("acepta texto alrededor del número y números en letras", () => {
    expect(responder(ind, "ingreso", "2500 pero es variable").borrador.ingreso).toBe(soles(2500));
    expect(responder(ind, "ingreso", "más o menos dos mil quinientos").borrador.ingreso).toBe(soles(2500));
    expect(responder({}, "fijos", "unos 900 soles").borrador.fijos).toBe(soles(900));
  });
  it("independiente: un rango da el mes normal y el flojo, y ya no pregunta el flojo", () => {
    const r = responder(ind, "ingreso", "entre 1500 y 3000");
    expect(r.borrador).toMatchObject({ ingreso: soles(3000), flojo: soles(1500) });
    expect(r.dicho).toMatch(/Entre S\/ 1,500\.00 y S\/ 3,000\.00/);
    expect(proximoPaso(r.borrador)).toBe("gastosTrabajo");
    const caso = armarCaso(aRespuestas(recorrer({ nombre: "Beto", trabajo: "independiente", cobro: "variable", ingreso: "de 1500 a 3000", gastosTrabajo: "0", seguro: "0", saldo: "600", fijos: "900", diaADia: "800", familia: "0", deudas: "no", tuvoCredito: "no" }).borrador, "2026-11-14"));
    expect(caso.ingresosFijos.reduce((suma, i) => suma + i.monto, 0)).toBe(soles(1500));
  });
  it("un solo monto sí pregunta el mes flojo", () => {
    expect(proximoPaso(responder(ind, "ingreso", "2500").borrador)).toBe("flojo");
  });
  it("por prudencia: de lo que entra o se tiene usa el menor; de lo que sale, el mayor", () => {
    expect(responder({ trabajo: "dependiente" }, "ingreso", "entre 2000 y 2500").borrador.ingreso).toBe(soles(2000));
    expect(responder({}, "saldo", "entre 300 y 500").borrador.saldo).toBe(soles(300));
    expect(responder({}, "extra", "200 a 400").borrador.extra).toBe(soles(200));
    expect(responder({}, "fijos", "entre 800 y 1000").borrador.fijos).toBe(soles(1000));
    expect(responder({}, "diaADia", "600-900").borrador.diaADia).toBe(soles(900));
    expect(responder({}, "gastosTrabajo", "200 a 300").borrador.gastosTrabajo).toBe(soles(300));
    expect(responder({}, "familia", "entre 100 y 200").borrador.familia).toBe(soles(200));
    expect(responder({}, "fijos", "entre 800 y 1000").dicho).toMatch(/uso S\/ 1,000\.00, por prudencia/);
  });
  it("«no» o «nada» en las preguntas nuevas vale cero; lo incomprensible se rechaza", () => {
    for (const paso of ["extra", "gastosTrabajo", "seguro", "familia", "estudios"] as Paso[]) {
      expect(responder({}, paso, "no").borrador[paso as keyof Borrador]).toBe(0);
      expect(responder({}, paso, "nada").borrador[paso as keyof Borrador]).toBe(0);
      expect(() => responder({}, paso, "depende")).toThrow(ErrorDatos);
    }
    expect(() => responder(ind, "ingreso", "2000 y en diciembre 4000")).toThrow(ErrorDatos);
    expect(() => responder(ind, "ingreso", "no sé")).toThrow(ErrorDatos);
  });
});

describe("las preguntas nuevas llegan al panel", () => {
  it("dependiente: extra, familia y estudios se vuelven ingresos y gastos fijos con el monto exacto", () => {
    const { borrador } = recorrer({ ...comunes, extra: "300.50", familia: "200", estudios: "350", deudas: "no", tuvoCredito: "no" });
    const r = aRespuestas(borrador, "2026-11-14");
    expect(r).toMatchObject({ ingresoExtra: 30_050, apoyoFamilia: soles(200), estudios: soles(350) });
    expect(r.gastosTrabajo).toBeUndefined();
    const caso = armarCaso(r);
    const suma = (lista: { monto: number }[]) => lista.reduce((t, x) => t + x.monto, 0);
    expect(suma(caso.ingresosFijos)).toBe(soles(2500) + 30_050);
    expect(caso.ingresosFijos.find(i => i.descripcion === "Ingreso extra")?.monto).toBe(30_050);
    expect(caso.gastosFijos.find(g => g.categoria === "familia")?.monto).toBe(soles(200));
    expect(caso.gastosFijos.find(g => g.categoria === "educacion")?.monto).toBe(soles(350));
    expect(suma(caso.gastosFijos)).toBe(soles(900 + 800 + 200 + 350));
    expect(caso.perfil.descripcion).toMatch(/apoyo a su familia/);
  });
  it("independiente: gastos del trabajo y seguro, repartidos sin perder un céntimo", () => {
    const { borrador } = recorrer({ nombre: "Beto", trabajo: "independiente", cobro: "variable", ingreso: "entre 1500 y 3000", gastosTrabajo: "300.01", seguro: "80", saldo: "600", fijos: "900", diaADia: "800", familia: "0", deudas: "no", tuvoCredito: "no" });
    const r = aRespuestas(borrador, "2026-11-14");
    expect(r).toMatchObject({ gastosTrabajo: 30_001, seguro: soles(80), apoyoFamilia: 0 });
    expect(r.estudios).toBeUndefined();
    expect(r.ingresoExtra).toBeUndefined();
    const caso = armarCaso(r);
    const trabajo = caso.gastosFijos.filter(g => g.id.startsWith("gasto-trabajo"));
    expect(trabajo.map(g => g.dia)).toEqual([3, 18]);
    expect(trabajo.reduce((t, g) => t + g.monto, 0)).toBe(30_001);
    expect(caso.gastosFijos.some(g => g.categoria === "familia")).toBe(false);
    expect(caso.gastosFijos.find(g => g.categoria === "salud")?.monto).toBe(soles(80));
  });
});

describe("independiente que cobra al día", () => {
  it("puede elegir «Todos los días», responde el mes flojo y el caso sale con ventas diarias", () => {
    expect(() => responder({ trabajo: "dependiente" }, "cobro", "diario")).toThrow(ErrorDatos);
    const { orden, borrador } = recorrer({ nombre: "Beto", trabajo: "independiente", cobro: "diario", ingreso: "2600", flojo: "1300", gastosTrabajo: "0", seguro: "0", saldo: "600", fijos: "900", diaADia: "800", familia: "0", deudas: "no", tuvoCredito: "no" });
    expect(orden).toContain("flojo");
    const r = aRespuestas(borrador, "2026-11-14");
    expect(r).toMatchObject({ trabajo: "independiente", cobro: "diario", ingresoMensual: soles(2600), ingresoFlojo: soles(1300) });
    const caso = armarCaso(r);
    expect(caso.ingresosFijos).toEqual([]);
    expect(caso.movimientos.length).toBeGreaterThan(0);
  });
});
