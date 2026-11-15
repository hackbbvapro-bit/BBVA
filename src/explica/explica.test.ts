import { describe, expect, it } from "vitest";
import { PERFILES } from "../datos/perfiles";
import { analizar, formatoLargo, formatoSoles } from "../motor";
import { aPerfil } from "../datos/aPerfil";
import { armarCaso, tuvoCreditoSegun, type Respuestas } from "../ruta/entrada";
import { fraseLibre, hechosDe, rutaExplicada, trazarRuta } from "../ruta/ruta";
import { CAMBIAR_FECHA_DE_PAGO } from "./educacion";
import { avisos, costoEnPalabras, enLista, mejorJugada, paraVoz, proximosPagos, responderSinIA, resumenHablado } from "./explica";

const [andrea, carlos, lucia] = PERFILES;
const a = { andrea: analizar(andrea), carlos: analizar(carlos), lucia: analizar(lucia) };

describe("avisos", () => {
  it("con déficit: el primero es urgente y dice cuándo, cuánto, por qué y la salida", () => {
    const [primero] = avisos(andrea, a.andrea);
    expect(primero).toMatchObject({ id: "deficit", nivel: "urgente", fecha: "2026-11-23",
      titulo: "En 10 días te faltarían S/ 119.07" });
    expect(primero.cuerpo).toContain("lunes 23 de noviembre");
    expect(primero.cuerpo).toContain("Alquiler y Pago Tarjeta Azul");
    expect(primero.cuerpo).toContain("La salida más barata");
  });

  it("la salida citada es la jugada que resuelve con menor costo", () => {
    const jugada = mejorJugada(a.andrea)!;
    expect(jugada.resuelve).toBe(true);
    expect(a.andrea.jugadas.filter(j => j.resuelve).every(j => j.costo >= jugada.costo)).toBe(true);
    const cuerpo = avisos(andrea, a.andrea)[0].cuerpo;
    expect(cuerpo).toContain(costoEnPalabras(jugada));
    // Su costo es estimado (puede haber cargos por cancelar): nunca se dice «no cuesta dinero».
    expect(jugada.certezaCosto).toBe("estimado");
    expect(cuerpo).not.toContain("no cuesta dinero");
  });

  it("si el hueco crece después del primer día en rojo, dice hasta dónde llega y cuándo", () => {
    const d = a.lucia.proyeccion.deficit!;
    expect(d.faltanteMaximo).toBeGreaterThan(d.faltante);
    const cuerpo = avisos(lucia, a.lucia)[0].cuerpo;
    expect(cuerpo).toContain(`el hueco crece hasta ${formatoSoles(d.faltanteMaximo)} el ${formatoLargo(d.fechaFaltanteMaximo)}`);
    expect(resumenHablado(lucia, a.lucia)).toContain(formatoSoles(d.faltanteMaximo));
  });

  it("si el primer día en rojo ya es el peor, no añade la frase del hueco", () => {
    const d = a.andrea.proyeccion.deficit!;
    expect(d.faltanteMaximo).toBe(d.faltante);
    expect(avisos(andrea, a.andrea)[0].cuerpo).not.toContain("el hueco crece");
  });

  it("sin déficit: el primero es tranquilizador y dice el día más ajustado", () => {
    const [primero] = avisos(carlos, a.carlos);
    expect(primero).toMatchObject({ id: "holgura", nivel: "bien", fecha: a.carlos.proyeccion.fechaSaldoMinimo });
    expect(primero.cuerpo).toContain(formatoSoles(a.carlos.proyeccion.saldoMinimo));
  });

  it("deudas: con varias dice cuál primero; con una sola, que no se quede en el mínimo", () => {
    const deAndrea = avisos(andrea, a.andrea).find(x => x.id === "deuda")!;
    expect(deAndrea.titulo).toBe("Paga primero Tarjeta Azul");
    expect(deAndrea.cuerpo).toContain("100.00 % al año (TCEA)");
    expect(deAndrea.cuerpo).toContain(formatoSoles(a.andrea.deudas!.ahorroVsMinimos));
    expect(avisos(lucia, a.lucia).find(x => x.id === "deuda")!.titulo).toBe("No te quedes en el mínimo de Tarjeta Azul");
  });

  it("si la deuda más cara no tiene TCEA anotada, pide la tasa en vez de afirmar un costo de 0 %", () => {
    const sinTasa = { ...lucia, deudas: lucia.deudas.map(d => ({ ...d, tceaBp: 0 })) };
    const deuda = avisos(sinTasa, analizar(sinTasa)).find(x => x.id === "deuda")!;
    expect(deuda.titulo).toContain("Anota la TCEA de");
    expect(deuda.cuerpo).not.toContain("0.00 %");
    expect(deuda.cuerpo).not.toContain("te ahorras");
  });

  it("si el plan de mínimos no termina, lo dice sin inventar un ahorro", () => {
    const sinFin = { ...a.lucia, deudas: { ...a.lucia.deudas!, ahorroVsMinimos: 0,
      minimos: { ...a.lucia.deudas!.minimos, noTermina: true } } };
    const deuda = avisos(lucia, sinFin).find(x => x.id === "deuda")!;
    expect(deuda.cuerpo).toContain("Pagando solo el mínimo nunca baja");
    expect(deuda.cuerpo).not.toContain("te ahorras");
  });

  it("el aviso de próximo pago no repite una causa del déficit", () => {
    for (const [perfil, analisis] of [[andrea, a.andrea], [carlos, a.carlos], [lucia, a.lucia]] as const) {
      const pago = avisos(perfil, analisis).find(x => x.id === "pago");
      const deficit = analisis.proyeccion.deficit;
      if (pago && deficit) expect(pago.fecha! < deficit.fecha).toBe(true);
    }
  });

  it("los ids no se repiten y siempre hay al menos un aviso", () => {
    for (const [perfil, analisis] of [[andrea, a.andrea], [carlos, a.carlos], [lucia, a.lucia]] as const) {
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
    const texto = resumenHablado(andrea, a.andrea);
    expect(texto).toContain(`Andrea, hoy tienes ${formatoSoles(andrea.saldoActual)}`);
    expect(texto).toContain("En 10 días te faltarían S/ 119.07");
    expect(texto).toContain("paga primero Tarjeta Azul");
  });

  it("enruta por palabras clave a la jugada correcta", () => {
    const minimo = a.andrea.jugadas.find(j => j.tipo === "pagar_minimo")!;
    const pausar = a.andrea.jugadas.find(j => j.tipo === "pausar_suscripciones")!;
    expect(responderSinIA("¿Y si pago solo el mínimo?", andrea, a.andrea)).toContain(minimo.detalle);
    expect(responderSinIA("¿y si pauso mis suscripciones?", andrea, a.andrea)).toContain(pausar.detalle);
    expect(responderSinIA("¿Qué deuda pago primero?", andrea, a.andrea)).toContain("Paga primero Tarjeta Azul");
  });

  it("si pregunta por mover la fecha de pago, explica que no sirve este mes y ofrece lo que sí puede hacer", () => {
    const texto = responderSinIA("¿Puedo mover la fecha de pago de mi tarjeta?", andrea, a.andrea);
    expect(texto).toContain("rige desde el ciclo siguiente");
    expect(texto).toContain(mejorJugada(a.andrea)!.detalle);
    expect(responderSinIA("¿cambio la fecha?", carlos, a.carlos)).toBe(CAMBIAR_FECHA_DE_PAGO);
    // «¿cuál es mi fecha de pago?» no es pedir moverla.
    expect(responderSinIA("¿Cuál es mi fecha de pago?", andrea, a.andrea)).not.toContain("ciclo siguiente");
  });

  it("con un faltante proyectado, el consejo de deudas pide cubrirlo antes de pagar de más", () => {
    const deficit = a.andrea.proyeccion.deficit!;
    const texto = responderSinIA("¿Le adelanto plata a la tarjeta?", andrea, a.andrea);
    expect(texto).toContain(`Ojo: el ${formatoLargo(deficit.fecha)} te faltarían S/ 119.07`);
    expect(texto).toContain("paga solo los mínimos y no adelantes pagos");
    for (const p of [carlos, lucia]) {
      const an = p === carlos ? a.carlos : a.lucia;
      if (an.proyeccion.deficit || !an.deudas?.primera) continue;
      expect(responderSinIA("¿Qué deuda pago primero?", p, an)).not.toContain("Ojo:");
    }
  });

  it("«¿me alcanza para…?» responde con el simulador, no con el resumen", () => {
    expect(responderSinIA("¿Me alcanza para gastar 50 soles?", carlos, a.carlos)).toMatch(/^Sí te alcanza\. Si gastas S\/ 50\.00 mañana/);
    expect(responderSinIA("¿puedo comprar algo de S/ 5,000?", carlos, a.carlos)).toMatch(/^No sin apretarte: con S\/ 5,000\.00/);
    expect(responderSinIA("¿me alcanza para 300 soles?", andrea, a.andrea)).toMatch(/^Ahora no te conviene/);
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

describe("respuestas sin IA cuando hay ruta", () => {
  const respuestas: Respuestas = {
    nombre: "Lucho", cobro: "fin_de_mes", ingresoMensual: 320_000, saldo: 90_000,
    fijosMensual: 110_000, diaADiaMensual: 100_000, deuda: null, tuvoCredito: false, hoy: "2026-11-14",
  };
  const datos = armarCaso(respuestas);
  const perfil = aPerfil(datos);
  const analisis = analizar(perfil);
  const ruta = trazarRuta(perfil, analisis, { ...hechosDe(datos, tuvoCreditoSegun(respuestas)), meta: "construir_historial" });

  it("el caso de prueba elige prepararse para una compra grande", () => {
    expect(ruta.id).toBe("construir_historial");
  });

  it("cuánto queda libre sale del flujo que calculó el motor", () => {
    expect(responderSinIA("¿Cuánto me queda libre al mes?", perfil, analisis, ruta)).toBe(fraseLibre(ruta.flujo));
  });

  it("por dónde empezar, historial y tarjeta con garantía explican la ruta completa con su aviso", () => {
    for (const pregunta of ["¿Por dónde empiezo?", "¿Cómo construyo mi historial?", "¿Qué es una tarjeta con garantía?", "¿Qué me conviene?"]) {
      const texto = responderSinIA(pregunta, perfil, analisis, ruta);
      expect(texto).toBe(rutaExplicada(ruta));
      expect(texto).toContain(ruta.aviso);
    }
  });

  it("un gasto concreto sigue respondiéndose con la simulación, no con la ruta", () => {
    const texto = responderSinIA("¿Me alcanza para un gasto de 200 soles?", perfil, analisis, ruta);
    expect(texto).not.toBe(rutaExplicada(ruta));
    expect(texto).toContain("S/ 200.00");
  });

  it("sin ruta se comporta igual que antes", () => {
    expect(responderSinIA("¿Por dónde empiezo?", andrea, a.andrea)).toBe(resumenHablado(andrea, a.andrea));
  });
});
