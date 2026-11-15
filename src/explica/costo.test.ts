/** Fase 1 · Tarea B: un costo que no se sabe nunca se muestra como «S/ 0.00», «Sin costo» ni «no cuesta dinero». */
import { describe, expect, it } from "vitest";
import { analizar, type CertezaCosto, type Jugada } from "../motor";
import { PERFILES } from "../datos/perfiles";
import { costoCorto, costoEnPalabras, efectoEnPalabras, mejorJugada } from "./explica";
import { datosJugadas } from "../agente/datos";

const GRATIS = /S\/ 0\.00|Sin costo|no cuesta dinero/i;
const c = (costo: number, certezaCosto: CertezaCosto) => ({ costo, certezaCosto });

describe("cómo se dice el costo", () => {
  it.each([
    [c(0, "conocido"), "Sin costo", "no cuesta dinero"],
    [c(1250, "conocido"), "S/ 12.50", "cuesta S/ 12.50"],
    [c(0, "estimado"), "Sin intereses", "no genera intereses, pero revisa si cobran algún cargo"],
    [c(1250, "estimado"), "S/ 12.50 aprox.", "cuesta unos S/ 12.50 (estimado)"],
    [c(0, "desconocido"), "No se sabe", "no sabemos cuánto cuesta: depende de la entidad"],
    [c(1250, "desconocido"), "No se sabe", "no sabemos cuánto cuesta: depende de la entidad"],
  ])("%o → «%s» / «%s»", (j, corto, frase) => {
    expect(costoCorto(j)).toBe(corto);
    expect(costoEnPalabras(j)).toBe(frase);
  });

  it("solo lo conocido en cero suena gratis; lo desconocido nunca lleva monto", () => {
    for (const certeza of ["estimado", "desconocido"] as const) {
      for (const costo of [0, 999]) {
        expect(costoCorto(c(costo, certeza))).not.toMatch(GRATIS);
        expect(costoEnPalabras(c(costo, certeza))).not.toMatch(GRATIS);
      }
    }
    expect(costoCorto(c(999, "desconocido"))).not.toMatch(/S\//);
    expect(costoEnPalabras(c(999, "desconocido"))).not.toMatch(/S\//);
  });

  it("el efecto se dice distinto si elimina, reduce o solo aplaza", () => {
    expect(efectoEnPalabras("elimina")).toBe("Con eso ya no quedas en rojo.");
    expect(efectoEnPalabras("reduce")).toMatch(/^Achica el hueco/);
    expect(efectoEnPalabras("posterga")).toMatch(/se sigue debiendo/);
    expect(efectoEnPalabras("no_mejora")).toMatch(/^Sola no alcanza/);
  });
});

describe("las jugadas reales de las personas de ejemplo", () => {
  it("ninguna con costo incierto se presenta como gratis, y el detalle no dice S/ 0.00", () => {
    for (const p of PERFILES) {
      for (const j of analizar(p).jugadas) {
        expect(j.costoDetalle).not.toContain("S/ 0.00");
        if (j.certezaCosto !== "conocido") expect(`${costoCorto(j)} ${costoEnPalabras(j)}`).not.toMatch(GRATIS);
      }
    }
  });

  it("pagar el mínimo es un costo estimado y se presenta como escenario, no como salida", () => {
    const minimos = PERFILES.flatMap(p => analizar(p).jugadas).filter(j => j.tipo === "pagar_minimo");
    expect(minimos.length).toBeGreaterThan(0);
    for (const j of minimos) {
      expect(j.certezaCosto).toBe("estimado");
      expect(j.detalle).toContain("Es un escenario para entender, no una salida");
      expect(j.costoDetalle).toMatch(/^Unos S\/ \d/);
    }
  });

  it("si la más barata tuviera costo desconocido, no se nombra «la más barata» en ningún lado", () => {
    const perfil = PERFILES.find(p => p.tipo === "independiente")!;
    const analisis = analizar(perfil);
    const [primera, ...resto] = analisis.jugadas;
    expect(primera.resuelve).toBe(true);
    const incierta: Jugada = { ...primera, certezaCosto: "desconocido" };
    const conIncierta = { ...analisis, jugadas: [incierta, ...resto] };
    expect(mejorJugada(conIncierta)?.titulo).not.toBe(primera.titulo);
    expect(datosJugadas(conIncierta)).toMatchObject({ la_mas_barata_que_resuelve_sola: mejorJugada(conIncierta)?.titulo ?? null });
    const vista = datosJugadas(conIncierta).jugadas!.find(j => j.titulo === primera.titulo)!;
    expect(vista).toMatchObject({ certeza_del_costo: "desconocido", cuesta: "no sabemos cuánto cuesta: depende de la entidad" });
  });
});
