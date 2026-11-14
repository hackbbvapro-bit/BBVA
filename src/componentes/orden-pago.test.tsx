import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { OrdenDePago } from "@/componentes/orden-pago";
import type { DecisionPago, ResultadoPrioridad } from "@/motor/prioridad";

const base = { entidad: "Entidad", monto: 10_000, motivo: "Motivo", calificacion: "normal", proximoPago: null } as const;

describe("OrdenDePago", () => {
  it("numera dentro de cada grupo, empezando en 1, aunque el orden global salte", () => {
    const decisiones: DecisionPago[] = [
      { ...base, id: "a", nombre: "Deuda A", grupo: "negociar", orden: 1 },
      { ...base, id: "b", nombre: "Deuda B", grupo: "negociar", orden: 2 },
      { ...base, id: "c", nombre: "Deuda C", grupo: "pagar-ya", orden: 4 },
    ];
    const r: ResultadoPrioridad = { decisiones, disponible: 50_000, comprometido: 10_000, sobrante: 0, faltante: 20_000, alcanzaParaTodo: false };
    const html = renderToStaticMarkup(<OrdenDePago r={r} />);
    const numeros = [...html.matchAll(/rounded-full bg-noche[^>]*>(\d+)</g)].map(m => m[1]);
    expect(numeros).toEqual(["1", "1", "2"]);
  });
});
