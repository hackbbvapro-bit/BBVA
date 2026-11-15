import { expect, it } from "vitest";
import { analizar } from "@/motor";
import { aPerfil } from "./aPerfil";
import { datosDeEjemplo } from "./semilla";
import { disponibleParaDeudas, prioridadDePagos } from "./paraPrioridad";

it("lo que reparte «Qué pagar primero» no supera lo disponible y suma lo de las decisiones de este mes", () => {
  const datos = datosDeEjemplo();
  const a = analizar(aPerfil(datos));
  const r = prioridadDePagos(datos, a);
  expect(r.disponible).toBe(disponibleParaDeudas(a));
  expect(r.comprometido).toBeLessThanOrEqual(r.disponible);
  const suma = r.decisiones.filter(d => d.grupo !== "negociar").reduce((s, d) => s + d.monto, 0);
  expect(suma).toBe(r.comprometido);
});
