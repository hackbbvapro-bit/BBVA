import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { analizar, diasDelHorizonte, episodiosEnRojo, proyectar, semanasDelGrafico, type Proyeccion } from "@/motor";
import { aPerfil } from "@/datos/aPerfil";
import { datosDeEjemplo } from "@/datos/semilla";
import { Grafico } from "./grafico";

describe("gráfico compacto", () => {
  it("conserva el control accesible y no muestra el detalle extenso", () => {
    const perfil = aPerfil(datosDeEjemplo());
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
    const perfil = aPerfil(datosDeEjemplo());
    const analisis = analizar(perfil);
    const despues = proyectar(perfil, { ajustes: analisis.jugadas[0].ajustes });
    const html = renderToStaticMarkup(<Grafico base={analisis.proyeccion} despues={despues} descripcion="Comparación" />);
    expect(html).toContain("var(--color-electrico)");
    expect(html).not.toMatch(/NaN|Infinity/);
  });

  it("en 1 mes dibuja una alerta por cada caída a rojo y rotula el día elegido con su año", () => {
    const perfil = aPerfil(datosDeEjemplo());
    const base = proyectar(perfil, { dias: diasDelHorizonte(perfil.hoy, "mes") });
    const html = renderToStaticMarkup(<Grafico base={base} descripcion="x" horizonte="mes" />);
    expect((html.match(/grafico-alerta/g) ?? []).length).toBe(episodiosEnRojo(base.dias).length);
    expect(html).toContain(`${base.deficit!.fecha.slice(0, 4)}</text>`);
  });

  it("desde 2 meses va por semanas: alerta en cada semana con caída y la fecha es el rango de la semana", () => {
    const perfil = aPerfil(datosDeEjemplo());
    for (const h of ["2m", "6m"] as const) {
      const base = proyectar(perfil, { dias: diasDelHorizonte(perfil.hoy, h) });
      const html = renderToStaticMarkup(<Grafico base={base} descripcion="x" horizonte={h} />);
      const conAlerta = semanasDelGrafico(base.dias).filter(s => s.alerta).length;
      expect(conAlerta).toBeGreaterThan(0);
      expect((html.match(/grafico-alerta/g) ?? []).length).toBe(conAlerta);
      expect(html).toMatch(/\d{1,2} \w+ – \d{1,2} \w+<\/text>/);
      expect(html).not.toMatch(/NaN|Infinity/);
    }
  });

  it("si se recupera y vuelve a caer, muestra varias alertas", () => {
    const perfil = aPerfil(datosDeEjemplo());
    const base = proyectar(perfil, { dias: 10 });
    const saldos = [5000, -100, 300, 400, -50, 200, 200, -10, -20, 100];
    const serie: Proyeccion = { ...base, dias: base.dias.map((d, i) => ({ ...d, saldo: saldos[i] })) };
    const html = renderToStaticMarkup(<Grafico base={serie} descripcion="x" horizonte="mes" />);
    expect((html.match(/grafico-alerta/g) ?? []).length).toBe(3);
  });
});
