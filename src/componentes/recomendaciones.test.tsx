import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { analizar } from "@/motor";
import { aPerfil } from "@/datos/aPerfil";
import { datosDeRosa } from "@/datos/semilla";
import { DatosDePrueba } from "@/componentes/datos";
import { Recomendaciones } from "@/componentes/recomendaciones";

describe("Recomendaciones", () => {
  it("sin ninguna opción no renderiza nada", () => {
    const datos = datosDeRosa();
    datos.cuentas = [{ id: "c", nombre: "Cuenta", saldo: 900_000_000 }];
    const analisis = analizar(aPerfil(datos));
    analisis.proyeccion = { ...analisis.proyeccion, deficit: null };
    expect(renderToStaticMarkup(<DatosDePrueba datos={datos}><Recomendaciones datos={datos} analisis={analisis} /></DatosDePrueba>)).toBe("");
  });

  it("con atraso muestra título, motivo, condición, fuente enlazada y la frase fija", () => {
    const datos = datosDeRosa();
    datos.deudas = datos.deudas.map((d, i) => (i === 0 ? { ...d, diasAtraso: 12 } : d));
    const analisis = analizar(aPerfil(datos));
    // `unido` pone un espacio sin salto entre «S/» y el monto.
    const html = renderToStaticMarkup(<DatosDePrueba datos={datos}><Recomendaciones datos={datos} analisis={analisis} /></DatosDePrueba>).replace(/ /g, " ");
    expect(html).toContain("Opciones para ti en BBVA");
    expect(html).toContain("Tarjeta de crédito con garantía líquida BBVA");
    expect(html).toContain("Por qué te lo sugerimos:");
    expect(html).toContain("12 días de atraso");
    expect(html).toContain("Depósito mínimo S/ 500 como garantía");
    expect(html).toContain('href="https://www.bbva.pe/personas/productos/tarjetas/credito/tarjeta-de-credito-garantia-liquida.html"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer"');
    expect(html).toContain("Consultado el 14 nov 2026");
    expect(html).toContain("Es una sugerencia, no una oferta: confírmalo con BBVA.");
    expect(html).not.toMatch(/NaN|undefined|bg-noche|bg-black/);
  });
});
