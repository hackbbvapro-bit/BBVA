import { describe, expect, it } from "vitest";
import { PERFILES } from "@/datos/perfiles";
import { analizar } from "@/motor";
import { cifras, estadoSaldo } from "./tablero";
import { flujoMensual } from "@/ruta/ruta";

const perfilDe = (id: string) => {
  const perfil = PERFILES.find(p => p.id === id);
  if (!perfil) throw new Error(`No existe el perfil ${id}`);
  return perfil;
};

describe("indicadores de Inicio", () => {
  it("Andrea: cada cifra dice qué significa y a qué sección lleva", () => {
    const perfil = perfilDe("independiente");
    const [dinero, deuda, fijos, salida] = cifras(perfil, analizar(perfil));
    expect(dinero).toMatchObject({ etiqueta: "Dinero hoy", valor: "S/ 1,168.73", destino: "dinero" });
    // 1 800 + 900 + 4 500 soles de saldo en tres deudas.
    expect(deuda).toMatchObject({ etiqueta: "Deuda total", valor: "S/ 7,200.00", nota: "Lo que debes en 3 deudas", destino: "deudas" });
    // Alquiler, servicios, suscripciones, seguro + mínimos (160 + 80) y cuota (270): 1 875.80 soles.
    expect(fijos).toMatchObject({ etiqueta: "Gastos fijos del mes", valor: "S/ 1,875.80",
      nota: "Lo que sale sí o sí cada mes", destino: "proyeccion" });
    expect(fijos.lineas).toHaveLength(12);
    expect(fijos.lineas?.slice(0, 3)).toEqual([["Alquiler", "S/ 850.00"], ["Cuota Préstamo personal", "S/ 270.00"], ["Mínimo Tarjeta Azul", "S/ 160.00"]]);
    expect(salida).toMatchObject({ etiqueta: "Salida más barata", valor: "Sin intereses",
      nota: "Pausa tus suscripciones este mes · libera S/ 161.80", destino: "como-evitarlo" });
  });

  it("sin déficit muestra el saldo al final del mes y lleva a la proyección", () => {
    const perfil = perfilDe("dependiente");
    const analisis = analizar(perfil);
    expect(analisis.proyeccion.deficit).toBeNull();
    expect(cifras(perfil, analisis)[3]).toMatchObject({ etiqueta: "Al final del mes", nota: "Si todo sigue como va", destino: "proyeccion" });
  });

  it("sin deudas lo dice en palabras y los gastos fijos no inventan mínimos", () => {
    const perfil = { ...perfilDe("independiente"), deudas: [] };
    const [, deuda, fijos] = cifras(perfil, analizar(perfil));
    expect(deuda).toMatchObject({ valor: "S/ 0.00", nota: "No tienes deudas registradas" });
    // 1 875.80 − (270 + 160 + 80) de mínimos y cuota = 1 365.80 soles.
    expect(fijos).toMatchObject({ valor: "S/ 1,365.80" });
    expect(fijos.lineas?.some(([d]) => /^(Mínimo|Cuota) /.test(d))).toBe(false);
  });

  it("una deuda sin pago mínimo no suma a los gastos fijos", () => {
    const base = perfilDe("independiente");
    const perfil = { ...base, deudas: base.deudas.map((d, i) => (i === 0 ? { ...d, pagoMinimo: 0 } : d)) };
    // Se va el mínimo de la Tarjeta Azul (160 soles): 1 875.80 − 160 = 1 715.80.
    expect(cifras(perfil, analizar(perfil))[2]).toMatchObject({ valor: "S/ 1,715.80" });
  });

  it("sin pagos fijos lo dice y no muestra desglose", () => {
    const base = perfilDe("independiente");
    const perfil = { ...base, deudas: [] };
    const analisis = { ...analizar(perfil), recurrentes: [] };
    expect(cifras(perfil, analisis)[2]).toMatchObject({ valor: "S/ 0.00", nota: "No tienes pagos fijos registrados", lineas: [] });
  });
});

describe("tarjeta de estado del saldo", () => {
  it("con déficit: rojo, monto y fecha salen del motor", () => {
    const perfil = perfilDe("independiente");
    const analisis = analizar(perfil);
    const d = analisis.proyeccion.deficit;
    if (!d) throw new Error("Andrea debería tener déficit");
    const estado = estadoSaldo(analisis, flujoMensual(perfil, analisis));
    expect(estado.tono).toBe("rojo");
    expect(estado.etiqueta).toBe("Te faltará dinero");
    expect(estado.valor).toMatch(/^S\/ [\d,]+\.\d{2}$/);
    expect(estado.lineas).toHaveLength(d.causas.length);
    expect(estado.accion).toBe(analisis.jugadas.length > 0 ? "Ver qué cambia" : undefined);
  });

  it("sin déficit ni gasto de más: verde y sin montos inventados", () => {
    const perfil = perfilDe("independiente");
    const analisis = analizar(perfil);
    const sinDeficit = { ...analisis, proyeccion: { ...analisis.proyeccion, deficit: null } };
    const estado = estadoSaldo(sinDeficit, { ingresos: 300000, gastos: 200000, cuotas: 0, libre: 100000 });
    expect(estado).toMatchObject({ tono: "verde", valor: "Sin faltantes" });
  });

  it("sin déficit pero gastando más de lo que entra: ámbar con el exceso mensual", () => {
    const perfil = perfilDe("independiente");
    const analisis = analizar(perfil);
    const sinDeficit = { ...analisis, proyeccion: { ...analisis.proyeccion, deficit: null } };
    const estado = estadoSaldo(sinDeficit, { ingresos: 200000, gastos: 230000, cuotas: 0, libre: -30000 });
    expect(estado).toMatchObject({ tono: "ambar", valor: "S/ 300.00", testId: "tarjeta-ritmo" });
  });
});
