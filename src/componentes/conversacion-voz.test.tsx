import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ConversacionVoz, SIN_SOPORTE } from "@/componentes/conversacion-voz";
import type { Fase } from "@/cliente/conversacion";

const accion = () => undefined;
const vista = (fase: Fase, soporte: "si" | "no" | "desconocido" = "si", mensaje = "") =>
  renderToStaticMarkup(
    <ConversacionVoz
      estado={{ fase, mensaje }}
      soporte={soporte}
      parcial=""
      alActivar={accion}
      alTerminar={accion}
      alInterrumpir={accion}
    />,
  );

describe("Conversación por voz (presentación)", () => {
  it("apagada ofrece el botón para hablar", () => {
    const html = vista("apagado");
    expect(html).toContain("Hablar con el copiloto");
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain("Terminar conversación");
  });
  it("muestra el estado en texto y permite terminar o interrumpir", () => {
    expect(vista("escuchando")).toContain("Te escucho…");
    expect(vista("pensando")).toContain("Pensando…");
    const hablando = vista("hablando");
    expect(hablando).toContain("Hablando… toca para interrumpir");
    expect(hablando).toContain("Terminar conversación");
    expect(hablando).toContain("Interrumpir");
  });
  it("sin soporte de voz explica el motivo en español y no ofrece el botón", () => {
    const html = vista("apagado", "no");
    expect(html).toContain(SIN_SOPORTE);
    expect(html).not.toContain("Hablar con el copiloto");
  });
  it("un error se anuncia como alerta", () => {
    const html = vista("error", "si", "Activa el micrófono");
    expect(html).toContain('role="alert"');
    expect(html).toContain("Activa el micrófono");
    expect(html).toContain("Hablar con el copiloto");
  });
});
