import { describe, expect, it } from "vitest";
import { ayudaVisible, preguntasDeRespaldo } from "@/componentes/chat";

describe("Asistente: sin deudas no se sugiere nada de deudas", () => {
  it("el panel «Te ayudo con» oculta la ayuda con deudas", () => {
    expect(ayudaVisible(false).map(a => a.texto).join(" ")).not.toMatch(/deuda/i);
    expect(ayudaVisible(true).map(a => a.texto).join(" ")).toMatch(/deuda/i);
  });
  it("la lista de respaldo no trae preguntas de deudas", () => {
    expect(preguntasDeRespaldo(false).join(" ")).not.toMatch(/deuda|mínimo/i);
    expect(preguntasDeRespaldo(false).length).toBeGreaterThanOrEqual(2);
    expect(preguntasDeRespaldo(true).join(" ")).toMatch(/deuda/i);
  });
});
