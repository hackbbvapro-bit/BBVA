import { describe, expect, it } from "vitest";
import { analizar, proyectar, type Proyeccion } from "../motor";
import { aPerfil } from "../datos/aPerfil";
import { datosDeEjemplo } from "../datos/semilla";
import { cambioConSigno, compararEscenario } from "./comparar";

const perfil = aPerfil(datosDeEjemplo());
const analisis = analizar(perfil);
const base = analisis.proyeccion;
const jugada = (id: string) => analisis.jugadas.find(j => j.id === id)!;
const con = (id: string) => proyectar(perfil, { ajustes: jugada(id).ajustes });

describe("compararEscenario con Andrea (cifras del motor)", () => {
  it("pausar suscripciones: antes te faltan S/ 119.07, después tu día más bajo es S/ 42.73 y el cambio cuadra", () => {
    const c = compararEscenario(base, con("jugada-pausar"), jugada("jugada-pausar"));
    expect(c.antes).toMatchObject({ saldo: -11907, etiqueta: "Te faltan", monto: "S/ 119.07", fecha: "2026-11-23" });
    expect(c.despues).toMatchObject({ saldo: 4273, etiqueta: "Te quedan", monto: "S/ 42.73" });
    expect(c.cambio).toBe(16180);
    expect(c.cambio).toBe(c.despues.saldo - c.antes.saldo);
    expect(c.cambio).toBe(jugada("jugada-pausar").libera);
    expect(c.cambioTexto).toBe("+S/ 161.80");
    expect(c.conclusion).toBe("evitado");
    expect(c.titulo).toBe("Evitas el día en rojo");
    expect(c.nota).toBe("No genera intereses, pero revisa si cobran algún cargo.");
  });

  it("recortar salidas: costo conocido de cero, sin nota", () => {
    const c = compararEscenario(base, con("jugada-recortar"), jugada("jugada-recortar"));
    expect([c.despues.saldo, c.cambio, c.conclusion, c.nota]).toEqual([2653, 14560, "evitado", ""]);
  });

  it("pagar solo el mínimo evita el rojo pero la nota dice lo que cuesta (no se vende como gratis)", () => {
    const c = compararEscenario(base, con("jugada-minimo"), jugada("jugada-minimo"));
    expect([c.despues.saldo, c.cambio, c.cambioTexto]).toEqual([32093, 44000, "+S/ 440.00"]);
    expect(c.conclusion).toBe("evitado");
    expect(c.nota).toBe("Cuesta unos S/ 26.16 (estimado).");
  });

  it("las tres opciones cuadran: antes + cambio = después, en céntimos enteros", () => {
    for (const j of analisis.jugadas) {
      const c = compararEscenario(base, con(j.id), j);
      expect(c.antes.saldo + c.cambio).toBe(c.despues.saldo);
      expect(Number.isInteger(c.cambio)).toBe(true);
      expect(c.despues.saldo).toBe(j.saldoMinimoDespues);
    }
  });
});

/** Proyecciones mínimas inventadas para los casos que Andrea no tiene. */
function proy(saldoMinimo: number, extra: Partial<Proyeccion> = {}): Proyeccion {
  const deficit = saldoMinimo < 0
    ? { fecha: "2026-11-20", faltante: -saldoMinimo, faltanteMaximo: -saldoMinimo, fechaFaltanteMaximo: "2026-11-20", causas: [], diasRestantes: 7 }
    : null;
  return { perfilId: "x", desde: "2026-11-13", hasta: "2026-12-12", saldoInicial: 0, dias: [], saldoMinimo, fechaSaldoMinimo: "2026-11-20", saldoFinal: 0, deficit, fueraDeVentana: [], ...extra };
}
const gratis = { costo: 0, certezaCosto: "conocido" as const };

describe("compararEscenario: las otras conclusiones", () => {
  it("reduce pero no elimina", () => {
    const c = compararEscenario(proy(-20000), proy(-5000), gratis);
    expect([c.conclusion, c.cambio, c.cambioTexto, c.titulo]).toEqual(["reducido", 15000, "+S/ 150.00", "Achica el hueco, pero no lo elimina"]);
    expect(c.despues).toMatchObject({ etiqueta: "Te faltan", monto: "S/ 50.00" });
  });

  it("si un pago sale de la ventana, es «aplazado» aunque el rojo desaparezca, y dice cuándo se sigue debiendo", () => {
    const movido = { fecha: "2026-12-20", monto: -60000, descripcion: "Pago Tarjeta Azul", categoria: "deuda" as const, origen: "recurrente" as const };
    const c = compararEscenario(proy(-11907), proy(4000, { fueraDeVentana: [movido] }), gratis);
    expect(c.conclusion).toBe("aplazado");
    expect(c.titulo).toBe("Solo lo aplaza a una fecha posterior");
    expect(c.nota).toMatch(/^Pago Tarjeta Azul \(S\/ 600\.00\) se sigue debiendo el .+\.$/);
  });

  it("si el costo depende de la entidad, la conclusión es incierta aunque el número mejore", () => {
    const c = compararEscenario(proy(-11907), proy(4000), { costo: 0, certezaCosto: "desconocido" });
    expect(c.conclusion).toBe("incierto");
    expect(c.titulo).toBe("Incierto: depende de que la entidad lo acepte");
    expect(c.nota).toBe("");
  });

  it("sin cambio y empeora", () => {
    expect(compararEscenario(proy(-100), proy(-100), gratis)).toMatchObject({ conclusion: "sin_cambio", cambio: 0, cambioTexto: "S/ 0.00", titulo: "No cambia tu día más bajo" });
    expect(compararEscenario(proy(-100), proy(-300), gratis)).toMatchObject({ conclusion: "sin_cambio", cambio: -200, cambioTexto: "−S/ 2.00", titulo: "No mejora tu día en rojo" });
  });

  it("cambioConSigno", () => {
    expect([cambioConSigno(1), cambioConSigno(-1), cambioConSigno(0)]).toEqual(["+S/ 0.01", "−S/ 0.01", "S/ 0.00"]);
  });
});
