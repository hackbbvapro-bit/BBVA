"use client";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PERFILES } from "@/datos/perfiles";
import { analizar } from "@/motor";
import { datosDeEjemplo } from "@/datos/semilla";
import { DatosDePrueba } from "@/componentes/datos";
import { Chat, preguntaTrasGuardar, RUTA_PDF_EJEMPLO } from "@/componentes/chat";

const voz = { leer: () => undefined, detener: () => undefined, sonando: false };

describe("subir un documento desde el asistente", () => {
  it("el chat trae el botón de subir, cerrado al entrar y sin selector de archivo a la vista", () => {
    const perfil = PERFILES[0];
    for (const demo of [true, false]) {
      const html = renderToStaticMarkup(
        <DatosDePrueba datos={datosDeEjemplo()}>
          <Chat perfil={perfil} analisis={analizar(perfil)} demo={demo} {...voz} />
        </DatosDePrueba>,
      );
      expect(html).toContain('aria-label="Subir un documento"');
      expect(html).toContain('aria-expanded="false"');
      expect(html).not.toContain('type="file"');
    }
  });

  it("la pregunta posterior la redacta el código con los conteos, con plurales correctos", () => {
    expect(preguntaTrasGuardar({ deudas: 1, cobros: 0 })).toBe("Subí un documento y guardé 1 deuda. ¿Qué cambia en mi plan?");
    expect(preguntaTrasGuardar({ deudas: 3, cobros: 1 })).toBe("Subí un documento y guardé 3 deudas y 1 cobro pendiente. ¿Qué cambia en mi plan?");
    expect(preguntaTrasGuardar({ deudas: 0, cobros: 2 })).toBe("Subí un documento y guardé 2 cobros pendientes. ¿Qué cambia en mi plan?");
  });

  it("si no se guardó nada, no se le pregunta nada al asistente", () => {
    expect(preguntaTrasGuardar({ deudas: 0, cobros: 0 })).toBeNull();
  });

  it("el PDF de prueba existe, es un PDF y se declara inventado, sin marca de ningún banco", () => {
    const pdf = readFileSync(`public${RUTA_PDF_EJEMPLO}`).toString("latin1");
    expect(pdf.startsWith("%PDF-")).toBe(true);
    expect(pdf).toContain("DOCUMENTO INVENTADO");
    expect(pdf).not.toMatch(/BBVA|SBS/i);
  });
});
