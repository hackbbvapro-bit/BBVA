"use client";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PERFILES } from "@/datos/perfiles";
import { analizar, proyectar } from "@/motor";
import { avisos } from "@/explica/explica";
import { Hoy } from "@/componentes/hoy";
import { Deudas } from "@/componentes/deudas";
import { Chat } from "@/componentes/chat";
import { DatosDePrueba } from "@/componentes/datos";
import { datosDeEjemplo } from "@/datos/semilla";
import { Grafico } from "@/componentes/grafico";
const voz = { leer: () => undefined, detener: () => undefined, sonando: false };
describe("Interfaz con perfiles sintéticos", () => {
  for (const perfil of PERFILES) {
    it(`renderiza las tres pantallas de ${perfil.nombre} sin APIs del navegador`, () => {
      const analisis = analizar(perfil);
      for (const vista of [
        <Hoy key="hoy" perfil={perfil} analisis={analisis} {...voz} />,
        <DatosDePrueba key="deudas" datos={datosDeEjemplo()}><Deudas perfil={perfil} analisis={analisis} /></DatosDePrueba>,
        <Chat key="chat" perfil={perfil} analisis={analisis} {...voz} />,
      ]) {
        const html = renderToStaticMarkup(vista);
        expect(html).not.toContain("NaN");
        expect(html).not.toContain("undefined");
        expect(html.length).toBeGreaterThan(0);
      }
    });
    it(`mantiene todas las jugadas de ${perfil.nombre} dentro del gráfico`, () => {
      const analisis = analizar(perfil);
      for (const jugada of [undefined, ...analisis.jugadas]) {
        const html = renderToStaticMarkup(
          <Grafico
            base={analisis.proyeccion}
            despues={jugada ? proyectar(perfil, { ajustes: jugada.ajustes }) : undefined}
            descripcion={avisos(perfil, analisis)[0].cuerpo}
          />,
        );
        expect(html).not.toMatch(/NaN|Infinity/);
        for (const [, x, y] of html.matchAll(/[ML]([\d.-]+),([\d.-]+)/g)) {
          expect(Number(x)).toBeGreaterThanOrEqual(0);
          expect(Number(x)).toBeLessThanOrEqual(350);
          expect(Number(y)).toBeGreaterThanOrEqual(0);
          expect(Number(y)).toBeLessThanOrEqual(250);
        }
      }
    });
  }
  it("Carlos muestra pagos, sin jugadas ni tarjeta coral", () => {
    const perfil = PERFILES.find(p => p.nombre === "Carlos")!;
    const html = renderToStaticMarkup(<Hoy perfil={perfil} analisis={analizar(perfil)} {...voz} />);
    expect(html).toContain("Lo que sale esta semana");
    expect(html).not.toContain("Tus jugadas");
    expect(html).not.toContain("bg-coral-suave");
  });
  it("renderiza el estado sin deudas sin mutar el perfil", () => {
    const perfil = PERFILES[0],
      analisis = analizar(perfil);
    const antes = JSON.stringify(perfil.deudas);
    renderToStaticMarkup(<DatosDePrueba datos={datosDeEjemplo()}><Deudas perfil={perfil} analisis={analisis} /></DatosDePrueba>);
    expect(JSON.stringify(perfil.deudas)).toBe(antes);
    expect(
      renderToStaticMarkup(<DatosDePrueba datos={{ ...datosDeEjemplo(), deudas: [] }}><Deudas perfil={perfil} analisis={{ ...analisis, deudas: null }} /></DatosDePrueba>),
    ).toContain("No tienes deudas abiertas");
  });
});
describe("Perfil y menú de usuario", () => {
  it("el perfil muestra a Andrea y no pide datos sensibles", async () => {
    const { Perfil } = await import("@/componentes/perfil");
    const { MenuUsuario } = await import("@/componentes/menu-usuario");
    const html = renderToStaticMarkup(<DatosDePrueba datos={datosDeEjemplo()}><Perfil /></DatosDePrueba>);
    expect(html).toContain("Andrea");
    expect(html).not.toMatch(/<input|NaN|undefined/);
    const menu = renderToStaticMarkup(<MenuUsuario nombre="Andrea" variante="lateral" alPerfil={() => undefined} alComoFunciona={() => undefined} />);
    expect(menu).toContain("Caso de ejemplo");
  });
});
describe("Cómo funciona", () => {
  it("trae el recorrido de 5 pasos, el glosario completo y la nota de privacidad", async () => {
    const { ComoFunciona } = await import("@/componentes/como-funciona");
    const html = renderToStaticMarkup(<ComoFunciona />);
    expect(html.match(/<li class="relative/g)).toHaveLength(5);
    for (const t of ["TCEA", "Faltante (déficit)", "Calificación SBS", "Jugada", "Saldo proyectado", "Tu privacidad", "Los números los calcula el código"]) {
      expect(html).toContain(t);
    }
    expect(html).not.toMatch(/<input|NaN|undefined/);
  });
});
