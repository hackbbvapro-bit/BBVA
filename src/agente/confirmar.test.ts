/**
 * Antes de guardar algo que cambia mucho los números, el asistente pregunta. Caso real de la prueba del
 * equipo: por voz se dijo «me presté para comprar mi departamento, fueron unos 800,000 soles» y quedó
 * anotado un gasto de S/ 800,000 sin preguntar.
 */
import { describe, expect, it, vi } from "vitest";
import { aPerfil } from "../datos/aPerfil";
import { datosDeEjemplo } from "../datos/semilla";
import { analizar } from "../motor";
import { crearHerramientas } from "./herramientas";
import {
  PREGUNTA_CONFIRMAR, efectoDe, foto, interpretarRegistro, pideConfirmacion, responderRegistro, yaPreguntoPor,
  type Accion, type MensajeSimple, type Situacion,
} from "./registro";

/** Alguien con S/ 80,000 en la cuenta y sin ningún día en rojo. */
function holgada(): Situacion {
  const perfil = { ...aPerfil(datosDeEjemplo()), saldoActual: 8_000_000 };
  return { perfil, cobros: [] };
}
const HOY = holgada().perfil.hoy;
const FRASE_REAL =
  "sí Bueno tengo un historial de préstamos muy breve de la vez que de la de la vez de cuando de cuando me preste para para comprar mi departamento fueron unos 800,000 soles";

describe("«me presté» es pedir prestado, no un gasto", () => {
  it("la frase real de la prueba ya no se lee como un gasto de 800,000", () => {
    const lectura = interpretarRegistro(FRASE_REAL, HOY);
    expect(lectura?.tipo).toBe("guia");
    expect(responderRegistro([{ rol: "usuario", texto: FRASE_REAL }], holgada())?.accion).toBeUndefined();
  });

  it("«le presté 50 a mi hermano» sigue siendo plata que salió", () => {
    expect(interpretarRegistro("le presté 50 soles a mi hermano", HOY)).toMatchObject({ tipo: "accion", accion: { tipo: "saldo", monto: -5_000 } });
  });

  it("«de la vez que…» no se toma como el nombre del gasto", () => {
    const lectura = interpretarRegistro("de la vez que pagué 100 soles", HOY);
    expect(lectura).toMatchObject({ tipo: "accion", accion: { descripcion: "Gasto" } });
  });
});

describe("pideConfirmacion", () => {
  const gasto = (monto: number): Accion => ({ tipo: "saldo", monto: -monto, descripcion: "Gasto" });
  it("la situación de prueba no tiene días en rojo", () => {
    expect(foto(holgada()).enRojoDesde).toBeNull();
  });
  it("un gasto chico se anota sin preguntar", () => {
    expect(pideConfirmacion(gasto(8_000), efectoDe(gasto(8_000), holgada()))).toBe(false);
  });
  it("un gasto mayor que todo el saldo, o que deja en rojo, pide confirmación", () => {
    expect(pideConfirmacion(gasto(80_000_000), efectoDe(gasto(80_000_000), holgada()))).toBe(true);
  });
  it("un ingreso nunca pide confirmación", () => {
    const ingreso: Accion = { tipo: "saldo", monto: 80_000_000, descripcion: "Ingreso extra" };
    expect(pideConfirmacion(ingreso, efectoDe(ingreso, holgada()))).toBe(false);
  });
});

describe("responderRegistro: primero pregunta, guarda con el «sí»", () => {
  const dicho: MensajeSimple = { rol: "usuario", texto: "gasté 800,000 soles en un departamento" };

  it("un gasto enorme no se guarda: muestra el efecto y pregunta", () => {
    const r = responderRegistro([dicho], holgada());
    expect(r?.accion).toBeUndefined();
    expect(r?.texto).toContain("S/ 800,000.00");
    expect(r?.texto).toContain(PREGUNTA_CONFIRMAR);
    expect(r?.texto).not.toContain("Anotado");
  });

  it("con «sí» se guarda, y con las cifras del motor", () => {
    const pregunta = responderRegistro([dicho], holgada())!.texto;
    for (const si of ["sí", "Sí, anótalo", "dale", "ya", "correcto"]) {
      const r = responderRegistro([dicho, { rol: "asistente", texto: pregunta }, { rol: "usuario", texto: si }], holgada());
      expect(r?.accion, si).toEqual({ tipo: "saldo", monto: -80_000_000, descripcion: "Gasto: Departamento" });
      expect(r?.texto, si).toContain("Anotado");
    }
  });

  it("con «no» no se guarda nada", () => {
    const pregunta = responderRegistro([dicho], holgada())!.texto;
    const r = responderRegistro([dicho, { rol: "asistente", texto: pregunta }, { rol: "usuario", texto: "no, mejor no" }], holgada());
    expect(r?.accion).toBeUndefined();
    expect(r?.texto).toContain("no anoté nada");
  });

  it("si corrige el monto, no se guarda el anterior", () => {
    const pregunta = responderRegistro([dicho], holgada())!.texto;
    const r = responderRegistro([dicho, { rol: "asistente", texto: pregunta }, { rol: "usuario", texto: "no, eran 80,000" }], holgada());
    expect(r?.accion).toBeUndefined();
  });

  it("un «sí» suelto, sin que el código haya preguntado antes, no anota nada", () => {
    const r = responderRegistro([dicho, { rol: "asistente", texto: "¿Quieres ver tus jugadas? S/ 800,000.00" }, { rol: "usuario", texto: "sí" }], holgada());
    expect(r).toBeNull();
  });

  it("un «sí» después de algo ya anotado no lo anota otra vez", () => {
    const chico: MensajeSimple = { rol: "usuario", texto: "gasté 80 soles en el mercado" };
    const anotado = responderRegistro([chico], holgada());
    expect(anotado?.accion).toBeDefined();
    expect(responderRegistro([chico, { rol: "asistente", texto: anotado!.texto }, { rol: "usuario", texto: "sí" }], holgada())).toBeNull();
  });
});

describe("herramientas de la IA: «confirmado» lo comprueba el código", () => {
  function armar(ultimoDelAsistente?: string) {
    const { perfil } = holgada();
    const alAccion = vi.fn<(a: Accion, t: string) => void>();
    const herramientas = crearHerramientas(perfil, analizar(perfil), undefined, { alAccion, ultimoDelAsistente });
    const correr = async (entrada: object) =>
      JSON.parse(String(await herramientas.find(h => h.name === "anotar_gasto")?.run(entrada as never)));
    return { alAccion, correr };
  }
  const gasto = { monto: "800,000", cuando: "ya_paso", descripcion: "Departamento", anotar: true };

  it("un gasto enorme no se guarda y la herramienta pide confirmar", async () => {
    const { alAccion, correr } = armar();
    const r = await correr(gasto);
    expect(r.anotado_en_su_panel).toBe(false);
    expect(r.necesita_confirmacion).toBeDefined();
    expect(r.respuesta_sugerida).toContain(PREGUNTA_CONFIRMAR);
    expect(alAccion).not.toHaveBeenCalled();
  });

  it("confirmado=true no basta si el asistente no preguntó antes por ese monto", async () => {
    const { alAccion, correr } = armar("Tu saldo de hoy es S/ 80,000.00.");
    expect((await correr({ ...gasto, confirmado: true })).anotado_en_su_panel).toBe(false);
    expect(alAccion).not.toHaveBeenCalled();
  });

  it("si preguntó por ese monto y la persona dijo que sí, se guarda", async () => {
    const { alAccion, correr } = armar("Serían −S/ 800,000.00 y quedarías en rojo. ¿Lo anoto?");
    expect((await correr({ ...gasto, confirmado: true })).anotado_en_su_panel).toBe(true);
    expect(alAccion).toHaveBeenCalledTimes(1);
  });

  it("un gasto chico sigue anotándose al instante", async () => {
    const { alAccion, correr } = armar();
    expect((await correr({ ...gasto, monto: "80" })).anotado_en_su_panel).toBe(true);
    expect(alAccion).toHaveBeenCalledTimes(1);
  });

  it("yaPreguntoPor exige una pregunta con el monto exacto", () => {
    const accion: Accion = { tipo: "saldo", monto: -80_000_000, descripcion: "Gasto" };
    expect(yaPreguntoPor(accion, "¿Anoto S/ 800,000.00?")).toBe(true);
    expect(yaPreguntoPor(accion, "¿Anoto S/ 80,000.00?")).toBe(false);
    expect(yaPreguntoPor(accion, "Anoté S/ 800,000.00.")).toBe(false);
    expect(yaPreguntoPor(accion, undefined)).toBe(false);
  });
});
