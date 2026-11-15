import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { aPerfil } from "@/datos/aPerfil";
import { datosDeEjemplo } from "@/datos/semilla";
import { analizar, formatoSoles, sumar } from "@/motor";
import { Hoy } from "@/componentes/hoy";

const datos = datosDeEjemplo();
const perfil = aPerfil(datos);
const analisis = analizar(perfil);
const voz = { leer: () => undefined, detener: () => undefined, sonando: false };
const plano = (html: string) => html.replace(/ /g, " ");

/** Texto del valor dentro de la tarjeta de cifra que lleva esa etiqueta. */
function valorDe(html: string, etiqueta: string): string | undefined {
  const desde = html.indexOf(`<span>${etiqueta}</span>`);
  if (desde < 0) return undefined;
  return html.slice(desde).match(/class="cifra-valor[^"]*">([^<]+)</)?.[1];
}

describe("resumen de cifras en Inicio", () => {
  it("«Deuda total» suma todas las deudas, no solo las tarjetas", () => {
    const html = plano(renderToStaticMarkup(<Hoy perfil={perfil} analisis={analisis} cuentas={datos.cuentas} {...voz} />));
    const total = sumar(perfil.deudas.map(d => d.saldo));
    const soloTarjetas = sumar(perfil.deudas.filter(d => d.tipo === "tarjeta").map(d => d.saldo));
    expect(total).not.toBe(soloTarjetas); // el caso de ejemplo tiene un préstamo: la prueba distingue ambos
    expect(valorDe(html, "Deuda total")).toBe(plano(formatoSoles(total)));
  });

  it("«Dinero hoy» suma todas las cuentas y coincide con el saldo del motor", () => {
    const html = plano(renderToStaticMarkup(<Hoy perfil={perfil} analisis={analisis} cuentas={datos.cuentas} {...voz} />));
    expect(valorDe(html, "Dinero hoy")).toBe(plano(formatoSoles(perfil.saldoActual)));
  });

  it("el próximo vencimiento se lee como fecha larga, no en formato técnico", () => {
    const html = renderToStaticMarkup(<Hoy perfil={perfil} analisis={analisis} cuentas={datos.cuentas} {...voz} />);
    expect(html).toMatch(/Próximo vencimiento: [a-záéíóú]+ \d{1,2} de [a-z]+/);
    expect(html).not.toMatch(/Próximo vencimiento: \d{4}-\d{2}-\d{2}/);
  });
});
