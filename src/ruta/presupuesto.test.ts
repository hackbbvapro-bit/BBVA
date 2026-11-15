import { describe, expect, it } from "vitest";
import { analizar, formatoLargo, soles, sumar } from "../motor";
import { aPerfil } from "../datos/aPerfil";
import { datosDeEjemplo } from "../datos/semilla";
import { CATALOGO } from "../recomendaciones/catalogo";
import { armarCaso, tuvoCreditoSegun, type Respuestas } from "./entrada";
import { PREGUNTAS, planDelMes, productosDeLaRuta } from "./presupuesto";
import { hechosDe, trazarRuta } from "./ruta";

const base: Respuestas = {
  nombre: "Lucía", cobro: "fin_de_mes", ingresoMensual: soles(2500), saldo: soles(600),
  fijosMensual: soles(900), diaADiaMensual: soles(800), deuda: null, tuvoCredito: false, hoy: "2026-11-14",
};
const con = (c: Partial<Respuestas>): Respuestas => ({ ...base, ...c });
const tarjeta = (saldo: number, cuota: number) => ({ tipo: "tarjeta" as const, saldo: soles(saldo), cuota: soles(cuota), atraso: "al_dia" as const });
function caso(r: Respuestas) {
  const datos = armarCaso(r);
  const perfil = aPerfil(datos);
  const analisis = analizar(perfil);
  const ruta = trazarRuta(perfil, analisis, { ...hechosDe(datos, tuvoCreditoSegun(r)), meta: r.meta ?? "ahorrar" });
  return { perfil, analisis, ruta, plan: planDelMes(perfil, analisis, ruta) };
}

describe("planDelMes: Andrea (le falta plata cada mes)", () => {
  const datos = datosDeEjemplo();
  const perfil = aPerfil(datos);
  const analisis = analizar(perfil);
  const ruta = trazarRuta(perfil, analisis, hechosDe(datos));
  const plan = planDelMes(perfil, analisis, ruta);

  it("dice cuánto falta, con la misma cifra de su ruta", () => {
    expect(plan.libre).toBe(ruta.flujo.libre);
    expect(plan.libre).toBe(-56470);
    expect(plan.alcanza).toBe(false);
    expect(plan.titulo).toBe("Cada mes te faltan S/ 564.70");
  });

  it("propone palancas calculadas con sus datos: suscripciones y pagar solo el mínimo de las tarjetas", () => {
    expect(plan.partidas.map(p => [p.id, p.monto])).toEqual([["suscripciones", 16180], ["solo-minimos", 51000]]);
    expect(plan.partidas[0].detalle).toMatch(/Streaming/);
    expect(plan.partidas[1].detalle).toMatch(/más intereses/);
    // 161.80 + 510.00 − 564.70 = 107.10
    expect(plan.nota).toBe("Con estas palancas juntas cierras el hueco y te quedarían S/ 107.10 al mes.");
  });

  it("todos los montos son céntimos enteros y positivos", () => {
    for (const p of plan.partidas) expect(Number.isInteger(p.monto) && p.monto > 0).toBe(true);
  });
});

describe("planDelMes: cuando sobra, lo libre se reparte sin perder un céntimo", () => {
  it("al día con deuda: todo lo libre a la deuda más cara", () => {
    const { plan, ruta } = caso(con({ meta: "salir_deudas", saldo: soles(1500), deuda: tarjeta(3000, 250) }));
    expect(ruta.id).toBe("salir_deudas");
    expect(plan.alcanza).toBe(true);
    expect(plan.partidas).toHaveLength(1);
    expect(plan.partidas[0].id).toBe("deuda");
    expect(plan.partidas[0].monto).toBe(soles(550));
  });

  it("construir historial: tope de uso = la mitad de lo libre (redondeada abajo) y el resto al colchón", () => {
    const { plan, ruta } = caso(con({ meta: "construir_historial" }));
    expect(ruta.id).toBe("construir_historial");
    expect(plan.partidas.map(p => [p.id, p.monto])).toEqual([["uso-credito", soles(400)], ["colchon", soles(400)]]);
    const impar = caso(con({ meta: "construir_historial", ingresoMensual: soles(2500) + 1 }));
    expect(sumar(impar.plan.partidas.map(p => p.monto))).toBe(impar.plan.libre);
    expect(impar.plan.partidas[0].monto).toBeLessThanOrEqual(impar.plan.partidas[1].monto);
  });

  it("hacer crecer con colchón incompleto: todo al colchón y dice en cuántos meses llega", () => {
    const { plan, ruta } = caso(con({ meta: "hacer_crecer", tuvoCredito: true }));
    expect(ruta.id).toBe("hacer_crecer");
    expect(plan.partidas.map(p => [p.id, p.monto])).toEqual([["colchon", soles(800)]]);
    expect(plan.partidas[0].detalle).toMatch(/6 meses/);
  });

  it("hacer crecer con lo que falta del colchón menor que lo libre: colchón y el resto a plazo largo", () => {
    const { plan } = caso(con({ meta: "hacer_crecer", tuvoCredito: true, saldo: soles(5000) }));
    expect(plan.partidas.map(p => [p.id, p.monto])).toEqual([["colchon", soles(100)], ["plazo-largo", soles(700)]]);
  });

  it("hacer crecer con colchón completo: todo a plazo largo", () => {
    const { plan } = caso(con({ meta: "hacer_crecer", tuvoCredito: true, saldo: soles(9000) }));
    expect(plan.partidas.map(p => [p.id, p.monto])).toEqual([["plazo-largo", soles(800)]]);
  });

  it("con un día en rojo y algo libre: primero guardar para ese día, sin extra a las deudas", () => {
    const { plan, analisis } = caso(con({ meta: "salir_deudas", saldo: soles(20), deuda: tarjeta(3000, 250), cobro: "semanal" }));
    const d = analisis.proyeccion.deficit;
    expect(d).toBeTruthy(); expect(plan.libre).toBeGreaterThan(0); if (!d) return;
    expect(plan.partidas[0].id).toBe("hueco");
    expect(plan.partidas[0].titulo).toBe(`Guardar para el ${formatoLargo(d.fecha)}`);
    expect(plan.partidas.some(p => p.id === "deuda")).toBe(false);
  });

  for (const r of [base, con({ meta: "hacer_crecer", tuvoCredito: true }), con({ meta: "hacer_crecer", tuvoCredito: true, saldo: soles(5000) }), con({ meta: "salir_deudas", saldo: soles(1500), deuda: tarjeta(3000, 250) })]) {
    it(`suma exacta (${r.tuvoCredito ? "con" : "sin"} crédito, saldo ${r.saldo})`, () => {
      const { plan } = caso(r);
      expect(sumar(plan.partidas.map(p => p.monto))).toBe(plan.libre);
    });
  }

  it("sin nada libre y sin palancas: lo dice sin inventar cifras", () => {
    const { plan } = caso(con({ saldo: soles(9000), ingresoMensual: soles(1700) }));
    expect(plan.libre).toBe(0);
    expect(plan.alcanza).toBe(false);
    expect(plan.titulo).toBe("Este mes no te sobra nada");
    expect(plan.partidas).toEqual([]);
  });
});

describe("productosDeLaRuta", () => {
  it("respeta lo que decidió el motor como «ahora» y suma lo que viene después", () => {
    const datos = datosDeEjemplo();
    const perfil = aPerfil(datos);
    const ruta = trazarRuta(perfil, analizar(perfil), hechosDe(datos));
    const p = productosDeLaRuta(ruta);
    expect(p.map(x => [x.entrada.id, x.cuando])).toEqual([["reprogramar", "ahora"], ["cuenta-de-ahorro", "despues"]]);
  });

  it("el fondo mutuo nunca aparece «ahora» si el colchón no está completo", () => {
    const { ruta } = caso(con({ meta: "hacer_crecer", tuvoCredito: true }));
    expect(productosDeLaRuta(ruta).find(x => x.entrada.id === "fondo-mutuo")?.cuando).toBe("despues");
    const completo = caso(con({ meta: "hacer_crecer", tuvoCredito: true, saldo: soles(9000) })).ruta;
    expect(productosDeLaRuta(completo).filter(x => x.entrada.id === "fondo-mutuo")).toEqual([expect.objectContaining({ cuando: "ahora" })]);
  });

  it("cada tipo de producto trae preguntas para el banco, sin cifras ni marcas", () => {
    for (const e of CATALOGO) {
      expect(PREGUNTAS[e.id].length).toBeGreaterThanOrEqual(3);
      for (const q of PREGUNTAS[e.id]) {
        expect(q).not.toMatch(/\d|%|S\/|BBVA|Interbank|BCP|Scotiabank/i);
      }
    }
  });
});
