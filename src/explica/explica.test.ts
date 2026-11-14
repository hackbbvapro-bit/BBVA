import { describe, expect, it } from "vitest";
import { PERFILES } from "../datos/perfiles";
import { analizar, formatoSoles } from "../motor";
import { avisos, enLista, mejorJugada, paraVoz, proximosPagos, responderSinIA, resumenHablado } from "./explica";

const [rosa, carlos, lucia] = PERFILES;
const a = { rosa: analizar(rosa), carlos: analizar(carlos), lucia: analizar(lucia) };

describe("avisos", () => {
  it("con déficit: el primero es urgente y dice cuándo, cuánto, por qué y la salida", () => {
    const [primero] = avisos(rosa, a.rosa);
    expect(primero).toMatchObject({ id: "deficit", nivel: "urgente", fecha: "2026-11-23",
      titulo: "En 10 días te faltarán S/ 200.00" });
    expect(primero.cuerpo).toContain("lunes 23 de noviembre");
    expect(primero.cuerpo).toContain("Alquiler y Pago Tarjeta Azul");
    expect(primero.cuerpo).toContain("La salida más barata");
  });

  it("la salida citada es la jugada que resuelve con menor costo", () => {
    const jugada = mejorJugada(a.rosa)!;
    expect(jugada.resuelve).toBe(true);
    expect(a.rosa.jugadas.filter(j => j.resuelve).every(j => j.costo >= jugada.costo)).toBe(true);
    expect(avisos(rosa, a.rosa)[0].cuerpo).toContain(jugada.costo > 0 ? formatoSoles(jugada.costo) : "no cuesta dinero");
  });

  it("sin déficit: el primero es tranquilizador y dice el día más ajustado", () => {
    const [primero] = avisos(carlos, a.carlos);
    expect(primero).toMatchObject({ id: "holgura", nivel: "bien", fecha: a.carlos.proyeccion.fechaSaldoMinimo });
    expect(primero.cuerpo).toContain(formatoSoles(a.carlos.proyeccion.saldoMinimo));
  });

  it("deudas: con varias dice cuál primero; con una sola, que no se quede en el mínimo", () => {
    const deRosa = avisos(rosa, a.rosa).find(x => x.id === "deuda")!;
    expect(deRosa.titulo).toBe("Paga primero Tarjeta Azul");
    expect(deRosa.cuerpo).toContain("100.00 % al año (TCEA)");
    expect(deRosa.cuerpo).toContain(formatoSoles(a.rosa.deudas!.ahorroVsMinimos));
    expect(avisos(lucia, a.lucia).find(x => x.id === "deuda")!.titulo).toBe("No te quedes en el mínimo de Tarjeta Azul");
  });

  it("si el plan de mínimos no termina, lo dice sin inventar un ahorro", () => {
    const sinFin = { ...a.lucia, deudas: { ...a.lucia.deudas!, ahorroVsMinimos: 0,
      minimos: { ...a.lucia.deudas!.minimos, noTermina: true } } };
    const deuda = avisos(lucia, sinFin).find(x => x.id === "deuda")!;
    expect(deuda.cuerpo).toContain("Pagando solo el mínimo nunca baja");
    expect(deuda.cuerpo).not.toContain("te ahorras");
  });

  it("el aviso de próximo pago no repite una causa del déficit", () => {
    for (const [perfil, analisis] of [[rosa, a.rosa], [carlos, a.carlos], [lucia, a.lucia]] as const) {
      const pago = avisos(perfil, analisis).find(x => x.id === "pago");
      const deficit = analisis.proyeccion.deficit;
      if (pago && deficit) expect(pago.fecha! < deficit.fecha).toBe(true);
    }
  });

  it("los ids no se repiten y siempre hay al menos un aviso", () => {
    for (const [perfil, analisis] of [[rosa, a.rosa], [carlos, a.carlos], [lucia, a.lucia]] as const) {
      const ids = avisos(perfil, analisis).map(x => x.id);
      expect(ids.length).toBeGreaterThan(0);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe("próximos pagos", () => {
  it("solo salidas fijas, en orden de fecha y dentro del plazo", () => {
    const pagos = proximosPagos(a.carlos, 10);
    expect(pagos.length).toBeGreaterThan(0);
    expect(pagos.every(p => p.monto < 0 && p.origen === "recurrente" && p.fecha <= "2026-11-23")).toBe(true);
    expect(pagos.map(p => p.fecha)).toEqual([...pagos.map(p => p.fecha)].sort());
    expect(proximosPagos(a.carlos, 1)).toEqual([]);
  });
});

describe("resumen hablado y respuestas sin IA", () => {
  it("el resumen nombra a la persona, su saldo y el aviso principal", () => {
    const texto = resumenHablado(rosa, a.rosa);
    expect(texto).toContain(`Rosa, hoy tienes ${formatoSoles(rosa.saldoActual)}`);
    expect(texto).toContain("En 10 días te faltarán S/ 200.00");
    expect(texto).toContain("paga primero Tarjeta Azul");
  });

  it("enruta por palabras clave a la jugada correcta", () => {
    const minimo = a.rosa.jugadas.find(j => j.tipo === "pagar_minimo")!;
    const mover = a.rosa.jugadas.find(j => j.tipo === "mover_pago")!;
    expect(responderSinIA("¿Y si pago solo el mínimo?", rosa, a.rosa)).toContain(minimo.detalle);
    expect(responderSinIA("puedo mover la fecha?", rosa, a.rosa)).toContain(mover.detalle);
    expect(responderSinIA("¿Qué deuda pago primero?", rosa, a.rosa)).toContain("Paga primero Tarjeta Azul");
  });

  it("«¿me alcanza para…?» responde con el simulador, no con el resumen", () => {
    expect(responderSinIA("¿Me alcanza para gastar 50 soles?", carlos, a.carlos)).toMatch(/^Sí te alcanza\. Si gastas S\/ 50\.00 mañana/);
    expect(responderSinIA("¿puedo comprar algo de S/ 5,000?", carlos, a.carlos)).toMatch(/^No sin apretarte: con S\/ 5,000\.00/);
    expect(responderSinIA("¿me alcanza para 300 soles?", rosa, a.rosa)).toMatch(/^Ahora no te conviene/);
  });

  it("si no entiende la pregunta, da el resumen; nunca queda vacío", () => {
    expect(responderSinIA("hola", carlos, a.carlos)).toBe(resumenHablado(carlos, a.carlos));
    expect(responderSinIA("", lucia, a.lucia).length).toBeGreaterThan(20);
    expect(responderSinIA("gastos", carlos, a.carlos)).toContain("al mes");
  });
});

describe("texto para voz", () => {
  it("dice los montos como se hablan", () => {
    expect(paraVoz("Te faltarán S/ 200.00")).toBe("Te faltarán 200 soles");
    expect(paraVoz("Cuesta S/ 4.64")).toBe("Cuesta 4 soles con 64 céntimos");
    expect(paraVoz("Ahorras S/ 1,206.37")).toBe("Ahorras 1206 soles con 37 céntimos");
    expect(paraVoz("Saldo -S/ 25.30")).toBe("Saldo menos 25 soles con 30 céntimos");
    expect(paraVoz("S/ 1.00 y S/ 0.05")).toBe("1 sol y 0 soles con 5 céntimos");
    expect(paraVoz("S/ 180")).toBe("180 soles");
  });

  it("porcentajes, siglas y símbolos", () => {
    expect(paraVoz("100.00 % al año (TCEA)")).toBe("100 por ciento al año");
    expect(paraVoz("TCEA de 89.99 %")).toBe("tasa de costo anual de 89 coma 99 por ciento");
    expect(paraVoz("Recorta 30 %")).toBe("Recorta 30 por ciento");
    expect(paraVoz("**Hola**  mundo\n# título")).toBe("Hola mundo título");
  });

  it("enLista", () => {
    expect(enLista([])).toBe("");
    expect(enLista(["a"])).toBe("a");
    expect(enLista(["a", "b", "a"])).toBe("a y b");
    expect(enLista(["a", "b", "c"])).toBe("a, b y c");
  });
});
