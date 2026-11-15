import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ConfirmarPlan } from "./bienvenida";
import { MiRuta } from "./tu-ruta";
import { armarCaso } from "../ruta/entrada";
import { aPerfil } from "../datos/aPerfil";
import { analizar } from "../motor";
import { avanceDe, opcionesDeRuta, recomendada, SIN_HECHOS, trazarRuta } from "../ruta/ruta";
import { planDelMes } from "../ruta/presupuesto";
const nada = () => undefined;

describe("elección explícita", () => {
  it("la confirmación presenta el permiso desmarcado debajo del botón", () => {
    const html = renderToStaticMarkup(<ConfirmarPlan externo={false} alCambiarExterno={nada} guardando={false} alVerPlan={nada} alVolver={nada} />);
    expect(html).toContain("Ver mi plan");
    expect(html).toContain('type="checkbox"');
    expect(html).not.toContain("checked");
    expect(html.indexOf("Ver mi plan")).toBeLessThan(html.indexOf('type="checkbox"'));
    expect(html).toContain("Tus respuestas de simulación se envían a un servicio de IA para conversar.");
  });
  it("las tarjetas son botones con aria-pressed y solo la elegida está resaltada", () => {
    const perfil = aPerfil(armarCaso({ nombre: "Lucho", cobro: "fin_de_mes", ingresoMensual: 250000, saldo: 60000, gastosMensual: 170000, deuda: null, hoy: "2026-11-14" }));
    const analisis = analizar(perfil);
    const hechos = { ...SIN_HECHOS, meta: "ahorrar" as const, rutaElegida: "hacer_crecer" as const };
    const ruta = trazarRuta(perfil, analisis, hechos);
    const opciones = opcionesDeRuta(perfil, analisis, hechos);
    const html = renderToStaticMarkup(<MiRuta ruta={ruta} avance={avanceDe(ruta)} alMarcar={nada} alElegir={nada} opciones={opciones} recomendada={recomendada(perfil, analisis, hechos)} plan={planDelMes(perfil, analisis, ruta)} />);
    expect(html).toContain("Elige tu ruta");
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(opciones.length - 1);
    expect(html).toContain("Recomendada");
    expect(html).not.toContain("Tope para usar tu primer crédito");
  });
});
