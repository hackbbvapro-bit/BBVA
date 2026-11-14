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
  for (let i = 0; i < 20; i++) {
    const paso = proximoPaso(borrador);
    orden.push(paso);
    if (paso === "permiso") return { borrador, orden };
    const valor = respuestas[paso];
    if (valor === undefined) throw new Error(`falta respuesta para ${paso}`);
    borrador = responder(borrador, paso, valor).borrador;
  }
  throw new Error("el guion no termina");
}

const comunes = { nombre: "Lucho", cobro: "fin_de_mes", ingreso: "2500", saldo: "600", fijos: "900", diaADia: "800" };
const rutaDe = (b: Borrador) => {
  const r = aRespuestas(b, "2026-11-14");
  const datos = armarCaso(r);
  const perfil = aPerfil(datos);
  return trazarRuta(perfil, analizar(perfil), hechosDe(datos, tuvoCreditoSegun(r))).id;
};

describe("orden de las preguntas", () => {
  it("sin deudas pregunta si alguna vez tuvo crédito y termina en el permiso", () => {
    const { orden } = recorrer({ ...comunes, deudas: "no", tuvoCredito: "no" });
    expect(orden).toEqual(["nombre", "cobro", "ingreso", "saldo", "fijos", "diaADia", "deudas", "tuvoCredito", "permiso"]);
  });
  it("con una tarjeta al día no pregunta el atraso ni si tuvo crédito", () => {
    const { orden } = recorrer({ ...comunes, deudas: "al_dia", tipoDeuda: "tarjeta", saldoDeuda: "3000", cuotaDeuda: "250" });
    expect(orden).toEqual(["nombre", "cobro", "ingreso", "saldo", "fijos", "diaADia", "deudas", "tipoDeuda", "saldoDeuda", "cuotaDeuda", "permiso"]);
  });
  it("con una deuda personal atrasada pregunta el atraso y si tuvo crédito", () => {
    const { orden } = recorrer({ ...comunes, deudas: "atraso", tipoDeuda: "personal", saldoDeuda: "500", cuotaDeuda: "100", atraso: "uno_a_dos_meses", tuvoCredito: "no" });
    expect(orden).toEqual(["nombre", "cobro", "ingreso", "saldo", "fijos", "diaADia", "deudas", "tipoDeuda", "saldoDeuda", "cuotaDeuda", "atraso", "tuvoCredito", "permiso"]);
  });
  it("la pregunta que toca siempre está entre las previstas, y el avance no se pasa del total", () => {
    let b: Borrador = {};
    const respuestas: Partial<Record<Paso, string>> = { ...comunes, deudas: "atraso", tipoDeuda: "prestamo", saldoDeuda: "8000", cuotaDeuda: "400", atraso: "mas_de_dos_meses" };
    for (let i = 0; i < 20; i++) {
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
    const pasos: Paso[] = ["nombre", "cobro", "ingreso", "saldo", "fijos", "diaADia", "deudas", "tipoDeuda", "saldoDeuda", "cuotaDeuda", "atraso", "tuvoCredito", "permiso"];
    for (const paso of pasos) {
      const p = pregunta(paso, { nombre: "Lucho" });
      expect(p.texto.length).toBeGreaterThan(10);
      if (p.clase === "opciones") expect(p.opciones!.length).toBeGreaterThanOrEqual(2);
      expect(`${p.texto} ${p.ayuda ?? ""}`).not.toMatch(/BBVA/i);
    }
  });
  it("saluda por el apodo y el permiso avisa que el caso sale a servicios externos", () => {
    expect(pregunta("cobro", { nombre: "Lucho" }).texto).toContain("Lucho");
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
      nombre: "Lucho", cobro: "fin_de_mes", ingresoMensual: soles(2500), saldo: soles(600), fijosMensual: soles(900), diaADiaMensual: soles(800),
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
