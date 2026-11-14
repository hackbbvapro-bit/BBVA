import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { analizar, proyectar } from "@/motor";
import { aPerfil } from "@/datos/aPerfil";
import { datosDeRosa } from "@/datos/semilla";
import { Grafico } from "./grafico";

describe("gráfico compacto", () => {
  it("conserva el control accesible y no muestra el detalle extenso", () => {
    const perfil = aPerfil(datosDeRosa());
    const base = analizar(perfil).proyeccion;
    const antes = structuredClone(base);
    const html = renderToStaticMarkup(<Grafico base={base} descripcion="Proyección" />);
    expect(html).toContain('type="range"');
    expect(html).toContain('class="sr-only');
    expect(html).not.toContain("Saldo al comenzar");
    expect(html).not.toContain("proyeccion-resumen");
    expect(base).toEqual(antes);
  });

  it("mantiene la comparación de escenarios", () => {
    const perfil = aPerfil(datosDeRosa());
    const analisis = analizar(perfil);
    const despues = proyectar(perfil, { ajustes: analisis.jugadas[0].ajustes });
    const html = renderToStaticMarkup(<Grafico base={analisis.proyeccion} despues={despues} descripcion="Comparación" />);
    expect(html).toContain("var(--color-electrico)");
    expect(html).not.toMatch(/NaN|Infinity/);
  });
});
