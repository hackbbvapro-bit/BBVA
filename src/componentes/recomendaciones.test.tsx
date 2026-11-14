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

  it("con atraso muestra título, motivo y la frase fija; sin marca, sin enlaces y sin cifras de mercado", () => {
    const datos = datosDeRosa();
    // Con plata de sobra: a quien le falta para fin de mes no se le propone inmovilizar un depósito.
    datos.cuentas = [{ id: "c", nombre: "Cuenta", saldo: 900_000_000 }];
    datos.deudas = datos.deudas.map((d, i) => (i === 0 ? { ...d, diasAtraso: 12 } : d));
    const analisis = analizar(aPerfil(datos));
    analisis.proyeccion = { ...analisis.proyeccion, deficit: null };
    // `unido` pone un espacio sin salto entre «S/» y el monto.
    const html = renderToStaticMarkup(<DatosDePrueba datos={datos}><Recomendaciones datos={datos} analisis={analisis} /></DatosDePrueba>).replace(/ /g, " ");
    expect(html).toContain("Alternativas que puedes consultar");
    expect(html).toContain("Tarjeta de crédito con garantía (depósito de respaldo)");
    expect(html).toContain("Por qué aparece:");
    expect(html).toContain("12 días de atraso");
    expect(html).toContain("Orientación educativa");
    expect(html).toContain("no es una oferta ni asesoría personalizada");
    expect(html).toContain("la decisión es tuya");
    expect(html).not.toMatch(/BBVA|bbva\.pe|href=|S\/ 500|Consultado el/);
    expect(html).not.toMatch(/NaN|undefined|bg-noche|bg-black/);
  });
});
