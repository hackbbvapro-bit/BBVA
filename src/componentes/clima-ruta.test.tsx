import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { analizar } from "@/motor";
import { aPerfil } from "@/datos/aPerfil";
import { datosDeEjemplo } from "@/datos/semilla";
import { avanceDe, trazarRuta } from "@/ruta/ruta";
import { MiRuta } from "./tu-ruta";
import { ClimaRuta, climaDelAvance } from "./clima-ruta";

const perfil = aPerfil(datosDeEjemplo());
const ruta = trazarRuta(perfil, analizar(perfil));

describe("clima según los pasos marcados", () => {
  it("pasa de tormenta a nubes, sol parcial y cielo despejado con el avance real", () => {
    expect(ruta.idsPasos.length).toBeGreaterThanOrEqual(3);
    for (const [cuantos, clima] of [
      [0, "tormenta"], [1, "nublado"], [2, "abriendo"], [ruta.idsPasos.length, "despejado"],
    ] as const) {
      const avance = avanceDe(ruta, ruta.idsPasos.slice(0, cuantos));
      expect(climaDelAvance(avance.cumplidos, avance.total)).toBe(clima);
    }
  });

  it("vuelve al clima anterior al desmarcar y cuenta pasos fuera de orden", () => {
    const marcas = [...ruta.idsPasos];
    expect(climaDelAvance(avanceDe(ruta, marcas).cumplidos, marcas.length)).toBe("despejado");
    marcas.splice(0, marcas.length, ruta.idsPasos[2]);
    const saltado = avanceDe(ruta, marcas);
    expect(saltado.siguiente).toBe(ruta.pasos[0]);
    expect(climaDelAvance(saltado.cumplidos, saltado.total)).toBe("nublado");
    marcas.length = 0;
    const desmarcado = avanceDe(ruta, marcas);
    expect(climaDelAvance(desmarcado.cumplidos, desmarcado.total)).toBe("tormenta");
  });

  it.each([
    [0, 0, "nublado"],
    [0, 1, "tormenta"], [1, 1, "despejado"],
    [0, 2, "tormenta"], [1, 2, "nublado"], [2, 2, "despejado"],
    [2, 5, "abriendo"], [4, 5, "abriendo"], [5, 5, "despejado"],
  ] as const)("%i pasos hechos de %i muestra %s", (cumplidos, total, clima) => {
    expect(climaDelAvance(cumplidos, total)).toBe(clima);
  });

  it("el clima tiene una descripción accesible sin necesitar APIs del navegador", () => {
    const html = renderToStaticMarkup(<ClimaRuta cumplidos={0} total={3} />);
    expect(html).toContain('role="img"');
    expect(html).toContain('data-clima="tormenta"');
    expect(html).toContain("Lluvia intensa");
  });

  it("MiRuta mantiene el clima, los checks y los textos tachados de acuerdo con el mismo avance", () => {
    const antes = structuredClone(ruta);
    for (const cuantos of [0, 1, 2, ruta.idsPasos.length]) {
      const marcas = ruta.idsPasos.slice(0, cuantos);
      const avance = avanceDe(ruta, marcas);
      const avanceAntes = structuredClone(avance);
      const html = renderToStaticMarkup(<MiRuta ruta={ruta} avance={avance} alMarcar={() => undefined} />);
      expect(html).toContain(`data-clima="${climaDelAvance(avance.cumplidos, avance.total)}"`);
      expect(html.match(/checked=""/g) ?? []).toHaveLength(cuantos);
      expect(html.match(/line-through/g) ?? []).toHaveLength(cuantos);
      expect(html.match(/type="checkbox"/g) ?? []).toHaveLength(ruta.idsPasos.length);
      expect(avance).toEqual(avanceAntes);
      expect(marcas).toEqual(ruta.idsPasos.slice(0, cuantos));
    }
    expect(ruta).toEqual(antes);
  });
});
