import { describe, expect, it } from "vitest";
import {
  ESTADO_INICIAL,
  debeEscuchar,
  estaActiva,
  reducir,
  textoEstado,
  type EstadoConversacion,
  type EventoConversacion,
  type Fase,
} from "./conversacion";

const e = (fase: Fase, mensaje = ""): EstadoConversacion => ({ fase, mensaje });
const correr = (inicio: EstadoConversacion, ...eventos: EventoConversacion[]) =>
  eventos.reduce(reducir, inicio);
const habla: EventoConversacion = { tipo: "hablaUsuario", texto: "¿Cómo llego a fin de mes?" };

describe("conversación manos libres", () => {
  it("empieza apagada y solo activar la enciende", () => {
    expect(ESTADO_INICIAL.fase).toBe("apagado");
    expect(reducir(ESTADO_INICIAL, { tipo: "activar" }).fase).toBe("escuchando");
    const otros: EventoConversacion[] = [
      habla,
      { tipo: "silencio" },
      { tipo: "respuestaLista" },
      { tipo: "finVoz" },
      { tipo: "interrumpir" },
      { tipo: "desactivar" },
      { tipo: "fallo", mensaje: "x" },
    ];
    for (const ev of otros) expect(reducir(ESTADO_INICIAL, ev)).toBe(ESTADO_INICIAL);
  });

  it("ciclo completo: escucha, piensa, habla y vuelve a escuchar", () => {
    const fases: Fase[] = [];
    let s = ESTADO_INICIAL;
    const eventos: EventoConversacion[] = [
      { tipo: "activar" },
      habla,
      { tipo: "respuestaLista" },
      { tipo: "finVoz" },
    ];
    for (const ev of eventos) {
      s = reducir(s, ev);
      fases.push(s.fase);
    }
    expect(fases).toEqual(["escuchando", "pensando", "hablando", "escuchando"]);
  });

  it("el silencio no cambia nada y un texto vacío no se envía", () => {
    const s = e("escuchando");
    expect(reducir(s, { tipo: "silencio" })).toBe(s);
    expect(reducir(s, { tipo: "hablaUsuario", texto: "   " })).toBe(s);
  });

  it("semidúplex: no atiende voz del usuario mientras piensa o habla", () => {
    expect(reducir(e("pensando"), habla).fase).toBe("pensando");
    expect(reducir(e("hablando"), habla).fase).toBe("hablando");
    expect(debeEscuchar(e("escuchando"))).toBe(true);
    for (const f of ["apagado", "pensando", "hablando", "error"] as Fase[]) expect(debeEscuchar(e(f))).toBe(false);
  });

  it("interrumpir mientras habla corta la voz y vuelve a escuchar", () => {
    expect(reducir(e("hablando"), { tipo: "interrumpir" }).fase).toBe("escuchando");
    expect(reducir(e("escuchando"), { tipo: "interrumpir" }).fase).toBe("escuchando");
    expect(reducir(e("pensando"), { tipo: "interrumpir" }).fase).toBe("pensando");
  });

  it("ignora respuestas o fin de voz que llegan tarde", () => {
    expect(reducir(e("escuchando"), { tipo: "respuestaLista" }).fase).toBe("escuchando");
    expect(reducir(e("apagado"), { tipo: "finVoz" }).fase).toBe("apagado");
    expect(reducir(e("pensando"), { tipo: "finVoz" }).fase).toBe("pensando");
    // interrumpió y la respuesta vieja llega después:
    expect(correr(e("hablando"), { tipo: "interrumpir" }, { tipo: "respuestaLista" }).fase).toBe("escuchando");
  });

  it("un fallo lleva a error con mensaje, desde cualquier estado encendido", () => {
    for (const f of ["escuchando", "pensando", "hablando", "error"] as Fase[]) {
      const s = reducir(e(f), { tipo: "fallo", mensaje: "Sin micrófono" });
      expect(s).toEqual({ fase: "error", mensaje: "Sin micrófono" });
    }
    expect(reducir(e("escuchando"), { tipo: "fallo", mensaje: "" }).mensaje).not.toBe("");
  });

  it("desde error se puede reintentar o apagar", () => {
    const s = e("error", "algo");
    expect(reducir(s, { tipo: "activar" })).toEqual(e("escuchando"));
    expect(reducir(s, { tipo: "desactivar" })).toEqual(e("apagado"));
  });

  it("desactivar apaga desde cada estado y limpia el mensaje", () => {
    for (const f of ["escuchando", "pensando", "hablando", "error"] as Fase[]) {
      expect(reducir(e(f, "m"), { tipo: "desactivar" })).toEqual(e("apagado"));
    }
  });

  it("activar estando ya activa no reinicia nada", () => {
    for (const f of ["escuchando", "pensando", "hablando"] as Fase[]) {
      const s = e(f);
      expect(reducir(s, { tipo: "activar" })).toBe(s);
    }
  });

  it("textos de estado y actividad", () => {
    expect(textoEstado("escuchando")).toBe("Te escucho…");
    expect(textoEstado("pensando")).toBe("Pensando…");
    expect(textoEstado("hablando")).toBe("Hablando… toca para interrumpir");
    expect(textoEstado("apagado")).toBe("");
    expect(estaActiva(e("hablando"))).toBe(true);
    expect(estaActiva(e("error"))).toBe(false);
    expect(estaActiva(e("apagado"))).toBe(false);
  });
});
